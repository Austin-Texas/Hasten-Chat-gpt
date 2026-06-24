import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, Package, TrendingDown, Wallet, Loader2,
  ChevronLeft, ChevronRight, Download, FileText,
} from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";

const COMPLETED_STATUSES = ["delivered", "pod_uploaded", "completed"];

// ── ISO week helpers ─────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day + 3);
  const firstThu = new Date(d.getFullYear(), 0, 4);
  const weekDiff = Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
  return { year: d.getFullYear(), week: weekDiff + 1 };
}

function getWeekRange(year, week) {
  const jan1 = new Date(year, 0, 1);
  const dayOffset = (1 - jan1.getDay() + 7) % 7;
  const weekStart = new Date(year, 0, 1 + dayOffset + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return { start: weekStart, end: weekEnd };
}

function formatWeekLabel(year, week) {
  const { start, end } = getWeekRange(year, week);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function shiftWeek(year, week, delta) {
  let newWeek = week + delta;
  let newYear = year;
  if (newWeek < 1) { newYear--; newWeek = 52; }
  if (newWeek > 52) { newYear++; newWeek = 1; }
  return { year: newYear, week: newWeek };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function WeeklySettlementReport() {
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = getISOWeek(new Date());
  const [weekSel, setWeekSel] = useState({ year: now.year, week: now.week });
  const [expandedDriver, setExpandedDriver] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Load.list("-created_date", 500),
      base44.entities.Driver.list("-created_date", 200),
      base44.entities.Expense.list("-date", 500),
      base44.entities.Settlement.list("-created_date", 500),
    ])
      .then(([ld, dr, ex, st]) => {
        setLoads(ld);
        setDrivers(dr);
        setExpenses(ex);
        setSettlements(st);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const { start, end } = getWeekRange(weekSel.year, weekSel.week);

  // Filter completed loads within this week (by delivery date)
  const weekLoads = useMemo(() => {
    return loads.filter(l => {
      if (!COMPLETED_STATUSES.includes(l.status)) return false;
      const delivery = l.actual_delivery || l.delivery_date;
      if (!delivery) return false;
      const d = new Date(delivery);
      return d >= start && d <= end;
    });
  }, [loads, start, end]);

  // Filter expenses within this week
  const weekExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
  }, [expenses, start, end]);

  // Filter settlements within this week
  const weekSettlements = useMemo(() => {
    return settlements.filter(s => {
      if (!s.created_date) return false;
      const d = new Date(s.created_date);
      return d >= start && d <= end;
    });
  }, [settlements, start, end]);

  const driverName = (id) => {
    const d = drivers.find(d => d.id === id);
    return d ? `${d.first_name} ${d.last_name}` : (id ? `Driver ${id.slice(-4)}` : "Unassigned");
  };

  // ── Per-driver aggregation ──
  const driverReports = useMemo(() => {
    const map = {};
    weekLoads.forEach(l => {
      const key = l.driver_id || "unassigned";
      if (!map[key]) map[key] = { driverId: key, name: driverName(key), loads: [], grossEarnings: 0, expenseTotal: 0, deductionTotal: 0, netPay: 0, };
      map[key].loads.push(l);
      map[key].grossEarnings += l.rate || l.total_revenue || 0;
    });

    weekExpenses.forEach(e => {
      const key = e.driver_id || "unassigned";
      if (!map[key]) map[key] = { driverId: key, name: driverName(key), loads: [], grossEarnings: 0, expenseTotal: 0, deductionTotal: 0, netPay: 0, };
      map[key].expenseTotal += e.amount || 0;
    });

    weekSettlements.forEach(s => {
      const key = s.driver_id || "unassigned";
      if (!map[key]) map[key] = { driverId: key, name: driverName(key), loads: [], grossEarnings: 0, expenseTotal: 0, deductionTotal: 0, netPay: 0, };
      map[key].deductionTotal += s.total_deductions || 0;
    });

    Object.values(map).forEach(r => {
      r.grossEarnings = Math.round(r.grossEarnings);
      r.expenseTotal = Math.round(r.expenseTotal);
      r.deductionTotal = Math.round(r.deductionTotal);
      r.netPay = r.grossEarnings - r.expenseTotal - r.deductionTotal;
    });

    return Object.values(map).sort((a, b) => b.grossEarnings - a.grossEarnings);
  }, [weekLoads, weekExpenses, weekSettlements, drivers]);

  // ── KPIs ──
  const totalGross = driverReports.reduce((s, r) => s + r.grossEarnings, 0);
  const totalExpenses = driverReports.reduce((s, r) => s + r.expenseTotal, 0);
  const totalDeductions = driverReports.reduce((s, r) => s + r.deductionTotal, 0);
  const totalNet = driverReports.reduce((s, r) => s + r.netPay, 0);

  // ── Expense breakdown by category ──
  const expenseByCategory = useMemo(() => {
    const map = {};
    weekExpenses.forEach(e => {
      const cat = e.category || "other";
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);
  }, [weekExpenses]);

  const tooltipStyle = {
    background: "#0F1829",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "8px",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Weekly Settlement Report</h1>
          <p className="text-slate-400 text-sm mt-0.5">Per-driver earnings, deductions & expenses by week</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekSel(shiftWeek(weekSel.year, weekSel.week, -1))}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold min-w-48 text-center">
            Week {weekSel.week}, {weekSel.year} — {formatWeekLabel(weekSel.year, weekSel.week)}
          </div>
          <button
            onClick={() => setWeekSel(shiftWeek(weekSel.year, weekSel.week, 1))}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekSel(getISOWeek(new Date()))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Gross Earnings" value={`$${totalGross.toLocaleString()}`} icon={DollarSign} color="green" />
        <KpiCard label="Completed Loads" value={weekLoads.length} icon={Package} color="blue" />
        <KpiCard label="Total Deductions" value={`$${totalDeductions.toLocaleString()}`} icon={TrendingDown} color="orange" />
        <KpiCard label="Net Payout" value={`$${totalNet.toLocaleString()}`} icon={Wallet} color="cyan" />
      </div>

      {/* Per-driver table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-heading font-semibold">Driver Settlements — Week {weekSel.week}</h2>
          <span className="text-slate-500 text-xs">{driverReports.length} drivers with activity</span>
        </div>
        {driverReports.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No completed loads or expenses in this week</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 font-semibold">Driver</th>
                  <th className="text-right text-slate-400 font-semibold">Loads</th>
                  <th className="text-right text-slate-400 font-semibold">Gross Earnings</th>
                  <th className="text-right text-slate-400 font-semibold">Deductions</th>
                  <th className="text-right text-slate-400 font-semibold">Expenses</th>
                  <th className="text-right text-slate-400 font-semibold">Net Payout</th>
                  <th className="text-center text-slate-400 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {driverReports.map(r => (
                  <>
                    <tr key={r.driverId} className="hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setExpandedDriver(expandedDriver === r.driverId ? null : r.driverId)}>
                      <td className="text-white font-medium">{r.name}</td>
                      <td className="text-right text-slate-300">{r.loads.length}</td>
                      <td className="text-right text-green-400 font-medium">${r.grossEarnings.toLocaleString()}</td>
                      <td className="text-right text-orange-400 font-medium">${r.deductionTotal.toLocaleString()}</td>
                      <td className="text-right text-amber-400 font-medium">${r.expenseTotal.toLocaleString()}</td>
                      <td className="text-right text-blue-400 font-bold">${r.netPay.toLocaleString()}</td>
                      <td className="text-center">
                        <button className="text-slate-500 hover:text-white transition-colors">
                          {expandedDriver === r.driverId ? "−" : "+"}
                        </button>
                      </td>
                    </tr>
                    {expandedDriver === r.driverId && (
                      <tr key={`${r.driverId}-detail`} className="bg-white/2">
                        <td colSpan={7} className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Load breakdown */}
                            <div>
                              <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Completed Loads</h4>
                              <div className="space-y-1.5">
                                {r.loads.map(l => (
                                  <div key={l.id} className="flex items-center justify-between text-xs bg-white/3 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                      <span className="text-slate-300 font-mono">{l.load_number || `#${l.id?.slice(-6)}`}</span>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-slate-400 truncate">{l.origin_city} → {l.destination_city}</span>
                                    </div>
                                    <span className="text-green-400 font-medium flex-shrink-0">${(l.rate || l.total_revenue || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Expense breakdown */}
                            <div>
                              <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Expenses & Deductions</h4>
                              <div className="space-y-1.5">
                                {weekExpenses.filter(e => (e.driver_id || "unassigned") === r.driverId).map(e => (
                                  <div key={e.id} className="flex items-center justify-between text-xs bg-white/3 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-amber-400 capitalize">{e.category}</span>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-slate-500">{e.description || e.vendor || "—"}</span>
                                    </div>
                                    <span className="text-amber-400 font-medium">−${(e.amount || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                                {/* Settlement deductions */}
                                {weekSettlements.filter(s => (s.driver_id || "unassigned") === r.driverId).map(s => (
                                  <div key={s.id} className="flex items-center justify-between text-xs bg-white/3 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-orange-400">Settlement deductions</span>
                                      {s.escrow_hold > 0 && <span className="text-slate-600 text-[10px]">escrow ${s.escrow_hold}</span>}
                                      {s.insurance_deduction > 0 && <span className="text-slate-600 text-[10px]">ins ${s.insurance_deduction}</span>}
                                      {s.fuel_advance > 0 && <span className="text-slate-600 text-[10px]">fuel ${s.fuel_advance}</span>}
                                    </div>
                                    <span className="text-orange-400 font-medium">−${(s.total_deductions || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                                {weekExpenses.filter(e => (e.driver_id || "unassigned") === r.driverId).length === 0 &&
                                 weekSettlements.filter(s => (s.driver_id || "unassigned") === r.driverId).length === 0 && (
                                  <div className="text-slate-600 text-xs text-center py-2">No deductions or expenses</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/3">
                  <td className="text-white font-bold">Totals</td>
                  <td className="text-right text-white font-bold">{weekLoads.length}</td>
                  <td className="text-right text-green-400 font-bold">${totalGross.toLocaleString()}</td>
                  <td className="text-right text-orange-400 font-bold">${totalDeductions.toLocaleString()}</td>
                  <td className="text-right text-amber-400 font-bold">${totalExpenses.toLocaleString()}</td>
                  <td className="text-right text-blue-400 font-bold">${totalNet.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Expense by category chart */}
      {expenseByCategory.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-heading font-semibold mb-4">Expenses by Category — Week {weekSel.week}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={expenseByCategory} margin={{ top: 0, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 10 }} angle={-30} textAnchor="end" height={70} interval={0} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v.toLocaleString()}`, "Amount"]} />
              <Bar dataKey="amount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}