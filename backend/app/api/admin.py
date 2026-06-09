"""
Admin API — student performance, proctoring violations, session details
Only accessible by users with is_admin=1
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, InterviewSession, ProctoringViolation, PerformanceReport, Answer, Question
from app.services.trust import calculate_trust
from pydantic import BaseModel
from typing import Optional
import asyncio

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


class ViolationPayload(BaseModel):
    session_id: int
    violation_type: str   # phone | no_face | multiple_faces | tab_switch
    severity: str = "medium"
    description: Optional[str] = None


# ── Report violation (called from frontend proctoring) ────────────────────────
@router.post("/violation")
async def report_violation(
    payload: ViolationPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    v = ProctoringViolation(
        session_id=payload.session_id,
        violation_type=payload.violation_type,
        severity=payload.severity,
        description=payload.description,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    db.refresh(session)
    trust = calculate_trust(session.violations)

    # Broadcast to any admin WebSocket watchers
    from app.api.interview import broadcast_violation
    violation_data = {
        "violation_id":   v.id,
        "session_id":     payload.session_id,
        "student_name":   current_user.name,
        "violation_type": payload.violation_type,
        "severity":       payload.severity,
        "description":    payload.description,
        "detected_at":    v.detected_at.isoformat() if v.detected_at else None,
        **trust,
    }
    asyncio.create_task(broadcast_violation(payload.session_id, violation_data))

    return {"status": "recorded", "violation_id": v.id, **trust}


# ── Admin: overview stats ─────────────────────────────────────────────────────
@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    total_students = db.query(func.count(User.id)).filter(User.is_admin == 0).scalar() or 0
    total_sessions = db.query(func.count(InterviewSession.id)).scalar() or 0
    completed = db.query(func.count(InterviewSession.id)).filter(InterviewSession.status == "completed").scalar() or 0
    active = db.query(func.count(InterviewSession.id)).filter(InterviewSession.status == "active").scalar() or 0

    avg_score = db.query(func.avg(InterviewSession.total_score)).filter(
        InterviewSession.status == "completed", InterviewSession.total_score > 0
    ).scalar() or 0

    hire_count = db.query(func.count(PerformanceReport.id)).filter(PerformanceReport.recommendation == "hire").scalar() or 0
    total_violations = db.query(func.count(ProctoringViolation.id)).scalar() or 0
    phone_violations = db.query(func.count(ProctoringViolation.id)).filter(ProctoringViolation.violation_type == "phone").scalar() or 0
    high_violations = db.query(func.count(ProctoringViolation.id)).filter(ProctoringViolation.severity == "high").scalar() or 0

    return {
        "total_students": total_students,
        "total_sessions": total_sessions,
        "completed_sessions": completed,
        "active_sessions": active,
        "avg_score": round(float(avg_score), 1),
        "hire_count": hire_count,
        "hire_rate": round(hire_count / completed * 100, 1) if completed else 0,
        "total_violations": total_violations,
        "phone_violations": phone_violations,
        "high_severity_violations": high_violations,
    }


# ── Admin: all students ───────────────────────────────────────────────────────
@router.get("/students")
def admin_students(db: Session = Depends(get_db), admin=Depends(require_admin)):
    students = db.query(User).filter(User.is_admin == 0).order_by(User.created_at.desc()).all()
    result = []
    for u in students:
        sessions = u.sessions
        completed_s = [s for s in sessions if s.status == "completed" and s.total_score > 0]
        avg = round(sum(s.total_score for s in completed_s) / len(completed_s), 1) if completed_s else 0.0
        best = round(max((s.total_score for s in completed_s), default=0.0), 1)
        total_violations = sum(len(s.violations) for s in sessions)
        phone_v = sum(1 for s in sessions for v in s.violations if v.violation_type == "phone")
        last_session = max(sessions, key=lambda s: s.started_at, default=None) if sessions else None
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "joined": u.created_at.isoformat() if u.created_at else None,
            "total_sessions": len(sessions),
            "completed_sessions": len(completed_s),
            "avg_score": avg,
            "best_score": best,
            "total_violations": total_violations,
            "trust_score": round(sum(calculate_trust(s.violations)["trust_score"] for s in sessions) / len(sessions), 1) if sessions else 100,
            "phone_violations": phone_v,
            "last_active": last_session.started_at.isoformat() if last_session else None,
            "hire_count": sum(1 for s in sessions if s.performance and s.performance.recommendation == "hire"),
        })
    return result


# ── Admin: all sessions ───────────────────────────────────────────────────────
@router.get("/sessions")
def admin_sessions(db: Session = Depends(get_db), admin=Depends(require_admin)):
    sessions = db.query(InterviewSession).order_by(InterviewSession.started_at.desc()).limit(200).all()
    result = []
    for s in sessions:
        rec = s.performance.recommendation if s.performance else None
        violations = [{"type": v.violation_type, "severity": v.severity, "detected_at": v.detected_at.isoformat()} for v in s.violations]
        trust = calculate_trust(s.violations)
        result.append({
            **trust,
            "session_id": s.id,
            "student_name": s.user.name if s.user else "—",
            "student_email": s.user.email if s.user else "—",
            "student_id": s.user_id,
            "domain": s.domain,
            "difficulty": s.difficulty,
            "status": s.status,
            "total_score": round(s.total_score, 1),
            "questions_asked": s.questions_asked,
            "recommendation": rec,
            "violations": violations,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        })
    return result


# ── Admin: all violations ─────────────────────────────────────────────────────
@router.get("/violations")
def admin_violations(db: Session = Depends(get_db), admin=Depends(require_admin)):
    violations = db.query(ProctoringViolation).order_by(ProctoringViolation.detected_at.desc()).limit(500).all()
    result = []
    for v in violations:
        s = v.session
        result.append({
            "id": v.id,
            "session_id": v.session_id,
            "student_name": s.user.name if s and s.user else "—",
            "student_email": s.user.email if s and s.user else "—",
            "domain": s.domain if s else "—",
            "violation_type": v.violation_type,
            "severity": v.severity,
            "description": v.description,
            "detected_at": v.detected_at.isoformat() if v.detected_at else None,
        })
    return result


# ── Admin: student detail ─────────────────────────────────────────────────────
@router.get("/student/{student_id}")
def admin_student_detail(student_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(User).filter(User.id == student_id, User.is_admin == 0).first()
    if not u:
        raise HTTPException(status_code=404, detail="Student not found")

    sessions_out = []
    for s in sorted(u.sessions, key=lambda x: x.started_at, reverse=True):
        rec = s.performance.recommendation if s.performance else None
        violations = [{"type": v.violation_type, "severity": v.severity, "detected_at": v.detected_at.isoformat()} for v in s.violations]
        trust = calculate_trust(s.violations)
        sessions_out.append({
            **trust,
            "session_id": s.id,
            "domain": s.domain,
            "difficulty": s.difficulty,
            "status": s.status,
            "total_score": round(s.total_score, 1),
            "questions_asked": s.questions_asked,
            "recommendation": rec,
            "violations": violations,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        })

    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "joined": u.created_at.isoformat() if u.created_at else None,
        "sessions": sessions_out,
    }


# ── Admin: make a user admin (by email) ──────────────────────────────────────
@router.post("/make-admin")
def make_admin(email: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = 1
    db.commit()
    return {"message": f"{user.name} is now an admin"}
