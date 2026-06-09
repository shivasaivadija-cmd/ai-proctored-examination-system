from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DifficultyLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class InterviewDomain(str, enum.Enum):
    frontend = "frontend"
    backend = "backend"
    data_analyst = "data_analyst"
    hr = "hr"
    fullstack = "fullstack"
    devops = "devops"


# ─── User ──────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Integer, default=0)          # 0=student  1=admin
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete")


# ─── Interview Session ──────────────────────────────────────────────────────────
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    domain = Column(String(50), nullable=False)
    difficulty = Column(String(20), nullable=False)
    status = Column(String(20), default="pending")  # pending → active → paused → completed → terminated
    total_score = Column(Float, default=0.0)
    questions_asked = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")
    questions = relationship("Question", back_populates="session", cascade="all, delete")
    performance = relationship("PerformanceReport", back_populates="session", uselist=False, cascade="all, delete")
    violations = relationship("ProctoringViolation", back_populates="session", cascade="all, delete")
    verification = relationship("VerificationSession", back_populates="session", uselist=False, cascade="all, delete")


# ─── Question ──────────────────────────────────────────────────────────────────
class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(30), default="technical")
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("InterviewSession", back_populates="questions")
    answer = relationship("Answer", back_populates="question", uselist=False, cascade="all, delete")


# ─── Answer ────────────────────────────────────────────────────────────────────
class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    answer_text = Column(Text, nullable=False)
    score = Column(Float, default=0.0)
    ai_feedback = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    improvements = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("Question", back_populates="answer")


# ─── Proctoring Violation ──────────────────────────────────────────────────────
class ProctoringViolation(Base):
    __tablename__ = "proctoring_violations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    violation_type = Column(String(50), nullable=False)   # phone | no_face | multiple_faces | tab_switch
    severity = Column(String(20), default="medium")        # low | medium | high
    description = Column(Text, nullable=True)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("InterviewSession", back_populates="violations")


# ─── Performance Report ─────────────────────────────────────────────────────────
class PerformanceReport(Base):
    __tablename__ = "performance_reports"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, default=0.0)
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    problem_solving_score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    key_strengths = Column(Text, nullable=True)
    areas_to_improve = Column(Text, nullable=True)
    recommendation = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("InterviewSession", back_populates="performance")


# ─── Verification Session ───────────────────────────────────────────────────────
class VerificationSession(Base):
    __tablename__ = "verification_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    verification_id = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(String(20), default="in_progress")  # in_progress | completed | failed
    required_checks = Column(Text, nullable=False)  # JSON array of check types
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    session = relationship("InterviewSession", back_populates="verification")
    checks = relationship("VerificationCheck", back_populates="verification_session", cascade="all, delete")


# ─── Verification Check ─────────────────────────────────────────────────────────
class VerificationCheck(Base):
    __tablename__ = "verification_checks"

    id = Column(Integer, primary_key=True, index=True)
    verification_session_id = Column(Integer, ForeignKey("verification_sessions.id", ondelete="CASCADE"), nullable=False)
    check_type = Column(String(50), nullable=False)  # face | lighting | accessories | devices | environment
    passed = Column(Integer, default=0)  # 0=failed, 1=passed
    confidence = Column(Float, default=0.0)
    message = Column(Text, nullable=True)
    details = Column(Text, nullable=True)  # JSON with detection details
    checked_at = Column(DateTime(timezone=True), server_default=func.now())

    verification_session = relationship("VerificationSession", back_populates="checks")
