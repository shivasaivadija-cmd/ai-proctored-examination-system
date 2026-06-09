"""
Test MediaPipe with NEW API (0.10.30+)
"""
import sys

print("="*80)
print("TESTING MEDIAPIPE 0.10.30+ (NEW API)")
print("="*80)

# Test 1: Import
print("\n[TEST 1] Importing mediapipe...")
try:
    import mediapipe as mp
    print(f"[OK] Version: {mp.__version__}")
except Exception as e:
    print(f"[FAIL] {e}")
    sys.exit(1)

# Test 2: Check available APIs
print("\n[TEST 2] Checking available APIs...")
print(f"  Has 'solutions': {hasattr(mp, 'solutions')}")
print(f"  Has 'tasks': {hasattr(mp, 'tasks')}")
print(f"  Available: {[x for x in dir(mp) if not x.startswith('_')]}")

print("\n" + "="*80)
print("MediaPipe 0.10.30+ uses 'tasks' API, not 'solutions'")
print("Your code needs migration OR use mediapipe < 0.10.8")
print("="*80)
