from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
    user_id: int
    is_admin: int = 0


# ─── Interview Session ─────────────────────────────────────────────────────────
class StartInterviewRequest(BaseModel):
    domain: str
    difficulty: str


class StartInterviewResponse(BaseModel):
    session_id: int
    domain: str
    difficulty: str
    message: str


# ─── Question ─────────────────────────────────────────────────────────────────
class GenerateQuestionRequest(BaseModel):
    session_id: int


class QuestionResponse(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    order_index: int
    options: List[str]       # 4 MCQ options ["A) ...", "B) ...", "C) ...", "D) ..."]
    correct_answer: str      # e.g. "A) Virtual DOM is..."
    explanation: str         # why the correct answer is correct


# ─── Answer / Evaluation ──────────────────────────────────────────────────────
class SubmitAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    answer_text: str         # the option text the user selected


class AnswerEvaluationResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    score: float             # 10 if correct, 0 if wrong
    feedback: str


# ─── Feedback / Report ────────────────────────────────────────────────────────
class FeedbackRequest(BaseModel):
    session_id: int


class QuestionResult(BaseModel):
    question_text: str
    question_type: str
    options: List[str]
    user_answer: str
    correct_answer: str
    explanation: str
    is_correct: bool


class PerformanceReportResponse(BaseModel):
    session_id: int
    overall_score: float
    technical_score: Optional[float]
    communication_score: Optional[float]
    problem_solving_score: Optional[float]
    summary: str
    key_strengths: List[str]
    areas_to_improve: List[str]
    recommendation: str
    domain: str
    difficulty: str
    questions_asked: int
    correct_count: int
    wrong_count: int
    duration_minutes: Optional[float]
    question_results: List[QuestionResult]
    trust_score: Optional[float] = None
    trust_level: Optional[str] = None
    trust_note: Optional[str] = None
    violation_count: Optional[int] = None


# ─── History ──────────────────────────────────────────────────────────────────
class SessionHistoryItem(BaseModel):
    session_id: int
    domain: str
    difficulty: str
    status: str
    total_score: float
    questions_asked: int
    started_at: datetime
    ended_at: Optional[datetime]
    recommendation: Optional[str]

    class Config:
        from_attributes = True
