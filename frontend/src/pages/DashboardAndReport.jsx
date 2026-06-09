import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { interviewAPI } from "../services/api";
import { useAuthStore, useInterviewStore } from "../store";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Brain, Play, History, TrendingUp, Award, LogOut, LayoutDashboard,
  Mic, FileText, Star, ChevronRight, Clock, Target, Zap, User,
  CheckCircle, XCircle, AlertCircle, BarChart2, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Shared Sidebar ─────────────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout } = useAuthStore();
  const { reset } = useInterviewStore();
  const navigate = useNavigate();
  const location = useLocation();

  const nav = [
    { path: "/dashboard",        icon: LayoutDashboard, label: "Dashboard" },
    { path: "/interview",        icon: Mic,             label: "New Interview" },
    { path: "/resume-interview", icon: FileText,        label: "Resume Interview" },
    { path: "/history",          icon: History,         label: "History" },
    { path: "/report",           icon: FileText,        label: "Last Report" },
  ];

  const handleLogout = () => { logout(); navigate("/login"); };
  const handleNewInterview = () => { reset(); navigate("/interview"); };

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-slate-900 border-r border-slate-700 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
          <Brain size={16} className="text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm">InterviewAI</div>
          <div className="text-slate-500 text-xs">Assessment Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-2">Navigation</p>
        {nav.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all
                ${active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
        <div className="pt-3">
          <button onClick={handleNewInterview}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all">
            <Play size={15} /> Start Interview
          </button>
        </div>
      </nav>

      {/* User + Logout */}
      <div className="px-2 py-3 border-t border-slate-700">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800 mb-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email || "user"}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 text-sm font-semibold transition-all">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Page Shell ─────────────────────────────────────────────────────────────────
function PageShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <main className="ml-56 min-h-screen">
        <div className="px-6 py-6">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
              {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = "text-primary-400", accent = "from-primary-500/20 to-primary-600/5" }) {
  return (
    <div className="card relative overflow-hidden bg-slate-800 border border-slate-700">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

// ── Score Badge ────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const s = parseFloat(score) || 0;
  const cls = s >= 7 ? "bg-green-500/20 text-green-400 border-green-500/30"
            : s >= 5 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
            :          "bg-red-500/20 text-red-400 border-red-500/30";
  return <span className={`badge border text-xs ${cls}`}>{s.toFixed(1)}/10</span>;
}

// ── Recommendation Badge ───────────────────────────────────────────────────────
function RecBadge({ rec }) {
  if (!rec) return <span className="text-slate-600 text-xs">—</span>;
  const map = {
    hire:    { cls: "bg-green-500/20 text-green-400 border-green-500/30",  icon: "✅", label: "Hire" },
    consider:{ cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: "🤔", label: "Consider" },
    reject:  { cls: "bg-red-500/20 text-red-400 border-red-500/30",        icon: "❌", label: "Reject" },
  };
  const m = map[rec] || map.consider;
  return <span className={`badge border text-xs ${m.cls}`}>{m.icon} {m.label}</span>;
}

const DOMAIN_ICONS = {
  frontend: "🎨", backend: "⚙️", fullstack: "🔧",
  data_analyst: "📊", devops: "🚀", hr: "🤝",
};

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function DashboardPage() {
  const { token, logout } = useAuthStore();
  const { reset } = useInterviewStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    interviewAPI.getHistory()
      .then((r) => setHistory(r.data))
      .catch((err) => {
        if (err.response?.status === 401) { logout(); navigate("/login", { replace: true }); }
        else toast.error("Failed to load history");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const completed  = history.filter((s) => s.status === "completed");
  const avgScore   = completed.length ? (completed.reduce((a, s) => a + s.total_score, 0) / completed.length).toFixed(1) : "—";
  const bestScore  = completed.length ? Math.max(...completed.map((s) => s.total_score)).toFixed(1) : "—";
  const hireCount  = history.filter((s) => s.recommendation === "hire").length;

  // Domain bar chart
  const domainData = Object.entries(
    history.reduce((acc, s) => { acc[s.domain] = (acc[s.domain] || 0) + 1; return acc; }, {})
  ).map(([domain, count]) => ({ domain: domain.replace("_", " "), count }));

  // Score trend (last 8 completed)
  const trendData = completed.slice(-8).map((s, i) => ({
    name: `#${i + 1}`, score: parseFloat(s.total_score.toFixed(1)),
  }));

  return (
    <PageShell title="Dashboard" subtitle="Your interview performance overview">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Sessions"  value={history.length}   sub="All time"           icon={Mic}       color="text-blue-400"   accent="from-blue-500/10 to-transparent" />
        <StatCard label="Completed"       value={completed.length} sub="Finished interviews" icon={CheckCircle} color="text-green-400" accent="from-green-500/10 to-transparent" />
        <StatCard label="Average Score"   value={avgScore}         sub="Out of 10"           icon={TrendingUp} color="text-yellow-400" accent="from-yellow-500/10 to-transparent" />
        <StatCard label="Hire Verdicts"   value={hireCount}        sub="Recommended hire"    icon={Award}      color="text-primary-400" accent="from-primary-500/10 to-transparent" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Score trend */}
        <div className="card bg-slate-800 border border-slate-700">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-400" /> Score Trend
          </h2>
          <p className="text-slate-400 text-xs mb-4">Last {trendData.length} completed sessions</p>
          {trendData.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-600 text-sm">
              Complete 2+ interviews to see trend
            </div>
          )}
        </div>

        {/* Domain distribution */}
        <div className="card bg-slate-800 border border-slate-700">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <BarChart2 size={16} className="text-primary-400" /> Sessions by Domain
          </h2>
          <p className="text-slate-400 text-xs mb-4">Interview distribution</p>
          {domainData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={domainData}>
                <XAxis dataKey="domain" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-600 text-sm">
              No sessions yet
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      <div className="card bg-slate-800 border border-slate-700">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <History size={16} className="text-primary-400" /> Recent Sessions
          </h2>
          <Link to="/history" className="text-primary-400 text-xs hover:text-primary-300 flex items-center gap-1 font-medium">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-700/30 rounded-xl animate-pulse" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <Mic size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No interviews yet</p>
            <Link to="/interview" className="text-primary-400 text-sm mt-2 hover:underline inline-block">
              Start your first interview →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 6).map((s) => (
              <div key={s.session_id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl hover:bg-slate-700/50 transition-all border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{DOMAIN_ICONS[s.domain] || "💼"}</span>
                  <div>
                    <p className="text-white text-sm font-semibold capitalize">{s.domain.replace("_", " ")}</p>
                    <p className="text-slate-400 text-xs capitalize">{s.difficulty} · {new Date(s.started_at).toLocaleDateString()} · {s.questions_asked}Q</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={s.total_score} />
                  <RecBadge rec={s.recommendation} />
                  <span className={`badge text-xs ${s.status === "completed" ? "bg-slate-700 text-slate-300" : "bg-blue-500/20 text-blue-400"}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function HistoryPage() {
  const { token, logout } = useAuthStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    interviewAPI.getHistory()
      .then((r) => setHistory(r.data))
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = filter === "all" ? history : history.filter((s) => s.status === filter);

  const toggleSession = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }

    setExpandedSession(sessionId);
    
    // If details already loaded, don't fetch again
    if (sessionDetails[sessionId]) return;

    // Fetch session details
    setLoadingDetails(prev => ({ ...prev, [sessionId]: true }));
    try {
      const res = await interviewAPI.getSessionDetails(sessionId);
      setSessionDetails(prev => ({ ...prev, [sessionId]: res.data }));
    } catch (error) {
      toast.error("Failed to load session details");
      setExpandedSession(null);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  return (
    <PageShell title="Interview History" subtitle="All your past interview sessions">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {["all", "completed", "active"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize
              ${filter === f ? "bg-primary-600 text-white" : "bg-dark-800 text-slate-400 border border-slate-700 hover:border-slate-500"}`}>
            {f} {f === "all" ? `(${history.length})` : `(${history.filter(s => s.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="card bg-slate-800 border border-slate-700">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-700/50 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <History size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No sessions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const isExpanded = expandedSession === s.session_id;
              const details = sessionDetails[s.session_id];
              const isLoadingDetails = loadingDetails[s.session_id];

              return (
                <div key={s.session_id} className="border border-slate-700/50 rounded-xl overflow-hidden">
                  {/* Session Row */}
                  <div 
                    onClick={() => toggleSession(s.session_id)}
                    className="flex items-center justify-between p-4 hover:bg-slate-700/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-2xl">{DOMAIN_ICONS[s.domain] || "💼"}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-white text-sm font-medium capitalize">{s.domain.replace("_", " ")}</span>
                          <span className="text-slate-500 text-xs capitalize">{s.difficulty}</span>
                          <span className="text-slate-500 text-xs">{s.questions_asked} Questions</span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">{new Date(s.started_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreBadge score={s.total_score} />
                      <RecBadge rec={s.recommendation} />
                      <span className={`badge text-xs ${s.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {s.status}
                      </span>
                      <ChevronRight 
                        size={18} 
                        className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                      />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 bg-slate-800/30 p-4">
                      {isLoadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw size={24} className="animate-spin text-primary-400" />
                          <span className="ml-3 text-slate-400">Loading questions...</span>
                        </div>
                      ) : details ? (
                        <div>
                          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <FileText size={16} className="text-primary-400" />
                            Answered Questions ({details.questions?.length || 0})
                          </h3>
                          <div className="space-y-3">
                            {details.questions?.map((q, idx) => (
                              <div key={idx} className="bg-dark-900 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="badge bg-slate-700 text-slate-300 text-xs">Q{idx + 1}</span>
                                      <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
                                        {q.question_type || 'MCQ'}
                                      </span>
                                    </div>
                                    <p className="text-white text-sm font-medium mb-3">{q.question_text}</p>
                                    
                                    {/* Options */}
                                    {q.options && (
                                      <div className="space-y-2 mb-3">
                                        {q.options.map((opt, i) => {
                                          const isUserAnswer = q.user_answer === opt;
                                          const isCorrect = q.correct_answer === opt;
                                          return (
                                            <div 
                                              key={i}
                                              className={`p-2 rounded-lg text-sm flex items-center gap-2
                                                ${isUserAnswer && isCorrect ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                                                  isUserAnswer && !isCorrect ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                                                  isCorrect ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                                                  'bg-slate-700/30 text-slate-400'}`}
                                            >
                                              <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
                                              <span className="flex-1">{opt}</span>
                                              {isUserAnswer && <span className="text-xs">(Your answer)</span>}
                                              {isCorrect && !isUserAnswer && <CheckCircle size={14} />}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Explanation */}
                                    {q.explanation && (
                                      <div className="bg-slate-700/20 rounded-lg p-3 mt-2">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Explanation</p>
                                        <p className="text-slate-300 text-sm">{q.explanation}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Score badge */}
                                  <div className="ml-4">
                                    {q.is_correct !== undefined && (
                                      q.is_correct ? (
                                        <div className="flex items-center gap-1 text-green-400">
                                          <CheckCircle size={20} />
                                          <span className="text-xs font-semibold">Correct</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-red-400">
                                          <XCircle size={20} />
                                          <span className="text-xs font-semibold">Wrong</span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          No questions found for this session
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORT PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function ReportPage() {
  const { report, reset } = useInterviewStore();
  const navigate = useNavigate();

  if (!report) {
    return (
      <PageShell title="Last Report" subtitle="Your most recent interview report">
        <div className="flex flex-col items-center justify-center py-24">
          <FileText size={48} className="text-slate-700 mb-4" />
          <p className="text-slate-400 text-lg font-medium mb-2">No report available yet</p>
          <p className="text-slate-500 text-sm mb-6">Complete an interview to see your report here</p>
          <button onClick={() => navigate("/interview")} className="btn-primary flex items-center gap-2">
            <Play size={16} /> Start Interview
          </button>
        </div>
      </PageShell>
    );
  }

  const radarData = [
    { subject: "Technical",        value: report.technical_score ?? 0 },
    { subject: "Communication",    value: report.communication_score ?? 0 },
    { subject: "Problem Solving",  value: report.problem_solving_score ?? 0 },
    { subject: "Overall",          value: report.overall_score ?? 0 },
  ];

  const recMap = {
    hire:    { cls: "text-green-400 bg-green-400/10 border-green-400/30",   icon: <CheckCircle size={18} />, label: "Hire" },
    consider:{ cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", icon: <AlertCircle size={18} />, label: "Consider" },
    reject:  { cls: "text-red-400 bg-red-400/10 border-red-400/30",         icon: <XCircle size={18} />,     label: "Reject" },
  };
  const rec = recMap[report.recommendation] || recMap.consider;

  const scoreColor = report.overall_score >= 7 ? "text-green-400" : report.overall_score >= 5 ? "text-yellow-400" : "text-red-400";

  return (
    <PageShell title="Interview Report" subtitle={`${report.domain?.replace("_", " ")} · ${report.difficulty} · ${report.questions_asked} questions`}>
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Overall score */}
        <div className="card text-center">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Overall Score</p>
          <p className={`text-6xl font-black ${scoreColor}`}>{report.overall_score}</p>
          <p className="text-slate-500 text-sm mt-1">out of 10</p>
        </div>
        {/* Verdict */}
        <div className="card flex flex-col items-center justify-center">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Verdict</p>
          <span className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-lg font-bold ${rec.cls}`}>
            {rec.icon} {rec.label}
          </span>
        </div>
        {/* Sub scores */}
        <div className="card space-y-3">
          {[
            { label: "Technical",       val: report.technical_score },
            { label: "Communication",   val: report.communication_score },
            { label: "Problem Solving", val: report.problem_solving_score },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-white font-semibold">{val?.toFixed(1) ?? "—"}</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${((val ?? 0) / 10) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Radar + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-white font-semibold mb-4">Performance Radar</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="text-white font-semibold mb-3">Summary</h2>
          <p className="text-slate-300 leading-relaxed text-sm">{report.summary}</p>
          {report.duration_minutes && (
            <div className="flex items-center gap-2 mt-4 text-slate-500 text-xs">
              <Clock size={12} /> Duration: {report.duration_minutes} minutes
            </div>
          )}
        </div>
      </div>

      {/* Strengths + Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="text-green-400 font-semibold text-sm mb-4 flex items-center gap-2">
            <Star size={14} /> Key Strengths
          </h3>
          <ul className="space-y-2">
            {report.key_strengths?.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="text-yellow-400 font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={14} /> Areas to Improve
          </h3>
          <ul className="space-y-2">
            {report.areas_to_improve?.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                <span className="text-yellow-500 mt-0.5 flex-shrink-0">→</span> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => { reset(); navigate("/interview"); }} className="btn-primary flex items-center gap-2">
          <Play size={16} /> Practice Again
        </button>
        <button onClick={() => navigate("/dashboard")}
          className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-all text-sm font-medium">
          Dashboard
        </button>
        <button onClick={() => navigate("/history")}
          className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-all text-sm font-medium">
          View History
        </button>
      </div>
    </PageShell>
  );
}
