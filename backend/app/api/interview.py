import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, decode_token
from app.models.user import User, InterviewSession, Question, Answer, PerformanceReport, ProctoringViolation
from app.schemas.interview import (
    StartInterviewRequest, StartInterviewResponse,
    GenerateQuestionRequest, QuestionResponse,
    SubmitAnswerRequest, AnswerEvaluationResponse,
    FeedbackRequest, PerformanceReportResponse, QuestionResult,
)
from app.services import ai_service
from app.services.question_bank import get_instant_question
from app.services.proctoring_ws import proctoring_manager
from app.services.trust import calculate_trust

router = APIRouter(prefix="/api/interview", tags=["Interview"])
MAX_QUESTIONS = 20

# ── Active WebSocket connections for real-time admin proctoring ───────────────
# Maps session_id -> list of admin WebSocket connections watching it
def _parse_question_meta(question: Question) -> dict:
    raw = question.question_type or "technical"
    if "|||" in raw:
        q_type, meta_json = raw.split("|||", 1)
        try:
            meta = json.loads(meta_json)
            return {
                "type":           q_type,
                "options":        meta.get("options", []),
                "correct_answer": meta.get("correct_answer", ""),
                "explanation":    meta.get("explanation", ""),
            }
        except Exception:
            pass
    return {"type": raw, "options": [], "correct_answer": "", "explanation": ""}


