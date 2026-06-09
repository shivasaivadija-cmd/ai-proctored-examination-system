import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { adminAPI } from "../services/api";
import { useAuthStore, useInterviewStore } from "../store";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Shield, Users, Mic, CheckCircle, AlertTriangle, Phone,
  Eye, LogOut, LayoutDashboard, History, FileText, Brain,
  ChevronRight, ChevronDown, RefreshCw, Award, TrendingUp,
  XCircle, Activity, TabletSmartphone, UserX, Monitor,
} from "lucide-react";
import toast from "react-hot-toast";

const DOMAIN_ICONS = { frontend: "🎨", backend: "⚙️", fullstack: "🔧", data_analyst: "📊", devops: "🚀", hr: "🤝" };
const VIOLATION_ICONS = { phone: "📱", no_face: "👤", multiple_faces: "👥", tab_switch: "🖥️" };
const VIOLATION_COLORS = { phone: "bg-red-100 text-red-700 border-red-300", no_face: "bg-amber-100 text-amber-700 border-amber-300", multiple_faces: "bg-red-100 text-red-700 border-red-300", tab_switch: "bg-blue-100 text-blue-700 border-blue-300" };
const SEVERITY_COLORS = { high: "bg-red-500", medium: "bg-amber-400", low: "bg-green-400" };
const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

function AdminSidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = [
    { path: "/admin",           icon: Shield,          label: "Admin Overview" },
    { path: "/admin/students",  icon: Users,           label: "Students" },
    { path: "/admin/sessions",  icon: Mic,             label: "All Sessions" },
    { path: "/admin/violations",icon: AlertTriangle,   label: "Violations" },
    { path: "/dashboard",       icon: LayoutDashboard, label: "Student View" },
  ];
  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-slate-900 border-r border-slate-700 flex flex-col z-50">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center"><Shield size={16} className="text-white" /></div>
        <div><div className="text-white font-bold text-sm">Admin Panel</div><div className="text-slate-500 text-xs">Proctoring Control</div></div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-2">Admin</p>
        {nav.map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all
              ${location.pathname === path ? "bg-red-700 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
            <Icon size={15} />{label}
          </Link>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-slate-700">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800 mb-2">
          <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase() || "A"}</div>
          <div className="flex-1 min-w-0"><p className="text-white text-xs font-semibold truncate">{user?.name}</p><p className="text-red-400 text-xs">Administrator</p></div>
        </div>
        <button onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-slate-400 hover:text-red-400 hover:bg-red-900/20 text-xs transition-all">
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={22} className={color} />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800">{value}</p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ViolationBadge({ type }) {
  const cls = VIOLATION_COLORS[type] || "bg-slate-100 text-slate-600 border-slate-300";
  const icon = VIOLATION_ICONS[type] || "⚠";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${cls}`}>
      {icon} {type?.replace("_", " ").toUpperCase()}
    </span>
  );
}

function ScorePill({ score }) {
  const s = parseFloat(score) || 0;
  const cls = s >= 7 ? "bg-green-100 text-green-700" : s >= 5 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${cls}`}>{s.toFixed(1)}/10</span>;
}

