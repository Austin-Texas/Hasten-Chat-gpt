import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  DollarSign, Users, Truck, CheckCircle, Download,
  ChevronDown, ChevronUp, Plus, Minus, FileText, Loader2, X
} from "lucide-react";
import { jsPDF } from "jspdf";

// ── Period helpers ───────────────────────────────────────────────────────────
const PERIODS = [
  { key: "this_week",    label: "This Week" },
  { key: "this_month",   label: "This Month" },
  { key: "last_month",   label: "Last Month" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "custom",       label: "Custom Range" },
];

function periodRange(key, customStart, customEnd) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (key) {
    case "this_week": {
      const d = now.getDay();
      const s = new Date(now); s.setDate(now.getDate() - d); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
      return [s, e];
    }
    case "this_month":   return [new Date(y, m, 1),     new Date(y, m + 1, 0, 23, 59, 59)];
    case "last_month":   return [new Date(y, m - 1, 1), new Date(y, m,     0, 23, 59, 59)];
    case "this_quarter": {
      const q = Math.floor(m / 3);
      return [new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 0, 23, 59, 59)];
    }
    case "custom":
      return [customStart ? new Date(customStart) : null, customEnd ? new Date(customEnd + "T23:59:59") : null];
    default: return [null, null];
  }
}

// ── PDF export ───────────────────────────────────────────────────────────────
function exportSettlementPDF(rows, periodLabel) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 0;

  const ORANGE = [234, 88, 12];
  const NAVY   = [11, 18, 33];
  const GRAY   = [100, 116, 139];
  const WHITE  = [255, 255, 255];

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 68, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(margin - 4, 16, 36, 36, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("H", margin + 9, 40);
  doc.setFontSize(18);
  doc.text("HASTEN Logistics", margin + 40, 36);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text("Driver Settlement Report", margin + 40, 52);
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(periodLabel, W - margin, 34, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, W - margin, 50, { align: "right" });

  y = 90;

  // Summary row
  const totalGross = rows.reduce((s, r) => s + r.grossPay, 0);
  const totalBonus = rows.reduce((s, r) => s + r.bonus, 0);
  const totalDeduct = rows.reduce((s, r) => s + r.approvedExpenses, 0);
  const totalNet   = rows.reduce((s, r) => s + r.netPay, 0);

  const boxes = [
    { label: "Drivers", value: String(rows.length) },
    { label: "Gross Pay", value: `$${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
    { label: "Bonuses", value: `$${totalBonus.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
    { label: "Total Net", value: `$${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
  ];
  const bw = (W - margin * 2 - 12) / boxes.length;
  boxes.forEach((b, i) => {
    const x = margin + i * (bw + 4);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y, bw, 44, 4, 4, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text(b.label.toUpperCase(), x + bw / 2, y + 13, { align: "center" });
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
    doc.text(b.value, x + bw / 2, y + 32, { align: "center" });
  });
  y += 58;

  // Table header
  const cols = [
    { label: "DRIVER",        x: margin + 4,   w: 110, align: "left" },
    { label: "LOADS",         x: margin + 130,  w: 40,  align: "right" },
    { label: "MILES",         x: margin + 182,  w: 50,  align: "right" },
    { label: "GROSS PAY",     x: margin + 244,  w: 70,  align: "right" },
    { label: "EXPENSES",      x: margin + 326,  w: 65,  align: "right" },
    { label: "BONUS",         x: margin + 403,  w: 55,  align: "right" },
    { label: "NET PAY",       x: margin + 469,  w: 70,  align: "right" },
  ];

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, W - margin * 2, 20, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
  cols.forEach(c => doc.text(c.label, c.align === "right" ? c.x + c.w : c.x, y + 13, { align: c.align }));
  y += 20;

  rows.forEach((row, i) => {
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 40; }
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, W - margin * 2, 18, "F"); }
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    const vals = [
      row.name,
      String(row.loads),
      row.miles.toLocaleString(),
      `$${row.grossPay.toFixed(2)}`,
      row.approvedExpenses > 0 ? `$${row.approvedExpenses.toFixed(2)}` : "—",
      row.bonus > 0 ? `+$${row.bonus.toFixed(2)}` : "—",
      `$${row.netPay.toFixed(2)}`,
    ];
    cols.forEach((c, ci) => {
      doc.setTextColor(ci === 6 ? [22, 163, 74] : NAVY);
      doc.text(vals[ci], c.align === "right" ? c.x + c.w : c.x, y + 12, { align: c.align });
    });
    y += 18;

    // Load sub-rows
    if (row.loadList.length > 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, W - margin * 2, row.loadList.length * 13 + 4, "F");
      row.loadList.forEach(l => {
        doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
        doc.text(`  › ${l.load_number || l.id.slice(-6).toUpperCase()}  ${l.origin_city || ""} → ${l.destination_city || ""}`, margin + 6, y + 9);
        doc.text(`${l.miles || 0} mi`, margin + 250, y + 9, { align: "right" });
        doc.text(`$${(l.rate || 0).toLocaleString()}`, margin + 330, y + 9, { align: "right" });
        y += 13;
      });
      y += 4;
    }
  });

  // Totals
  doc.setFillColor(...ORANGE);
  doc.setFillColor(234, 88, 12);
  doc.rect(margin, y, W - margin * 2, 22, "F");
  doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
  doc.text("TOTAL", margin + 4, y + 14);
  doc.text(`$${totalGross.toFixed(2)}`, margin + 314, y + 14, { align: "right" });
  doc.text(`$${totalDeduct.toFixed(2)}`, margin + 391, y + 14, { align: "right" });
  doc.text(`+$${totalBonus.toFixed(2)}`, margin + 458, y + 14, { align: "right" });
  doc.text(`$${totalNet.toFixed(2)}`, W - margin, y + 14, { align: "right" });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...NAVY);
    doc.rect(0, ph - 26, W, 26, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 190, 210);
    doc.text("HASTEN Logistics · Driver Settlement Report · Confidential", margin, ph - 9);
    doc.text(`Page ${p} of ${totalPages}`, W - margin, ph - 9, { align: "right" });
  }

  doc.save(`HASTEN_Settlements_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SettlementGenerator() {
  const [drivers, setDrivers]   = useState([]);
  const [loads, setLoads]       = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");

  // Per-driver bonus overrides keyed by driver.id
  const [bonuses, setBonuses]       = useState({});
  const [notes, setNotes]           = useState({});
  const [expanded, setExpanded]     = useState(null);

  // Finalization state
  const [finalizing, setFinalizing] = useState(null);  // driverId being saved
  const [finalizingAll, setFinalizingAll] = useState(false);
  const [finalized, setFinalized]   = useState(new Set()); // driverIds already saved this session
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list("-created_date", 200),
      base44.entities.Load.filter({ status: "completed" }, "-created_date", 1000),
      base44.entities.Expense.filter({ status: "approved" }, "-created_date", 1000),
    ]).then(([d, l, e]) => {
      setDrivers(d);
      setLoads(l);
      setExpenses(e);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const [start, end] = periodRange(period, customStart, customEnd);

  const inRange = (dateStr) => {
    if (!dateStr) return !start;
    const d = new Date(dateStr);
    if (!start) return true;
    return d >= start && d <= end;
  };

  const periodLabel = useMemo(() => {
    if (period === "custom" && customStart && customEnd) {
      return `${new Date(customStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(customEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return PERIODS.find(p => p.key === period)?.label || period;
  }, [period, customStart, customEnd]);

  const rows = useMemo(() => {
    return drivers.map(driver => {
      const driverLoads = loads.filter(l =>
        l.driver_id === driver.id && inRange(l.actual_delivery || l.updated_date)
      );
      if (driverLoads.length === 0) return null;

      const totalMiles   = driverLoads.reduce((s, l) => s + (l.miles || 0), 0);
      const totalRevenue = driverLoads.reduce((s, l) => s + (l.rate || 0), 0);

      let grossPay = 0;
      if (driver.pay_type === "per_mile" && driver.pay_rate) {
        grossPay = totalMiles * driver.pay_rate;
      } else if (driver.pay_type === "percentage" && driver.pay_rate) {
        grossPay = totalRevenue * (driver.pay_rate / 100);
      } else if (driver.pay_type === "flat_rate" && driver.pay_rate) {
        grossPay = driverLoads.length * driver.pay_rate;
      } else {
        grossPay = totalRevenue * 0.25; // fallback 25%
      }

      // Approved expenses for this driver in period
      const driverExpenses = expenses.filter(e =>
        e.driver_id === driver.id && inRange(e.date) && e.is_reimbursable !== false
      );
      const approvedExpenses = driverExpenses.reduce((s, e) => s + (e.amount || 0), 0);

      const bonus  = parseFloat(bonuses[driver.id] || 0) || 0;
      const netPay = Math.max(0, grossPay + bonus - approvedExpenses);

      return {
        driverId:         driver.id,
        name:             `${driver.first_name} ${driver.last_name}`,
        email:            driver.email,
        payType:          driver.pay_type || "flat_rate",
        payRate:          driver.pay_rate || 0,
        loads:            driverLoads.length,
        miles:            Math.round(totalMiles),
        totalRevenue:     Math.round(totalRevenue * 100) / 100,
        grossPay:         Math.round(grossPay * 100) / 100,
        approvedExpenses: Math.round(approvedExpenses * 100) / 100,
        expenseList:      driverExpenses,
        bonus:            Math.round(bonus * 100) / 100,
        netPay:           Math.round(netPay * 100) / 100,
        loadList:         driverLoads,
        notes:            notes[driver.id] || "",
      };
    }).filter(Boolean).sort((a, b) => b.netPay - a.netPay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, loads, expenses, period, customStart, customEnd, bonuses, notes]);

  const totals = useMemo(() => ({
    loads:    rows.reduce((s, r) => s + r.loads, 0),
    miles:    rows.reduce((s, r) => s + r.miles, 0),
    gross:    rows.reduce((s, r) => s + r.grossPay, 0),
    bonus:    rows.reduce((s, r) => s + r.bonus, 0),
    expenses: rows.reduce((s, r) => s + r.approvedExpenses, 0),
    net:      rows.reduce((s, r) => s + r.netPay, 0),
  }), [rows]);

  const saveSettlement = async (row) => {
    const [s, e] = [start, end];
    const record = {
      driver_id:        row.driverId,
      driver_name:      row.name,
      pay_period_start: s ? s.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      pay_period_end:   e ? e.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      pay_type:         row.payType,
      pay_rate:         row.payRate,
      loads_completed:  row.loads,
      total_miles:      row.miles,
      total_revenue:    row.totalRevenue,
      base_pay:         row.grossPay,
      bonuses:          row.bonus,
      deductions:       row.approvedExpenses,
      net_pay:          row.netPay,
      status:           "calculated",
      notes:            row.notes,
      loads: row.loadList.map(l => ({
        load_id:     l.id,
        load_number: l.load_number || "",
        miles:       l.miles || 0,
        revenue:     l.rate || 0,
        pay_amount:  row.loads > 0 ? Math.round((row.grossPay / row.loads) * 100) / 100 : 0,
      })),
    };
    await base44.entities.PayrollRecord.create(record);
  };

  const handleFinalizeOne = async (row) => {
    setFinalizing(row.driverId);
    try {
      await saveSettlement(row);
      setFinalized(prev => new Set([...prev, row.driverId]));
      showToast(`Settlement saved for ${row.name}`);
    } catch (err) {
      showToast(`Failed: ${err.message}`, false);
    } finally {
      setFinalizing(null);
    }
  };

  const handleFinalizeAll = async () => {
    setFinalizingAll(true);
    let count = 0;
    for (const row of rows) {
      if (finalized.has(row.driverId)) continue;
      try {
        await saveSettlement(row);
        setFinalized(prev => new Set([...prev, row.driverId]));
        count++;
      } catch (err) {
        console.error(`Settlement failed for ${row.name}:`, err);
      }
    }
    setFinalizingAll(false);
    showToast(`${count} settlement${count !== 1 ? "s" : ""} finalized successfully`);
  };

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-slide-up
          ${toast.ok ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                period === p.key ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportSettlementPDF(rows, periodLabel)}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={handleFinalizeAll}
            disabled={finalizingAll || rows.every(r => finalized.has(r.driverId))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            {finalizingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {finalizingAll ? "Saving…" : "Finalize All"}
          </button>
        </div>
      </div>

      {/* Custom range inputs */}
      {period === "custom" && (
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">From</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
              style={{ background: "#0F1829" }} />
          </div>
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">To</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
              style={{ background: "#0F1829" }} />
          </div>
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Drivers",     value: rows.length,                                       color: "text-blue-400" },
          { label: "Loads",       value: totals.loads,                                      color: "text-orange-400" },
          { label: "Gross Pay",   value: `$${totals.gross.toLocaleString()}`,               color: "text-green-400" },
          { label: "Bonuses",     value: `+$${totals.bonus.toLocaleString()}`,              color: "text-cyan-400" },
          { label: "Total Net",   value: `$${totals.net.toLocaleString()}`,                 color: "text-white" },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-xl p-4 border border-white/5">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`font-bold text-xl font-heading ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Driver cards */}
      {rows.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 p-10 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No completed loads found for this period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(row => {
            const isOpen = expanded === row.driverId;
            const isDone = finalized.has(row.driverId);
            return (
              <div key={row.driverId} className={`glass-card rounded-xl border transition-all ${isDone ? "border-green-500/20" : "border-white/5"}`}>
                {/* Row header */}
                <button
                  className="w-full text-left px-5 py-4 hover:bg-white/2 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : row.driverId)}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Driver name */}
                    <div className="flex-1 min-w-40">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{row.name}</span>
                        {isDone && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400">Finalized</span>}
                      </div>
                      <div className="text-slate-500 text-xs capitalize mt-0.5">
                        {row.payType.replace("_", " ")} · {row.loads} loads · {row.miles.toLocaleString()} mi
                      </div>
                    </div>

                    {/* Pay breakdown (desktop) */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-slate-500 text-xs">Gross</div>
                        <div className="text-white font-semibold">${row.grossPay.toLocaleString()}</div>
                      </div>
                      {row.approvedExpenses > 0 && (
                        <div className="text-center">
                          <div className="text-slate-500 text-xs">Expenses</div>
                          <div className="text-red-400 font-semibold">−${row.approvedExpenses.toLocaleString()}</div>
                        </div>
                      )}
                      {row.bonus > 0 && (
                        <div className="text-center">
                          <div className="text-slate-500 text-xs">Bonus</div>
                          <div className="text-cyan-400 font-semibold">+${row.bonus.toLocaleString()}</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-slate-500 text-xs">Net Pay</div>
                        <div className="text-green-400 font-bold text-base">${row.netPay.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Mobile net pay */}
                    <div className="md:hidden ml-auto text-right">
                      <div className="text-green-400 font-bold">${row.netPay.toLocaleString()}</div>
                      <div className="text-slate-500 text-xs">net pay</div>
                    </div>

                    {/* Finalize button */}
                    <button
                      onClick={e => { e.stopPropagation(); handleFinalizeOne(row); }}
                      disabled={isDone || finalizing === row.driverId}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 disabled:opacity-50
                        ${isDone ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20"}`}
                    >
                      {finalizing === row.driverId
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : isDone ? <CheckCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {isDone ? "Saved" : "Finalize"}
                    </button>

                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-white/5 px-5 pb-5 animate-slide-up">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4">
                      {/* Load list */}
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5" /> Completed Loads ({row.loads})
                        </div>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                          {row.loadList.map(l => (
                            <div key={l.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                              <span className="text-orange-400 font-mono font-bold">{l.load_number || `#${l.id.slice(-6).toUpperCase()}`}</span>
                              <span className="text-slate-400 truncate mx-2">{l.origin_city} → {l.destination_city}</span>
                              <span className="text-slate-500 flex-shrink-0">{l.miles || 0} mi</span>
                              <span className="text-green-400 font-semibold flex-shrink-0 ml-2">${(l.rate || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Adjustments */}
                      <div className="space-y-4">
                        {/* Approved expenses */}
                        {row.expenseList.length > 0 && (
                          <div>
                            <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                              <Minus className="w-3.5 h-3.5 text-red-400" /> Approved Expenses ({row.expenseList.length})
                            </div>
                            <div className="space-y-1">
                              {row.expenseList.map(e => (
                                <div key={e.id} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10">
                                  <span className="text-slate-400 capitalize">{e.category?.replace("_", " ")} · {e.vendor || e.description || "—"}</span>
                                  <span className="text-red-400 font-semibold">−${e.amount?.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bonus input */}
                        <div>
                          <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-cyan-400" /> Bonus / Adjustment
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={bonuses[row.driverId] || ""}
                              onChange={e => setBonuses(prev => ({ ...prev, [row.driverId]: e.target.value }))}
                              className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-colors"
                              style={{ background: "#0F1829" }}
                            />
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">Notes</div>
                          <textarea
                            rows={2}
                            placeholder="Internal settlement notes…"
                            value={notes[row.driverId] || ""}
                            onChange={e => setNotes(prev => ({ ...prev, [row.driverId]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40 resize-none"
                            style={{ background: "#0F1829" }}
                          />
                        </div>

                        {/* Net pay summary */}
                        <div className="rounded-xl p-3 border border-white/10 bg-white/3 space-y-1.5 text-sm">
                          {[
                            ["Gross Pay",            `$${row.grossPay.toFixed(2)}`,         "text-white"],
                            ["Approved Expenses",    `−$${row.approvedExpenses.toFixed(2)}`, "text-red-400"],
                            ["Bonus",                `+$${row.bonus.toFixed(2)}`,            "text-cyan-400"],
                          ].map(([label, val, cls]) => (
                            <div key={label} className="flex justify-between">
                              <span className="text-slate-400">{label}</span>
                              <span className={cls}>{val}</span>
                            </div>
                          ))}
                          <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold">
                            <span className="text-white">Net Pay</span>
                            <span className="text-green-400 text-base">${row.netPay.toFixed(2)}</span>
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

      {/* Totals footer */}
      {rows.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-orange-500/15 bg-orange-500/3">
          <div className="flex flex-wrap gap-6 items-center justify-between">
            <span className="text-white font-semibold">{rows.length} Driver Settlement Summary · {periodLabel}</span>
            <div className="flex gap-6 text-sm flex-wrap">
              <div><span className="text-slate-400">Gross: </span><span className="text-white font-bold">${totals.gross.toLocaleString()}</span></div>
              <div><span className="text-slate-400">Expenses: </span><span className="text-red-400 font-bold">−${totals.expenses.toLocaleString()}</span></div>
              <div><span className="text-slate-400">Bonuses: </span><span className="text-cyan-400 font-bold">+${totals.bonus.toLocaleString()}</span></div>
              <div><span className="text-slate-400">Net Total: </span><span className="text-green-400 font-bold text-base">${totals.net.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}