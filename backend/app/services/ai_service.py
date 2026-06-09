"""
AI Service — Upgraded with llama-3.3-70b-versatile, async support, better prompts
"""
import json
import re
import asyncio
from typing import List, Dict, Optional
from groq import Groq, AsyncGroq
from app.core.config import settings
from app.services.question_bank import get_instant_question

# Sync client for sync routes
client = Groq(api_key=settings.GROQ_API_KEY)
# Async client for async routes (parallel question generation)
async_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Use fastest + smartest Groq model
MODEL = settings.GROQ_MODEL
MODEL_FAST = settings.GROQ_FAST_MODEL


def _call_groq(system: str, user: str, max_tokens: int = 800, temperature: float = 0.7) -> str:
    try:
        msg = client.chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=False,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
        )
        return msg.choices[0].message.content.strip()
    except Exception as e:
        raise RuntimeError(f"Groq API error: {str(e)}")


async def _call_groq_async(system: str, user: str, max_tokens: int = 800, temperature: float = 0.7) -> str:
    """Async Groq call — enables parallel question generation."""
    try:
        msg = await async_client.chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=False,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
        )
        return msg.choices[0].message.content.strip()
    except Exception as e:
        raise RuntimeError(f"Groq async error: {str(e)}")


def _call_groq_stream(system: str, user: str, max_tokens: int = 800, temperature: float = 0.7):
    try:
        stream = client.chat.completions.create(
            model=MODEL_FAST,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        raise RuntimeError(f"Groq stream error: {str(e)}")


def _safe_json(text: str) -> dict:
    """Parse JSON with 3 fallback strategies."""
    for attempt in [text, re.sub(r"```(?:json)?", "", text).replace("```", "").strip()]:
        try:
            return json.loads(attempt)
        except Exception:
            pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return {}


# ─── Domain contexts ──────────────────────────────────────────────────────────
DOMAIN_CONTEXTS = {
    "frontend":    "React, Vue, Angular, JavaScript ES6+, CSS Flexbox/Grid, performance optimization, browser APIs, accessibility, Webpack/Vite, TypeScript, testing",
    "backend":     "REST/GraphQL APIs, SQL/NoSQL databases, indexing, JWT/OAuth, Redis, microservices, message queues, security, scalability, Python/Node/Java",
    "fullstack":   "Frontend + backend integration, database design, CI/CD, deployment, full-stack debugging, system design, API contracts",
    "data_analyst":"SQL joins/window functions/CTEs, Python pandas/numpy/scikit-learn, statistics, A/B testing, data visualization, business metrics, ETL pipelines",
    "devops":      "Docker, Kubernetes, CI/CD pipelines, Terraform, AWS/GCP/Azure, Prometheus/Grafana, networking, incident response, SRE practices",
    "hr":          "STAR method, conflict resolution, teamwork, leadership, time management, communication, career goals, cultural fit, problem-solving approach",
}

DIFFICULTY_GUIDE = {
    "beginner":     "foundational concepts, basic definitions, simple real-world scenarios",
    "intermediate": "practical application, debugging, real-world problems, moderate complexity",
    "advanced":     "deep expertise, architectural decisions, edge cases, performance trade-offs, system design",
}

Q_TYPES = [
    "technical", "problem_solving", "technical", "behavioral", "system_design",
    "technical", "scenario", "technical", "debugging", "architecture",
    "optimization", "security", "testing", "deployment", "performance",
    "scalability", "best_practices", "trade_offs", "real_world", "troubleshooting",
]

# ═══════════════════════════════════════════════════════════════════════════════
# MCQ GENERATION — SYNC + ASYNC
# ═══════════════════════════════════════════════════════════════════════════════
MCQ_SYSTEM = """You are a senior technical interviewer at a top tech company creating exam questions.

Generate ONE unique multiple-choice question with exactly 4 answer options.

Return ONLY this JSON (no markdown, no extra text):
{
  "question": "Precise, specific question text?",
  "type": "technical",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option",
    "D) Fourth option"
  ],
  "correct_answer": "A) First option",
  "explanation": "Clear 2-3 sentence explanation of why this is correct and others are wrong."
}

STRICT RULES:
- Exactly 4 options starting with A), B), C), D)
- correct_answer must EXACTLY match one option string
- Wrong options must be plausible (not obviously wrong)
- Question must test real knowledge, not trivia
- Return ONLY the JSON object"""


def _build_mcq_prompt(domain: str, difficulty: str, previous_questions: List[str], question_index: int) -> str:
    context = DOMAIN_CONTEXTS.get(domain, DOMAIN_CONTEXTS["hr"])
    q_type = Q_TYPES[question_index % len(Q_TYPES)]
    prev = "\n".join(f"- {q[:100]}" for q in previous_questions[-8:]) or "None yet"
    return f"""Domain: {domain} ({context})
Difficulty: {difficulty} — {DIFFICULTY_GUIDE.get(difficulty, '')}
Question #{question_index + 1} | Type: {q_type}

Previously asked questions (DO NOT repeat or closely paraphrase any):
{prev}

Generate a UNIQUE {q_type} MCQ for a {difficulty} {domain} interview.
Focus on practical, real-world knowledge. Return ONLY the JSON."""


def _validate_mcq(data: dict, q_type: str) -> dict:
    """Validate and fix MCQ structure."""
    if not isinstance(data, dict):
        data = {}
    options = data.get("options", [])
    if not isinstance(options, list) or len(options) != 4:
        options = ["A) Option A", "B) Option B", "C) Option C", "D) Option D"]
    # Ensure options start with A), B), C), D)
    fixed = []
    for i, opt in enumerate(options[:4]):
        prefix = f"{chr(65+i)}) "
        text = str(opt).strip()
        text = re.sub(r"^[A-D][\).\s-]*", "", text).strip()
        fixed.append(prefix + (text or f"Option {chr(65+i)}"))
    options = fixed
    correct = data.get("correct_answer", options[0])
    if correct not in options:
        correct_text = re.sub(r"^[A-D][\).\s-]*", "", str(correct)).strip().lower()
        correct = next((opt for opt in options if opt[3:].strip().lower() == correct_text), options[0])
    question = str(data.get("question") or "").strip()
    if not question:
        question = "What is a key concept in this domain?"
    explanation = str(data.get("explanation") or "").strip()
    if not explanation:
        explanation = "This is the correct answer based on industry best practices."
    return {
        "question":       question,
        "type":           str(data.get("type") or q_type),
        "options":        options,
        "correct_answer": correct,
        "explanation":    explanation,
    }


def generate_question(
    domain: str, difficulty: str, previous_questions: List[str],
    question_index: int, session_id: Optional[int] = None,
) -> Dict:
    """Sync MCQ generation."""
    q_type = Q_TYPES[question_index % len(Q_TYPES)]
    prompt = _build_mcq_prompt(domain, difficulty, previous_questions, question_index)
    raw = _call_groq(MCQ_SYSTEM, prompt, max_tokens=600, temperature=0.85)
    return _validate_mcq(_safe_json(raw), q_type)


async def generate_question_async(
    domain: str, difficulty: str, previous_questions: List[str],
    question_index: int, session_id: Optional[int] = None,
) -> Dict:
    """Async MCQ generation — for parallel prefetch."""
    q_type = Q_TYPES[question_index % len(Q_TYPES)]
    prompt = _build_mcq_prompt(domain, difficulty, previous_questions, question_index)
    raw = await _call_groq_async(MCQ_SYSTEM, prompt, max_tokens=600, temperature=0.85)
    return _validate_mcq(_safe_json(raw), q_type)


async def generate_questions_batch(
    domain: str, difficulty: str, previous_questions: List[str],
    start_index: int, count: int = 5, session_id: Optional[int] = None,
) -> List[Dict]:
    """Generate `count` questions in parallel using asyncio.gather."""
    tasks = [
        generate_question_async(domain, difficulty, previous_questions, start_index + i, session_id)
        for i in range(count)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    questions = []
    seen = set(previous_questions)
    for offset, result in enumerate(results):
        if isinstance(result, dict) and result.get("question") and result["question"] not in seen:
            questions.append(result)
            seen.add(result["question"])
            continue
        fallback = get_instant_question(domain, difficulty, start_index + offset, session_id)
        if fallback["question"] not in seen:
            questions.append(fallback)
            seen.add(fallback["question"])
    return questions


def generate_question_stream(
    domain: str, difficulty: str, previous_questions: List[str],
    question_index: int, session_id: Optional[int] = None,
):
    q_type = Q_TYPES[question_index % len(Q_TYPES)]
    prompt = _build_mcq_prompt(domain, difficulty, previous_questions, question_index)
    for chunk in _call_groq_stream(MCQ_SYSTEM, prompt, max_tokens=600, temperature=0.85):
        yield chunk


# ═══════════════════════════════════════════════════════════════════════════════
# MCQ EVALUATION — INSTANT (no AI needed)
# ═══════════════════════════════════════════════════════════════════════════════
def evaluate_mcq_answer(question: str, user_answer: str, correct_answer: str, explanation: str) -> dict:
    is_correct = user_answer.strip() == correct_answer.strip()
    return {
        "is_correct":     is_correct,
        "correct_answer": correct_answer,
        "explanation":    explanation,
        "score":          10.0 if is_correct else 0.0,
        "feedback":       "Correct! Well done." if is_correct else f"Incorrect. The correct answer is: {correct_answer}",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PERFORMANCE REPORT
# ═══════════════════════════════════════════════════════════════════════════════
REPORT_SYSTEM = """You are a senior hiring manager writing a detailed candidate assessment.
Analyze the MCQ exam results and return ONLY valid JSON:
{
  "overall_score": 7.5,
  "technical_score": 7.0,
  "communication_score": 7.5,
  "problem_solving_score": 8.0,
  "summary": "3-4 sentence honest assessment of the candidate's performance",
  "key_strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "areas_to_improve": ["specific area 1", "specific area 2"],
  "recommendation": "hire",
  "trust_note": "Brief note on exam integrity if violations occurred"
}
Scoring: hire ≥70% correct, consider 40-69%, reject <40%.
Be specific — reference actual topics from the questions."""


def generate_performance_report(domain: str, difficulty: str, qa_pairs: List[dict], violation_count: int = 0) -> dict:
    correct = sum(1 for p in qa_pairs if p.get("is_correct", False))
    total   = len(qa_pairs)
    pct     = round(correct / total * 100) if total else 0
    score   = round(correct / total * 10, 1) if total else 0

    summary_lines = "\n".join(
        f"Q{i+1}: {p['question'][:90]} | {'✓' if p.get('is_correct') else '✗'} (correct: {p.get('correct_answer', '')[:50]})"
        for i, p in enumerate(qa_pairs)
    )
    violation_note = f"\nNote: {violation_count} proctoring violations detected during this exam." if violation_count > 0 else ""

    prompt = f"""Domain: {domain} | Difficulty: {difficulty}
Score: {correct}/{total} ({pct}%){violation_note}

Results:
{summary_lines}

Write a performance report JSON. Be specific about topics tested."""

    raw    = _call_groq(REPORT_SYSTEM, prompt, max_tokens=800, temperature=0.4)
    result = _safe_json(raw)

    for key in ["overall_score", "technical_score", "communication_score", "problem_solving_score"]:
        try:
            result[key] = max(0.0, min(10.0, float(result.get(key, score))))
        except Exception:
            result[key] = score

    # Penalize score if high violations
    if violation_count >= 3:
        result["overall_score"] = max(0.0, result["overall_score"] - 1.0)
        result["trust_note"] = f"{violation_count} proctoring violations detected. Score adjusted."

    result.setdefault("summary", f"Answered {correct}/{total} questions correctly ({pct}%).")
    result.setdefault("key_strengths", ["Completed the examination", "Attempted all questions"])
    result.setdefault("areas_to_improve", ["Review incorrect answers", "Practice more questions"])
    result.setdefault("recommendation", "hire" if pct >= 70 else "consider" if pct >= 40 else "reject")
    result.setdefault("trust_note", "No proctoring violations detected.")

    return result
