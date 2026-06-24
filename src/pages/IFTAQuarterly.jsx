import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Loader2, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import { exportIFTAPDF } from "@/lib/iftaPdfExport";
import KpiCard from "@/components/hasten/KpiCard";

export default function IFTAQuarterly() {
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState("Q2-2026");
  const [stateReports, setStateReports] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.Truck.list("-created_date", 150),
      base44.entities.Load.filter({ status: "completed" }, "-created_date", 1000),
      base44.entities.Expense.filter({ category: "fuel" }, "-created_date", 500),
    ])
      .then(([t, l, e]) => {
        setTrucks(t);
        setLoads(l);
        setExpenses(e);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getQuarterDates = (quarter) => {
    const [q, year] = quarter.split("-");
    const quarterNum = parseInt(q.replace("Q", ""));
    const startMonth = (quarterNum - 1) * 3;
    const endMonth = startMonth + 3;

    const start = new Date(parseInt(year), startMonth, 1);
    const end = new Date(parseInt(year), endMonth, 0);

    return { start, end };
  };

  const generateIFTAReport = async () => {
    setGenerating(true);
    try {
      const { start, end } = getQuarterDates(selectedQuarter);
      const res = await base44.functions.invoke("generateIFTAQuarterly", {
        quarter: selectedQuarter,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      setGenResult(res.data);
      setStateReports(res.data.stateReports || {});

      setTimeout(() => setGenResult(null), 2000);
    } catch (err) {
      console.error("IFTA generation error:", err);
      alert("Failed to generate IFTA report");
    } finally {
      setGenerating(false);
    }
  };

  const calculateQuarterlyData = () => {
    const { start, end } = getQuarterDates(selectedQuarter);
    const stateData = {};
    let totalMiles = 0;
    let totalGallons = 0;
    let totalFuelCost = 0;

    // Aggregate mileage by state from completed loads
    loads.forEach(load => {
      const loadDate = new Date(load.actual_delivery || load.delivery_date || load.created_date);
      if (loadDate >= start && loadDate <= end) {
        const state = load.destination_state || "Unknown";
        if (!stateData[state]) {
          stateData[state] = { miles: 0, gallons: 0, cost: 0, loads: 0 };
        }
        stateData[state].miles += load.miles || 0;
        stateData[state].loads += 1;
        totalMiles += load.miles || 0;
      }
    });

    // Aggregate fuel data by state
    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      if (expDate >= start && expDate <= end) {
        const state = exp.location_state || "Unknown";
        if (!stateData[state]) {
          stateData[state] = { miles: 0, gallons: 0, cost: 0, loads: 0 };
        }
        stateData[state].gallons += exp.gallons || 0;
        stateData[state].cost += exp.amount || 0;
        totalGallons += exp.gallons || 0;
        totalFuelCost += exp.amount || 0;
      }
    });

    return {
      stateData,
      totalMiles,
      totalGallons,
      totalFuelCost,
      mpg: totalGallons > 0 ? (totalMiles / totalGallons).toFixed(2) : 0,
    };
  };

  const quarterlyData = calculateQuarterlyData();

  const handleExportCSV = () => {
    const { start, end } = getQuarterDates(selectedQuarter);
    const header = [
      `IFTA Quarterly Report - ${selectedQuarter}`,
      `Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      "",
      "State,Miles,Gallons,Fuel Cost,Avg MPG,Loads",
    ];

    const rows = Object.entries(quarterlyData.stateData).map(([state, data]) => [
      state,
      data.miles.toFixed(0),
      data.gallons.toFixed(1),
      data.cost.toFixed(2),
      data.gallons > 0 ? (data.miles / data.gallons).toFixed(2) : "N/A",
      data.loads,
    ]);

    const summary = [
      "",
      "SUMMARY",
      `Total Miles,${quarterlyData.totalMiles.toFixed(0)}`,
      `Total Gallons,${quarterlyData.totalGallons.toFixed(1)}`,
      `Total Fuel Cost,$${quarterlyData.totalFuelCost.toFixed(2)}`,
      `Average MPG,${quarterlyData.mpg}`,
    ];

    const csv = [header.join(","), ...rows.map(r => r.join(",")), ...summary].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IFTA-${selectedQuarter}.csv`;
    a.click();
  };

  const quarters = [
    "Q1-2026",
    "Q2-2026",
    "Q3-2026",
    "Q4-2026",
    "Q1-2025",
    "Q2-2025",
    "Q3-2025",
    "Q4-2025",
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">IFTA Quarterly Filings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Generate official state fuel tax reports</p>
        </div>
        <button
          onClick={generateIFTAReport}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {genResult && (
        <div className="glass-card rounded-xl p-4 border border-green-500/20 bg-green-500/5 animate-slide-up">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-green-400 font-semibold">IFTA Report Generated</div>
              <p className="text-slate-400 text-sm mt-1">
                {genResult.statesReported} states • {genResult.totalMiles} miles • {genResult.totalGallons} gallons
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quarter Selector */}
      <div className="space-y-2">
        <label className="text-white text-sm font-semibold">Select Quarter</label>
        <select
          value={selectedQuarter}
          onChange={e => setSelectedQuarter(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50"
          style={{ background: "#0F1829" }}
        >
          {quarters.map(q => (
            <option key={q} value={q} style={{ background: "#0F1829" }}>
              {q}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Miles" value={quarterlyData.totalMiles?.toLocaleString()} icon={TrendingUp} color="blue" />
        <KpiCard label="Total Gallons" value={quarterlyData.totalGallons?.toFixed(1)} icon={FileText} color="green" />
        <KpiCard label="Fuel Cost" value={`$${quarterlyData.totalFuelCost?.toFixed(0)}`} icon={FileText} color="orange" />
        <KpiCard label="Avg MPG" value={quarterlyData.mpg} icon={TrendingUp} color="cyan" />
      </div>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button
          onClick={() => exportIFTAPDF({ quarterlyData, selectedQuarter })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          <FileText className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* State Breakdown Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 bg-white/2">
          <h2 className="text-white font-semibold">State Mileage Breakdown</h2>
        </div>
        {Object.keys(quarterlyData.stateData).length === 0 ? (
          <div className="p-8 text-center text-slate-500">No mileage data for this quarter</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left font-semibold text-slate-400 uppercase text-xs">State</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-400 uppercase text-xs">Miles</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-400 uppercase text-xs">Gallons</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-400 uppercase text-xs">Fuel Cost</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-400 uppercase text-xs">MPG</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-400 uppercase text-xs">Loads</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(quarterlyData.stateData)
                  .sort(([, a], [, b]) => b.miles - a.miles)
                  .map(([state, data]) => (
                    <tr key={state} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-white font-semibold">{state}</td>
                      <td className="px-5 py-3 text-right text-slate-300">{data.miles.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-slate-300">{data.gallons.toFixed(1)}</td>
                      <td className="px-5 py-3 text-right text-slate-300">${data.cost.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right text-amber-400 font-semibold">
                        {data.gallons > 0 ? (data.miles / data.gallons).toFixed(2) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">{data.loads}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filing Summary */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold mb-4">IFTA Filing Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-slate-400">States to Report:</span>
            <span className="text-white font-semibold">{Object.keys(quarterlyData.stateData).length}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-slate-400">Quarter:</span>
            <span className="text-white font-semibold">{selectedQuarter}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-slate-400">Filing Status:</span>
            <span className="text-amber-400 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Ready for Review
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}