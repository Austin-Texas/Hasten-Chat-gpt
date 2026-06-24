import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Download, Truck, MapPin, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function MileageReportGenerator() {
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Truck.list("-created_date", 100),
      base44.entities.Load.list("-created_date", 500),
    ])
      .then(([tr, ld]) => {
        setTrucks(tr);
        setLoads(ld);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (trucks.length === 0 || loads.length === 0) return;

    const [year, month] = selectedMonth.split("-").map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Filter loads for this month
    const monthLoads = loads.filter(l => {
      if (!l.actual_delivery && !l.delivery_date && !l.created_date) return false;
      const date = new Date(l.actual_delivery || l.delivery_date || l.created_date);
      return date >= monthStart && date <= monthEnd && l.status === "completed";
    });

    // Build report: truck -> state -> miles
    const report = {};
    monthLoads.forEach(load => {
      if (!load.truck_id || !load.miles) return;
      
      // Determine states (use destination state for simplicity)
      const state = load.destination_state || "UNKNOWN";
      
      if (!report[load.truck_id]) {
        report[load.truck_id] = { truckUnit: "", states: {} };
      }
      
      const truck = trucks.find(t => t.id === load.truck_id);
      report[load.truck_id].truckUnit = truck?.unit_number || load.truck_id.slice(-4);
      
      if (!report[load.truck_id].states[state]) {
        report[load.truck_id].states[state] = 0;
      }
      report[load.truck_id].states[state] += load.miles;
    });

    setReportData(report);
  }, [selectedMonth, trucks, loads]);

  // Group data by state for chart
  const stateChart = {};
  Object.values(reportData).forEach(truck => {
    Object.entries(truck.states).forEach(([state, miles]) => {
      if (!stateChart[state]) stateChart[state] = 0;
      stateChart[state] += miles;
    });
  });

  const chartData = Object.entries(stateChart)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([state, miles]) => ({ state, miles }));

  const totalMiles = Object.values(reportData).reduce(
    (sum, truck) => sum + Object.values(truck.states).reduce((s, m) => s + m, 0),
    0
  );

  const handleExportCSV = () => {
    const [year, month] = selectedMonth.split("-");
    const csv = [
      ["IFTA Mileage Report", `${year}-${month}`],
      [],
      ["Truck", "Unit #", "State", "Miles"],
    ];

    Object.entries(reportData)
      .sort((a, b) => a[1].truckUnit.localeCompare(b[1].truckUnit))
      .forEach(([truckId, truck]) => {
        Object.entries(truck.states)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([state, miles]) => {
            csv.push([truckId.slice(-4), truck.truckUnit, state, Math.round(miles)]);
          });
      });

    csv.push([]);
    csv.push(["TOTALS BY STATE"]);
    Object.entries(stateChart)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([state, miles]) => {
        csv.push([state, "", "", Math.round(miles)]);
      });

    csv.push([]);
    csv.push(["GRAND TOTAL", "", "", Math.round(totalMiles)]);

    const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ifta-mileage-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase mb-2 block">Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            style={{ colorScheme: "dark" }}
          />
        </div>
        <button
          onClick={handleExportCSV}
          disabled={loading || Object.keys(reportData).length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/30 disabled:opacity-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary KPI */}
      <div className="glass-card rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Total Miles This Month</div>
            <div className="text-3xl font-bold text-white">{Math.round(totalMiles).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Trucks Active</div>
            <div className="text-3xl font-bold text-blue-400">{Object.keys(reportData).length}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs font-semibold uppercase mb-1">States</div>
            <div className="text-3xl font-bold text-orange-400">{Object.keys(stateChart).length}</div>
          </div>
        </div>
      </div>

      {/* State Chart */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Top 10 States by Miles</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <XAxis dataKey="state" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
              <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }}
                formatter={v => [Math.round(v).toLocaleString(), "Miles"]} />
              <Bar dataKey="miles" fill="#EA580C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm">Mileage by Truck & State</h3>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : Object.keys(reportData).length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No completed loads for this month</div>
        ) : (
          <div className="divide-y divide-white/5">
            {Object.entries(reportData)
              .sort((a, b) => a[1].truckUnit.localeCompare(b[1].truckUnit))
              .map(([truckId, truck]) => {
                const truckTotalMiles = Object.values(truck.states).reduce((s, m) => s + m, 0);
                return (
                  <div key={truckId} className="border-b border-white/5 last:border-b-0">
                    {/* Truck header */}
                    <div className="px-5 py-3 bg-white/2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-semibold">Unit #{truck.truckUnit}</span>
                      <span className="text-slate-500 text-sm ml-auto">{Math.round(truckTotalMiles).toLocaleString()} miles</span>
                    </div>
                    {/* States */}
                    <div className="divide-y divide-white/5">
                      {Object.entries(truck.states)
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([state, miles]) => (
                          <div key={state} className="px-5 py-2.5 flex items-center justify-between text-sm hover:bg-white/1 transition-colors">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-slate-300">{state}</span>
                            </div>
                            <span className="text-white font-mono font-semibold">{Math.round(miles).toLocaleString()} mi</span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}

            {/* Grand totals */}
            <div className="px-5 py-4 bg-orange-500/5 border-t border-orange-500/20">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Total Miles</span>
                  <span className="text-white font-bold text-lg">{Math.round(totalMiles).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Avg per truck</span>
                  <span>${(totalMiles / (Object.keys(reportData).length || 1)).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}