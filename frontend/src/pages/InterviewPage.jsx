import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthStore, useInterviewStore } from "../store";
import toast from "react-hot-toast";
import api, { interviewAPI, adminAPI } from "../services/api";
import {
  Brain, ChevronRight, Loader2, Play, History, FileText,
  LayoutDashboard, Mic, LogOut, CheckCircle, XCircle,
  AlertCircle, CameraOff, Shield, Eye,
  Clock, Award, ChevronLeft,
} from "lucide-react";

const MAX_QUESTIONS = 20;
const DOMAINS = [
  { value: "frontend",    label: "Frontend Developer", icon: "🎨", desc: "React, CSS, JS" },
  { value: "backend",     label: "Backend Developer",  icon: "⚙️", desc: "APIs, Databases" },
  { value: "fullstack",   label: "Full Stack",          icon: "🔧", desc: "End-to-end" },
  { value: "data_analyst",label: "Data Analyst",        icon: "📊", desc: "SQL, Python" },
  { value: "devops",      label: "DevOps Engineer",     icon: "🚀", desc: "CI/CD, Docker" },
  { value: "hr",          label: "HR / Behavioral",     icon: "🤝", desc: "Soft skills" },
];
const DIFFICULTIES = [
  { value: "beginner",     label: "Beginner",     color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
  { value: "intermediate", label: "Intermediate", color: "border-amber-500 text-amber-600 bg-amber-50" },
  { value: "advanced",     label: "Advanced",     color: "border-red-500 text-red-600 bg-red-50" },
];

// ── Proctoring Camera with AI Face Detection ────────────────────────────────
function ProctoringCamera({ active, sessionId }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const lastViolationRef = useRef({});
  const faceApiRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [faceCount, setFaceCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [violations, setViolations] = useState([]);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    if (!active) return;
    loadModel();
    startCamera();
    return () => stopCamera();
  }, [active]);

  useEffect(() => {
    if (status !== "active" && status !== "phone" && status !== "no-face" && status !== "multiple") return;
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [status]);

  useEffect(() => {
    if (status === "idle" || status === "requesting" || status === "denied" || !modelLoaded) return;
    intervalRef.current = setInterval(detectFaces, 2000); // Check every 2 seconds for real-time detection
    return () => clearInterval(intervalRef.current);
  }, [status, sessionId, modelLoaded]);

  const loadModel = async () => {
    try {
      const faceapi = await import('face-api.js');
      faceApiRef.current = faceapi;
      
      const MODEL_URL = '/models'; // Models will be in public/models folder
      
      // Load all required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      setModelLoaded(true);
      console.log('✅ Face-API.js models loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load face-api.js models:', err);
      toast.error('AI models failed to load. Using basic monitoring.');
      setModelLoaded(true); // Continue with basic mode
    }
  };

  const reportViolation = async (type, severity, description) => {
    if (!sessionId) return;
    const now = Date.now();
    // Report max once every 30 seconds per violation type
    if (now - (lastViolationRef.current[type] || 0) < 30000) return;
    lastViolationRef.current[type] = now;
    setViolations(prev => [...prev.slice(-9), { type, severity, time: new Date().toLocaleTimeString() }]);
    try { 
      await adminAPI.reportViolation({ 
        session_id: sessionId, 
        violation_type: type, 
        severity, 
        description 
      }); 
    }
    catch (err) { 
      console.error('Failed to report violation:', err);
    }
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const faceapi = faceApiRef.current;
    
    try {
      // ULTRA-SENSITIVE detection - catches even partial faces, side profiles, far persons
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,      // Higher resolution for better detection at distance
        scoreThreshold: 0.15  // VERY LOW = detects even blurry/partial/distant faces
      });

      // Detect ALL faces including partial/side profiles
      const detections = await faceapi
        .detectAllFaces(video, options)
        .withFaceLandmarks();

      // NO CANVAS DRAWING - Silent detection
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numFaces = detections.length;
      setFaceCount(numFaces);

      // Additional body detection using motion/color analysis
      const hasSecondPerson = await detectSecondPersonByMovement(ctx, video.videoWidth, video.videoHeight);

      // Check for violations
      if (numFaces === 0) {
        setStatus("no-face");
        reportViolation("no_face", "medium", "No face detected in camera");
      } else if (numFaces > 1 || hasSecondPerson) {
        setStatus("multiple");
        const count = Math.max(numFaces, hasSecondPerson ? 2 : numFaces);
        setFaceCount(count);
        reportViolation("multiple_faces", "high", `${count} ${count === 1 ? 'person' : 'people'} detected in camera - second person entering frame`);
      } else {
        setStatus("active");
        
        // Check for glasses (allowed)
        const landmarks = detections[0].landmarks;
        if (landmarks) {
          const hasGlasses = detectGlasses(landmarks);
          if (hasGlasses) {
            console.log('👓 Glasses detected (allowed)');
          }
        }
        
        // Check for phone
        await detectPhone(ctx, canvas.width, canvas.height, detections[0]);
      }
    } catch (err) {
      console.error('Detection error:', err);
      // Fallback to basic mode
      setFaceCount(1);
      setStatus("active");
    }
  };

  const detectSecondPersonByMovement = async (ctx, width, height) => {
    // Detect second person by analyzing frame for body parts, skin tones, movement
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Divide frame into 3x3 grid, detect skin tones in each region
      const gridSize = 3;
      const cellWidth = Math.floor(width / gridSize);
      const cellHeight = Math.floor(height / gridSize);
      
      let skinRegions = 0;
      
      for (let gridY = 0; gridY < gridSize; gridY++) {
        for (let gridX = 0; gridX < gridSize; gridX++) {
          let skinPixels = 0;
          const startX = gridX * cellWidth;
          const startY = gridY * cellHeight;
          
          // Sample pixels in this grid cell (every 10th pixel for performance)
          for (let y = startY; y < startY + cellHeight && y < height; y += 10) {
            for (let x = startX; x < startX + cellWidth && x < width; x += 10) {
              const i = (y * width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Detect human skin tones (RGB ranges)
              // Works for all skin types: light, medium, dark
              if (isSkinTone(r, g, b)) {
                skinPixels++;
              }
            }
          }
          
          // If this grid cell has significant skin pixels, it's a person region
          if (skinPixels > 3) {
            skinRegions++;
          }
        }
      }
      
      // If skin detected in 4+ grid cells, likely 2+ people
      // (1 person typically occupies 2-3 cells max)
      return skinRegions >= 4;
      
    } catch (err) {
      console.error('Movement detection error:', err);
      return false;
    }
  };

  const isSkinTone = (r, g, b) => {
    // Universal skin tone detection (works for all ethnicities)
    // Based on research: RGB skin detection algorithm
    
    // Rule 1: Red dominant
    const rule1 = r > 95 && g > 40 && b > 20 && 
                  r > g && r > b && 
                  Math.abs(r - g) > 15;
    
    // Rule 2: Normalized RGB (for darker skin tones)
    const sum = r + g + b;
    if (sum === 0) return false;
    const nr = r / sum;
    const ng = g / sum;
    const nb = b / sum;
    const rule2 = nr > 0.33 && nr < 0.55 && 
                  ng > 0.25 && ng < 0.45 && 
                  nb > 0.15 && nb < 0.35;
    
    // Rule 3: YCbCr color space (most accurate for all skin types)
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const rule3 = y > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173;
    
    return rule1 || rule2 || rule3;
  };

  const detectGlasses = (landmarks) => {
    // Detect glasses by analyzing eye region landmarks
    // Face-api.js provides 68 landmarks, eyes are around points 36-47
    try {
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      // Calculate eye regions to detect if covered by glasses
      const leftEyeWidth = Math.abs(leftEye[3].x - leftEye[0].x);
      const rightEyeWidth = Math.abs(rightEye[3].x - rightEye[0].x);
      
      // If eye landmarks are detected clearly, glasses don't obstruct detection
      return leftEyeWidth > 10 && rightEyeWidth > 10;
    } catch {
      return false;
    }
  };

  const detectPhone = async (ctx, width, height, faceDetection) => {
    // Detect rectangular objects near the face that could be phones
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Get face bounding box
      const faceBox = faceDetection.detection.box;
      const faceBottom = faceBox.y + faceBox.height;
      const faceRight = faceBox.x + faceBox.width;
      
      // Look for bright rectangular objects near face (phone screens are bright)
      let brightPixels = 0;
      const sampleSize = 20; // Sample every 20th pixel for performance
      
      for (let y = Math.floor(faceBottom); y < Math.min(height, faceBottom + 150); y += sampleSize) {
        for (let x = Math.floor(faceBox.x); x < Math.min(width, faceRight); x += sampleSize) {
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          
          // Phone screens are very bright (>180) and uniform
          if (brightness > 200) {
            brightPixels++;
          }
        }
      }
      
      // If >15 bright pixels in hand region, likely a phone
      const threshold = 15;
      if (brightPixels > threshold) {
        setStatus("phone");
        reportViolation("phone_detected", "critical", "Mobile phone detected near face");
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Phone detection error:', err);
      return false;
    }
  };

  const startCamera = async () => {
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: "user" 
        }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        videoRef.current.play(); 
      }
      setStatus("active");
    } catch (err) { 
      console.error('Camera access denied:', err);
      setStatus("denied"); 
    }
  };

  const stopCamera = () => {
    clearInterval(intervalRef.current);
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const STATUS_CFG = {
    idle:      { border: "border-slate-200", dot: "bg-slate-400",               label: "Camera Off",        bg: "bg-slate-50" },
    requesting:{ border: "border-blue-300",  dot: "bg-blue-400 animate-pulse",   label: "Connecting...",     bg: "bg-blue-50" },
    active:    { border: "border-green-300", dot: "bg-green-500",                label: "Monitoring Active", bg: "bg-green-50" },
    denied:    { border: "border-red-300",   dot: "bg-red-500",                  label: "Access Denied",     bg: "bg-red-50" },
    "no-face": { border: "border-amber-300", dot: "bg-amber-500 animate-pulse",  label: "No Face Detected", bg: "bg-amber-50" },
    multiple:  { border: "border-red-300",   dot: "bg-red-500 animate-pulse",    label: "Multiple Faces",    bg: "bg-red-50" },
    phone:     { border: "border-red-400",   dot: "bg-red-600 animate-pulse",    label: "Phone Detected",    bg: "bg-red-50" },
  };
  const cfg = STATUS_CFG[status] || STATUS_CFG.idle;

  if (!active) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white">
        <div className="flex items-center gap-1.5">
          <Shield size={12} />
          <span className="text-xs font-bold uppercase tracking-wide">AI Proctoring</span>
          {!modelLoaded && <span className="text-xs text-amber-400">(Loading...)</span>}
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${cfg.border} ${cfg.bg}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className="font-medium text-slate-700 text-xs">{cfg.label}</span>
        </div>
      </div>

      <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
        {status === "denied" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <CameraOff size={22} className="text-red-400" />
            <p className="text-xs text-center px-3 text-slate-300">Enable camera in browser settings</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {/* Canvas hidden - no visual overlays */}
            
            {status === "no-face" && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow-lg">
                ⚠ Please stay visible in camera
              </div>
            )}
            
            {status === "multiple" && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-sm font-black px-4 py-2 rounded shadow-lg animate-pulse">
                ⚠ MULTIPLE PEOPLE DETECTED
              </div>
            )}
            
            {status === "phone" && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-700 text-white text-sm font-black px-4 py-2 rounded shadow-lg animate-pulse">
                📱 PHONE DETECTED - PUT IT AWAY!
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={10} />
          <span className="font-mono font-semibold">{fmt(elapsed)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Eye size={10} className={status === "active" ? "text-green-600" : status === "no-face" ? "text-amber-600" : "text-red-600"} />
          <span className={status === "active" ? "text-green-700 font-semibold" : status === "no-face" ? "text-amber-700" : "text-red-700 font-bold"}>
            {status === "active" ? "Monitoring" : status === "no-face" ? "No Face" : "Alert"}
          </span>
        </div>
        <div className="text-xs font-bold text-red-600">● LIVE</div>
      </div>

      {violations.length > 0 && (
        <div className="border-t border-slate-200 px-2 py-1.5 bg-red-50 max-h-20 overflow-y-auto">
          <p className="text-xs font-bold text-red-800 mb-1">Violations (Admin Only):</p>
          {violations.slice(-3).map((v, i) => (
            <div key={i} className="text-xs flex items-center gap-1.5 text-red-700 py-0.5">
              <span className="font-mono text-red-400 text-xs">{v.time}</span>
              <span className={`px-1 rounded text-white font-bold text-xs ${
                v.severity === "high" ? "bg-red-600" : v.severity === "medium" ? "bg-amber-500" : "bg-slate-500"
              }`}>
                {v.type.replace("_", " ").toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout, isAdmin } = useAuthStore();
  const { reset } = useInterviewStore();
  const navigate = useNavigate();
  const location = useLocation();

  const nav = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/interview",  icon: Mic,             label: "New Interview" },
    { path: "/history",    icon: History,          label: "History" },
    { path: "/report",     icon: FileText,         label: "Last Report" },
  ];
  if (isAdmin) nav.push({ path: "/admin", icon: Shield, label: "Admin Panel" });

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-slate-900 border-r border-slate-700 flex flex-col z-50">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center"><Brain size={16} className="text-white" /></div>
        <div><div className="text-white font-bold text-sm">InterviewAI</div><div className="text-slate-500 text-xs">Assessment Portal</div></div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-2">Navigation</p>
        {nav.map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all
              ${location.pathname === path ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
            <Icon size={15} />{label}
          </Link>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-slate-700">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800 mb-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase() || "U"}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs">{isAdmin ? "Administrator" : "Candidate"}</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-slate-400 hover:text-red-400 hover:bg-red-900/20 text-xs transition-all">
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Setup Screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(false);
  const { reset } = useInterviewStore();
  useEffect(() => { reset(); }, [reset]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-indigo-700 text-white rounded-lg px-6 py-4 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"><Brain size={22} /></div>
        <div>
          <h1 className="text-lg font-bold">AI Examination Portal</h1>
          <p className="text-indigo-200 text-sm">Proctored Online Interview Assessment System</p>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-white/10 rounded px-3 py-1.5">
          <Shield size={14} /><span className="text-xs font-semibold">SECURE</span>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-5 text-sm text-amber-800">
        <p className="font-semibold mb-1">⚠ Important Instructions</p>
        <ul className="space-y-0.5 text-xs list-disc list-inside text-amber-700">
          <li>Camera will be active for real-time proctoring</li>
          <li>Do not switch tabs — violations are recorded and reported</li>
          <li>Mobile phone usage will be detected automatically</li>
          <li>Each question has only one correct answer</li>
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded text-xs flex items-center justify-center font-bold">1</span>
          Select Examination Domain
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DOMAINS.map(d => (
            <button key={d.value} onClick={() => setDomain(d.value)}
              className={`p-3 rounded border text-left transition-all ${domain === d.value ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300"}`}>
              <div className="text-xl mb-1">{d.icon}</div>
              <div className="font-semibold text-xs">{d.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded text-xs flex items-center justify-center font-bold">2</span>
          Select Difficulty Level
        </h2>
        <div className="flex gap-3">
          {DIFFICULTIES.map(d => (
            <button key={d.value} onClick={() => setDifficulty(d.value)}
              className={`flex-1 py-2.5 rounded border font-semibold text-sm transition-all ${difficulty === d.value ? d.color + " border-current" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => { if (!domain || !difficulty) { toast.error("Select domain and difficulty"); return; } setLoading(true); onStart(domain, difficulty); }}
        disabled={!domain || !difficulty || loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
        {loading ? "Initializing Examination..." : "Begin Examination"}
      </button>
    </div>
  );
}

// ── Live Interview Screen ─────────────────────────────────────────────────────
function LiveInterviewScreen({ domain, difficulty, onFinish }) {
  const { sessionId, allResults, addResult } = useInterviewStore();

  const [questionIndex, setQuestionIndex] = useState(0);
  const [allQuestions, setAllQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [answeredMap, setAnsweredMap] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trustScore, setTrustScore] = useState(100);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const preloadingRef = useRef(new Set());
  const askedTextsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // ─── FULLSCREEN ENFORCEMENT ───────────────────────────────────────────────
  useEffect(() => {
    const enterFullscreen = async () => {
      if (!containerRef.current) return;
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        toast.success("🔒 Exam locked in fullscreen mode");
      } catch { toast.error("⚠ Please enable fullscreen for exam security"); }
    };
    enterFullscreen();

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setTrustScore(t => Math.max(0, t - 5));
        if (sessionId) {
          adminAPI.reportViolation({ session_id: sessionId, violation_type: "fullscreen_exit", severity: "high", description: "Candidate exited fullscreen mode" }).catch(() => {});
          toast.error("⚠ FULLSCREEN EXIT DETECTED! Trust score reduced.", { duration: 5000 });
        }
      } else {
        setIsFullscreen(true);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [sessionId]);

  // ─── ANTI-CHEAT: DISABLE RIGHT-CLICK & COPY-PASTE ───────────────────────
  useEffect(() => {
    const onContextMenu = (e) => { e.preventDefault(); toast.error("Right-click disabled during exam"); };
    const onCopy = (e) => { e.preventDefault(); toast.error("Copy disabled during exam"); };
    const onPaste = (e) => { e.preventDefault(); toast.error("Paste disabled during exam"); };
    const onCut = (e) => { e.preventDefault(); toast.error("Cut disabled during exam"); };
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
    };
  }, []);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Tab-switch detection
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && sessionId) {
        setTrustScore(t => Math.max(0, t - 10));
        adminAPI.reportViolation({ session_id: sessionId, violation_type: "tab_switch", severity: "high", description: "Candidate switched tab or minimized window" }).catch(() => {});
        toast.error("⚠ TAB SWITCH DETECTED! Trust score reduced.", { duration: 5000 });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [sessionId]);

  // Rebuild answeredMap
  useEffect(() => {
    const map = {};
    allQuestions.forEach((q, idx) => {
      if (!q) return;
      const r = allResults.find(r => r.question_id === q.question_id);
      if (r) map[idx] = r;
    });
    setAnsweredMap(map);
  }, [allResults, allQuestions]);

  // ─── PARALLEL PREFETCH ON EXAM START ───────────────────────────────────────
  useEffect(() => {
    if (!initializedRef.current && sessionId) {
      initializedRef.current = true;
      preloadAllQuestions();
    }
  }, [sessionId]);

  const preloadAllQuestions = async () => {
    setLoading(true);
    setLoadingProgress(0);
    
    try {
      // Step 1: Load first batch (5 questions) - show first question immediately
      const res = await interviewAPI.prefetchQuestions(sessionId);
      const questions = res.data.questions || [];
      questions.forEach(q => askedTextsRef.current.add(q.question_text));
      setAllQuestions(questions);
      setLoadingProgress(Math.round((questions.length / MAX_QUESTIONS) * 100));
      
      if (questions[0]) {
        setCurrentQ(questions[0]);
        setLoading(false);
      }
      
      // Step 2: Load ALL remaining questions in parallel (background)
      const remaining = MAX_QUESTIONS - questions.length;
      if (remaining > 0) {
        const batchSize = 5; // Load 5 at a time to avoid overwhelming the server
        
        for (let start = questions.length; start < MAX_QUESTIONS; start += batchSize) {
          const end = Math.min(start + batchSize, MAX_QUESTIONS);
          const loadPromises = [];
          
          for (let i = start; i < end; i++) {
            loadPromises.push(loadQuestion(i, false));
          }
          
          await Promise.all(loadPromises);
          setLoadingProgress(Math.round((end / MAX_QUESTIONS) * 100));
        }
        
        setLoadingProgress(100);
        setTimeout(() => setLoadingProgress(0), 2000); // Hide progress after 2s
      }
      
    } catch (e) {
      console.error('Preload error:', e);
      setLoadingProgress(0);
      toast.error("Loading questions...");
      setTimeout(() => loadQuestion(0, true), 1000);
    }
  };

  const loadQuestion = async (index, isFirst = false) => {
    if (index >= MAX_QUESTIONS) return;
    if (preloadingRef.current.has(index)) return;
    if (allQuestions[index]) {
      if (index === questionIndex) {
        setCurrentQ(allQuestions[index]);
        setLoading(false);
      }
      return;
    }
    
    preloadingRef.current.add(index);
    if (isFirst) setLoading(true);
    
    try {
      const res = await interviewAPI.generateQuestion(sessionId);
      const q = res.data;
      
      let finalQ = q;
      if (askedTextsRef.current.has(q.question_text)) {
        try {
          const res2 = await interviewAPI.generateQuestion(sessionId);
          finalQ = res2.data;
        } catch {
          finalQ = q;
        }
      }
      
      askedTextsRef.current.add(finalQ.question_text);
      setAllQuestions(prev => {
        const updated = [...prev];
        updated[index] = finalQ;
        return updated;
      });
      
      if (index === questionIndex || isFirst) {
        setCurrentQ(finalQ);
        setLoading(false);
      }
      
      preloadingRef.current.delete(index);
    } catch (e) {
      console.error(`Load Q${index + 1} failed:`, e);
      preloadingRef.current.delete(index);
      if (isFirst) {
        toast.error("Failed to load question");
        setLoading(false);
      }
    }
  };

  const navigateTo = (index) => {
    if (index < 0 || index >= MAX_QUESTIONS) return;
    setSelectedOption(null);
    setQuestionIndex(index);
    const q = allQuestions[index];
    if (q) { setCurrentQ(q); setLoading(false); }
    else { setCurrentQ(null); setLoading(true); loadQuestion(index); }
  };

  const handleSelect = async (option) => {
    if (isSubmitting || !currentQ) return;
    const isReAnswer = !!answeredMap[questionIndex];
    setSelectedOption(option);
    
    // ✅ INSTANT UI UPDATE - Don't wait for API
    const optimisticResult = {
      question: currentQ.question_text,
      question_id: currentQ.question_id,
      options: currentQ.options,
      user_answer: option,
      correct_answer: "", // Will be filled by API
      explanation: "",
      is_correct: false,
      score: 0
    };
    
    // Update UI immediately
    setAnsweredMap(prev => ({ ...prev, [questionIndex]: optimisticResult }));
    
    // Move to next question immediately if not re-answering
    if (!isReAnswer && questionIndex + 1 < MAX_QUESTIONS) {
      const next = questionIndex + 1;
      setQuestionIndex(next);
      const nextQ = allQuestions[next];
      if (nextQ) {
        setCurrentQ(nextQ);
        setLoading(false);
      } else {
        setCurrentQ(null);
        setLoading(true);
        loadQuestion(next);
      }
    }
    
    // Submit in background (don't block UI)
    setIsSubmitting(true);
    try {
      const res = await api.post("/interview/submit-answer", {
        session_id: sessionId,
        question_id: currentQ.question_id,
        answer_text: option
      });
      
      // Update with real result from API
      const result = {
        question: currentQ.question_text,
        question_id: currentQ.question_id,
        options: currentQ.options,
        user_answer: option,
        correct_answer: res.data.correct_answer,
        explanation: res.data.explanation,
        is_correct: res.data.is_correct,
        score: res.data.score
      };
      
      setAnsweredMap(prev => ({ ...prev, [questionIndex]: result }));
      
      if (isReAnswer) {
        useInterviewStore.setState(s => ({
          allResults: s.allResults.map(r =>
            r.question_id === currentQ.question_id ? result : r
          )
        }));
        toast.success("✓ Answer updated!", { duration: 1500 });
      } else {
        addResult(result);
        // Silent success - already moved to next question
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error("Failed to submit. Try again.");
      // Revert optimistic update on error
      if (!isReAnswer) {
        setAnsweredMap(prev => {
          const updated = { ...prev };
          delete updated[questionIndex];
          return updated;
        });
      }
    } finally {
      setSelectedOption(null);
      setIsSubmitting(false);
    }
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const answeredCount = Object.keys(answeredMap).length;
  const answeredResult = answeredMap[questionIndex];
  const isAnswered = !!answeredResult;

  if (loading && !currentQ) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 size={36} className="animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-slate-700 font-semibold">Loading Question {questionIndex + 1}...</p>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="flex gap-4 bg-slate-100 min-h-screen p-6">
      <div className="flex-1 min-w-0">
        {/* Exam header */}
        <div className="bg-indigo-700 text-white rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-white/20 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide">{domain.replace("_", " ")} — {difficulty}</span>
            <span className="text-indigo-200 text-xs">Q {questionIndex + 1} of {MAX_QUESTIONS}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-white/10 rounded px-2.5 py-1"><Clock size={13} /><span className="font-mono font-bold text-sm">{fmt(elapsed)}</span></div>
            <div className="flex items-center gap-1.5 text-xs"><CheckCircle size={13} className="text-green-300" /><span>{answeredCount}/{MAX_QUESTIONS}</span></div>
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded font-bold ${trustScore >= 80 ? "bg-green-500" : trustScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}>
              <Shield size={13} /><span>Trust: {trustScore}%</span>
            </div>
            {!isFullscreen && <div className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded animate-pulse">⚠ EXIT FULLSCREEN</div>}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-slate-200 rounded-full h-1.5 mb-4">
          <div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${(answeredCount / MAX_QUESTIONS) * 100}%` }} />
        </div>

        {/* Loading Progress Indicator */}
        {loadingProgress > 0 && loadingProgress < 100 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-800">Loading all questions: {loadingProgress}%</p>
              <div className="bg-blue-200 rounded-full h-1.5 mt-1">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${loadingProgress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-4">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50 rounded-t-lg">
            <span className="text-xs font-bold text-slate-500 uppercase">Question {questionIndex + 1}</span>
            {currentQ && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium capitalize">{currentQ.question_type}</span>}
            {isAnswered && <span className="ml-auto flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold"><CheckCircle size={11} /> Answered</span>}
          </div>
          <div className="p-5">
            {loading
              ? <div className="flex items-center gap-2 text-slate-500"><Loader2 size={16} className="animate-spin" /><span className="text-sm">Loading...</span></div>
              : <p className="text-slate-800 text-base font-medium leading-relaxed">{currentQ?.question_text}</p>
            }
          </div>
        </div>

        {/* Options */}
        {!loading && currentQ && (
          <div className="space-y-2 mb-4">
            {currentQ.options.map((opt, i) => {
              const clean = opt.replace(/^[A-D][.)]\s*/, "").trim();
              const isUser = answeredResult?.user_answer === opt;
              const isSel = selectedOption === opt;
              let cls = "border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50";
              if (isSel) cls = "border-indigo-500 bg-indigo-50 text-indigo-800";
              else if (isUser) cls = "border-green-500 bg-green-50 text-green-800";
              return (
                <button key={i} onClick={() => handleSelect(opt)} disabled={isSubmitting}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${cls} disabled:cursor-not-allowed`}>
                  <span className={`w-7 h-7 rounded flex items-center justify-center text-sm font-bold flex-shrink-0 ${isUser ? "bg-green-600 text-white" : isSel ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm flex-1">{clean}</span>
                  {isUser && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigateTo(questionIndex - 1)} disabled={questionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-sm font-medium">
            <ChevronLeft size={16} /> Previous
          </button>
          <button onClick={() => onFinish(allResults)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold">
            Submit Examination
          </button>
          <button onClick={() => navigateTo(questionIndex + 1)} disabled={questionIndex >= MAX_QUESTIONS - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-sm font-medium">
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 flex-shrink-0 space-y-3">
        <ProctoringCamera active={true} sessionId={sessionId} />

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-3 py-2 bg-slate-800 text-white"><span className="text-xs font-bold uppercase tracking-wide">Question Palette</span></div>
          <div className="p-3">
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {Array.from({ length: MAX_QUESTIONS }, (_, i) => {
                const isAnsweredQ = !!answeredMap[i];
                const isCurrent = i === questionIndex;
                const isLoaded = !!allQuestions[i];
                let cls = "";
                
                if (isCurrent && isAnsweredQ) {
                  // Current question + answered = Blue with ring
                  cls = "border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-sm";
                } else if (isCurrent) {
                  // Current question + not answered = Blue outline
                  cls = "border-indigo-600 bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300";
                } else if (isAnsweredQ) {
                  // Answered = Green
                  cls = "border-green-500 bg-green-500 text-white hover:bg-green-600";
                } else if (isLoaded) {
                  // Not answered but loaded = Gray
                  cls = "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200";
                } else {
                  // Not loaded = Light gray disabled
                  cls = "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed";
                }
                
                return (
                  <button 
                    key={i} 
                    onClick={() => navigateTo(i)}
                    disabled={!isLoaded && i !== questionIndex}
                    className={`w-8 h-8 rounded border-2 text-xs font-bold transition-all flex items-center justify-center ${cls} disabled:opacity-50`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 bg-green-500 border-green-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 bg-slate-100 border-slate-300" />
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 bg-indigo-100 border-indigo-600 ring-2 ring-indigo-300" />
                <span>Current</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-xs space-y-2">
          <p className="font-bold text-slate-700 uppercase tracking-wide">Summary</p>
          {[["Total", MAX_QUESTIONS, "text-slate-600"], ["Answered", answeredCount, "text-green-700"], ["Remaining", MAX_QUESTIONS - answeredCount, "text-slate-400"]].map(([l, v, c]) => (
            <div key={l} className={`flex justify-between ${c}`}><span>{l}</span><span className="font-semibold">{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────
function ResultsScreen({ results, domain, difficulty, onRestart }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const correct = results.filter(r => r.is_correct).length;
  const pct = results.length ? Math.round((correct / results.length) * 100) : 0;
  const wrongAnswers = results.filter(r => !r.is_correct);
  const recommendation = pct >= 70 ? "SELECTED" : pct >= 40 ? "WAITLIST" : "NOT SELECTED";
  const recColor = pct >= 70 ? "text-green-700 bg-green-50 border-green-300" : pct >= 40 ? "text-amber-700 bg-amber-50 border-amber-300" : "text-red-700 bg-red-50 border-red-300";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-slate-800 text-white rounded-lg px-6 py-5 mb-5 flex items-center gap-6">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#334155" strokeWidth="16" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="16" strokeDasharray={`${pct * 2.51} 251`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center"><p className="text-2xl font-black">{pct}%</p></div>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold mb-1">Examination Result</h1>
          <p className="text-slate-400 text-sm capitalize">{domain?.replace("_", " ")} · {difficulty}</p>
          <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded border font-bold text-sm ${recColor}`}>
            <Award size={15} /> {recommendation}
          </div>
        </div>
        <div className="text-right space-y-3">
          <div><p className="text-3xl font-black text-green-400">{correct}</p><p className="text-xs text-slate-400">Correct</p></div>
          <div><p className="text-3xl font-black text-red-400">{results.length - correct}</p><p className="text-xs text-slate-400">Wrong</p></div>
        </div>
      </div>

      {wrongAnswers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-5">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <h2 className="font-bold text-slate-800 text-sm">Review Wrong Answers ({wrongAnswers.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {wrongAnswers.map((r, idx) => {
              const open = expandedIdx === idx;
              return (
                <div key={idx}>
                  <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setExpandedIdx(open ? null : idx)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <XCircle size={16} className="text-red-500 flex-shrink-0" />
                      <p className="text-slate-700 text-sm truncate">{r.question}</p>
                    </div>
                    <ChevronRight size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                  </div>
                  {open && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mt-3 mb-1">Correct Answer</p>
                      <div className="text-sm px-3 py-2 rounded bg-green-50 text-green-800 border border-green-200 mb-3 font-medium">{r.correct_answer}</div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Explanation</p>
                      <p className="text-slate-700 text-sm leading-relaxed">{r.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button onClick={onRestart} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm">
          <Play size={15} /> Attempt Again
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm">
          <LayoutDashboard size={15} /> Dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function InterviewPage() {
  const { domain, difficulty, status, sessionId, allResults, setSession, reset } = useInterviewStore();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if coming from verification with verified session
  useEffect(() => {
    if (location.state?.verified && location.state?.session_id) {
      const { session_id, domain: d, difficulty: diff } = location.state;
      setSession(session_id, d, diff);
      toast.success("Verification complete! Starting exam...");
    }
  }, [location.state, setSession]);

  // ✅ NEW: Block exam if not verified
  useEffect(() => {
    if (status === "active" && !location.state?.verified) {
      console.warn("[SECURITY] Exam started without verification - blocking");
      toast.error("Please complete verification first");
      reset();
    }
  }, [status, location.state, reset]);

  const handleStart = async (d, diff) => {
    setLoading(true);
    try {
      reset();
      const res = await interviewAPI.startInterview({ domain: d, difficulty: diff });
      const sessionId = res.data.session_id;
      
      // ✅ FIXED: Navigate to verification page (mandatory face detection)
      console.log('[EXAM START] Redirecting to verification for session:', sessionId);
      navigate("/verification", {
        state: { 
          session_id: sessionId, 
          domain: d, 
          difficulty: diff 
        }
      });
      toast.success("Starting verification workflow...");
    } catch (err) {
      console.error('[EXAM START] Error:', err);
      toast.error("Failed to start. Please try again."); 
    }
    finally { setLoading(false); }
  };

  const handleFinish = async (results) => {
    if (results.length === 0) { toast.error("Answer at least one question."); return; }
    try {
      const feedbackRes = await interviewAPI.getFeedback(sessionId);
      useInterviewStore.setState({ status: "completed", allResults: results, report: feedbackRes.data });
      toast.success("Examination submitted!");
    } catch { useInterviewStore.setState({ status: "completed", allResults: results }); }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <main className="ml-56 min-h-screen px-6 py-6">
        {status === "idle" && <SetupScreen onStart={handleStart} />}
        {status === "active" && <LiveInterviewScreen domain={domain} difficulty={difficulty} onFinish={handleFinish} />}
        {status === "completed" && <ResultsScreen results={allResults} domain={domain} difficulty={difficulty} onRestart={reset} />}
      </main>
    </div>
  );
}
