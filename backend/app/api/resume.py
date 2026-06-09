"""
Resume-based interview API using pdfplumber + pymupdf for accurate parsing
"""
import io
import fitz  # pymupdf
import pdfplumber
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai_service import _call_groq, _safe_json

router = APIRouter(prefix="/api/resume", tags=["Resume Interview"])

Q_CATEGORIES = [
    "project_deep_dive", "library_why_used", "skills_depth", "project_architecture",
    "technology_choice", "library_why_used", "project_deep_dive", "problem_solved",
    "skills_depth", "project_architecture", "library_why_used", "technology_choice",
    "project_deep_dive", "skills_depth", "problem_solved", "library_why_used",
    "project_architecture", "technology_choice", "project_deep_dive", "skills_depth",
    "library_why_used", "problem_solved", "project_architecture", "skills_depth",
    "technology_choice", "project_deep_dive", "library_why_used", "problem_solved",
    "skills_depth", "project_architecture",
]

CATEGORY_INSTRUCTIONS = {
    "project_deep_dive":    "Ask a specific question about one of their projects — what it does, how it works, what was hardest",
    "library_why_used":     "Ask WHY they used a specific library/framework — what problem it solved, what alternatives exist",
    "skills_depth":         "Test deep understanding of a skill they listed — not just definition, but real-world application",
    "project_architecture": "Ask about architecture/design decisions in one of their projects — why structured that way",
    "technology_choice":    "Ask why they chose one technology over another in their resume",
    "problem_solved":       "Ask about a specific technical challenge they solved — approach, trade-offs, result",
}


def extract_text_from_pdf(content: bytes) -> str:
    """Extract text using pdfplumber first, fallback to pymupdf."""
    text = ""
    # Try pdfplumber first (best for text-based PDFs)
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages_text = []
            for page in pdf.pages:
                t = page.extract_text(x_tolerance=2, y_tolerance=2)
                if t:
                    pages_text.append(t)
            text = "\n".join(pages_text)
    except Exception:
        pass

    # Fallback to pymupdf if pdfplumber got nothing
    if not text.strip():
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            pages_text = []
            for page in doc:
                t = page.get_text("text")
                if t:
                    pages_text.append(t)
            text = "\n".join(pages_text)
            doc.close()
        except Exception:
            pass

    return text.strip()


