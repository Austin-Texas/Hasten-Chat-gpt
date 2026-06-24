import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, Filter } from "lucide-react";

const CATEGORY_COLORS = {
  fuel:         "#EA580C",
  maintenance:  "#3B82F6",
  tolls:        "#22C55E",
  lumper:       "#A855F7",
  detention:    "#06B6D4",
  scales:       "#EAB308",
  permits:      "#F43F5E",
  insurance:    "#F97316",
  registration: "#8B5CF6",
  tires:        "#10B981",
  parts:        "#EC4899",
  labor:        "#14B8A6",
  meals:        "#F59E0B",
  lodging:      "#6366F1",
  other:        "#64748b",
};

const DATE_PRESETS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last 12 months", days: 365 },
  { label: "All time", days: null },
];

const selectClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors";

export default function DriverExpenseBreakdown() {
  const [expenses, setExpenses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [datePreset, setDatePreset] = useState(90);
  const [chartView, setChartView] = useState("bar"); // bar | pie

  useEffect(() => {
    Promise.all([
      base44.entities.Expense.list("-date", 500),
      base44.entities.Driver.list("-created_date", 100),
    ]).then(([exp, drv]) => {
      setExpenses(exp);
      setDrivers(drv);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, `${d.first_name} ${d.last_name}`])), [drivers]);

  const filtered = useMemo(() => {
    let list = expenses;

    // Filter by driver
    if (selectedDriver) list = list.filter(e => e.driver_id === selectedDriver);

    // Filter by date range
    if (datePreset !== null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - datePreset);
      list = list.filter(e => e.date && new Date(e.date) >= cutoff);
    }

    return list;
  }, [expenses, selectedDriver, datePreset]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const acc = {};
    filtered.forEach(e => {
      const cat = e.category || "other";
      acc[cat] = (acc[cat] || 0) + (e.amount || 0);
    });
    return Object.entries(acc)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        label: category.replace(/_/g, " "),
        amount,
        color: CATEGORY_COLORS[category] || "#64748b",
      }));
  }, [filtered]);

  // Per-driver totals for the top-drivers table
  const perDriverData = useMemo(() => {
    const acc = {};
    filtered.forEach(e => {
      const did = e.driver_id || "__unknown__";
      if (!acc[did]) acc[did] = { total: 0, count: 0 };
      acc[did].total += e.amount || 0;
      acc[did].count += 1;
    });
    return Object.entries(acc)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([did, v]) => ({
        name: did === "__unknown__" ? "Unassigned" : (driverMap[did] || `Driver …${did.slice(-4)}`),
        total: v.total,
        count: v.count,
      }));
  }, [filtered, driverMap]);

  const totalAmount = categoryData.reduce((s, c) => s + c.amount, 0);

  const tooltipStyle = { background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: 12 };
  const fmt = n => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) return (
    <div className="grid grid-cols-2 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="glass-card rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-orange-400" />
          <span className="text-white font-semibold text-sm">Filters</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-slate-500 text-xs">Driver</label>
            <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
              className={selectClass} style={{ background: "#0F1829" }}>
              <option value="" style={{ background: "#0F1829" }}>All Drivers</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id} style={{ background: "#0F1829" }}>
                  {d.first_name} {d.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-slate-500 text-xs">Date Range</label>
            <select value={datePreset ?? ""} onChange={e => setDatePreset(e.target.value === "" ? null : Number(e.target.value))}
              className={selectClass} style={{ background: "#0F1829" }}>
              {DATE_PRESETS.map(p => (
                <option key={p.label} value={p.days ?? ""} style={{ background: "#0F1829" }}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500 text-xs">Chart Type</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {["bar","pie"].map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${chartView === v ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-red-400">{fmt(totalAmount)}</div>
          <div className="text-slate-500 text-xs mt-1">{filtered.length} records</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Categories</div>
          <div className="text-2xl font-bold text-white">{categoryData.length}</div>
          <div className="text-slate-500 text-xs mt-1">expense types</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Top Category</div>
          <div className="text-xl font-bold text-white capitalize">{categoryData[0]?.label || "—"}</div>
          <div className="text-slate-500 text-xs mt-1">{categoryData[0] ? fmt(categoryData[0].amount) : "—"}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Avg per Record</div>
          <div className="text-2xl font-bold text-amber-400">
            {filtered.length > 0 ? fmt(totalAmount / filtered.length) : "—"}
          </div>
          <div className="text-slate-500 text-xs mt-1">per expense</div>
        </div>
      </div>

      {/* Main chart */}
      {categoryData.length === 0 ? (
        <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
          <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No expenses match your filters</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting the driver or date range</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-heading font-semibold mb-5">
            Expense Breakdown by Category
            {selectedDriver && drivers.find(d => d.id === selectedDriver) && (
              <span className="text-orange-400 font-normal text-sm ml-2">
                — {driverMap[selectedDriver]}
              </span>
            )}
          </h3>

          {chartView === "bar" ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }} layout="vertical">
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false}
                  tickLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmt(v), "Amount"]} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {categoryData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryData} dataKey="amount" nameKey="label" cx="50%" cy="50%"
                    outerRadius={110} innerRadius={55} paddingAngle={2}>
                    {categoryData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [fmt(v), "Amount"]} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-col gap-2 min-w-[180px]">
                {categoryData.map(c => (
                  <div key={c.category} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-slate-300 text-xs capitalize">{c.label}</span>
                    </div>
                    <span className="text-white text-xs font-semibold font-mono">{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category table */}
      {categoryData.length > 0 && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5">
            <h3 className="text-white font-semibold text-sm">Category Detail</h3>
          </div>
          <div className="grid grid-cols-4 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
            <span>Category</span>
            <span className="text-right">Amount</span>
            <span className="text-right">% of Total</span>
            <span>Share</span>
          </div>
          <div className="divide-y divide-white/5">
            {categoryData.map(c => {
              const pct = totalAmount > 0 ? (c.amount / totalAmount) * 100 : 0;
              return (
                <div key={c.category} className="grid grid-cols-4 gap-4 px-5 py-3 items-center hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-white text-sm capitalize">{c.label}</span>
                  </div>
                  <span className="text-right text-red-400 font-bold text-sm font-mono">{fmt(c.amount)}</span>
                  <span className="text-right text-slate-400 text-sm">{pct.toFixed(1)}%</span>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top drivers by spend (only shown when "All Drivers" selected) */}
      {!selectedDriver && perDriverData.length > 0 && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5">
            <h3 className="text-white font-semibold text-sm">Top Drivers by Spend</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
            <span>Driver</span>
            <span className="text-right">Total Spent</span>
            <span className="text-right">Records</span>
          </div>
          <div className="divide-y divide-white/5">
            {perDriverData.map((d, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 px-5 py-3 items-center hover:bg-white/2 transition-colors">
                <span className="text-white text-sm truncate">{d.name}</span>
                <span className="text-right text-red-400 font-bold text-sm font-mono">{fmt(d.total)}</span>
                <span className="text-right text-slate-400 text-sm">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}