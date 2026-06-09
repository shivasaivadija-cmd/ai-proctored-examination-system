import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { resumeAPI } from "../services/api";
import api from "../services/api";
import { useAuthStore } from "../store";
import toast from "react-hot-toast";
import {
  Brain, ChevronRight, Loader2, Play, History, FileText, Upload,
  LayoutDashboard, Mic, MicOff, Volume2, VolumeX, LogOut,
  CheckCircle, XCircle, AlertCircle, FileCheck,
} from "lucide-react";

function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = [
    { path: "/dashboard",        icon: LayoutDashboard, label: "Dashboard" },
    { path: "/interview",        icon: Mic,             label: "New Interview" },
    { path: "/resume-interview", icon: FileCheck,       label: "Resume Interview" },
    { path: "/history",          icon: History,         label: "History" },
    { path: "/report",           icon: FileText,        label: "Last Report" },
  ];
  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-dark-800 border-r border-slate-700/50 flex flex-col z-50">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm">InterviewAI</div>
          <div className="text-slate-500 text-xs">Resume Based</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${location.pathname === path
                ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}>
            <Icon size={16} />{label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-700/30 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
        </div>
        <button onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 text-sm transition-all">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Upload Screen ──────────────────────────────────────────────────────────────
function UploadScreen({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a resume file");
    setUploading(true);
    try {
      const res = await resumeAPI.uploadResume(file);
      toast.success("Resume analyzed!");
      onUploadComplete(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed. Try a text-based PDF.");
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary-600/20 border border-primary-500/30 rounded-full px-4 py-2 text-primary-400 text-sm font-medium mb-4">
          <FileCheck size={14} /> Resume-Based Interview
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Upload Your Resume</h1>
        <p className="text-slate-400 text-sm">AI reads every skill, project, and library — then asks 20-30 deep questions</p>
      </div>

      {!uploading ? (
        <>
          <div className="card mb-6">
            <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                ${dragActive ? "border-primary-500 bg-primary-500/10" : "border-slate-700 hover:border-slate-500"}`}>
              <Upload size={48} className="mx-auto mb-4 text-slate-500" />
              <p className="text-white font-medium mb-2">{file ? file.name : "Drop resume here or click to browse"}</p>
              <p className="text-slate-500 text-sm">PDF, TXT, DOCX supported</p>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} className="hidden" />
            </div>
            {file && (
              <div className="mt-4 p-4 bg-slate-700/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-primary-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-slate-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400">
                  <XCircle size={20} />
                </button>
              </div>
            )}
          </div>
          <button onClick={handleUpload} disabled={!file}
            className="btn-primary w-full text-base py-4 flex items-center justify-center gap-2">
            <ChevronRight size={20} /> Analyze & Start Interview
          </button>
        </>
      ) : (
        <div className="card text-center py-12">
          <Loader2 size={48} className="animate-spin text-primary-400 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold mb-2">Analyzing Your Resume...</p>
          <p className="text-slate-400 text-sm">Reading skills, projects, libraries, experience</p>
          <p className="text-slate-500 text-xs mt-2">This takes 20–40 seconds. Please wait.</p>
          <div className="mt-6 flex justify-center gap-2">
            {["Skills", "Projects", "Libraries", "Experience"].map((s, i) => (
              <span key={i} className="badge bg-slate-700 text-slate-400 text-xs animate-pulse">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analysis Screen ────────────────────────────────────────────────────────────
function AnalysisScreen({ analysis, onStart }) {
  if (!analysis) return null;
  const projects   = analysis.projects   || [];
  const frameworks = analysis.frameworks || [];
  const libraries  = analysis.libraries  || [];
  const languages  = analysis.languages  || [];
  const databases  = analysis.databases  || [];
  const skills     = analysis.skills     || [];
  const tools      = analysis.tools      || [];
  const totalQ     = analysis.total_questions || 20;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-white mb-1">Resume Deeply Analyzed!</h1>
        <p className="text-slate-400 text-sm">{analysis.summary || "Ready to start"}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Experience</p>
          <p className="text-2xl font-bold text-white">{analysis.experience_years || 0} yrs</p>
        </div>
        <div className="card text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Projects Found</p>
          <p className="text-2xl font-bold text-primary-400">{projects.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Questions</p>
          <p className="text-2xl font-bold text-green-400">{totalQ}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {languages.length > 0 && (
          <div className="card">
            <h3 className="text-white font-semibold mb-3 text-sm">Languages</h3>
            <div className="flex flex-wrap gap-2">
              {languages.map((l, i) => <span key={i} className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30">{l}</span>)}
            </div>
          </div>
        )}
        {frameworks.length > 0 && (
          <div className="card">
            <h3 className="text-white font-semibold mb-3 text-sm">Frameworks</h3>
            <div className="flex flex-wrap gap-2">
              {frameworks.map((f, i) => <span key={i} className="badge bg-primary-500/20 text-primary-400 border border-primary-500/30">{f}</span>)}
            </div>
          </div>
        )}
        {libraries.length > 0 && (
          <div className="card">
            <h3 className="text-white font-semibold mb-3 text-sm">Libraries</h3>
            <div className="flex flex-wrap gap-2">
              {libraries.map((l, i) => <span key={i} className="badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{l}</span>)}
            </div>
          </div>
        )}
        {databases.length > 0 && (
          <div className="card">
            <h3 className="text-white font-semibold mb-3 text-sm">Databases</h3>
            <div className="flex flex-wrap gap-2">
              {databases.map((d, i) => <span key={i} className="badge bg-green-500/20 text-green-400 border border-green-500/30">{d}</span>)}
            </div>
          </div>
        )}
        {tools.length > 0 && (
          <div className="card">
            <h3 className="text-white font-semibold mb-3 text-sm">Tools</h3>
            <div className="flex flex-wrap gap-2">
              {tools.map((t, i) => <span key={i} className="badge bg-slate-700 text-slate-300">{t}</span>)}
            </div>
          </div>
        )}
        {skills.length > 0 && (
          <div className="card">
            <h3 className="text-white font-semibold mb-3 text-sm">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => <span key={i} className="badge bg-slate-700 text-slate-300">{s}</span>)}
            </div>
          </div>
        )}
      </div>

      {projects.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-white font-semibold mb-3 text-sm">Projects Detected ({projects.length})</h3>
          <div className="space-y-3">
            {projects.map((p, i) => (
              <div key={i} className="p-3 bg-slate-700/30 rounded-xl">
                <p className="text-white font-medium text-sm">{p.name}</p>
                <p className="text-slate-400 text-xs mt-1">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(p.tech_used || []).map((t, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 bg-slate-600 text-slate-300 rounded">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onStart}
        className="btn-primary w-full text-base py-4 flex items-center justify-center gap-2">
        <Play size={20} /> Start {totalQ}-Question Resume Interview
      </button>
    </div>
  );
}

// ── Interview Screen ───────────────────────────────────────────────────────────
function ResumeInterviewScreen({ resumeData, onFinish }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [allQuestions, setAllQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentQRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const shouldListenRef = useRef(false);
  const isPreloadingRef = useRef(false);
  const MAX_QUESTIONS = resumeData?.total_questions || 20;

  useEffect(() => { currentQRef.current = currentQ; }, [currentQ]);

  // Load first question on mount
  useEffect(() => {
    loadFirstQuestion();
  }, []);

  const loadFirstQuestion = async () => {
    setLoading(true);
    try {
      const res = await resumeAPI.generateResumeQuestion({
        resume_text: resumeData.resume_text,
        resume_analysis: resumeData.analysis || resumeData,
        question_index: 0,
        total_questions: MAX_QUESTIONS,
        previous_questions: [],
      });
      const questions = [res.data];
      setAllQuestions(questions);
      setCurrentQ(res.data);
      setLoading(false);
      // Immediately preload next question
      preloadNextQuestion(1);
    } catch (error) {
      toast.error("Failed to load question");
      setLoading(false);
    }
  };

  // Aggressive preloading - preload next 2 questions
  const preloadNextQuestion = async (index) => {
    if (index >= MAX_QUESTIONS || isPreloadingRef.current || allQuestions[index]) return;
    
    isPreloadingRef.current = true;
    try {
      const res = await resumeAPI.generateResumeQuestion({
        resume_text: resumeData.resume_text,
        resume_analysis: resumeData.analysis || resumeData,
        question_index: index,
        total_questions: MAX_QUESTIONS,
        previous_questions: allQuestions.filter(q => q).map(q => q.question),
      });
      setAllQuestions(prev => {
        const updated = [...prev];
        updated[index] = res.data;
        return updated;
      });
      // Preload one more ahead
      if (index + 1 < MAX_QUESTIONS) {
        setTimeout(() => {
          isPreloadingRef.current = false;
          preloadNextQuestion(index + 1);
        }, 200);
      } else {
        isPreloadingRef.current = false;
      }
    } catch (error) {
      console.error('Preload failed:', error);
      isPreloadingRef.current = false;
    }
  };

  const navigateToQuestion = (index) => {
    if (index >= 0 && index < MAX_QUESTIONS) {
      setSelectedOption(null);
      setTranscript("");
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      
      // Stop any ongoing speech
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isSpeakingRef.current = false;
      setIsSpeaking(false);

      // Check if question exists
      if (allQuestions[index]) {
        setCurrentQ(allQuestions[index]);
        setQuestionIndex(index);
        // Preload next if not exists
        if (index + 1 < MAX_QUESTIONS && !allQuestions[index + 1]) {
          preloadNextQuestion(index + 1);
        }
      } else {
        // Generate the question on demand
        setLoading(true);
        resumeAPI.generateResumeQuestion({
          resume_text: resumeData.resume_text,
          resume_analysis: resumeData.analysis || resumeData,
          question_index: index,
          total_questions: MAX_QUESTIONS,
          previous_questions: allQuestions.filter(q => q).map(q => q.question),
        })
          .then(res => {
            const newQ = res.data;
            setAllQuestions((prev) => {
              const updated = [...prev];
              updated[index] = newQ;
              return updated;
            });
            setCurrentQ(newQ);
            setQuestionIndex(index);
            setLoading(false);
            // Preload next
            if (index + 1 < MAX_QUESTIONS) {
              preloadNextQuestion(index + 1);
            }
          })
          .catch(error => {
            console.error("Failed to generate question:", error);
            toast.error("Failed to load question. Please try again.");
            setLoading(false);
          });
      }
    }
  };

  const nextQuestion = () => {
    if (questionIndex < MAX_QUESTIONS - 1) {
      navigateToQuestion(questionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (questionIndex > 0) {
      navigateToQuestion(questionIndex - 1);
    }
  };

  const speakQuestion = async (q) => {
    // If already speaking, stop it
    if (isSpeakingRef.current) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      return;
    }
    
    const qData = q || currentQRef.current;
    if (!qData) return;
    
    const labels = ["Option A", "Option B", "Option C", "Option D"];
    // Clean option text - remove prefix like "A) " or "A. " if present
    const cleanOption = (opt) => {
      return opt.replace(/^[A-D][.)\s]+/, '').trim();
    };
    const text = `${qData.question}. ${qData.options.map((o, i) => `${labels[i]}: ${cleanOption(o)}`).join(". ")}`;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    
    try {
      const res = await api.post("/realtime/tts", { text, lang: "en" });
      const audio = new Audio(`data:audio/mp3;base64,${res.data.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        audioRef.current = null;
      };
      audio.play();
    } catch {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      audioRef.current = null;
    }
  };

  const toggleListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error("Use Chrome or Edge for voice");
    if (isListening) { shouldListenRef.current = false; recognitionRef.current?.stop(); setIsListening(false); return; }
    shouldListenRef.current = true; startRecognition();
  };

  const startRecognition = () => {
    if (!shouldListenRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = "en-US"; r.maxAlternatives = 5;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++)
        for (let j = 0; j < e.results[i].length; j++) {
          const text = e.results[i][j].transcript.trim();
          if (text) { setTranscript(text); if (matchVoice(text)) { shouldListenRef.current = false; r.stop(); setIsListening(false); return; } }
        }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") { shouldListenRef.current = false; setIsListening(false); toast.error("Mic denied"); }
      else if (e.error !== "aborted" && shouldListenRef.current) setTimeout(startRecognition, 500);
    };
    r.onend = () => { if (shouldListenRef.current) setTimeout(startRecognition, 100); else setIsListening(false); };
    r.start(); recognitionRef.current = r; setIsListening(true);
  };

  const matchVoice = (text) => {
    const q = currentQRef.current; if (!q) return false;
    const l = text.toLowerCase().trim();
    const map = { "a": 0, "b": 1, "c": 2, "d": 3, "ay": 0, "be": 1, "bee": 1, "see": 2, "sea": 2, "dee": 3,
      "one": 0, "two": 1, "three": 2, "four": 3, "first": 0, "second": 1, "third": 2, "fourth": 3,
      "option a": 0, "option b": 1, "option c": 2, "option d": 3 };
    for (const [key, idx] of Object.entries(map))
      if (l === key || l.includes(key)) { handleSelectOption(q.options[idx]); return true; }
    return false;
  };

  const handleSelectOption = async (option) => {
    if (isSubmitting) return;
    
    const existingAnswerIndex = allResults.findIndex(
      (r) => r.question === currentQRef.current.question
    );
    
    setSelectedOption(option);
    setIsSubmitting(true);
    shouldListenRef.current = false; 
    recognitionRef.current?.stop(); 
    setIsListening(false);
    
    try {
      const res = await api.post("/realtime/check-answer", {
        question: currentQRef.current.question, 
        options: currentQRef.current.options,
        correct_answer: currentQRef.current.correct_answer, 
        user_answer: option,
        explanation: currentQRef.current.explanation,
      });
      
      const newResult = {
        question: currentQRef.current.question, 
        options: currentQRef.current.options,
        user_answer: option, 
        correct_answer: currentQRef.current.correct_answer,
        explanation: currentQRef.current.explanation,
        category_label: currentQRef.current.category_label || "Resume",
        is_correct: res.data.is_correct,
      };
      
      if (existingAnswerIndex >= 0) {
        // Update existing answer - don't auto-advance
        const updatedResults = [...allResults];
        updatedResults[existingAnswerIndex] = newResult;
        setAllResults(updatedResults);
        toast.success("Answer updated!");
        setSelectedOption(null);
        setIsSubmitting(false);
      } else {
        // Add new answer - auto-advance
        setAllResults(prev => [...prev, newResult]);
        toast.success("Answer submitted!");
        
        // Auto-advance to next question immediately
        if (questionIndex + 1 < MAX_QUESTIONS) {
          const nextIndex = questionIndex + 1;
          
          // Stop any audio/speech
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          shouldListenRef.current = false;
          recognitionRef.current?.stop();
          setIsListening(false);
          setTranscript("");
          setSelectedOption(null);
          setIsSubmitting(false);
          
          // Instant transition - question should be preloaded
          if (allQuestions[nextIndex]) {
            setCurrentQ(allQuestions[nextIndex]);
            setQuestionIndex(nextIndex);
            // Preload next 2 questions
            if (nextIndex + 1 < MAX_QUESTIONS && !allQuestions[nextIndex + 1]) {
              preloadNextQuestion(nextIndex + 1);
            }
          } else {
            // Fallback: generate if not preloaded
            resumeAPI.generateResumeQuestion({
              resume_text: resumeData.resume_text,
              resume_analysis: resumeData.analysis || resumeData,
              question_index: nextIndex,
              total_questions: MAX_QUESTIONS,
              previous_questions: allQuestions.filter(q => q).map(q => q.question),
            })
              .then(res => {
                const newQ = res.data;
                setAllQuestions((prev) => {
                  const updated = [...prev];
                  updated[nextIndex] = newQ;
                  return updated;
                });
                setCurrentQ(newQ);
                setQuestionIndex(nextIndex);
                // Preload next
                if (nextIndex + 1 < MAX_QUESTIONS) {
                  preloadNextQuestion(nextIndex + 1);
                }
              })
              .catch(error => {
                console.error("Failed to generate next question:", error);
                toast.error("Failed to load next question. Click Next to continue.");
              });
          }
        } else {
          setSelectedOption(null);
          setIsSubmitting(false);
        }
      }
    } catch { 
      toast.error("Failed to check answer"); 
      setSelectedOption(null);
      setIsSubmitting(false);
    }
  };

  if (loading && !currentQ)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2
            size={48}
            className="animate-spin text-primary-500 mx-auto mb-4"
          />
          <p className="text-white text-lg">Preparing your interview...</p>
          <p className="text-slate-400 text-sm mt-2">Generating question from your resume</p>
        </div>
      </div>
    );

  if (!currentQ) return null;

  const answeredResult = allResults.find(
    (r) => r.question === currentQ.question,
  );
  const isAnswered = !!answeredResult;
  const userAnswer = answeredResult?.user_answer;

  return (
    <div className="flex gap-6">
      <div className="flex-1 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge bg-primary-500/20 text-primary-400 border border-primary-500/30">Q{questionIndex + 1} of {MAX_QUESTIONS}</span>
            <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">{currentQ.category_label}</span>
            {loading && (
              <span className="badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">
                Loading...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevQuestion}
              disabled={questionIndex === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ← Previous
            </button>
            <button
              onClick={nextQuestion}
              disabled={questionIndex >= MAX_QUESTIONS - 1}
              className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next →
            </button>
          </div>
        </div>

      <div className="card mb-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <FileCheck size={28} className="text-white" />
            </div>
            {isSpeaking && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <Volume2 size={12} className="text-white" />
            </div>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">
                {currentQ.category_label}
              </span>
              <span className="text-xs text-slate-500">Question {questionIndex + 1}</span>
              {isAnswered && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  ✓ Answered
                </span>
              )}
            </div>
            <p className="text-white text-base leading-relaxed font-medium mb-3">{currentQ.question}</p>
            {transcript && <div className="text-xs text-slate-400 bg-slate-700/30 px-3 py-2 rounded-lg">🎤 Heard: "{transcript}"</div>}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {currentQ.options.map((opt, i) => {
          const isSelected = selectedOption === opt;
          const isUserAnswer = userAnswer === opt;
          return (
            <button key={i} onClick={() => handleSelectOption(opt)} 
              disabled={isSubmitting}
              className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3
                ${
                  isSelected
                    ? "border-primary-500 bg-primary-500/10 text-white"
                    : isUserAnswer
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-slate-700 bg-dark-900 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50"
                }`}>
              <span className="text-lg font-bold w-8 flex-shrink-0">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt.replace(/^[A-D][.)\s]+/, '').trim()}</span>
              {isUserAnswer && (
                <CheckCircle size={20} className="text-green-400" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggleListening} disabled={isSubmitting}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all
            ${isListening ? "border-red-500 bg-red-500/10 text-red-400 animate-pulse" : "border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          {isListening ? "Stop Listening" : "Speak Answer"}
        </button>
        <button onClick={() => speakQuestion(currentQ)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600 font-medium text-sm transition-all">
          {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {isSpeaking ? "Stop Reading" : "Read Question"}
        </button>
        <button
          onClick={() => onFinish(allResults)}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary-500 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 font-medium text-sm transition-all"
        >
          Finish Interview
        </button>
      </div>
    </div>

    <div className="w-64 bg-dark-800 border border-slate-700/50 rounded-xl p-4 h-fit">
      <h3 className="text-white font-semibold mb-4 text-sm">Questions</h3>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: MAX_QUESTIONS }, (_, i) => {
          const isAnswered = allResults.some(
            (r) => r.question === allQuestions[i]?.question
          );
          const isCurrent = i === questionIndex;
          return (
            <button
              key={i}
              onClick={() => navigateToQuestion(i)}
              className={`w-10 h-10 rounded-full border-2 text-xs font-bold transition-all flex items-center justify-center
                ${
                  isCurrent
                    ? "border-primary-500 bg-primary-500/20 text-primary-400"
                    : isAnswered
                      ? "border-green-500 bg-green-500/20 text-green-400"
                      : "border-slate-600 bg-slate-800/50 text-slate-400 hover:bg-slate-700"
                }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-4 text-xs text-slate-400">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          Answered
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-primary-500"></div>
          Current
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-600"></div>
          Not Answered
        </div>
      </div>
    </div>
  </div>
  );
}

// ── Results Screen ─────────────────────────────────────────────────────────────
function ResultsScreen({ results, onRestart }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const correct     = results.filter(r => r.is_correct).length;
  const wrong       = results.length - correct;
  const pct         = Math.round((correct / results.length) * 100);
  const wrongAnswers = results.filter(r => !r.is_correct);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Resume Interview Complete!</h1>
        <div className="flex items-center justify-center gap-12 mb-4">
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="20" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="20"
                strokeDasharray={`${pct * 2.51} 251`} strokeLinecap="round" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20"
                strokeDasharray={`${(100 - pct) * 2.51} 251`}
                strokeDashoffset={`-${pct * 2.51}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <p className="text-4xl font-black text-white">{pct}%</p>
              <p className="text-xs text-slate-500">Score</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <div><p className="text-2xl font-bold text-green-400">{correct}</p><p className="text-sm text-slate-500">Correct</p></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <div><p className="text-2xl font-bold text-red-400">{wrong}</p><p className="text-sm text-slate-500">Wrong</p></div>
            </div>
            <p className="text-slate-500 text-xs">{results.length} questions total</p>
          </div>
        </div>
      </div>

      {wrongAnswers.length > 0 ? (
        <div className="card mb-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            Review Wrong Answers ({wrongAnswers.length})
          </h2>
          <div className="space-y-3">
            {wrongAnswers.map((r) => {
              const idx = results.indexOf(r);
              const open = expandedIdx === idx;
              return (
                <div key={idx} className="border border-red-500/30 rounded-xl overflow-hidden bg-red-500/5">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-red-500/10 transition-all"
                    onClick={() => setExpandedIdx(open ? null : idx)}>
                    <div className="flex items-center gap-3 flex-1">
                      <XCircle size={20} className="text-red-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">Q{idx + 1}: {r.question}</p>
                        <p className="text-slate-500 text-xs mt-1">
                          Category: <span className="text-blue-400">{r.category_label}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className={`text-slate-500 transition-transform ${open ? "rotate-90" : ""}`} />
                  </div>
                  {open && (
                    <div className="p-4 bg-slate-700/20 border-t border-red-500/30">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Correct Answer</p>
                      <div className="text-sm px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 mb-3">
                        {r.correct_answer}
                      </div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Explanation</p>
                      <p className="text-slate-300 text-sm leading-relaxed">{r.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card mb-6 text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Perfect Score!</h3>
          <p className="text-slate-400">You answered all resume-based questions correctly!</p>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button onClick={onRestart} className="btn-primary flex items-center gap-2">
          <Play size={16} /> Try Again
        </button>
        <Link to="/dashboard"
          className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-all text-sm font-medium flex items-center">
          Dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function ResumeInterviewPage() {
  const [status, setStatus] = useState("upload");
  const [resumeData, setResumeData] = useState(null);
  const [results, setResults] = useState([]);

  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar />
      <main className="ml-60 min-h-screen px-8 py-8">
        {status === "upload" && (
          <UploadScreen onUploadComplete={(data) => { setResumeData(data); setStatus("analysis"); }} />
        )}
        {status === "analysis" && (
          <AnalysisScreen analysis={resumeData} onStart={() => { setStatus("interview"); toast.success("Resume interview started!"); }} />
        )}
        {status === "interview" && (
          <ResumeInterviewScreen resumeData={resumeData} onFinish={(r) => { setResults(r); setStatus("results"); }} />
        )}
        {status === "results" && (
          <ResultsScreen results={results} onRestart={() => { setStatus("upload"); setResumeData(null); setResults([]); }} />
        )}
      </main>
    </div>
  );
}
