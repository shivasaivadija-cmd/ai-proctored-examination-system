"""
Quick test to verify MediaPipe installation
Run: python test_mediapipe.py
"""
import sys

print("="*80)
print("TESTING MEDIAPIPE INSTALLATION")
print("="*80)

# Test 1: Import MediaPipe
print("\n[TEST 1] Importing mediapipe...")
try:
    import mediapipe as mp
    print("[OK] mediapipe imported successfully")
    print(f"  Version: {mp.__version__}")
except Exception as e:
    print(f"[FAIL] Failed to import mediapipe: {e}")
    sys.exit(1)

# Test 2: Initialize Face Detection
print("\n[TEST 2] Initializing Face Detection...")
try:
    face_detection = mp.solutions.face_detection.FaceDetection(
        model_selection=1,
        min_detection_confidence=0.5
    )
    print("[OK] Face Detection initialized")
except Exception as e:
    print(f"[FAIL] Failed to initialize Face Detection: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Initialize Face Mesh
print("\n[TEST 3] Initializing Face Mesh...")
try:
    face_mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=3,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    print("[OK] Face Mesh initialized")
except Exception as e:
    print(f"[FAIL] Failed to initialize Face Mesh: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Create dummy frame
print("\n[TEST 4] Testing with dummy frame...")
try:
    import cv2
    import numpy as np
    
    # Create a blank image (480x640 RGB)
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    dummy_frame[:, :] = (100, 100, 100)  # Gray background
    
    # Convert to RGB
    rgb_frame = cv2.cvtColor(dummy_frame, cv2.COLOR_BGR2RGB)
    
    # Try processing
    results = face_detection.process(rgb_frame)
    print("[OK] Face detection processing works")
    print(f"  Faces detected: {len(results.detections) if results.detections else 0}")
    
    mesh_results = face_mesh.process(rgb_frame)
    print("[OK] Face mesh processing works")
    print(f"  Faces detected: {len(mesh_results.multi_face_landmarks) if mesh_results.multi_face_landmarks else 0}")
    
except Exception as e:
    print(f"[FAIL] Frame processing failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "="*80)
print("[SUCCESS] ALL TESTS PASSED - MediaPipe is working correctly!")
print("="*80)