function RecBadge({ rec }) {
  if (!rec) return <span className="text-slate-400 text-xs">—</span>;
  const map = { hire: "bg-green-100 text-green-700", consider: "bg-amber-100 text-amber-700", reject: "bg-red-100 text-red-700" };
  return <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${map[rec] || map.consider}`}>{rec}</span>;
}

// ── Admin Overview ─────────────────────────────────────────────────────────────
export function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [violations, setViolations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    Promise.all([adminAPI.getStats(), adminAPI.getViolations(), adminAPI.getSessions()])
      .then(([s, v, se]) => { setStats(s.data); setViolations(v.data.slice(0, 50)); setSessions(se.data.slice(0, 50)); })
      .catch(() => toast.error("Failed to load admin data"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) return (
    <div className="min-h-screen bg-slate-100"><AdminSidebar />
      <main className="ml-56 p-6 flex items-center justify-center min-h-screen">
        <div className="text-center"><RefreshCw size={36} className="animate-spin text-indigo-600 mx-auto mb-3" /><p className="text-slate-600">Loading admin data...</p></div>
      </main>
    </div>
  );

  // Violation breakdown for pie
  const violationBreakdown = violations.reduce((acc, v) => {
    acc[v.violation_type] = (acc[v.violation_type] || 0) + 1; return acc;
  }, {});
  const pieData = Object.entries(violationBreakdown).map(([name, value]) => ({ name: name.replace("_", " "), value }));

  // Score distribution
  const scoreDist = [0, 0, 0, 0, 0];
  sessions.forEach(s => { const idx = Math.min(Math.floor(s.total_score / 2), 4); scoreDist[idx]++; });
  const scoreChartData = ["0-2", "2-4", "4-6", "6-8", "8-10"].map((l, i) => ({ range: l, count: scoreDist[i] }));

  // Domain distribution
  const domainDist = sessions.reduce((acc, s) => { acc[s.domain] = (acc[s.domain] || 0) + 1; return acc; }, {});
  const domainData = Object.entries(domainDist).map(([d, c]) => ({ domain: d.replace("_", " "), count: c }));

  // Recent violations (last 10)
  const recentViolations = violations.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar />
      <main className="ml-56 p-6">
        {/* Header */}
        <div className="bg-red-700 text-white rounded-lg px-6 py-4 mb-6 flex items-center gap-4">
          <Shield size={28} />
          <div>
            <h1 className="text-xl font-bold">Admin Control Panel</h1>
            <p className="text-red-200 text-sm">Real-time student monitoring & proctoring oversight</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-white/10 rounded px-3 py-1.5 text-xs font-semibold">
            <Activity size={14} /> LIVE MONITORING
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Students" value={stats?.total_students ?? 0} sub="Registered" icon={Users} color="text-indigo-600" bg="bg-indigo-100" />
          <StatCard label="Total Sessions" value={stats?.total_sessions ?? 0} sub={`${stats?.completed_sessions ?? 0} completed`} icon={Mic} color="text-green-600" bg="bg-green-100" />
          <StatCard label="Avg Score" value={`${stats?.avg_score ?? 0}/10`} sub={`${stats?.hire_rate ?? 0}% hire rate`} icon={TrendingUp} color="text-amber-600" bg="bg-amber-100" />
          <StatCard label="Violations" value={stats?.total_violations ?? 0} sub={`${stats?.phone_violations ?? 0} phone detected`} icon={AlertTriangle} color="text-red-600" bg="bg-red-100" />
        </div>

        {/* Violation stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Phone Detected",   value: stats?.phone_violations ?? 0,         icon: Phone,          color: "text-red-600",   bg: "bg-red-50",     sub: "HIGH severity" },
            { label: "No Face",           value: violations.filter(v=>v.violation_type==="no_face").length, icon: UserX, color: "text-amber-600", bg: "bg-amber-50", sub: "MEDIUM severity" },
            { label: "Multiple Persons",  value: violations.filter(v=>v.violation_type==="multiple_faces").length, icon: Users, color: "text-red-600", bg: "bg-red-50", sub: "HIGH severity" },
            { label: "Tab Switches",      value: violations.filter(v=>v.violation_type==="tab_switch").length, icon: Monitor, color: "text-blue-600", bg: "bg-blue-50", sub: "MEDIUM severity" },
          ].map(c => <StatCard key={c.label} {...c} />)}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><TrendingUp size={15} className="text-indigo-500" /> Score Distribution</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={scoreChartData}>
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 6, color: "#fff", fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><Mic size={15} className="text-green-500" /> Sessions by Domain</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={domainData}>
                <XAxis dataKey="domain" tick={{ fontSize: 9, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 6, color: "#fff", fontSize: 12 }} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-red-500" /> Violation Types</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={55} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={9}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 6, color: "#fff", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No violations yet</div>}
          </div>
        </div>

        {/* Recent violations */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><AlertTriangle size={15} className="text-red-500" /> Recent Violations</h3>
            <Link to="/admin/violations" className="text-indigo-600 text-xs font-semibold hover:underline flex items-center gap-1">View all <ChevronRight size={12} /></Link>
          </div>
          {recentViolations.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">No violations recorded</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentViolations.map(v => (
                <div key={v.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_COLORS[v.severity] || "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{v.student_name}</span>
                      <span className="text-xs text-slate-400">{v.domain}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{v.description || v.violation_type}</p>
                  </div>
                  <ViolationBadge type={v.violation_type} />
                  <span className="text-xs text-slate-400 flex-shrink-0">{new Date(v.detected_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Mic size={15} className="text-indigo-500" /> Recent Sessions</h3>
            <Link to="/admin/sessions" className="text-indigo-600 text-xs font-semibold hover:underline flex items-center gap-1">View all <ChevronRight size={12} /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {sessions.slice(0, 8).map(s => (
              <div key={s.session_id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                <span className="text-lg">{DOMAIN_ICONS[s.domain] || "💼"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{s.student_name}</span>
                    <span className="text-xs text-slate-400 capitalize">{s.domain.replace("_", " ")} · {s.difficulty}</span>
                  </div>
                  <p className="text-xs text-slate-400">{new Date(s.started_at).toLocaleString()}</p>
                </div>
                <ScorePill score={s.total_score} />
                <RecBadge rec={s.recommendation} />
                {s.violation_count > 0 && (
                  <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-xs font-bold">
                    <AlertTriangle size={11} /> {s.violation_count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Students Page ──────────────────────────────────────────────────────────────
export function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState({});
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    adminAPI.getStudents()
      .then(r => setStudents(r.data))
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const toggleStudent = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (detail[id]) return;
    try {
      const res = await adminAPI.getStudentDetail(id);
      setDetail(prev => ({ ...prev, [id]: res.data }));
    } catch { toast.error("Failed to load student details"); }
  };

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar />
      <main className="ml-56 p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-xl font-bold text-slate-800">Students</h1><p className="text-slate-500 text-sm">{students.length} registered students</p></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
        </div>

        {loading ? <div className="flex justify-center py-12"><RefreshCw size={28} className="animate-spin text-indigo-500" /></div> : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Student", "Sessions", "Avg Score", "Best", "Violations", "Phones", "Hire Count", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <>
                    <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => toggleStudent(s.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{s.name[0]?.toUpperCase()}</div>
                          <div><p className="font-semibold text-slate-800">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.total_sessions} <span className="text-slate-400 text-xs">({s.completed_sessions} done)</span></td>
                      <td className="px-4 py-3"><ScorePill score={s.avg_score} /></td>
                      <td className="px-4 py-3"><ScorePill score={s.best_score} /></td>
                      <td className="px-4 py-3">
                        {s.total_violations > 0
                          ? <span className="flex items-center gap-1 text-red-600 font-bold"><AlertTriangle size={13} /> {s.total_violations}</span>
                          : <span className="text-green-600 font-semibold text-xs">Clean</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.phone_violations > 0
                          ? <span className="flex items-center gap-1 text-red-700 font-bold text-xs bg-red-50 px-2 py-0.5 rounded border border-red-200">📱 {s.phone_violations}</span>
                          : <span className="text-slate-400 text-xs">0</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.hire_count > 0
                          ? <span className="text-green-700 font-bold text-xs">✅ {s.hire_count}</span>
                          : <span className="text-slate-400 text-xs">0</span>}
                      </td>
                      <td className="px-4 py-3"><ChevronRight size={16} className={`text-slate-400 transition-transform ${expanded === s.id ? "rotate-90" : ""}`} /></td>
                    </tr>

                    {expanded === s.id && (
                      <tr key={`${s.id}-detail`}>
                        <td colSpan={8} className="bg-slate-50 border-t border-slate-200 px-6 py-4">
                          {!detail[s.id] ? (
                            <div className="flex items-center gap-2 text-slate-500 text-sm"><RefreshCw size={14} className="animate-spin" /> Loading...</div>
                          ) : (
                            <div>
                              <h4 className="font-bold text-slate-700 mb-3 text-sm">Session History ({detail[s.id].sessions?.length})</h4>
                              <div className="space-y-2">
                                {detail[s.id].sessions?.map(sess => (
                                  <div key={sess.session_id} className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-4">
                                    <span className="text-base">{DOMAIN_ICONS[sess.domain] || "💼"}</span>
                                    <div className="flex-1">
                                      <span className="text-sm font-semibold text-slate-700 capitalize">{sess.domain.replace("_", " ")}</span>
                                      <span className="text-xs text-slate-400 ml-2">{sess.difficulty} · {sess.questions_asked}Q</span>
                                    </div>
                                    <ScorePill score={sess.total_score} />
                                    <RecBadge rec={sess.recommendation} />
                                    {sess.violation_count > 0 && (
                                      <div className="flex gap-1 flex-wrap">
                                        {sess.violations.map((v, i) => <ViolationBadge key={i} type={v.type} />)}
                                      </div>
                                    )}
                                    <span className="text-xs text-slate-400">{sess.started_at ? new Date(sess.started_at).toLocaleDateString() : "—"}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Violations Page ────────────────────────────────────────────────────────────
export function AdminViolationsPage() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    adminAPI.getViolations()
      .then(r => setViolations(r.data))
      .catch(() => toast.error("Failed to load violations"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const types = ["all", "phone", "no_face", "multiple_faces", "tab_switch"];
  const filtered = filter === "all" ? violations : violations.filter(v => v.violation_type === filter);

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar />
      <main className="ml-56 p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Proctoring Violations</h1>
          <p className="text-slate-500 text-sm">{violations.length} total violations recorded</p>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all
                ${filter === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"}`}>
              {t === "all" ? `All (${violations.length})` : `${VIOLATION_ICONS[t] || "⚠"} ${t.replace("_", " ")} (${violations.filter(v => v.violation_type === t).length})`}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-12"><RefreshCw size={28} className="animate-spin text-indigo-500" /></div> : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["#", "Student", "Domain", "Violation", "Severity", "Description", "Time"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v, i) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{v.student_name}</p>
                      <p className="text-xs text-slate-400">{v.student_email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 capitalize text-xs">{v.domain?.replace("_", " ")}</td>
                    <td className="px-4 py-2.5"><ViolationBadge type={v.violation_type} /></td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${SEVERITY_COLORS[v.severity] || "bg-slate-400"}`}>
                        {v.severity?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs truncate">{v.description || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">{v.detected_at ? new Date(v.detected_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No violations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sessions Page ──────────────────────────────────────────────────────────────
export function AdminSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    adminAPI.getSessions()
      .then(r => setSessions(r.data))
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const filtered = filter === "all" ? sessions : sessions.filter(s => s.status === filter);

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar />
      <main className="ml-56 p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">All Sessions</h1>
          <p className="text-slate-500 text-sm">{sessions.length} total sessions</p>
        </div>

        <div className="flex gap-2 mb-4">
          {[["all", "All"], ["completed", "Completed"], ["active", "Active"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                ${filter === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"}`}>
              {l} ({v === "all" ? sessions.length : sessions.filter(s => s.status === v).length})
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-12"><RefreshCw size={28} className="animate-spin text-indigo-500" /></div> : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Student", "Domain", "Difficulty", "Score", "Verdict", "Q's", "Violations", "Status", "Date"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s.session_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{s.student_name}</p>
                      <p className="text-xs text-slate-400">{s.student_email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 capitalize">{DOMAIN_ICONS[s.domain]} {s.domain?.replace("_", " ")}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 capitalize">{s.difficulty}</td>
                    <td className="px-4 py-2.5"><ScorePill score={s.total_score} /></td>
                    <td className="px-4 py-2.5"><RecBadge rec={s.recommendation} /></td>
                    <td className="px-4 py-2.5 text-slate-600 text-xs">{s.questions_asked}</td>
                    <td className="px-4 py-2.5">
                      {s.violation_count > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.violations.slice(0, 2).map((v, i) => <ViolationBadge key={i} type={v.type} />)}
                          {s.violations.length > 2 && <span className="text-xs text-slate-400">+{s.violations.length - 2}</span>}
                        </div>
                      ) : <span className="text-green-600 text-xs font-semibold">Clean</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{s.started_at ? new Date(s.started_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No sessions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
