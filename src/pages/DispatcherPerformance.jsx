import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Clock, DollarSign, Package, Loader2, Users } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";

const COMPLETED_STATUSES = ["delivered", "pod_uploaded", "completed"];

export default function DispatcherPerformance() {
  const [loads, setLoads] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  useEffect(() => {
    Promise.all([
      base44.entities.Load.list("-created_date", 500),
      base44.entities.UserProfile.filter({ businessRole: "dispatcher" }, "-created_date", 100),
    ])
      .then(([ld, dp]) => {
        setLoads(ld);
        setDispatchers(dp);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cutoff = useMemo(() => {
    const d = new Date();
    if (dateRange === "7d") d.setDate(d.getDate() - 7);
    else if (dateRange === "30d") d.setDate(d.getDate() - 30);
    else if (dateRange === "90d") d.setDate(d.getDate() - 90);
    return d;
  }, [dateRange]);

  const filteredLoads = useMemo(
    () => loads.filter(l => new Date(l.created_date) >= cutoff),
    [loads, cutoff]
  );

  const dispatcherName = (id) => {
    const dp = dispatchers.find(d => d.id === id || d.authUserId === id);
    return dp?.fullName || dp?.email || (id ? `Dispatcher ${id.slice(-4)}` : "Unassigned");
  };

  // ── Daily load volume ──
  const dailyVolume = useMemo(() => {
    const map = {};
    filteredLoads.forEach(l => {
      const day = new Date(l.created_date).toISOString().slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map)
      .map(([date, count]) => ({ date, loads: count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredLoads]);

  // ── Per-dispatcher metrics ──
  const perDispatcher = useMemo(() => {
    const stats = {};
    filteredLoads.forEach(l => {
      const key = l.dispatcher_id || "unassigned";
      if (!stats[key]) stats[key] = { id: key, name: dispatcherName(l.dispatcher_id), loads: 0, completed: 0, revenue: 0, turnaroundHours: [], };
      stats[key].loads++;
      if (COMPLETED_STATUSES.includes(l.status)) {
        stats[key].completed++;
        stats[key].revenue += l.rate || l.total_revenue || 0;
      }
      if (l.actual_pickup && l.actual_delivery) {
        const hrs = (new Date(l.actual_delivery) - new Date(l.actual_pickup)) / (1000 * 60 * 60);
        if (hrs > 0 && hrs < 720) stats[key].turnaroundHours.push(hrs);
      }
    });
    return Object.values(stats)
      .map(s => ({
        ...s,
        avgTurnaround: s.turnaroundHours.length
          ? Math.round((s.turnaroundHours.reduce((a, b) => a + b, 0) / s.turnaroundHours.length) * 10) / 10
          : 0,
        revenue: Math.round(s.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredLoads, dispatchers]);

  // ── KPIs ──
  const totalRevenue = perDispatcher.reduce((s, d) => s + d.revenue, 0);
  const allTurnaround = perDispatcher.flatMap(d => d.turnaroundHours);
  const avgTurnaround = allTurnaround.length
    ? Math.round((allTurnaround.reduce((a, b) => a + b, 0) / allTurnaround.length) * 10) / 10
    : 0;
  const totalCompleted = perDispatcher.reduce((s, d) => s + d.completed, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  const tooltipStyle = {
    background: "#0F1829",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "8px",
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Dispatcher Performance</h1>
          <p className="text-slate-400 text-sm mt-0.5">Daily volume, turnaround times & processed revenue by dispatcher</p>
        </div>
        <div className="flex gap-2 p-1 rounded-lg bg-white/5 border border-white/5">
          {["7d", "30d", "90d"].map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                dateRange === r ? "bg-green-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue (Processed)" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" />
        <KpiCard label="Completed Loads" value={totalCompleted} icon={Package} color="blue" />
        <KpiCard label="Avg Turnaround" value={`${avgTurnaround}h`} icon={Clock} color="orange" />
        <KpiCard label="Active Dispatchers" value={perDispatcher.filter(d => d.loads > 0).length} icon={Users} color="cyan" />
      </div>

      {/* Daily load volume chart */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white font-heading font-semibold mb-4">Daily Load Volume</h2>
        {dailyVolume.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No load data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyVolume} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={d => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                formatter={v => [v, "Loads"]}
              />
              <Line type="monotone" dataKey="loads" stroke="#00E678" strokeWidth={2} dot={{ r: 3, fill: "#00E678" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-dispatcher table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold">Dispatcher Breakdown</h2>
        </div>
        {perDispatcher.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No dispatcher activity in this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 font-semibold">Dispatcher</th>
                  <th className="text-right text-slate-400 font-semibold">Total Loads</th>
                  <th className="text-right text-slate-400 font-semibold">Completed</th>
                  <th className="text-right text-slate-400 font-semibold">Processed Revenue</th>
                  <th className="text-right text-slate-400 font-semibold">Avg Turnaround</th>
                </tr>
              </thead>
              <tbody>
                {perDispatcher.map(d => (
                  <tr key={d.id} className="hover:bg-white/3 transition-colors">
                    <td className="text-white font-medium">{d.name}</td>
                    <td className="text-right text-slate-300">{d.loads}</td>
                    <td className="text-right text-blue-400 font-medium">{d.completed}</td>
                    <td className="text-right text-green-400 font-medium">${d.revenue.toLocaleString()}</td>
                    <td className="text-right text-orange-400 font-medium">{d.avgTurnaround > 0 ? `${d.avgTurnaround}h` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue per dispatcher bar chart */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white font-heading font-semibold mb-4">Processed Revenue by Dispatcher</h2>
        {perDispatcher.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No revenue data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={perDispatcher} margin={{ top: 0, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={v => [`$${v.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#00E678" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Turnaround time per dispatcher */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white font-heading font-semibold mb-4">Avg Driver Turnaround Time by Dispatcher</h2>
        {perDispatcher.filter(d => d.avgTurnaround > 0).length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No turnaround data (requires completed loads with pickup & delivery timestamps)</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={perDispatcher.filter(d => d.avgTurnaround > 0)} margin={{ top: 0, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={v => [`${v}h`, "Avg Turnaround"]}
              />
              <Bar dataKey="avgTurnaround" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}