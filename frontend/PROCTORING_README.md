# AI Face Detection Setup

## Models Downloaded ✅

All face-api.js models are now in `public/models/`:
- **Tiny Face Detector** - Fast face detection (193KB)
- **Face Landmark 68** - Facial landmark detection for glasses (357KB)
- **Face Recognition** - Advanced face analysis (6.4MB)

## Features Enabled

### 1. Multi-Face Detection
- Detects 0 to multiple faces
- Lower threshold (0.3) for better detection with glasses/masks
- Real-time canvas overlay with bounding boxes

### 2. Glasses/Spectacles Detection
- Uses facial landmarks (68 points)
- Analyzes eye regions to confirm face visibility
- Glasses are ALLOWED (no violation)

### 3. Phone Detection
- Analyzes brightness patterns near face
- Detects rectangular bright objects (phone screens)
- Triggers critical violation

### 4. Performance Optimized
- Checks every 4 seconds (not every frame)
- Uses TinyFaceDetector for speed
- Samples pixels for phone detection

## How It Works

```javascript
// 1. Load models on camera start
await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
await faceapi.nets.faceLandmark68Net.loadFromUri('/models')

// 2. Detect faces every 4 seconds
const detections = await faceapi
  .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
  .withFaceLandmarks()

// 3. Analyze results
if (detections.length === 0) → "no-face" violation
if (detections.length > 1) → "multiple-faces" violation
if (phoneDetected) → "phone-detected" violation (critical)
```

## Violation Severity

- **Critical**: Phone detected (trust -15%)
- **High**: Multiple faces, Tab switch, Fullscreen exit (trust -10%)
- **Medium**: No face detected (trust -5%)

## If Models Fail to Load

The system gracefully falls back to basic monitoring mode with no AI detection.

## Redownload Models (if needed)

```bash
node download-models.js
```
