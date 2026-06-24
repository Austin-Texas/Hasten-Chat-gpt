import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, MapPin, Zap, Loader2 } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";

export default function DispatcherAnalytics() {
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  useEffect(() => {
    Promise.all([
      base44.entities.Load.list("-created_date", 500),
      base44.entities.Driver.list("-created_date", 200),
    ])
      .then(([ld, dr]) => {
        setLoads(ld);
        setDrivers(dr);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter by date range
  const getFilteredLoads = () => {
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === "7d") cutoff.setDate(cutoff.getDate() - 7);
    else if (dateRange === "30d") cutoff.setDate(cutoff.getDate() - 30);
    else if (dateRange === "90d") cutoff.setDate(cutoff.getDate() - 90);
    
    return loads.filter(l => new Date(l.created_date) >= cutoff);
  };

  const filteredLoads = getFilteredLoads();
  const completedLoads = filteredLoads.filter(l => ["delivered", "pod_uploaded", "completed"].includes(l.status));

  // ━━━ LOAD COMPLETION TIMES ━━━
  const getCompletionTimes = () => {
    return completedLoads
      .filter(l => l.actual_pickup && l.actual_delivery)
      .map(l => {
        const pickup = new Date(l.actual_pickup);
        const delivery = new Date(l.actual_delivery);
        const hours = (delivery - pickup) / (1000 * 60 * 60);
        return { load_id: l.load_number || `#${l.id.slice(-4)}`, hours: Math.round(hours * 10) / 10, miles: l.miles || 0 };
      })
      .sort((a, b) => a.hours - b.hours);
  };

  const completionTimes = getCompletionTimes();
  const avgCompletionTime = completionTimes.length > 0 
    ? Math.round(completionTimes.reduce((s, c) => s + c.hours, 0) / completionTimes.length * 10) / 10
    : 0;

  // ━━━ REGIONAL FREIGHT DENSITY ━━━
  const getRegionalDensity = () => {
    const regional = {};
    filteredLoads.forEach(l => {
      const region = `${l.destination_state || "?"}`;
      regional[region] = (regional[region] || 0) + 1;
    });
    return Object.entries(regional)
      .map(([state, count]) => ({ state, loads: count }))
      .sort((a, b) => b.loads - a.loads)
      .slice(0, 10);
  };

  const regionalData = getRegionalDensity();

  // ━━━ DISPATCH EFFICIENCY ━━━
  const getEfficiencyMetrics = () => {
    const total = filteredLoads.length;
    const completed = completedLoads.length;
    const assigned = filteredLoads.filter(l => ["assigned", "accepted"].includes(l.status)).length;
    const in_transit = filteredLoads.filter(l => ["en_route", "in_transit", "arrived_pickup", "loaded", "arrived_delivery"].includes(l.status)).length;
    const cancelled = filteredLoads.filter(l => l.status === "cancelled").length;

    return {
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      assigned_rate: total > 0 ? Math.round((assigned / total) * 100) : 0,
      in_transit_rate: total > 0 ? Math.round((in_transit / total) * 100) : 0,
      cancellation_rate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    };
  };

  const efficiency = getEfficiencyMetrics();

  // ━━━ HOURLY LOAD DISTRIBUTION ━━━
  const getHourlyDistribution = () => {
    const hourly = {};
    for (let i = 0; i < 24; i++) hourly[i] = 0;
    
    filteredLoads.forEach(l => {
      const hour = new Date(l.created_date).getHours();
      hourly[hour]++;
    });

    return Object.entries(hourly).map(([hour, count]) => ({
      hour: `${hour}:00`,
      loads: count,
    }));
  };

  const hourlyData = getHourlyDistribution();

  // ━━━ DRIVER PERFORMANCE SCATTER ━━━
  const getDriverPerformance = () => {
    return drivers
      .filter(d => d.loads_completed > 0)
      .map(d => ({
        name: `${d.first_name} ${d.last_name}`,
        loads: d.loads_completed,
        safety_score: d.safety_score || 100,
      }))
      .slice(0, 20);
  };

  const driverPerf = getDriverPerformance();

  // ━━━ STATUS BREAKDOWN ━━━
  const getStatusBreakdown = () => {
    const statuses = {};
    filteredLoads.forEach(l => {
      const status = l.status || "unknown";
      statuses[status] = (statuses[status] || 0) + 1;
    });
    return Object.entries(statuses).map(([status, count]) => ({
      name: status.replace(/_/g, " "),
      value: count,
    }));
  };

  const statusData = getStatusBreakdown();
  const COLORS = ["#EA580C", "#F97316", "#3B82F6", "#22C55E", "#A855F7", "#06B6D4", "#EAB308", "#F43F5E", "#14B8A6"];

  // ━━━ AVERAGE LOAD VALUE ━━━
  const avgLoadValue = filteredLoads.length > 0
    ? Math.round(filteredLoads.reduce((s, l) => s + (l.rate || 0), 0) / filteredLoads.length)
    : 0;

  // ━━━ UTILIZATION ━━━
  const activeDrivers = drivers.filter(d => d.status !== "inactive").length;
  const assignedDrivers = filteredLoads.filter(l => l.driver_id && ["assigned", "accepted", "en_route", "in_transit"].includes(l.status)).length;
  const utilization = activeDrivers > 0 ? Math.round((assignedDrivers / activeDrivers) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Dispatch Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Load completion, regional density & efficiency metrics</p>
        </div>
        <div className="flex gap-2 p-1 rounded-lg bg-white/5 border border-white/5">
          {["7d", "30d", "90d"].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                dateRange === range
                  ? "bg-orange-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {range === "7d" ? "7d" : range === "30d" ? "30d" : "90d"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Avg Completion Time" value={`${avgCompletionTime}h`} icon={Clock} color="blue" />
        <KpiCard label="Completion Rate" value={`${efficiency.completion_rate}%`} icon={TrendingUp} color="green" />
        <KpiCard label="Regional Hubs" value={regionalData.length} icon={MapPin} color="cyan" />
        <KpiCard label="Fleet Utilization" value={`${utilization}%`} icon={Zap} color="orange" />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie: Status Distribution */}
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-heading font-semibold mb-4">Load Status Breakdown</h2>
          {statusData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No load data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.slice(0, 8)} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar: Regional Density */}
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-heading font-semibold mb-4">Top Freight Regions</h2>
          {regionalData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No regional data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={regionalData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="state" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}
                  formatter={v => [v, "Loads"]}
                />
                <Bar dataKey="loads" fill="#EA580C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hourly Load Distribution */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white font-heading font-semibold mb-4">Load Creation Timeline (24h)</h2>
        {hourlyData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}
                formatter={v => [v, "Loads"]}
              />
              <Bar dataKey="loads" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Driver Performance Scatter */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white font-heading font-semibold mb-4">Driver Performance (Loads vs Safety Score)</h2>
        {driverPerf.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No driver data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                dataKey="loads"
                name="Loads Completed"
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="safety_score"
                name="Safety Score"
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value, name) =>
                  name === "loads" ? [value, "Loads Completed"] : [value, "Safety Score"]
                }
              />
              <Scatter name="Drivers" data={driverPerf} fill="#EA580C" />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Efficiency Summary */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white font-heading font-semibold mb-4">Dispatch Efficiency Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/3 rounded-lg p-4 text-center">
            <div className="text-slate-400 text-xs uppercase font-semibold mb-2">Completion Rate</div>
            <div className="text-3xl font-bold text-green-400">{efficiency.completion_rate}%</div>
            <div className="text-slate-500 text-xs mt-1">{completedLoads.length} of {filteredLoads.length}</div>
          </div>
          <div className="bg-white/3 rounded-lg p-4 text-center">
            <div className="text-slate-400 text-xs uppercase font-semibold mb-2">Assigned</div>
            <div className="text-3xl font-bold text-blue-400">{efficiency.assigned_rate}%</div>
            <div className="text-slate-500 text-xs mt-1">Waiting assignment</div>
          </div>
          <div className="bg-white/3 rounded-lg p-4 text-center">
            <div className="text-slate-400 text-xs uppercase font-semibold mb-2">In Transit</div>
            <div className="text-3xl font-bold text-orange-400">{efficiency.in_transit_rate}%</div>
            <div className="text-slate-500 text-xs mt-1">Active shipments</div>
          </div>
          <div className="bg-white/3 rounded-lg p-4 text-center">
            <div className="text-slate-400 text-xs uppercase font-semibold mb-2">Cancellation Rate</div>
            <div className={`text-3xl font-bold ${efficiency.cancellation_rate > 5 ? "text-red-400" : "text-green-400"}`}>
              {efficiency.cancellation_rate}%
            </div>
            <div className="text-slate-500 text-xs mt-1">Out of total</div>
          </div>
        </div>
      </div>

      {/* Completion Time Distribution */}
      {completionTimes.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-heading font-semibold mb-4">Load Completion Time Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={completionTimes.slice(0, 30)}
              margin={{ top: 0, right: 8, left: -20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="load_id"
                tick={{ fill: "#64748b", fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}
                formatter={v => [`${v}h`, "Time"]}
              />
              <Bar dataKey="hours" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}