class ResumeQuestionRequest(BaseModel):
    resume_text: str
    resume_analysis: dict
    question_index: int
    total_questions: int = 25
    previous_questions: list[str] = []


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    try:
        content = await file.read()
        fname = file.filename.lower()

        if fname.endswith(".pdf"):
            text = extract_text_from_pdf(content)
        elif fname.endswith(".txt"):
            text = content.decode("utf-8")
        elif fname.endswith(".docx"):
            from docx import Document
            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        else:
            raise HTTPException(status_code=400, detail="Only PDF, TXT, DOCX supported")

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from resume. Try a text-based PDF.")

        # Deep analysis with full resume text
        system_prompt = """You are an expert resume parser. Extract EVERY detail from this resume accurately.
Return ONLY valid JSON:
{
  "name": "full name",
  "summary": "2-3 sentence profile",
  "experience_years": 2,
  "current_role": "latest job title",
  "languages": ["Python", "JavaScript"],
  "frameworks": ["React", "FastAPI", "Django"],
  "libraries": ["pandas", "axios", "SQLAlchemy", "NumPy"],
  "databases": ["PostgreSQL", "MongoDB", "MySQL"],
  "tools": ["Git", "Docker", "VS Code", "Postman"],
  "cloud": ["AWS", "GCP", "Azure"],
  "skills": ["REST APIs", "Machine Learning", "CI/CD"],
  "projects": [
    {
      "name": "exact project name from resume",
      "description": "what it does",
      "tech_used": ["React", "Node.js", "MongoDB"],
      "libraries_used": ["axios", "mongoose", "express"],
      "your_role": "what the candidate built/did",
      "key_features": ["feature1", "feature2"]
    }
  ],
  "work_experience": [
    {
      "company": "company name",
      "role": "job title",
      "duration": "Jan 2022 - Dec 2023",
      "tech_used": ["Python", "AWS"],
      "responsibilities": ["built X", "improved Y by Z%"]
    }
  ],
  "education": "B.Tech Computer Science, XYZ University 2023",
  "certifications": ["AWS Certified", "Google Cloud"]
}"""

        user_prompt = f"Parse this resume completely — extract every project, library, skill, and experience:\n\n{text[:4000]}"

        raw = _call_groq(system_prompt, user_prompt, max_tokens=2500, temperature=0.1)
        analysis = _safe_json(raw)

        # Calculate question count based on resume richness
        n_projects = len(analysis.get("projects", []))
        n_libs = len(analysis.get("libraries", []))
        n_exp = len(analysis.get("work_experience", []))
        total_q = min(30, max(20, n_projects * 4 + n_libs // 2 + n_exp * 3))

        return {
            "resume_text": text,
            "analysis": analysis,
            "total_questions": total_q,
            "name": analysis.get("name", "Candidate"),
            "summary": analysis.get("summary", "Resume analyzed"),
            "experience_years": analysis.get("experience_years", 0),
            "current_role": analysis.get("current_role", ""),
            "languages": analysis.get("languages", []),
            "frameworks": analysis.get("frameworks", []),
            "libraries": analysis.get("libraries", []),
            "databases": analysis.get("databases", []),
            "tools": analysis.get("tools", []),
            "cloud": analysis.get("cloud", []),
            "skills": analysis.get("skills", []),
            "projects": analysis.get("projects", []),
            "work_experience": analysis.get("work_experience", []),
            "education": analysis.get("education", ""),
            "certifications": analysis.get("certifications", []),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume processing error: {str(e)}")


@router.post("/resume-question")
def generate_resume_question(
    payload: ResumeQuestionRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        category = Q_CATEGORIES[payload.question_index % len(Q_CATEGORIES)]
        instruction = CATEGORY_INSTRUCTIONS.get(category, "Ask a relevant technical question")
        analysis = payload.resume_analysis

        # Build rich context from analysis
        projects_str = "\n".join(
            f"  Project: {p.get('name','')}\n"
            f"  What it does: {p.get('description','')}\n"
            f"  Tech used: {', '.join(p.get('tech_used', []))}\n"
            f"  Libraries: {', '.join(p.get('libraries_used', []))}\n"
            f"  Candidate's role: {p.get('your_role','')}\n"
            f"  Key features: {', '.join(p.get('key_features', []))}"
            for p in analysis.get("projects", [])
        ) or "No projects listed"

        experience_str = "\n".join(
            f"  {e.get('role','')} at {e.get('company','')} ({e.get('duration','')})\n"
            f"  Tech: {', '.join(e.get('tech_used', []))}\n"
            f"  Did: {'; '.join(e.get('responsibilities', [])[:3])}"
            for e in analysis.get("work_experience", [])
        ) or "No experience listed"

        prev = "\n".join(f"- {q}" for q in payload.previous_questions[-10:]) or "None"

        system_prompt = f"""You are a senior technical interviewer doing a deep resume-based interview.

CURRENT TASK: {instruction}

Generate ONE MCQ question that references SPECIFIC items from the candidate's resume.
Return ONLY valid JSON:
{{
  "question": "Specific question referencing their actual project/library/skill?",
  "type": "{category}",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correct_answer": "A) option1",
  "explanation": "Why this is correct, referencing their resume context."
}}

RULES:
- MUST reference specific project names, library names, or company names from their resume
- Test real understanding — not just definitions
- Wrong options must be plausible
- Return ONLY JSON"""

        user_prompt = f"""CANDIDATE: {analysis.get('name','')} | {analysis.get('current_role','')} | {analysis.get('experience_years',0)} years

LANGUAGES: {', '.join(analysis.get('languages', []))}
FRAMEWORKS: {', '.join(analysis.get('frameworks', []))}
LIBRARIES: {', '.join(analysis.get('libraries', []))}
DATABASES: {', '.join(analysis.get('databases', []))}
TOOLS: {', '.join(analysis.get('tools', []))}
CLOUD: {', '.join(analysis.get('cloud', []))}
SKILLS: {', '.join(analysis.get('skills', []))}

PROJECTS:
{projects_str}

WORK EXPERIENCE:
{experience_str}

Question {payload.question_index + 1}/{payload.total_questions} | Category: {category}

Already asked (DO NOT repeat these):
{prev}

Generate the question JSON now."""

        raw = _call_groq(system_prompt, user_prompt, max_tokens=900, temperature=0.75)
        data = _safe_json(raw)

        options = data.get("options", [])
        if not isinstance(options, list) or len(options) != 4:
            options = ["A) Option A", "B) Option B", "C) Option C", "D) Option D"]
        correct = data.get("correct_answer", options[0])
        if correct not in options:
            correct = options[0]

        return {
            "question": data.get("question", "What technology from your resume are you most proficient in?"),
            "type": category,
            "category_label": category.replace("_", " ").title(),
            "options": options,
            "correct_answer": correct,
            "explanation": data.get("explanation", "Based on your resume."),
        }

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI error: {str(e)}")
