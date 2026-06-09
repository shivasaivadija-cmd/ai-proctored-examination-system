"""
AI-powered verification and detection service
Uses OpenCV Haar Cascades (no MediaPipe dependency issues)
"""
import cv2
import numpy as np
import base64
from typing import Dict
from datetime import datetime
from collections import defaultdict, deque


class ProctoringAIService:
    """
    OpenCV-based proctoring service (no MediaPipe required)
    """
    
    def __init__(self):
        print("[AI SERVICE] Initializing ProctoringAIService...")
        try:
            # Load OpenCV Haar Cascade classifiers
            print("[AI SERVICE] Loading OpenCV Haar Cascades...")
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            print("[AI SERVICE] [OK] Face and eye detectors loaded")
            
            self.detection_history = defaultdict(lambda: deque(maxlen=5))
            
            self.THRESHOLDS = {
                "brightness_min": 30,  # Reduced from 40 for dim offices
                "brightness_max": 230,  # Increased from 220 for bright offices
                "face_size_min": 0.05,  # Reduced from 0.10 - much more lenient
                "face_size_max": 0.90,  # Increased from 0.80 - allow closer faces
                "looking_away_threshold": 0.3,
                "phone_confidence": 0.6,
                "person_confidence": 0.5,
            }
            print("[AI SERVICE] [OK] Initialization complete")
        except Exception as e:
            print(f"[AI SERVICE] [FAIL] INITIALIZATION FAILED: {str(e)}")
            raise
    
    
    def verify_face(self, frame: np.ndarray) -> Dict:
        """Verify face presence using OpenCV Haar Cascades"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        print(f"[FACE DETECTION] Detected {len(faces)} faces")
        
        if len(faces) == 0:
            print("[FACE DETECTION] FAIL: No face detected")
            return {
                "passed": False,
                "confidence": 0.9,
                "message": "No face detected. Please position yourself in front of the camera.",
                "face_count": 0,
                "details": "NO_FACE"
            }
        
        if len(faces) > 1:
            print(f"[FACE DETECTION] FAIL: Multiple faces ({len(faces)})")
            return {
                "passed": False,
                "confidence": 1.0,
                "message": f"{len(faces)} faces detected. Only one person allowed.",
                "face_count": len(faces),
                "details": "MULTIPLE_FACES"
            }
        
        # Check face size
        x, y, w, h = faces[0]
        frame_h, frame_w = frame.shape[:2]
        face_area = (w * h) / (frame_w * frame_h)
        
        print(f"[FACE DETECTION] Face size: {w}x{h}, Frame: {frame_w}x{frame_h}, Area ratio: {face_area:.3f}")
        print(f"[FACE DETECTION] Thresholds: min={self.THRESHOLDS['face_size_min']}, max={self.THRESHOLDS['face_size_max']}")
        
        if face_area < self.THRESHOLDS["face_size_min"]:
            print(f"[FACE DETECTION] FAIL: Face too small ({face_area:.3f} < {self.THRESHOLDS['face_size_min']})")
            return {
                "passed": False,
                "confidence": 0.9,
                "message": "Face too small. Please move closer to the camera.",
                "face_count": 1,
                "details": "FACE_TOO_FAR"
            }
        
        if face_area > self.THRESHOLDS["face_size_max"]:
            print(f"[FACE DETECTION] FAIL: Face too close ({face_area:.3f} > {self.THRESHOLDS['face_size_max']})")
            return {
                "passed": False,
                "confidence": 0.9,
                "message": "Face too close. Please move back from the camera.",
                "face_count": 1,
                "details": "FACE_TOO_CLOSE"
            }
        
        print(f"[FACE DETECTION] PASS: Face verified (area={face_area:.3f})")
        return {
            "passed": True,
            "confidence": 0.9,
            "message": "Face detected successfully.",
            "face_count": 1,
            "details": "FACE_VERIFIED",
            "bbox": [x/frame_w, y/frame_h, w/frame_w, h/frame_h]
        }
    
    
    def verify_lighting(self, frame: np.ndarray) -> Dict:
        """Check lighting conditions"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        avg_brightness = np.mean(gray)
        overexposed_ratio = np.sum(gray > 240) / gray.size
        underexposed_ratio = np.sum(gray < 20) / gray.size
        
        if avg_brightness < self.THRESHOLDS["brightness_min"]:
            return {
                "passed": False,
                "confidence": 0.9,
                "message": "Environment too dark. Please improve lighting.",
                "brightness_level": round(avg_brightness, 1),
                "details": "TOO_DARK"
            }
        
        if avg_brightness > self.THRESHOLDS["brightness_max"]:
            return {
                "passed": False,
                "confidence": 0.9,
                "message": "Environment too bright. Reduce lighting or close curtains.",
                "brightness_level": round(avg_brightness, 1),
                "details": "TOO_BRIGHT"
            }
        
        if overexposed_ratio > 0.3:
            return {
                "passed": False,
                "confidence": 0.85,
                "message": "Overexposed areas detected. Adjust lighting angle.",
                "brightness_level": round(avg_brightness, 1),
                "details": "OVEREXPOSED"
            }
        
        if underexposed_ratio > 0.3:
            return {
                "passed": False,
                "confidence": 0.85,
                "message": "Underexposed areas detected. Add more light sources.",
                "brightness_level": round(avg_brightness, 1),
                "details": "UNDEREXPOSED"
            }
        
        return {
            "passed": True,
            "confidence": 0.95,
            "message": "Lighting conditions optimal.",
            "brightness_level": round(avg_brightness, 1),
            "details": "LIGHTING_OK"
        }
    
    
    def detect_accessories(self, frame: np.ndarray) -> Dict:
        """Detect prohibited accessories (simplified)"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            return {
                "passed": True,
                "confidence": 0.5,
                "message": "Unable to detect accessories (no face detected).",
                "detected_items": []
            }
        
        x, y, w, h = faces[0]
        face_roi = gray[y:y+h, x:x+w]
        eyes = self.eye_cascade.detectMultiScale(face_roi)
        
        detected_accessories = []
        
        # Check if eyes are not visible (sunglasses/mask)
        if len(eyes) == 0:
            detected_accessories.append("sunglasses_or_mask")
        
        if detected_accessories:
            items_str = ", ".join(detected_accessories).replace("_", " ").title()
            return {
                "passed": False,
                "confidence": 0.75,
                "message": f"Prohibited accessories detected: {items_str}. Please remove them.",
                "detected_items": detected_accessories
            }
        
        return {
            "passed": True,
            "confidence": 0.80,
            "message": "No prohibited accessories detected.",
            "detected_items": []
        }
    
    
    def detect_devices(self, frame: np.ndarray) -> Dict:
        """Detect devices (simplified)"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = frame.shape[:2]
        
        detected_devices = []
        
        # Detect bright rectangular objects (phones/tablets)
        _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if 500 < area < 50000:
                x, y, cw, ch = cv2.boundingRect(contour)
                aspect_ratio = cw / ch if ch > 0 else 0
                
                if (0.4 <= aspect_ratio <= 0.7) or (1.4 <= aspect_ratio <= 2.5):
                    if y > h * 0.5:
                        detected_devices.append("mobile_phone")
                        break
        
        if detected_devices:
            items_str = ", ".join(detected_devices).replace("_", " ").title()
            return {
                "passed": False,
                "confidence": 0.70,
                "message": f"Prohibited devices detected: {items_str}. Please remove them from view.",
                "detected_items": detected_devices
            }
        
        return {
            "passed": True,
            "confidence": 0.75,
            "message": "No prohibited devices detected.",
            "detected_items": []
        }
    
    
    def scan_environment(self, frame: np.ndarray) -> Dict:
        """Scan environment for multiple people"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        detected_issues = []
        person_count = len(faces)
        
        if person_count > 1:
            detected_issues.append(f"{person_count} people detected in frame")
        
        # Detect multiple screens
        _, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        large_bright_regions = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 10000:
                x, y, cw, ch = cv2.boundingRect(contour)
                aspect_ratio = cw / ch if ch > 0 else 0
                if 1.2 <= aspect_ratio <= 2.5:
                    large_bright_regions += 1
        
        if large_bright_regions > 1:
            detected_issues.append("Multiple screens detected")
        
        if detected_issues:
            return {
                "passed": False,
                "confidence": 0.80,
                "message": "Environment issues detected: " + "; ".join(detected_issues),
                "person_count": person_count,
                "issues": detected_issues
            }
        
        return {
            "passed": True,
            "confidence": 0.85,
            "message": "Environment scan complete. No issues detected.",
            "person_count": person_count,
            "issues": []
        }
    
    
    def detect_realtime_violations(self, frame: np.ndarray, session_id: int) -> Dict:
        """Real-time violation detection"""
        violations = []
        warnings = []
        
        face_result = self.verify_face(frame)
        if not face_result["passed"]:
            if face_result["face_count"] == 0:
                violations.append({
                    "type": "no_face",
                    "severity": "medium",
                    "confidence": 1.0,
                    "message": "Candidate not visible in camera"
                })
            elif face_result["face_count"] > 1:
                violations.append({
                    "type": "multiple_faces",
                    "severity": "critical",
                    "confidence": 1.0,
                    "message": f"{face_result['face_count']} people detected"
                })
        
        device_result = self.detect_devices(frame)
        if not device_result["passed"]:
            if "mobile_phone" in device_result["detected_items"]:
                violations.append({
                    "type": "phone_detected",
                    "severity": "critical",
                    "confidence": 0.75,
                    "message": "Mobile phone detected in frame"
                })
        
        lighting_result = self.verify_lighting(frame)
        if not lighting_result["passed"]:
            warnings.append({
                "type": "lighting_issue",
                "severity": "low",
                "confidence": lighting_result["confidence"],
                "message": lighting_result["message"]
            })
        
        return {
            "violations": violations,
            "warnings": warnings,
            "timestamp": datetime.utcnow().isoformat(),
            "frame_analysis_complete": True
        }


def base64_to_frame(base64_data: str) -> np.ndarray:
    """Convert base64 image to OpenCV frame"""
    try:
        print(f"[BASE64] Decoding frame, data length: {len(base64_data)}")
        if "base64," in base64_data:
            base64_data = base64_data.split("base64,")[1]
        
        img_bytes = base64.b64decode(base64_data)
        print(f"[BASE64] Decoded bytes: {len(img_bytes)}")
        
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            print("[BASE64] [FAIL] cv2.imdecode returned None")
            raise ValueError("Failed to decode image")
        
        print(f"[BASE64] [OK] Frame decoded: {frame.shape}")
        return frame
    except Exception as e:
        print(f"[BASE64] [FAIL] Error: {str(e)}")
        raise


def frame_to_base64(frame: np.ndarray) -> str:
    """Convert OpenCV frame to base64"""
    _, buffer = cv2.imencode('.jpg', frame)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{img_base64}"


_ai_service_instance = None

def get_ai_service() -> ProctoringAIService:
    """Get singleton AI service instance"""
    global _ai_service_instance
    if _ai_service_instance is None:
        print("[AI SERVICE] Creating singleton instance...")
        _ai_service_instance = ProctoringAIService()
    else:
        print("[AI SERVICE] Reusing existing instance")
    return _ai_service_instance
