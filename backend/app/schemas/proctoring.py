"""
Proctoring verification and detection schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ═══ VERIFICATION SCHEMAS ═══════════════════════════════════════════════════
class VerificationCheckResult(BaseModel):
    """Single verification check result"""
    check_type: Literal["face", "lighting", "accessories", "devices", "environment"]
    passed: bool
    confidence: float = Field(ge=0.0, le=1.0)
    message: str
    detected_issues: List[str] = []
    timestamp: datetime


class StartVerificationRequest(BaseModel):
    """Start pre-exam verification"""
    session_id: int


class StartVerificationResponse(BaseModel):
    """Verification session started"""
    session_id: int
    verification_id: str
    status: Literal["verification_started"]
    required_checks: List[str]
    message: str


class SubmitVerificationFrameRequest(BaseModel):
    """Submit frame for verification analysis"""
    session_id: int
    verification_id: str
    frame_data: str  # base64 image
    check_type: Literal["face", "lighting", "accessories", "devices", "environment"]


class SubmitVerificationFrameResponse(BaseModel):
    """Verification frame analysis result"""
    check_type: str
    passed: bool
    confidence: float
    message: str
    detected_objects: List[str] = []
    recommendations: List[str] = []


class CompleteVerificationRequest(BaseModel):
    """Complete verification and start exam"""
    session_id: int
    verification_id: str


class CompleteVerificationResponse(BaseModel):
    """Verification completion result"""
    session_id: int
    verification_passed: bool
    checks_completed: List[VerificationCheckResult]
    failed_checks: List[str]
    can_start_exam: bool
    message: str


# ═══ REAL-TIME DETECTION SCHEMAS ════════════════════════════════════════════
class DetectionFrameRequest(BaseModel):
    """Submit frame for real-time proctoring detection"""
    session_id: int
    frame_data: str  # base64 image
    timestamp: datetime


class DetectionResult(BaseModel):
    """AI detection result"""
    detection_type: Literal["face", "person", "phone", "accessories", "gaze", "audio"]
    detected: bool
    confidence: float
    count: Optional[int] = None
    details: Optional[str] = None
    bbox: Optional[List[float]] = None  # [x, y, width, height]


class DetectionFrameResponse(BaseModel):
    """Frame analysis response"""
    session_id: int
    timestamp: datetime
    detections: List[DetectionResult]
    violations: List[str]
    trust_score_delta: float  # Change in trust score
    warnings: List[str]
    actions: List[Literal["warning", "pause", "terminate"]]


# ═══ VIOLATION SCHEMAS ══════════════════════════════════════════════════════
class CreateViolationRequest(BaseModel):
    """Create violation record"""
    session_id: int
    violation_type: Literal[
        "no_face", "multiple_faces", "phone_detected", "tab_switch",
        "fullscreen_exit", "accessories_detected", "looking_away",
        "audio_detected", "screen_sharing", "external_monitor"
    ]
    severity: Literal["low", "medium", "high", "critical"]
    description: str
    confidence: Optional[float] = None
    evidence_data: Optional[str] = None  # base64 screenshot
    detected_objects: Optional[List[str]] = None


class ViolationResponse(BaseModel):
    """Violation creation response"""
    violation_id: int
    session_id: int
    timestamp: datetime
    trust_score: float
    trust_level: Literal["high", "medium", "low", "critical"]
    action_taken: Optional[Literal["warning", "pause", "terminate"]] = None


# ═══ ADMIN LIVE MONITORING ══════════════════════════════════════════════════
class LiveSessionMonitorRequest(BaseModel):
    """Admin live session monitoring request"""
    session_id: int


class LiveSessionStatus(BaseModel):
    """Live session status for admin"""
    session_id: int
    student_name: str
    student_email: str
    domain: str
    difficulty: str
    status: Literal["verification", "active", "paused", "completed", "terminated"]
    current_question_index: int
    questions_answered: int
    elapsed_seconds: int
    trust_score: float
    trust_level: str
    recent_violations: List[dict]
    live_snapshot: Optional[str] = None  # base64 latest frame


class AdminControlRequest(BaseModel):
    """Admin exam control"""
    session_id: int
    action: Literal["pause", "resume", "terminate", "send_warning"]
    reason: str
    admin_note: Optional[str] = None


class AdminControlResponse(BaseModel):
    """Admin control response"""
    session_id: int
    action_taken: str
    success: bool
    message: str
    timestamp: datetime
