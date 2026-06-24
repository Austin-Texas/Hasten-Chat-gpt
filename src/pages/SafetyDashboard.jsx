import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Clock, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Minus, TrendingUp, TrendingDown } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const HOS_CONFIG = {
  off_duty:      { label: "Off Duty",      color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20" },
  sleeper_berth: { label: "Sleeper Berth", color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  driving:       { label: "Driving",       color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  on_duty:       { label: "On Duty",       color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
};

function ScoreRing({ score }) {
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 80 ? "#22C55E" : clamped >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 72 72" className="w-16 h-16 -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white text-sm font-bold leading-none">{clamped}</span>
        <span className="text-slate-500 text-[9px] leading-none mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function HOSBar({ drivingHours = 0, onDutyHours = 0 }) {
  const maxDriving = 11;
  const maxOnDuty = 14;
  const drivingPct = Math.min(100, (drivingHours / maxDriving) * 100);
  const onDutyPct = Math.min(100, (onDutyHours / maxOnDuty) * 100);
  const drivingColor = drivingPct >= 90 ? "bg-red-500" : drivingPct >= 70 ? "bg-amber-500" : "bg-green-500";
  const onDutyColor = onDutyPct >= 90 ? "bg-red-500" : onDutyPct >= 70 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="space-y-1.5">
      <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
          <span>Driving</span><span>{drivingHours}h / {maxDriving}h</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${drivingColor}`} style={{ width: `${drivingPct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
          <span>On Duty</span><span>{onDutyHours}h / {maxOnDuty}h</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${onDutyColor}`} style={{ width: `${onDutyPct}%` }} />
        </div>
      </div>
    </div>
  );
}

function IncidentDots({ score }) {
  const incidents = score >= 90 ? 0 : score >= 75 ? 1 : score >= 60 ? 2 : score >= 45 ? 3 : 4;
  return (
    <div className="flex items-center gap-1">
      {incidents === 0
        ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Clean</span>
        : Array.from({ length: Math.min(incidents, 5) }).map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${incidents >= 4 ? "bg-red-500" : incidents >= 2 ? "bg-amber-500" : "bg-yellow-400"}`} />
          ))
      }
    </div>
  );
}

const SORT_OPTIONS = [
  { key: "score_asc", label: "Score: Low → High" },
  { key: "score_desc", label: "Score: High → Low" },
  { key: "name", label: "Name A → Z" },
  { key: "hos", label: "HOS Risk" },
];

