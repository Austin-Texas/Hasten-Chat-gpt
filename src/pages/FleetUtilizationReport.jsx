import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { Truck, TrendingUp, Clock, DollarSign, Activity, Loader2, Zap, AlertTriangle } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";
import StatusBadge from "@/components/hasten/StatusBadge";

const COMPLETED_STATUSES = ["delivered", "pod_uploaded", "completed"];
const ACTIVE_STATUSES = ["assigned", "accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery"];

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

export default function FleetUtilizationReport() {
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("revenue_per_mile");

  useEffect(() => {
    Promise.all([
      base44.entities.Truck.list("-created_date", 200),
      base44.entities.Load.list("-created_date", 500),
      base44.entities.Expense.list("-created_date", 500).catch(() => []),
      base44.entities.Driver.list("-created_date", 200),
    ])
      .then(([t, l, e, d]) => {
        setTrucks(t);
        setLoads(l);
        setExpenses(e);
        setDrivers(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const driverName = (id) => {
    const d = drivers.find(d => d.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "—";
  };

  // ── Per-truck utilization data ──
  const truckReports = useMemo(() => {
    return trucks.map(truck => {
      const truckLoads = loads.filter(l => l.truck_id === truck.id);
      const completedLoads = truckLoads.filter(l => COMPLETED_STATUSES.includes(l.status));
      const activeLoads = truckLoads.filter(l => ACTIVE_STATUSES.includes(l.status));

      const totalRevenue = completedLoads.reduce((s, l) => s + (l.rate || l.total_revenue || 0), 0);
      const totalMiles = completedLoads.reduce((s, l) => s + (l.miles || 0), 0);
      const totalExpenses = expenses.filter(e => e.truck_id === truck.id).reduce((s, e) => s + (e.amount || 0), 0);
      const revenuePerMile = totalMiles > 0 ? totalRevenue / totalMiles : 0;
      const costPerMile = totalMiles > 0 ? totalExpenses / totalMiles : 0;
      const profitPerMile = revenuePerMile - costPerMile;

      // Idle days: days since last active/completed load
      const sortedLoads = [...truckLoads].filter(l => l.actual_delivery || l.delivery_date || l.actual_pickup || l.pickup_date)
        .sort((a, b) => new Date(b.actual_delivery || b.delivery_date || b.actual_pickup || b.pickup_date) - new Date(a.actual_delivery || a.delivery_date || a.actual_pickup || a.pickup_date));
      const lastLoadDate = sortedLoads[0]?.actual_delivery || sortedLoads[0]?.delivery_date || sortedLoads[0]?.actual_pickup || sortedLoads[0]?.pickup_date;
      const idleDays = lastLoadDate ? daysSince(lastLoadDate) : daysSince(truck.created_date) ?? 0;

      // Active utilization: has at least one active load
      const isActive = activeLoads.length > 0 || truck.status === "active";

      return {
        ...truck,
        driverName: driverName(truck.driver_id),
        completedCount: completedLoads.length,
        activeCount: activeLoads.length,
        totalRevenue: Math.round(totalRevenue),
        totalMiles: Math.round(totalMiles),
        totalExpenses: Math.round(totalExpenses),
        revenuePerMile: Math.round(revenuePerMile * 100) / 100,
        costPerMile: Math.round(costPerMile * 100) / 100,
        profitPerMile: Math.round(profitPerMile * 100) / 100,
        idleDays: idleDays ?? 0,
        lastLoadDate,
        isActive,
      };
    });
  }, [trucks, loads, expenses, drivers]);

  // Sort
  const sortedReports = useMemo(() => {
    const sorted = [...truckReports];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "revenue_per_mile": return b.revenuePerMile - a.revenuePerMile;
        case "total_revenue": return b.totalRevenue - a.totalRevenue;
        case "idle_days": return b.idleDays - a.idleDays;
        case "total_miles": return b.totalMiles - a.totalMiles;
        case "profit_per_mile": return b.profitPerMile - a.profitPerMile;
        default: return 0;
      }
    });
    return sorted;
  }, [truckReports, sortBy]);

  // ── KPIs ──
  const activeTrucks = truckReports.filter(t => t.isActive).length;
  const idleTruckCount = truckReports.filter(t => !t.isActive && t.status !== "maintenance" && t.status !== "out_of_service").length;
  const maintenanceCount = truckReports.filter(t => t.status === "maintenance").length;
  const totalIdleDays = truckReports.reduce((s, t) => s + t.idleDays, 0);
  const avgIdleDays = truckReports.length > 0 ? Math.round(totalIdleDays / truckReports.length) : 0;
  const totalRevenue = truckReports.reduce((s, t) => s + t.totalRevenue, 0);
  const totalMiles = truckReports.reduce((s, t) => s + t.totalMiles, 0);
  const avgRevPerMile = totalMiles > 0 ? Math.round((totalRevenue / totalMiles) * 100) / 100 : 0;
  const utilizationPct = trucks.length > 0 ? Math.round((activeTrucks / trucks.length) * 100) : 0;

  // ── Chart data ──
  const chartData = sortedReports.slice(0, 15).map(t => ({
    name: t.unit_number || `T-${t.id?.slice(-4)}`,
    revenue: t.totalRevenue,
    miles: t.totalMiles,
    idle: t.idleDays,
  }));

  const scatterData = truckReports.filter(t => t.totalMiles > 0).map(t => ({
    name: t.unit_number || `T-${t.id?.slice(-4)}`,
    miles: t.totalMiles,
    rpm: t.revenuePerMile,
  }));

  const tooltipStyle = { background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" };

  // ── Idle alerts ──
  const idleAlerts = truckReports.filter(t => t.idleDays >= 7 && t.status !== "maintenance" && t.status !== "out_of_service")
    .sort((a, b) => b.idleDays - a.idleDays);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Fleet Utilization Report</h1>
          <p className="text-slate-400 text-sm mt-0.5">Truck activity, idle days & revenue per mile</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">Sort by:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-green-500/40"
          >
            <option value="revenue_per_mile" style={{ background: "#0F1829" }}>Revenue / Mile</option>
            <option value="total_revenue" style={{ background: "#0F1829" }}>Total Revenue</option>
            <option value="idle_days" style={{ background: "#0F1829" }}>Idle Days</option>
            <option value="total_miles" style={{ background: "#0F1829" }}>Total Miles</option>
            <option value="profit_per_mile" style={{ background: "#0F1829" }}>Profit / Mile</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Fleet Utilization" value={`${utilizationPct}%`} icon={Zap} color="green" />
        <KpiCard label="Active Trucks" value={`${activeTrucks}/${trucks.length}`} icon={Truck} color="blue" />
        <KpiCard label="Avg Idle Days" value={avgIdleDays} icon={Clock} color="orange" />
        <KpiCard label="Avg Rev / Mile" value={`$${avgRevPerMile}`} icon={DollarSign} color="cyan" />
      </div>

      {/* Idle alerts */}
      {idleAlerts.length > 0 && (
        <div className="glass-card rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
            <AlertTriangle className="w-4 h-4" />
            {idleAlerts.length} truck{idleAlerts.length !== 1 ? "s" : ""} idle for 7+ days
          </div>
          <div className="flex flex-wrap gap-2">
            {idleAlerts.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-amber-300 font-medium">{t.unit_number || "—"}</span>
                <span className="text-amber-500/60">•</span>
                <span className="text-amber-400">{t.idleDays}d idle</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Truck table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold">Truck Performance Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th className="text-left text-slate-400 font-semibold">Unit</th>
                <th className="text-left text-slate-400 font-semibold">Driver</th>
                <th className="text-center text-slate-400 font-semibold">Status</th>
                <th className="text-right text-slate-400 font-semibold">Loads</th>
                <th className="text-right text-slate-400 font-semibold">Miles</th>
                <th className="text-right text-slate-400 font-semibold">Revenue</th>
                <th className="text-right text-slate-400 font-semibold">Expenses</th>
                <th className="text-right text-slate-400 font-semibold">Rev/Mile</th>
                <th className="text-right text-slate-400 font-semibold">Profit/Mile</th>
                <th className="text-center text-slate-400 font-semibold">Idle Days</th>
              </tr>
            </thead>
            <tbody>
              {sortedReports.map(t => (
                <tr key={t.id} className="hover:bg-white/3 transition-colors">
                  <td className="text-white font-medium">{t.unit_number || "—"}</td>
                  <td className="text-slate-300">{t.driverName}</td>
                  <td className="text-center"><StatusBadge status={t.status} /></td>
                  <td className="text-right text-slate-300">{t.completedCount}</td>
                  <td className="text-right text-slate-300">{t.totalMiles.toLocaleString()}</td>
                  <td className="text-right text-green-400 font-medium">${t.totalRevenue.toLocaleString()}</td>
                  <td className="text-right text-orange-400 font-medium">${t.totalExpenses.toLocaleString()}</td>
                  <td className={`text-right font-medium ${t.revenuePerMile >= avgRevPerMile ? "text-green-400" : "text-slate-400"}`}>
                    ${t.revenuePerMile.toFixed(2)}
                  </td>
                  <td className={`text-right font-medium ${t.profitPerMile >= 0 ? "text-green-400" : "text-red-400"}`}>
                    ${t.profitPerMile.toFixed(2)}
                  </td>
                  <td className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.idleDays >= 7 ? "bg-red-500/15 text-red-400" :
                      t.idleDays >= 3 ? "bg-amber-500/15 text-amber-400" :
                      "bg-slate-500/15 text-slate-400"
                    }`}>
                      {t.idleDays}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/3">
                <td className="text-white font-bold" colSpan={3}>Fleet Totals</td>
                <td className="text-right text-white font-bold">{truckReports.reduce((s, t) => s + t.completedCount, 0)}</td>
                <td className="text-right text-white font-bold">{totalMiles.toLocaleString()}</td>
                <td className="text-right text-green-400 font-bold">${totalRevenue.toLocaleString()}</td>
                <td className="text-right text-orange-400 font-bold">${truckReports.reduce((s, t) => s + t.totalExpenses, 0).toLocaleString()}</td>
                <td className="text-right text-green-400 font-bold">${avgRevPerMile.toFixed(2)}</td>
                <td></td>
                <td className="text-center text-white font-bold">{totalIdleDays}d</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Revenue by truck chart */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-heading font-semibold mb-4">Revenue & Miles by Truck (Top 15)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 0, right: 8, left: -8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} angle={-35} textAnchor="end" height={70} interval={0} />
              <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="#00E678" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="miles" name="Miles" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue per mile scatter */}
      {scatterData.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-heading font-semibold mb-4">Efficiency: Miles vs Revenue/Mile</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" dataKey="miles" name="Total Miles" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis type="number" dataKey="rpm" name="Rev/Mile" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} formatter={(v, n) => n === "rpm" ? [`$${v.toFixed(2)}`, "Rev/Mile"] : [v.toLocaleString(), "Miles"]} />
              <Scatter data={scatterData} fill="#EA580C" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}