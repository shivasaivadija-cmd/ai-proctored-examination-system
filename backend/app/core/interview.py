import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, InterviewSession, Question, Answer, PerformanceReport
from app.schemas.interview import (
    StartInterviewRequest, StartInterviewResponse,
    GenerateQuestionRequest, QuestionResponse,
    SubmitAnswerRequest, AnswerEvaluationResponse,
    FeedbackRequest, PerformanceReportResponse, QuestionResult,
    SessionHistoryItem,
)
from app.services import ai_service

router = APIRouter(prefix="/api/interview", tags=["Interview"])
MAX_QUESTIONS = 8


@router.post("/start-interview", response_model=StartInterviewResponse)
def start_interview(payload: StartInterviewRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    session = InterviewSession(
        user_id=current_user.id, domain=payload.domain,
        difficulty=payload.difficulty, status="active",
    )
    db.add(session); db.commit(); db.refresh(session)
    return StartInterviewResponse(
        session_id=session.id, domain=session.domain, difficulty=session.difficulty,
        message=f"Interview started! Domain: {session.domain}, Difficulty: {session.difficulty}",
    )


@router.post("/generate-question", response_model=QuestionResponse)
def generate_question(payload: GenerateQuestionRequest, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Interview session is not active")
    if session.questions_asked >= MAX_QUESTIONS:
        raise HTTPException(status_code=400, detail="Maximum questions reached — please submit feedback")

    prev = [q.question_text for q in session.questions]

    try:
        mcq = ai_service.generate_question(
            domain=session.domain, difficulty=session.difficulty,
            previous_questions=prev, question_index=session.questions_asked,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")

    # Store options, correct_answer, explanation in question_text as JSON metadata
    # We use separate fields via the Text column — store extra data in ai_feedback-like field
    question = Question(
        session_id=session.id,
        question_text=mcq["question"],
        question_type=mcq["type"],
        order_index=session.questions_asked,
        # Store MCQ metadata as JSON in a dedicated column via strengths field workaround
        # We'll store it in question_text as a JSON blob with a marker
    )
    # Store MCQ data as JSON in question_type field extended — use a separate approach:
    # Save options/correct/explanation into the question record using extra JSON
    question.question_type = mcq["type"]
    # We store MCQ metadata in a JSON string appended — use the existing Text columns creatively
    # Best: store as JSON in question_text with separator
    question.question_text = mcq["question"]
    # Store MCQ extra data in ai_feedback of a pre-created Answer placeholder? No.
    # Cleanest: store JSON in question_type as "type|||json"
    mcq_meta = json.dumps({
        "options":        mcq["options"],
        "correct_answer": mcq["correct_answer"],
        "explanation":    mcq["explanation"],
    })
    question.question_type = f"{mcq['type']}|||{mcq_meta}"

    db.add(question)
    session.questions_asked += 1
    db.commit(); db.refresh(question)

    return QuestionResponse(
        question_id=question.id,
        question_text=mcq["question"],
        question_type=mcq["type"],
        order_index=question.order_index,
        options=mcq["options"],
        correct_answer=mcq["correct_answer"],
        explanation=mcq["explanation"],
    )


def _parse_question_meta(question: Question) -> dict:
    """Extract MCQ metadata stored in question_type field."""
    raw_type = question.question_type or "technical"
    if "|||" in raw_type:
        q_type, meta_json = raw_type.split("|||", 1)
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
    return {"type": raw_type, "options": [], "correct_answer": "", "explanation": ""}


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

    meta       = _parse_question_meta(question)
    evaluation = ai_service.evaluate_mcq_answer(
        question=question.question_text,
        user_answer=payload.answer_text,
        correct_answer=meta["correct_answer"],
        explanation=meta["explanation"],
    )

    answer = Answer(
        question_id=question.id,
        answer_text=payload.answer_text,
        score=evaluation["score"],
        ai_feedback=evaluation["feedback"],
        strengths=json.dumps([evaluation["correct_answer"]]),
        improvements=json.dumps([evaluation["explanation"]]),
    )
    db.add(answer)

    # Update running score
    existing = [a.score for q in session.questions for a in ([q.answer] if q.answer else [])]
    existing.append(evaluation["score"])
    session.total_score = sum(existing) / len(existing)
    db.commit()

    return AnswerEvaluationResponse(
        is_correct=evaluation["is_correct"],
        correct_answer=evaluation["correct_answer"],
        explanation=evaluation["explanation"],
        score=evaluation["score"],
        feedback=evaluation["feedback"],
    )


@router.post("/feedback", response_model=PerformanceReportResponse)
def generate_feedback(payload: FeedbackRequest, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    qa_pairs       = []
    question_results = []

    for q in session.questions:
        if not q.answer:
            continue
        meta = _parse_question_meta(q)
        is_correct = q.answer.score >= 9.0  # 10 = correct, 0 = wrong

        qa_pairs.append({
            "question":       q.question_text,
            "answer":         q.answer.answer_text,
            "score":          q.answer.score,
            "is_correct":     is_correct,
            "correct_answer": meta["correct_answer"],
        })
        question_results.append(QuestionResult(
            question_text=q.question_text,
            question_type=meta["type"],
            options=meta["options"],
            user_answer=q.answer.answer_text,
            correct_answer=meta["correct_answer"],
            explanation=meta["explanation"],
            is_correct=is_correct,
        ))

    if not qa_pairs:
        raise HTTPException(status_code=400, detail="No answers submitted yet")

    try:
        report_data = ai_service.generate_performance_report(
            domain=session.domain, difficulty=session.difficulty, qa_pairs=qa_pairs,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")

    correct_count = sum(1 for r in question_results if r.is_correct)
    wrong_count   = len(question_results) - correct_count

    session.status    = "completed"
    session.ended_at  = datetime.utcnow()
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
        wrong_count=wrong_count,
        duration_minutes=duration,
        question_results=question_results,
    )


@router.get("/history", response_model=list[SessionHistoryItem])
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.started_at.desc()).all()

    return [
        SessionHistoryItem(
            session_id=s.id, domain=s.domain, difficulty=s.difficulty,
            status=s.status, total_score=round(s.total_score, 1),
            questions_asked=s.questions_asked, started_at=s.started_at,
            ended_at=s.ended_at,
            recommendation=s.performance.recommendation if s.performance else None,
        )
        for s in sessions
    ]
