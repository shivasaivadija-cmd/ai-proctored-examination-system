"""
Proctoring Verification API
Pre-exam verification workflow + Real-time monitoring
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, InterviewSession, ProctoringViolation, VerificationSession, VerificationCheck
from app.schemas.proctoring import (
    StartVerificationRequest, StartVerificationResponse,
    SubmitVerificationFrameRequest, SubmitVerificationFrameResponse,
    CompleteVerificationRequest, CompleteVerificationResponse,
    DetectionFrameRequest, DetectionFrameResponse,
    CreateViolationRequest, ViolationResponse,
    LiveSessionStatus, AdminControlRequest, AdminControlResponse,
    VerificationCheckResult
)
from app.services.verification_ai import get_ai_service, base64_to_frame
from datetime import datetime
import uuid
import json

router = APIRouter(prefix="/api/verification", tags=["Verification & Proctoring"])


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: START VERIFICATION WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/start", response_model=StartVerificationResponse)
def start_verification(
    payload: StartVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start pre-exam verification workflow
    Creates verification session with required checks
    """
    # Verify session exists and belongs to user
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "pending"  # New status: pending verification
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found or not in pending state"
        )
    
    # Create verification session
    verification_id = str(uuid.uuid4())
    verification = VerificationSession(
        session_id=session.id,
        verification_id=verification_id,
        status="in_progress",
        required_checks=json.dumps([
            "face", "lighting", "accessories", "devices", "environment"
        ]),
        started_at=datetime.utcnow()
    )
    
    db.add(verification)
    db.commit()
    db.refresh(verification)
    
    return StartVerificationResponse(
        session_id=session.id,
        verification_id=verification_id,
        status="verification_started",
        required_checks=["face", "lighting", "accessories", "devices", "environment"],
        message="Verification workflow started. Complete all checks to begin exam."
    )


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2-6: SUBMIT VERIFICATION FRAMES (Face, Lighting, Accessories, Devices, Environment)
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/check", response_model=SubmitVerificationFrameResponse)
async def submit_verification_frame(
    payload: SubmitVerificationFrameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit frame for specific verification check
    AI analyzes frame and returns pass/fail result
    """
    print(f"\n{'='*80}")
    print(f"[VERIFICATION API] New check request: {payload.check_type}")
    print(f"[VERIFICATION API] User: {current_user.email}")
    print(f"[VERIFICATION API] Verification ID: {payload.verification_id}")
    
    try:
        # Verify verification session exists
        print("[VERIFICATION API] Step 1: Checking verification session...")
        verification = db.query(VerificationSession).filter(
            VerificationSession.verification_id == payload.verification_id,
            VerificationSession.status == "in_progress"
        ).first()
        
        if not verification:
            print("[VERIFICATION API] ✗ Verification session not found")
            raise HTTPException(status_code=404, detail="Verification session not found or already completed")
        print(f"[VERIFICATION API] ✓ Verification session found: ID={verification.id}")
        
        # Verify session belongs to user
        print("[VERIFICATION API] Step 2: Checking session ownership...")
        session = db.query(InterviewSession).filter(
            InterviewSession.id == verification.session_id,
            InterviewSession.user_id == current_user.id
        ).first()
        
        if not session:
            print("[VERIFICATION API] ✗ Unauthorized access")
            raise HTTPException(status_code=403, detail="Unauthorized")
        print(f"[VERIFICATION API] ✓ Session authorized: ID={session.id}")
        
        # Convert base64 to frame
        print("[VERIFICATION API] Step 3: Decoding frame...")
        try:
            frame = base64_to_frame(payload.frame_data)
            if frame is None:
                raise ValueError("Invalid frame data")
            print(f"[VERIFICATION API] ✓ Frame decoded successfully: {frame.shape}")
        except Exception as e:
            print(f"[VERIFICATION API] ✗ Frame decode error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
        
        # Get AI service
        print("[VERIFICATION API] Step 4: Getting AI service...")
        try:
            ai_service = get_ai_service()
            print("[VERIFICATION API] ✓ AI service ready")
        except Exception as e:
            print(f"[VERIFICATION API] ✗ AI service initialization failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI service unavailable: {str(e)}")
        
        # Run appropriate check
        print(f"[VERIFICATION API] Step 5: Running {payload.check_type} check...")
        result = None
        
        try:
            if payload.check_type == "face":
                result = ai_service.verify_face(frame)
            elif payload.check_type == "lighting":
                result = ai_service.verify_lighting(frame)
            elif payload.check_type == "accessories":
                result = ai_service.detect_accessories(frame)
            elif payload.check_type == "devices":
                result = ai_service.detect_devices(frame)
            elif payload.check_type == "environment":
                result = ai_service.scan_environment(frame)
            else:
                raise HTTPException(status_code=400, detail="Invalid check_type")
            
            print(f"[VERIFICATION API] ✓ Check completed: passed={result['passed']}")
        except Exception as e:
            print(f"[VERIFICATION API] ✗ Check execution failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Check failed: {str(e)}")
        
        # Save check result
        print("[VERIFICATION API] Step 6: Saving check result...")
        check = VerificationCheck(
            verification_session_id=verification.id,
            check_type=payload.check_type,
            passed=result["passed"],
            confidence=result["confidence"],
            message=result["message"],
            details=json.dumps(result),
            checked_at=datetime.utcnow()
        )
        
        db.add(check)
        db.commit()
        print(f"[VERIFICATION API] ✓ Check result saved: ID={check.id}")
        
        # Prepare response
        detected_objects = []
        recommendations = []
        
        if "detected_items" in result:
            detected_objects = result["detected_items"]
        elif "issues" in result:
            detected_objects = result["issues"]
        
        if not result["passed"]:
            # Generate recommendations based on failure
            if payload.check_type == "face":
                if result.get("details") == "NO_FACE":
                    recommendations = ["Position yourself in front of the camera", "Ensure camera is not blocked"]
                elif result.get("details") == "MULTIPLE_FACES":
                    recommendations = ["Ensure only one person is in frame", "Ask others to leave the room"]
                elif result.get("details") == "FACE_TOO_FAR":
                    recommendations = ["Move closer to the camera", "Adjust camera position"]
                elif result.get("details") == "FACE_TOO_CLOSE":
                    recommendations = ["Move back from camera", "Adjust your seating position"]
            
            elif payload.check_type == "lighting":
                if result.get("details") == "TOO_DARK":
                    recommendations = ["Turn on room lights", "Open curtains", "Use desk lamp"]
                elif result.get("details") == "TOO_BRIGHT":
                    recommendations = ["Close curtains", "Turn off direct lights", "Adjust window blinds"]
            
            elif payload.check_type == "accessories":
                recommendations = [f"Remove {item}" for item in detected_objects]
            
            elif payload.check_type == "devices":
                recommendations = [f"Remove {item} from view" for item in detected_objects]
                recommendations.append("Place devices outside camera range")
            
            elif payload.check_type == "environment":
                recommendations = ["Ensure you are alone in the room", "Remove additional screens", "Choose a quiet location"]
        
        print(f"[VERIFICATION API] ✓ Response prepared successfully")
        print(f"{'='*80}\n")
        
        return SubmitVerificationFrameResponse(
            check_type=payload.check_type,
            passed=result["passed"],
            confidence=result["confidence"],
            message=result["message"],
            detected_objects=detected_objects,
            recommendations=recommendations
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[VERIFICATION API] ✗ FATAL ERROR: {str(e)}")
        print(traceback.format_exc())
        print(f"{'='*80}\n")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: COMPLETE VERIFICATION & START EXAM
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/complete", response_model=CompleteVerificationResponse)
def complete_verification(
    payload: CompleteVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Complete verification and authorize exam start
    All checks must pass before exam can begin
    """
    # Get verification session
    verification = db.query(VerificationSession).filter(
        VerificationSession.verification_id == payload.verification_id
    ).first()
    
    if not verification:
        raise HTTPException(status_code=404, detail="Verification session not found")
    
    # Verify ownership
    session = db.query(InterviewSession).filter(
        InterviewSession.id == verification.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Get all checks
    checks = db.query(VerificationCheck).filter(
        VerificationCheck.verification_session_id == verification.id
    ).all()
    
    # Analyze results
    required_checks = json.loads(verification.required_checks)
    completed_checks = {check.check_type: check for check in checks}
    
    checks_completed = []
    failed_checks = []
    
    for check_type in required_checks:
        if check_type in completed_checks:
            check = completed_checks[check_type]
            checks_completed.append(
                VerificationCheckResult(
                    check_type=check.check_type,
                    passed=check.passed,
                    confidence=check.confidence,
                    message=check.message,
                    detected_issues=json.loads(check.details).get("detected_items", []),
                    timestamp=check.checked_at
                )
            )
            
            if not check.passed:
                failed_checks.append(check_type)
        else:
            failed_checks.append(check_type)
    
    # Determine if all checks passed
    verification_passed = len(failed_checks) == 0
    
    if verification_passed:
        # Update verification status
        verification.status = "completed"
        verification.completed_at = datetime.utcnow()
        
        # Update session status to active
        session.status = "active"
        
        db.commit()
        
        return CompleteVerificationResponse(
            session_id=session.id,
            verification_passed=True,
            checks_completed=checks_completed,
            failed_checks=[],
            can_start_exam=True,
            message="✓ All verification checks passed. You may now start the exam."
        )
    else:
        return CompleteVerificationResponse(
            session_id=session.id,
            verification_passed=False,
            checks_completed=checks_completed,
            failed_checks=failed_checks,
            can_start_exam=False,
            message=f"Verification incomplete. Failed checks: {', '.join(failed_checks)}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# REAL-TIME MONITORING: SUBMIT FRAME FOR VIOLATION DETECTION
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/detect", response_model=DetectionFrameResponse)
async def detect_violations_realtime(
    payload: DetectionFrameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Real-time violation detection during exam
    Submit frames continuously (every 2-3 seconds)
    """
    # Verify session
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id,
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "active"
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")
    
    # Convert frame
    try:
        frame = base64_to_frame(payload.frame_data)
        if frame is None:
            raise ValueError("Invalid frame")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")
    
    # Run AI detection
    ai_service = get_ai_service()
    detection_result = ai_service.detect_realtime_violations(frame, session.id)
    
    # Process violations
    violations_to_report = []
    trust_score_delta = 0.0
    actions = []
    
    for violation in detection_result["violations"]:
        # Create violation record
        v = ProctoringViolation(
            session_id=session.id,
            violation_type=violation["type"],
            severity=violation["severity"],
            description=violation["message"]
        )
        db.add(v)
        
        violations_to_report.append(violation["type"])
        
        # Calculate trust score impact
        if violation["severity"] == "critical":
            trust_score_delta -= 15
            actions.append("pause")
        elif violation["severity"] == "high":
            trust_score_delta -= 10
            actions.append("warning")
        elif violation["severity"] == "medium":
            trust_score_delta -= 5
            actions.append("warning")
    
    # Process warnings (don't create violations, just warn)
    warnings = [w["message"] for w in detection_result["warnings"]]
    
    db.commit()
    
    # Convert detections to response format
    from app.schemas.proctoring import DetectionResult
    
    detections = []
    
    # Add face detection
    if detection_result["violations"]:
        for v in detection_result["violations"]:
            if v["type"] in ["no_face", "multiple_faces"]:
                detections.append(DetectionResult(
                    detection_type="face",
                    detected=True,
                    confidence=v["confidence"],
                    details=v["message"]
                ))
            elif v["type"] == "phone_detected":
                detections.append(DetectionResult(
                    detection_type="phone",
                    detected=True,
                    confidence=v["confidence"],
                    details=v["message"]
                ))
    
    return DetectionFrameResponse(
        session_id=session.id,
        timestamp=datetime.utcnow(),
        detections=detections,
        violations=violations_to_report,
        trust_score_delta=trust_score_delta,
        warnings=warnings,
        actions=list(set(actions))
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN: LIVE SESSION MONITORING
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/admin/live/{session_id}", response_model=LiveSessionStatus)
def get_live_session_status(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get live status of ongoing exam session (admin only)
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get recent violations (last 10)
    recent_violations = db.query(ProctoringViolation).filter(
        ProctoringViolation.session_id == session_id
    ).order_by(ProctoringViolation.detected_at.desc()).limit(10).all()
    
    violations_list = [{
        "type": v.violation_type,
        "severity": v.severity,
        "description": v.description,
        "time": v.detected_at.isoformat() if v.detected_at else None
    } for v in recent_violations]
    
    # Calculate trust score
    from app.services.trust import calculate_trust
    trust = calculate_trust(session.violations)
    
    # Calculate elapsed time
    elapsed_seconds = 0
    if session.started_at:
        elapsed_seconds = int((datetime.utcnow() - session.started_at.replace(tzinfo=None)).total_seconds())
    
    return LiveSessionStatus(
        session_id=session.id,
        student_name=session.user.name if session.user else "Unknown",
        student_email=session.user.email if session.user else "Unknown",
        domain=session.domain,
        difficulty=session.difficulty,
        status=session.status,
        current_question_index=session.questions_asked,
        questions_answered=session.questions_asked,
        elapsed_seconds=elapsed_seconds,
        trust_score=trust["trust_score"],
        trust_level=trust["trust_level"],
        recent_violations=violations_list
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN: CONTROL EXAM (PAUSE / RESUME / TERMINATE)
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/admin/control", response_model=AdminControlResponse)
def admin_control_exam(
    payload: AdminControlRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin controls: pause, resume, terminate exam or send warning
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    action_taken = payload.action
    success = True
    message = ""
    
    if payload.action == "pause":
        if session.status == "active":
            session.status = "paused"
            message = f"Exam paused by admin. Reason: {payload.reason}"
        else:
            success = False
            message = "Cannot pause - exam not active"
    
    elif payload.action == "resume":
        if session.status == "paused":
            session.status = "active"
            message = "Exam resumed by admin"
        else:
            success = False
            message = "Cannot resume - exam not paused"
    
    elif payload.action == "terminate":
        if session.status in ["active", "paused"]:
            session.status = "terminated"
            session.ended_at = datetime.utcnow()
            message = f"Exam terminated by admin. Reason: {payload.reason}"
        else:
            success = False
            message = "Cannot terminate - exam not active"
    
    elif payload.action == "send_warning":
        # Create warning violation
        v = ProctoringViolation(
            session_id=session.id,
            violation_type="admin_warning",
            severity="medium",
            description=f"Admin warning: {payload.reason}"
        )
        db.add(v)
        message = "Warning sent to candidate"
    
    if success:
        db.commit()
    
    return AdminControlResponse(
        session_id=session.id,
        action_taken=action_taken,
        success=success,
        message=message,
        timestamp=datetime.utcnow()
    )
