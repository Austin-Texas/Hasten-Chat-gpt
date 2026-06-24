import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  FileText, Download, RefreshCw, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Fuel, DollarSign, MapPin, Truck
} from "lucide-react";
import { exportIFTAPDF } from "@/lib/iftaPdfExport";

const QUARTERS = [
  { value: 1, label: "Q1 (Jan–Mar)" },
  { value: 2, label: "Q2 (Apr–Jun)" },
  { value: 3, label: "Q3 (Jul–Sep)" },
  { value: 4, label: "Q4 (Oct–Dec)" },
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2];

function exportCSV(report) {
  const rows = [
    ["IFTA Fuel Tax Report", `Q${report.quarter} ${report.year}`, "", "", ""],
    ["Period", report.date_range.from, "to", report.date_range.to, ""],
    ["Total Loads", report.loads_count, "", "", ""],
    ["Total Miles", report.total_miles, "", "", ""],
    ["Total Gallons", report.total_gallons, "", "", ""],
    ["Total Tax Owed", `$${report.total_tax_owed.toFixed(2)}`, "", "", ""],
    [],
    ["State", "Miles Traveled", "Gallons Used", "Tax Rate ($/gal)", "Tax Owed ($)"],
    ...report.state_summary.map(r => [
      r.state,
      r.miles,
      r.gallons.toFixed(2),
      r.rate !== null ? r.rate.toFixed(4) : "N/A",
      r.taxOwed.toFixed(2),
    ]),
    [],
    ["Load #", "Origin", "Destination", "Miles", "Total Tax ($)", "Delivery Date"],
    ...report.load_breakdowns.map(l => [
      l.load_number, l.origin, l.destination, l.miles, l.total_tax.toFixed(2),
      l.delivery_date ? new Date(l.delivery_date).toLocaleDateString() : "",
    ]),
  ];

  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `IFTA_Q${report.quarter}_${report.year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function IFTAReport() {
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [year, setYear] = useState(currentYear);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedLoad, setExpandedLoad] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await base44.functions.invoke("iftaTaxReport", { quarter, year });
      setReport(res.data);
    } catch (err) {
      setError(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">IFTA Fuel Tax Report</h1>
          <p className="text-slate-400 text-sm mt-0.5">Calculate per-state fuel taxes for audit compliance</p>
        </div>
        {report && (
          <div className="flex gap-2">
            <button
              onClick={() => exportCSV(report)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => exportIFTAPDF({ report })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
            >
              <FileText className="w-4 h-4" /> Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">Quarter</label>
            <select
              value={quarter}
              onChange={e => setQuarter(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              style={{ background: "#0F1829" }}
            >
              {QUARTERS.map(q => (
                <option key={q.value} value={q.value} style={{ background: "#0F1829" }}>{q.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              style={{ background: "#0F1829" }}
            >
              {YEARS.map(y => (
                <option key={y} value={y} style={{ background: "#0F1829" }}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition-all"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? "Calculating…" : "Generate Report"}
          </button>
        </div>

        {/* Info note */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-blue-500/8 border border-blue-500/15 text-blue-300 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
          <span>Miles are estimated per state based on origin/destination. For full IFTA compliance, integrate a route mileage API or enter actual miles per state on each load record.</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Report Output */}
      {report && (
        <div className="space-y-5 animate-slide-up">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Loads Analyzed", value: report.loads_count, icon: Truck, color: "orange" },
              { label: "Total Miles", value: report.total_miles.toLocaleString(), icon: MapPin, color: "blue" },
              { label: "Total Gallons", value: `${report.total_gallons.toLocaleString()}`, sub: "gal consumed", icon: Fuel, color: "amber" },
              { label: "Total Tax Owed", value: `$${report.total_tax_owed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "green" },
            ].map(kpi => {
              const colorMap = {
                orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
                blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
                amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
                green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" },
              }[kpi.color];
              return (
                <div key={kpi.label} className="glass-card rounded-xl p-4 border border-white/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{kpi.label}</p>
                      <p className="text-white text-xl font-bold font-heading">{kpi.value}</p>
                      {kpi.sub && <p className="text-slate-600 text-xs mt-0.5">{kpi.sub}</p>}
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${colorMap.bg} border ${colorMap.border} flex items-center justify-center`}>
                      <kpi.icon className={`w-4 h-4 ${colorMap.text}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Per-State Breakdown */}
          <div>
            <h2 className="text-white font-heading font-semibold mb-3">Tax by State — {report.period}</h2>
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                <span>State</span>
                <span className="text-right">Miles</span>
                <span className="text-right">Gallons</span>
                <span className="text-right">Rate / Gal</span>
                <span className="text-right">Tax Owed</span>
              </div>
              <div className="divide-y divide-white/5">
                {report.state_summary.map(row => (
                  <div key={row.state} className="grid grid-cols-5 gap-4 px-5 py-3 items-center hover:bg-white/2 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-6 rounded bg-white/8 border border-white/10 flex items-center justify-center text-white text-xs font-bold">{row.state}</span>
                      {!row.hasRate && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" title="No rate found" />}
                    </div>
                    <span className="text-right text-slate-300 text-sm">{row.miles.toLocaleString()}</span>
                    <span className="text-right text-slate-300 text-sm">{row.gallons.toFixed(1)}</span>
                    <span className="text-right text-slate-400 text-sm font-mono">
                      {row.rate !== null ? `$${row.rate.toFixed(4)}` : <span className="text-amber-400 text-xs">Unknown</span>}
                    </span>
                    <span className={`text-right text-sm font-bold font-mono ${row.taxOwed > 0 ? "text-orange-400" : "text-slate-500"}`}>
                      ${row.taxOwed.toFixed(2)}
                    </span>
                  </div>
                ))}
                {/* Totals row */}
                <div className="grid grid-cols-5 gap-4 px-5 py-3 border-t border-white/10 bg-white/2">
                  <span className="text-white font-semibold text-sm">Total</span>
                  <span className="text-right text-white font-semibold text-sm">{report.total_miles.toLocaleString()}</span>
                  <span className="text-right text-white font-semibold text-sm">{report.total_gallons.toFixed(1)}</span>
                  <span />
                  <span className="text-right text-orange-400 font-bold font-mono">${report.total_tax_owed.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Per-Load Breakdown */}
          <div>
            <h2 className="text-white font-heading font-semibold mb-3">Load Breakdown ({report.load_breakdowns.length} loads)</h2>
            {report.load_breakdowns.length === 0 ? (
              <div className="text-center py-10 glass-card rounded-xl border border-white/5">
                <CheckCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No completed loads found for this period</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
                {report.load_breakdowns.map(load => {
                  const expanded = expandedLoad === load.load_id;
                  return (
                    <div key={load.load_id}>
                      <button
                        onClick={() => setExpandedLoad(expanded ? null : load.load_id)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors text-left"
                      >
                        <span className="text-orange-400 font-mono text-sm font-bold w-28 flex-shrink-0">{load.load_number}</span>
                        <span className="text-slate-300 text-sm flex-1 truncate">{load.origin} → {load.destination}</span>
                        <span className="text-slate-500 text-xs hidden sm:block flex-shrink-0">{load.miles} mi</span>
                        <span className="text-orange-400 font-mono text-sm font-bold flex-shrink-0">${load.total_tax.toFixed(2)}</span>
                        {expanded ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                      </button>
                      {expanded && (
                        <div className="px-5 pb-4 animate-slide-up">
                          <div className="rounded-lg overflow-hidden border border-white/5">
                            <div className="grid grid-cols-4 gap-3 px-4 py-2 bg-white/3 text-xs text-slate-500 uppercase tracking-wider">
                              <span>State</span><span className="text-right">Miles</span><span className="text-right">Gallons</span><span className="text-right">Tax</span>
                            </div>
                            {load.states.map((s, i) => (
                              <div key={i} className="grid grid-cols-4 gap-3 px-4 py-2 border-t border-white/5 text-sm">
                                <span className="text-white font-medium">{s.state}</span>
                                <span className="text-right text-slate-400">{s.miles}</span>
                                <span className="text-right text-slate-400">{s.gallons.toFixed(2)}</span>
                                <span className="text-right text-orange-400 font-mono">{s.tax !== null ? `$${s.tax.toFixed(2)}` : "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}