def _save_question(db: Session, session_id: int, mcq: dict, order_index: int) -> Question:
    meta = json.dumps({"options": mcq["options"], "correct_answer": mcq["correct_answer"], "explanation": mcq["explanation"]})
    q = Question(
        session_id=session_id,
        question_text=mcq["question"],
        question_type=f"{mcq['type']}|||{meta}",
        order_index=order_index,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


def _question_payload(q: Question) -> dict:
    meta = _parse_question_meta(q)
    return {
        "question_id": q.id,
        "question_text": q.question_text,
        "question_type": meta["type"],
        "order_index": q.order_index,
        "options": meta["options"],
        "correct_answer": meta["correct_answer"],
        "explanation": meta["explanation"],
    }


def _verify_admin_ws(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_admin:
        return None
    return user


# ═══════════════════════════════════════════════════════════════════════════════
# START INTERVIEW
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/start-interview", response_model=StartInterviewResponse)
def start_interview(payload: StartInterviewRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    session = InterviewSession(
        user_id=current_user.id, domain=payload.domain,
        difficulty=payload.difficulty, status="pending",  # Start in pending, verification required
    )
    db.add(session); db.commit(); db.refresh(session)
    return StartInterviewResponse(
        session_id=session.id, domain=session.domain, difficulty=session.difficulty,
        message=f"Interview session created. Please complete verification to start exam.",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PREFETCH — Generate up to 5 questions in parallel (async)
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/prefetch-questions")
async def prefetch_questions(payload: GenerateQuestionRequest, db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    """Pre-generate 5 questions in parallel for instant exam flow."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session or session.status not in ["pending", "active"]:
        raise HTTPException(status_code=404, detail="Session not found or inactive")

    existing_questions = db.query(Question).filter(
        Question.session_id == session.id
    ).order_by(Question.order_index.asc()).all()
    existing_count = len(existing_questions)
    remaining = MAX_QUESTIONS - existing_count

    unanswered = [
        q for q in existing_questions
        if not db.query(Answer).filter(Answer.question_id == q.id).first()
    ]
    if len(unanswered) >= 5 or remaining <= 0:
        questions = unanswered[:5]
        return {"questions": [_question_payload(q) for q in questions], "count": len(questions)}

    batch_size = min(5 - len(unanswered), remaining)
    existing_texts = {q.question_text for q in existing_questions}
    seen_texts = set(existing_texts)
    next_order = max((q.order_index for q in existing_questions), default=-1) + 1

    mcqs = []
    for i in range(batch_size):
        candidate = get_instant_question(
            domain=session.domain,
            difficulty=session.difficulty,
            question_index=next_order + i,
            session_id=session.id,
        )
        if candidate["question"] not in seen_texts:
            mcqs.append(candidate)
            seen_texts.add(candidate["question"])

    if len(mcqs) < batch_size:
        ai_mcqs = await ai_service.generate_questions_batch(
            domain=session.domain, difficulty=session.difficulty,
            previous_questions=list(seen_texts), start_index=next_order + len(mcqs),
            count=batch_size - len(mcqs), session_id=session.id,
        )
        mcqs.extend(ai_mcqs)

    saved = []
    for mcq in mcqs:
        if mcq["question"] in existing_texts or mcq["question"] in {q.question_text for q in saved}:
            continue
        q = _save_question(db, session.id, mcq, next_order + len(saved))
        saved.append(q)

    questions = (unanswered + saved)[:5]
    return {"questions": [_question_payload(q) for q in questions], "count": len(questions)}


# ═══════════════════════════════════════════════════════════════════════════════
# GENERATE SINGLE QUESTION
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/generate-question", response_model=QuestionResponse)
def generate_question(payload: GenerateQuestionRequest, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status not in ["pending", "active"]:
        raise HTTPException(status_code=400, detail="Interview session is not active")

    existing_questions = db.query(Question).filter(
        Question.session_id == session.id
    ).order_by(Question.order_index.asc()).all()
    for existing in existing_questions:
        if not db.query(Answer).filter(Answer.question_id == existing.id).first():
            return QuestionResponse(**_question_payload(existing))

    existing_count = len(existing_questions)
    if existing_count >= MAX_QUESTIONS:
        raise HTTPException(status_code=400, detail="Maximum questions reached")

    prev_texts = [q.question_text for q in existing_questions]

    # Try question bank first (instant), fall back to AI
    mcq = None
    for attempt in range(5):
        candidate = get_instant_question(
            domain=session.domain, difficulty=session.difficulty,
            question_index=existing_count + attempt, session_id=session.id,
        )
        if candidate["question"] not in prev_texts:
            mcq = candidate
            break

    if mcq is None:
        mcq = ai_service.generate_question(
            domain=session.domain, difficulty=session.difficulty,
            previous_questions=prev_texts, question_index=existing_count,
            session_id=session.id,
        )

    next_order = max((q.order_index for q in existing_questions), default=-1) + 1
    q = _save_question(db, session.id, mcq, next_order)

    return QuestionResponse(**_question_payload(q))


# ═══════════════════════════════════════════════════════════════════════════════
# SUBMIT ANSWER
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/submit-answer", response_model=AnswerEvaluationResponse)
def submit_answer(payload: SubmitAnswerRequest, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    question = db.query(Question).filter(
        Question.id == payload.question_id,
        Question.session_id == payload.session_id,
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if not payload.answer_text.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    meta = _parse_question_meta(question)
    evaluation = ai_service.evaluate_mcq_answer(
        question=question.question_text,
        user_answer=payload.answer_text,
        correct_answer=meta["correct_answer"],
        explanation=meta["explanation"],
    )

    existing = db.query(Answer).filter(Answer.question_id == question.id).first()
    if existing:
        existing.answer_text = payload.answer_text
        existing.score = evaluation["score"]
        existing.ai_feedback = evaluation["feedback"]
    else:
        db.add(Answer(
            question_id=question.id,
            answer_text=payload.answer_text,
            score=evaluation["score"],
            ai_feedback=evaluation["feedback"],
            strengths=json.dumps([evaluation["correct_answer"]]),
            improvements=json.dumps([evaluation["explanation"]]),
        ))
        session.questions_asked += 1

    all_answers = db.query(Answer).join(Question).filter(Question.session_id == session.id).all()
    if all_answers:
        session.total_score = sum(a.score for a in all_answers) / len(all_answers)

    db.commit()

    return AnswerEvaluationResponse(
        is_correct=evaluation["is_correct"],
        correct_answer=evaluation["correct_answer"],
        explanation=evaluation["explanation"],
        score=evaluation["score"],
        feedback=evaluation["feedback"],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# FEEDBACK / FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/feedback", response_model=PerformanceReportResponse)
def generate_feedback(payload: FeedbackRequest, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    qa_pairs, question_results = [], []
    for q in session.questions:
        if not q.answer:
            continue
        meta = _parse_question_meta(q)
        is_correct = q.answer.score >= 9.0
        qa_pairs.append({
            "question": q.question_text, "answer": q.answer.answer_text,
            "score": q.answer.score, "is_correct": is_correct,
            "correct_answer": meta["correct_answer"],
        })
        question_results.append(QuestionResult(
            question_text=q.question_text, question_type=meta["type"],
            options=meta["options"], user_answer=q.answer.answer_text,
            correct_answer=meta["correct_answer"], explanation=meta["explanation"],
            is_correct=is_correct,
        ))

    if not qa_pairs:
        raise HTTPException(status_code=400, detail="No answers submitted yet")

    violations = db.query(ProctoringViolation).filter(
        ProctoringViolation.session_id == session.id
    ).all()
    trust = calculate_trust(violations)

    try:
        report_data = ai_service.generate_performance_report(
            domain=session.domain, difficulty=session.difficulty,
            qa_pairs=qa_pairs, violation_count=trust["violation_count"],
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")

    correct_count = sum(1 for r in question_results if r.is_correct)
    session.status = "completed"
    session.ended_at = datetime.utcnow()
    session.total_score = report_data.get("overall_score", session.total_score)

    perf = PerformanceReport(
        session_id=session.id,
        overall_score=report_data.get("overall_score", 0),
        technical_score=report_data.get("technical_score"),
        communication_score=report_data.get("communication_score"),
        problem_solving_score=report_data.get("problem_solving_score"),
        summary=report_data.get("summary", ""),
        key_strengths=json.dumps(report_data.get("key_strengths", [])),
        areas_to_improve=json.dumps(report_data.get("areas_to_improve", [])),
        recommendation=report_data.get("recommendation", "consider"),
    )
    db.add(perf); db.commit()

    duration = None
    if session.ended_at and session.started_at:
        started = session.started_at.replace(tzinfo=None) if session.started_at.tzinfo else session.started_at
        duration = round(abs((session.ended_at - started).total_seconds()) / 60, 1)

    return PerformanceReportResponse(
        session_id=session.id,
        overall_score=perf.overall_score,
        technical_score=perf.technical_score,
        communication_score=perf.communication_score,
        problem_solving_score=perf.problem_solving_score,
        summary=perf.summary,
        key_strengths=json.loads(perf.key_strengths or "[]"),
        areas_to_improve=json.loads(perf.areas_to_improve or "[]"),
        recommendation=perf.recommendation,
        domain=session.domain,
        difficulty=session.difficulty,
        questions_asked=session.questions_asked,
        correct_count=correct_count,
        wrong_count=len(question_results) - correct_count,
        duration_minutes=duration,
        question_results=question_results,
        trust_score=trust["trust_score"],
        trust_level=trust["trust_level"],
        trust_note=report_data.get("trust_note") or trust["trust_note"],
        violation_count=trust["violation_count"],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET — Real-time proctoring stream (admin watches a session live)
# ═══════════════════════════════════════════════════════════════════════════════
@router.websocket("/ws/proctor/{session_id}")
async def proctor_websocket(websocket: WebSocket, session_id: int,
                            token: str = None, db: Session = Depends(get_db)):
    """Admin connects here to watch a session's violations in real-time."""
    if not _verify_admin_ws(token, db):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await proctoring_manager.connect_session(session_id, websocket)
    try:
        while True:
            # Keep alive — ping every 30s
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        proctoring_manager.disconnect_session(session_id, websocket)


async def broadcast_violation(session_id: int, violation_data: dict):
    """Broadcast a new violation to all admin watchers of this session."""
    await proctoring_manager.broadcast_violation(session_id, violation_data)


@router.websocket("/ws/proctor")
async def proctor_global_websocket(websocket: WebSocket, token: str = None, db: Session = Depends(get_db)):
    """Admin-wide live violation stream."""
    if not _verify_admin_ws(token, db):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await proctoring_manager.connect_global(websocket)
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        proctoring_manager.disconnect_global(websocket)


# ═══════════════════════════════════════════════════════════════════════════════
# HISTORY + SESSION DETAILS
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/history")
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.started_at.desc()).all()

    return [{
        **calculate_trust(s.violations),
        "session_id":      s.id,
        "domain":          s.domain,
        "difficulty":      s.difficulty,
        "status":          s.status,
        "questions_asked": s.questions_asked,
        "total_score":     round(s.total_score, 1),
        "recommendation":  s.performance.recommendation if s.performance else None,
        "started_at":      s.started_at.isoformat() if s.started_at else None,
        "ended_at":        s.ended_at.isoformat() if s.ended_at else None,
    } for s in sessions]


@router.get("/session/{session_id}")
def get_session_details(session_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = []
    for q in session.questions:
        meta = _parse_question_meta(q)
        qd = {
            "question_id": q.id, "question_text": q.question_text,
            "question_type": meta["type"], "order_index": q.order_index,
            "options": meta["options"], "correct_answer": meta["correct_answer"],
            "explanation": meta["explanation"],
            "user_answer": None, "is_correct": None, "score": None,
        }
        if q.answer:
            qd["user_answer"] = q.answer.answer_text
            qd["is_correct"] = q.answer.score >= 9.0
            qd["score"] = q.answer.score
        questions.append(qd)

    return {
        **calculate_trust(session.violations),
        "session_id": session.id, "domain": session.domain,
        "difficulty": session.difficulty, "status": session.status,
        "questions_asked": session.questions_asked,
        "total_score": round(session.total_score, 1),
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "questions": questions,
    }


@router.get("/question/{question_id}", response_model=QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    question = db.query(Question).join(InterviewSession).filter(
        Question.id == question_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    meta = _parse_question_meta(question)
    return QuestionResponse(
        question_id=question.id, question_text=question.question_text,
        question_type=meta["type"], order_index=question.order_index,
        options=meta["options"], correct_answer=meta["correct_answer"],
        explanation=meta["explanation"],
    )
