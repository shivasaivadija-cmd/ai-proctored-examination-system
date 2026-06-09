import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store";
import toast from "react-hot-toast";
import api from "../services/api";
import {
  Camera, CheckCircle, XCircle, AlertCircle, Loader2,
  Eye, Sun, User, Smartphone, Home, ShieldCheck, ArrowRight, AlertTriangle
} from "lucide-react";

const VERIFICATION_STEPS = [
  { id: "face", label: "Face Detection", icon: User, description: "Verify your identity" },
  { id: "lighting", label: "Lighting Check", icon: Sun, description: "Ensure proper lighting" },
  { id: "accessories", label: "Accessories", icon: Eye, description: "Remove prohibited items" },
  { id: "devices", label: "Device Check", icon: Smartphone, description: "Clear workspace" },
  { id: "environment", label: "Environment Scan", icon: Home, description: "Scan surroundings" },
];

export function VerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // Session data from navigation state
  const sessionData = location.state;

  const [currentStep, setCurrentStep] = useState(0);
  const [verificationId, setVerificationId] = useState(null);
  const [sessionId, setSessionId] = useState(sessionData?.session_id || null);
  const [domain, setDomain] = useState(sessionData?.domain || "");
  const [difficulty, setDifficulty] = useState(sessionData?.difficulty || "");

  const [cameraActive, setCameraActive] = useState(false);
  const [checkResults, setCheckResults] = useState({});
  const [currentCheckStatus, setCurrentCheckStatus] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // Start verification on mount
  useEffect(() => {
    if (!sessionId) {
      toast.error("No session found. Starting new session...");
      navigate("/interview");
      return;
    }
    startVerification();
  }, [sessionId]);

  // Start camera when step changes
  useEffect(() => {
    if (currentStep >= 0 && currentStep < VERIFICATION_STEPS.length) {
      startCamera();
    }
    return () => stopCamera();
  }, [currentStep]);

  const startVerification = async () => {
    try {
      const res = await api.post("/verification/start", { session_id: sessionId });
      setVerificationId(res.data.verification_id);
      toast.success("Verification started. Complete all checks to begin exam.");
    } catch (err) {
      toast.error("Failed to start verification");
      console.error(err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      toast.error("Camera access denied. Please enable camera permissions.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const runCheck = async () => {
    if (!verificationId || analyzing) return;

    const frameData = captureFrame();
    if (!frameData) {
      toast.error("Failed to capture frame. Please try again.");
      return;
    }

    // ✅ VALIDATE WEBCAM STATE
    const video = videoRef.current;
    console.log("[VERIFICATION DEBUG]", {
      videoReadyState: video?.readyState,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      frameSizeKB: Math.round(frameData.length / 1024),
      checkType: VERIFICATION_STEPS[currentStep].id
    });

    if (video?.readyState !== 4) {
      toast.error("Camera not ready. Please wait and try again.");
      return;
    }

    setAnalyzing(true);
    setCurrentCheckStatus("analyzing");

    const checkType = VERIFICATION_STEPS[currentStep].id;

    try {
      const res = await api.post("/verification/check", {
        session_id: sessionId,
        verification_id: verificationId,
        frame_data: frameData,
        check_type: checkType,
      });

      const result = res.data;

      // ✅ LOG DETAILED RESULT
      console.log("[VERIFICATION RESULT]", JSON.stringify({
        checkType,
        passed: result.passed,
        confidence: result.confidence,
        message: result.message,
        details: result.details,
        detectedIssues: result.detected_objects || result.issues || [],
      }, null, 2));

      setCheckResults((prev) => ({
        ...prev,
        [checkType]: result,
      }));

      if (result.passed) {
        setCurrentCheckStatus("passed");
        toast.success(`✓ ${VERIFICATION_STEPS[currentStep].label} passed`);

        // Auto-advance after 1.5s
        setTimeout(() => {
          if (currentStep < VERIFICATION_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
            setCurrentCheckStatus(null);
          } else {
            completeVerification();
          }
        }, 1500);
      } else {
        setCurrentCheckStatus("failed");
        // ✅ SHOW SPECIFIC ERROR MESSAGE
        const errorMsg = result.message || "Check failed. Please try again.";
        toast.error(errorMsg, { duration: 5000 });
        
        // ✅ LOG FAILURE DETAILS
        console.error("[VERIFICATION FAILED]", JSON.stringify({
          checkType,
          reason: result.details,
          message: result.message,
          confidence: result.confidence,
          recommendations: result.recommendations
        }, null, 2));
      }
    } catch (err) {
      // ✅ ENHANCED ERROR LOGGING
      console.error("[VERIFICATION ERROR]", {
        checkType,
        status: err.response?.status,
        statusText: err.response?.statusText,
        errorDetail: err.response?.data?.detail,
        fullError: err.message
      });
      
      console.error("[RAW ERROR BODY]", JSON.stringify(err.response?.data));
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message
        || "Server error. Please check backend logs.";
      
      toast.error(`Check failed: ${errorMessage}`, { duration: 7000 });
      setCurrentCheckStatus("failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const completeVerification = async () => {
    try {
      const res = await api.post("/verification/complete", {
        session_id: sessionId,
        verification_id: verificationId,
      });

      if (res.data.verification_passed) {
        toast.success("✓ All checks passed! Starting exam...");
        stopCamera();
        navigate("/interview", {
          state: { session_id: sessionId, domain, difficulty, verified: true },
        });
      } else {
        toast.error(`Verification incomplete: ${res.data.failed_checks.join(", ")}`);
      }
    } catch (err) {
      toast.error("Failed to complete verification");
      console.error(err);
    }
  };

  const retryCheck = () => {
    setCurrentCheckStatus(null);
  };

  const step = VERIFICATION_STEPS[currentStep];
  const StepIcon = step?.icon || Camera;
  const allPassed = VERIFICATION_STEPS.every((s) => checkResults[s.id]?.passed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck size={28} />
                Pre-Exam Verification
              </h1>
              <p className="text-indigo-200 text-sm mt-1">
                Complete all security checks to begin your examination
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-200">Candidate</p>
              <p className="font-semibold">{user?.name}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-100 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            {VERIFICATION_STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isPassed = checkResults[s.id]?.passed;
              const isCurrent = idx === currentStep;
              const isCompleted = idx < currentStep || isPassed;

              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                      isPassed
                        ? "bg-green-500 border-green-500 text-white"
                        : isCurrent
                        ? "bg-indigo-600 border-indigo-600 text-white animate-pulse"
                        : isCompleted
                        ? "bg-slate-300 border-slate-300 text-slate-600"
                        : "bg-white border-slate-300 text-slate-400"
                    }`}
                  >
                    {isPassed ? <CheckCircle size={20} /> : <Icon size={20} />}
                  </div>
                  {idx < VERIFICATION_STEPS.length - 1 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        isCompleted ? "bg-green-500" : "bg-slate-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center text-sm text-slate-600">
            Step {currentStep + 1} of {VERIFICATION_STEPS.length}: {step?.label}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Camera View */}
            <div className="bg-black rounded-lg overflow-hidden relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* ✅ DEBUG OVERLAY */}
              {cameraActive && videoRef.current && (
                <div className="absolute top-12 left-2 bg-black bg-opacity-70 text-white text-xs p-2 rounded font-mono">
                  <div>✓ Camera: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}</div>
                  <div>✓ Ready: {videoRef.current.readyState === 4 ? "YES" : "NO"}</div>
                  <div>✓ Step: {VERIFICATION_STEPS[currentStep].id}</div>
                </div>
              )}

              {/* Status Overlay */}
              {currentCheckStatus === "analyzing" && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 size={48} className="animate-spin mx-auto mb-3" />
                    <p className="font-semibold">Analyzing...</p>
                  </div>
                </div>
              )}

              {currentCheckStatus === "passed" && (
                <div className="absolute inset-0 bg-green-500 bg-opacity-80 flex items-center justify-center">
                  <div className="text-center text-white">
                    <CheckCircle size={64} className="mx-auto mb-3" />
                    <p className="text-2xl font-bold">✓ Check Passed</p>
                  </div>
                </div>
              )}

              {currentCheckStatus === "failed" && (
                <div className="absolute inset-0 bg-red-500 bg-opacity-80 flex items-center justify-center">
                  <div className="text-center text-white">
                    <XCircle size={64} className="mx-auto mb-3" />
                    <p className="text-2xl font-bold">✗ Check Failed</p>
                  </div>
                </div>
              )}

              {/* Camera Status */}
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            </div>

            {/* Instructions */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                    <StepIcon size={28} className="text-indigo-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{step?.label}</h2>
                    <p className="text-slate-600 text-sm">{step?.description}</p>
                  </div>
                </div>

                {/* Instructions based on current step */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Instructions
                  </p>
                  <ul className="space-y-1 text-sm text-blue-800">
                    {step?.id === "face" && (
                      <>
                        <li>• Position your face in the center of the camera</li>
                        <li>• Ensure your entire face is visible</li>
                        <li>• Remove any face coverings</li>
                        <li>• Only one person should be visible</li>
                      </>
                    )}
                    {step?.id === "lighting" && (
                      <>
                        <li>• Sit in a well-lit area</li>
                        <li>• Avoid backlighting from windows</li>
                        <li>• Ensure your face is clearly visible</li>
                        <li>• Avoid shadows on your face</li>
                      </>
                    )}
                    {step?.id === "accessories" && (
                      <>
                        <li>• Remove caps, hats, or helmets</li>
                        <li>• Remove sunglasses or dark glasses</li>
                        <li>• Remove face masks</li>
                        <li>• Remove hoodies covering your face</li>
                      </>
                    )}
                    {step?.id === "devices" && (
                      <>
                        <li>• Remove mobile phones from view</li>
                        <li>• Remove smartwatches</li>
                        <li>• Remove earphones/headphones</li>
                        <li>• Clear your desk of electronic devices</li>
                      </>
                    )}
                    {step?.id === "environment" && (
                      <>
                        <li>• Slowly turn your head left and right</li>
                        <li>• Ensure no one else is in the room</li>
                        <li>• Close unnecessary applications</li>
                        <li>• Choose a quiet, private location</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Current Check Result */}
                {checkResults[step?.id] && (
                  <div
                    className={`rounded-lg p-4 mb-4 ${
                      checkResults[step?.id].passed
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <p
                      className={`font-semibold mb-2 flex items-center gap-2 ${
                        checkResults[step?.id].passed ? "text-green-900" : "text-red-900"
                      }`}
                    >
                      {checkResults[step?.id].passed ? (
                        <CheckCircle size={18} />
                      ) : (
                        <XCircle size={18} />
                      )}
                      {checkResults[step?.id].message}
                    </p>

                    {checkResults[step?.id].recommendations?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold text-red-800 mb-1">
                          Recommendations:
                        </p>
                        <ul className="space-y-1 text-sm text-red-700">
                          {checkResults[step?.id].recommendations.map((rec, idx) => (
                            <li key={idx}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {currentCheckStatus === "failed" && (
                  <button
                    onClick={retryCheck}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={20} />
                    Retry Check
                  </button>
                )}

                {!analyzing && currentCheckStatus !== "passed" && (
                  <button
                    onClick={runCheck}
                    disabled={!cameraActive || analyzing}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzing ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Camera size={20} />
                    )}
                    {analyzing ? "Analyzing..." : `Run ${step?.label}`}
                  </button>
                )}

                {allPassed && (
                  <button
                    onClick={completeVerification}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowRight size={20} />
                    Complete Verification & Start Exam
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Warning */}
        <div className="bg-amber-50 border-t border-amber-200 px-6 py-3">
          <p className="text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>
              <strong>Important:</strong> You must pass all verification checks before starting
              the exam. Ensure you follow all instructions carefully.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
