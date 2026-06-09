from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func
from pathlib import Path
from app.core.database import get_db
from app.models.user import User, InterviewSession, PerformanceReport
from app.core.config import settings

router = APIRouter(tags=["Dashboard"])

templates = Jinja2Templates(directory=str(Path(__file__).parent.parent / "templates"))

DOMAIN_META = {
    "frontend":     {"label": "Frontend",    "icon": "🎨", "color": "#6366f1"},
    "backend":      {"label": "Backend",     "icon": "⚙️",  "color": "#22c55e"},
    "fullstack":    {"label": "Full Stack",  "icon": "🔧", "color": "#06b6d4"},
    "data_analyst": {"label": "Data Analyst","icon": "📊", "color": "#eab308"},
    "devops":       {"label": "DevOps",      "icon": "🚀", "color": "#f97316"},
    "hr":           {"label": "HR",          "icon": "🤝", "color": "#ec4899"},
}

ENDPOINTS = [
    {"method": "POST", "path": "/api/auth/register",               "desc": "Register new user"},
    {"method": "POST", "path": "/api/auth/login",                  "desc": "Login & get JWT token"},
    {"method": "GET",  "path": "/api/auth/me",                     "desc": "Get current user"},
    {"method": "POST", "path": "/api/auth/forgot-password",        "desc": "Request password reset"},
    {"method": "POST", "path": "/api/auth/reset-password",         "desc": "Reset password with token"},
    {"method": "POST", "path": "/api/interview/start-interview",   "desc": "Create interview session"},
    {"method": "POST", "path": "/api/interview/generate-question", "desc": "AI generates next question"},
    {"method": "POST", "path": "/api/interview/submit-answer",     "desc": "Submit & evaluate answer"},
    {"method": "POST", "path": "/api/interview/feedback",          "desc": "Generate final report"},
    {"method": "GET",  "path": "/api/interview/history",           "desc": "Get session history"},
]


def _score_color(score: float) -> str:
    if score >= 7: return "#22c55e"
    if score >= 5: return "#eab308"
    return "#ef4444"


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)):
    # ── Core stats ──
    total_users     = db.query(func.count(User.id)).scalar() or 0
    total_sessions  = db.query(func.count(InterviewSession.id)).scalar() or 0
    active_sessions = db.query(func.count(InterviewSession.id)).filter(InterviewSession.status == "active").scalar() or 0
    completed_sessions = db.query(func.count(InterviewSession.id)).filter(InterviewSession.status == "completed").scalar() or 0

    avg_score_raw = db.query(func.avg(InterviewSession.total_score)).filter(
        InterviewSession.status == "completed", InterviewSession.total_score > 0
    ).scalar() or 0
    avg_score = round(float(avg_score_raw), 1)

    hire_count = db.query(func.count(PerformanceReport.id)).filter(PerformanceReport.recommendation == "hire").scalar() or 0
    hire_rate  = round((hire_count / completed_sessions * 100) if completed_sessions else 0, 1)

    stats = {
        "total_users": total_users,
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "completed_sessions": completed_sessions,
        "avg_score": avg_score,
        "hire_rate": hire_rate,
        "hire_count": hire_count,
    }

    # ── Domain stats ──
    domain_rows = db.query(
        InterviewSession.domain,
        func.count(InterviewSession.id).label("cnt"),
        func.avg(InterviewSession.total_score).label("avg")
    ).group_by(InterviewSession.domain).all()

    max_cnt = max((r.cnt for r in domain_rows), default=1)
    domain_stats = []
    for r in domain_rows:
        meta = DOMAIN_META.get(r.domain, {"label": r.domain, "icon": "💼", "color": "#6366f1"})
        domain_stats.append({
            "label": meta["label"], "icon": meta["icon"], "color": meta["color"],
            "count": r.cnt,
            "pct": round(r.cnt / max_cnt * 100),
            "avg_score": round(float(r.avg or 0), 1),
        })

    # ── Domain chart ──
    domain_chart = {
        "labels": [DOMAIN_META.get(r.domain, {"label": r.domain})["label"] for r in domain_rows] or ["No data"],
        "data":   [r.cnt for r in domain_rows] or [1],
        "colors": [DOMAIN_META.get(r.domain, {"color": "#6366f1"})["color"] for r in domain_rows] or ["#6366f1"],
    }

    # ── Score distribution chart (buckets 0-2, 2-4, 4-6, 6-8, 8-10) ──
    all_scores = db.query(InterviewSession.total_score).filter(
        InterviewSession.status == "completed", InterviewSession.total_score > 0
    ).all()
    buckets = [0, 0, 0, 0, 0]
    for (s,) in all_scores:
        idx = min(int(s / 2), 4)
        buckets[idx] += 1
    score_chart = {
        "labels": ["0–2", "2–4", "4–6", "6–8", "8–10"],
        "data": buckets,
    }

    # ── Recent sessions ──
    recent = db.query(InterviewSession).order_by(InterviewSession.started_at.desc()).limit(20).all()
    sessions = []
    for s in recent:
        score = round(s.total_score, 1)
        rec = s.performance.recommendation if s.performance else None
        meta = DOMAIN_META.get(s.domain, {"icon": "💼"})
        sessions.append({
            "id": s.id,
            "user_name":  s.user.name  if s.user else "—",
            "user_email": s.user.email if s.user else "—",
            "user_initial": (s.user.name[0].upper() if s.user else "?"),
            "domain":      s.domain,
            "domain_icon": meta["icon"],
            "difficulty":  s.difficulty,
            "questions_asked": s.questions_asked,
            "score":       score,
            "score_pct":   round(score * 10),
            "score_color": _score_color(score),
            "status":      s.status,
            "recommendation": rec,
            "started_at":  s.started_at.strftime("%b %d, %H:%M") if s.started_at else "—",
        })

    # ── Users ──
    all_users = db.query(User).order_by(User.created_at.desc()).all()
    users = []
    for u in all_users:
        completed = [s for s in u.sessions if s.status == "completed" and s.total_score > 0]
        avg = round(sum(s.total_score for s in completed) / len(completed), 1) if completed else 0.0
        best = round(max((s.total_score for s in completed), default=0.0), 1)
        users.append({
            "id": u.id,
            "name":  u.name,
            "email": u.email,
            "initial": u.name[0].upper(),
            "session_count": len(u.sessions),
            "avg_score":  avg,
            "best_score": best,
            "joined": u.created_at.strftime("%b %d, %Y") if u.created_at else "—",
        })

    return templates.TemplateResponse("dashboard.html", {
        "request":      request,
        "app_name":     settings.APP_NAME,
        "stats":        stats,
        "domain_stats": domain_stats,
        "domain_chart": domain_chart,
        "score_chart":  score_chart,
        "sessions":     sessions,
        "users":        users,
        "endpoints":    ENDPOINTS,
    })