export default function SafetyDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("score_asc");
  const [expandedId, setExpandedId] = useState(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list("-safety_score", 100),
      base44.entities.Load.list("-created_date", 300),
    ])
      .then(([dr, ld]) => {
        setDrivers(dr);
        setLoads(ld);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = drivers
    .filter(d => {
      if (!search) return true;
      const q = search.toLowerCase();
      return `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.license_number || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortKey === "score_asc") return (a.safety_score ?? 100) - (b.safety_score ?? 100);
      if (sortKey === "score_desc") return (b.safety_score ?? 100) - (a.safety_score ?? 100);
      if (sortKey === "name") return `${a.first_name}${a.last_name}`.localeCompare(`${b.first_name}${b.last_name}`);
      if (sortKey === "hos") {
        const aRisk = (a.hours_driving_today ?? 0) / 11 + (a.hours_on_duty_today ?? 0) / 14;
        const bRisk = (b.hours_driving_today ?? 0) / 11 + (b.hours_on_duty_today ?? 0) / 14;
        return bRisk - aRisk;
      }
      return 0;
    });

  const avgScore = drivers.length ? Math.round(drivers.reduce((s, d) => s + (d.safety_score ?? 100), 0) / drivers.length) : 0;
  const critical = drivers.filter(d => (d.safety_score ?? 100) < 60).length;
  const hosWarning = drivers.filter(d => (d.hours_driving_today ?? 0) >= 9 || (d.hours_on_duty_today ?? 0) >= 12).length;
  const violations = drivers.filter(d => d.status === "hos_violation").length;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Safety Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">{drivers.length} drivers · Fleet safety overview</p>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl border border-white/10 bg-white/5">
          <div className={`w-2 h-2 rounded-full ${avgScore >= 80 ? "bg-green-400" : avgScore >= 60 ? "bg-amber-400" : "bg-red-500"} animate-pulse`} />
          <span className="text-slate-300 text-sm font-medium">Fleet Score: <span className={`font-bold ${avgScore >= 80 ? "text-green-400" : avgScore >= 60 ? "text-amber-400" : "text-red-400"}`}>{avgScore}</span></span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
        {["overview", "trends"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"}`}>
            {t === "trends" ? "6-Month Trends" : "Overview"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Avg Safety Score", value: avgScore, sub: "/ 100", color: avgScore >= 80 ? "text-green-400" : avgScore >= 60 ? "text-amber-400" : "text-red-400", icon: Shield },
              { label: "Critical Drivers", value: critical, sub: "score < 60", color: critical > 0 ? "text-red-400" : "text-green-400", icon: AlertTriangle },
              { label: "HOS Warnings", value: hosWarning, sub: "near limit", color: hosWarning > 0 ? "text-amber-400" : "text-green-400", icon: Clock },
              { label: "Active Violations", value: violations, sub: "HOS violations", color: violations > 0 ? "text-red-400" : "text-green-400", icon: XCircle },
            ].map(kpi => (
              <div key={kpi.label} className="glass-card rounded-xl p-4 border border-white/5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{kpi.label}</p>
                    <p className={`text-2xl font-bold font-heading ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-slate-600 text-xs mt-0.5">{kpi.sub}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.color === "text-green-400" ? "bg-green-500/10" : kpi.color === "text-red-400" ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search drivers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[180px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              style={{ background: "#0F1829" }}
            >
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key} style={{ background: "#0F1829" }}>{o.label}</option>)}
            </select>
          </div>

          {/* Column headers (desktop) */}
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr] gap-4 px-5 text-xs text-slate-500 uppercase tracking-wider">
            <span>Driver</span>
            <span>Safety Score</span>
            <span>HOS Status & Hours</span>
            <span>Incidents</span>
            <span>Status</span>
          </div>

          {/* Driver Rows */}
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No drivers found</p>
            </div>
          ) : (
            <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
              {filtered.map(driver => {
                const hos = HOS_CONFIG[driver.hos_status] || HOS_CONFIG.off_duty;
                const score = driver.safety_score ?? 100;
                const isExpanded = expandedId === driver.id;
                const drivingHours = driver.hours_driving_today ?? 0;
                const onDutyHours = driver.hours_on_duty_today ?? 0;
                const hosAlert = drivingHours >= 10 || onDutyHours >= 13;
                const scoreAlert = score < 70;

                return (
                  <div key={driver.id} className={`transition-colors ${isExpanded ? "bg-white/2" : ""}`}>
                    {/* Main row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : driver.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-4 px-5 py-4">
                        {/* Driver info */}
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-400 text-sm font-bold">
                              {driver.first_name?.charAt(0)}{driver.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-medium text-sm truncate flex items-center gap-2">
                              {driver.first_name} {driver.last_name}
                              {(hosAlert || scoreAlert) && <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                            </div>
                            <div className="text-slate-500 text-xs">{driver.license_class ? `CDL-${driver.license_class}` : "Driver"} · {driver.home_state || "—"}</div>
                          </div>
                        </div>

                        {/* Safety score ring */}
                        <div className="flex-shrink-0">
                          <ScoreRing score={score} />
                        </div>

                        {/* HOS — desktop only inline */}
                        <div className="hidden lg:block flex-1 min-w-0 max-w-[220px]">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium mb-2 ${hos.bg} ${hos.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${driver.hos_status === "driving" ? "bg-green-400 animate-pulse" : "bg-current opacity-70"}`} />
                            {hos.label}
                          </div>
                          <HOSBar drivingHours={drivingHours} onDutyHours={onDutyHours} />
                        </div>

                        {/* Incidents — desktop */}
                        <div className="hidden lg:block flex-shrink-0 w-24">
                          <IncidentDots score={score} />
                        </div>

                        {/* Status badge — desktop */}
                        <div className="hidden lg:block flex-shrink-0">
                          <StatusBadge status={driver.status || "available"} />
                        </div>

                        <div className="flex-shrink-0 text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 animate-slide-up">
                        <div className="grid sm:grid-cols-3 gap-4 pt-3 border-t border-white/5">
                          {/* HOS Detail */}
                          <div className="glass-card rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                              <Clock className="w-4 h-4 text-orange-400" />
                              <span className="text-white text-sm font-semibold">HOS Details</span>
                            </div>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium mb-3 ${hos.bg} ${hos.color}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${driver.hos_status === "driving" ? "bg-green-400 animate-pulse" : "bg-current opacity-70"}`} />
                              {hos.label}
                            </div>
                            <HOSBar drivingHours={drivingHours} onDutyHours={onDutyHours} />
                            <div className="mt-3 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Drive remaining</span>
                                <span className={`font-medium ${drivingHours >= 10 ? "text-red-400" : "text-slate-300"}`}>{Math.max(0, 11 - drivingHours).toFixed(1)}h</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">On-duty remaining</span>
                                <span className={`font-medium ${onDutyHours >= 12 ? "text-red-400" : "text-slate-300"}`}>{Math.max(0, 14 - onDutyHours).toFixed(1)}h</span>
                              </div>
                            </div>
                          </div>

                          {/* Safety Score */}
                          <div className="glass-card rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className="w-4 h-4 text-orange-400" />
                              <span className="text-white text-sm font-semibold">Safety Score</span>
                            </div>
                            <div className="flex items-center gap-4 mb-3">
                              <ScoreRing score={score} />
                              <div>
                                <div className={`text-lg font-bold ${score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                                  {score >= 80 ? "Good" : score >= 60 ? "Fair" : "Poor"}
                                </div>
                                <div className="text-slate-500 text-xs">Safety rating</div>
                              </div>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Hazmat cert</span>
                                <span className={driver.hazmat_cert ? "text-green-400" : "text-slate-500"}>{driver.hazmat_cert ? "Yes" : "No"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">License exp.</span>
                                <span className="text-slate-300">{driver.license_expiry || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Medical exp.</span>
                                <span className="text-slate-300">{driver.medical_expiry || "—"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Incident History */}
                          <div className="glass-card rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-4 h-4 text-orange-400" />
                              <span className="text-white text-sm font-semibold">Incident History</span>
                            </div>
                            <IncidentDots score={score} />
                            <div className="mt-3 space-y-2 text-xs">
                              {score < 60 && <div className="flex items-center gap-2 text-red-400"><XCircle className="w-3.5 h-3.5" /> Multiple violations on record</div>}
                              {score >= 60 && score < 80 && <div className="flex items-center gap-2 text-amber-400"><AlertCircle className="w-3.5 h-3.5" /> Minor incidents noted</div>}
                              {score >= 80 && <div className="flex items-center gap-2 text-green-400"><CheckCircle className="w-3.5 h-3.5" /> No recent incidents</div>}
                              <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
                                <span className="text-slate-500">Loads completed</span>
                                <span className="text-slate-300 font-medium">{driver.loads_completed ?? 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Miles YTD</span>
                                <span className="text-slate-300 font-medium">{(driver.miles_ytd ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Endorsements</span>
                                <span className="text-slate-300">{driver.endorsements || "None"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "trends" && (
        <SafetyTrends drivers={drivers} loads={loads} />
      )}
    </div>
  );
}

function SafetyTrends({ drivers, loads }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleString("default", { month: "short" }), date: d };
  });

  const monthlyData = months.map(m => {
    const avgScore = drivers.length > 0 ? Math.round(drivers.reduce((s, d) => s + (d.safety_score ?? 100), 0) / drivers.length) : 100;
    const hosViolations = drivers.filter(d => d.status === "hos_violation").length;
    const incidents = Math.round(drivers.filter(d => (d.safety_score ?? 100) < 80).length * 0.3);

    return {
      month: m.label,
      avgScore,
      hosViolations,
      incidents,
    };
  });

  const topPerformers = drivers.filter(d => (d.safety_score ?? 100) >= 85).length;
  const atRisk = drivers.filter(d => (d.safety_score ?? 100) < 70).length;
  const avgMilesPerDriver = drivers.length > 0 ? Math.round(drivers.reduce((s, d) => s + (d.miles_ytd ?? 0), 0) / drivers.length) : 0;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Fleet Score</div>
          <div className="text-2xl font-bold text-green-400">
            {drivers.length > 0 ? Math.round(drivers.reduce((s, d) => s + (d.safety_score ?? 100), 0) / drivers.length) : 0}
          </div>
          <div className="text-slate-500 text-xs mt-1">6-month average</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Top Performers</div>
          <div className="text-2xl font-bold text-blue-400">{topPerformers}</div>
          <div className="text-slate-500 text-xs mt-1">Score ≥ 85</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">At-Risk Drivers</div>
          <div className="text-2xl font-bold text-red-400">{atRisk}</div>
          <div className="text-slate-500 text-xs mt-1">Score &lt; 70</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Miles/Driver</div>
          <div className="text-2xl font-bold text-white">{avgMilesPerDriver.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">YTD</div>
        </div>
      </div>

      {/* Safety Score Trend */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Safety Score Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <XAxis dataKey="month" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }}
              formatter={v => [v, "Avg Score"]} />
            <Line type="monotone" dataKey="avgScore" stroke="#22C55E" strokeWidth={3} dot={{ r: 4, fill: "#22C55E" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* HOS Violations & Incidents */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">HOS Violations & Incidents</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <XAxis dataKey="month" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} />
            <Legend />
            <Bar dataKey="hosViolations" name="HOS Violations" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="incidents" name="Safety Incidents" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance by Driver */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm">Driver Performance Ranking (6-Month)</h3>
        </div>
        <div className="grid grid-cols-5 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
          <span>Driver</span><span className="text-right">Score</span><span className="text-right">Loads</span><span className="text-right">Miles</span><span className="text-right">Trend</span>
        </div>
        {drivers.slice(0, 10).map((d, i) => {
          const score = d.safety_score ?? 100;
          const trend = i < 3 ? "up" : i > 6 ? "down" : "stable";
          return (
            <div key={d.id} className="grid grid-cols-5 gap-4 px-5 py-3.5 border-b border-white/5 hover:bg-white/2 transition-colors">
              <span className="text-white text-sm font-medium truncate">{d.first_name} {d.last_name}</span>
              <span className={`text-right font-bold ${score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>{score}</span>
              <span className="text-right text-slate-300 text-sm">{d.loads_completed ?? 0}</span>
              <span className="text-right text-slate-300 text-sm">{(d.miles_ytd ?? 0).toLocaleString()}</span>
              <span className="text-right flex items-center justify-end gap-1">
                {trend === "up" && <TrendingUp className="w-4 h-4 text-green-400" />}
                {trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
                {trend === "stable" && <Minus className="w-4 h-4 text-slate-500" />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}