import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Fuel, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function FuelEfficiencyDashboard() {
  const [trucks, setTrucks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Truck.list("-created_date", 100),
      base44.entities.Expense.filter({ category: "fuel" }, "-created_date", 500),
      base44.entities.Load.list("-created_date", 300),
    ])
      .then(([tr, exp, ld]) => {
        setTrucks(tr);
        setExpenses(exp);
        setLoads(ld);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Calculate MPG per truck
  const truckEfficiency = trucks.map(truck => {
    const truckExpenses = expenses.filter(e => e.truck_id === truck.id);
    const truckLoads = loads.filter(l => l.truck_id === truck.id && l.status === "completed");

    const totalFuelGallons = truckExpenses.reduce((s, e) => s + (e.gallons || 0), 0);
    const totalMiles = truckLoads.reduce((s, l) => s + (l.miles || 0), 0);
    const mpg = totalFuelGallons > 0 ? Math.round((totalMiles / totalFuelGallons) * 10) / 10 : 0;
    const totalFuelCost = truckExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const loadsCompleted = truckLoads.length;

    return {
      id: truck.id,
      unit: truck.unit_number,
      year: truck.year,
      make: truck.make,
      model: truck.model,
      mpg,
      miles: totalMiles,
      gallons: totalFuelGallons,
      cost: totalFuelCost,
      loads: loadsCompleted,
      costPerMile: totalMiles > 0 ? Math.round((totalFuelCost / totalMiles) * 100) / 100 : 0,
    };
  }).filter(t => t.loads > 0).sort((a, b) => b.mpg - a.mpg);

  const avgMpg = truckEfficiency.length > 0 ? Math.round((truckEfficiency.reduce((s, t) => s + t.mpg, 0) / truckEfficiency.length) * 10) / 10 : 0;
  const bestMpg = truckEfficiency.length > 0 ? truckEfficiency[0] : null;
  const worstMpg = truckEfficiency.length > 0 ? truckEfficiency[truckEfficiency.length - 1] : null;
  const totalFuelSpent = truckEfficiency.reduce((s, t) => s + t.cost, 0);

  // Monthly fuel trend
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleString("default", { month: "short" }), date: d };
  });

  const monthlyData = months.map(m => {
    const row = { month: m.label };
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === m.date.getFullYear() && d.getMonth() === m.date.getMonth();
    });
    row.totalGallons = monthExpenses.reduce((s, e) => s + (e.gallons || 0), 0);
    row.totalCost = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    return row;
  });

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Fleet MPG</div>
          <div className="text-2xl font-bold text-green-400">{avgMpg}</div>
          <div className="text-slate-500 text-xs mt-1">miles per gallon</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Fuel Spent</div>
          <div className="text-2xl font-bold text-orange-400">${totalFuelSpent.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">6-month total</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Best Performer</div>
          <div className="text-2xl font-bold text-blue-400">{bestMpg?.mpg || 0}</div>
          <div className="text-slate-500 text-xs mt-1">{bestMpg?.unit || "—"}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Trucks Tracked</div>
          <div className="text-2xl font-bold text-white">{truckEfficiency.length}</div>
          <div className="text-slate-500 text-xs mt-1">with fuel data</div>
        </div>
      </div>

      {/* Monthly Fuel Trend */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Monthly Fuel Usage & Cost</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <XAxis dataKey="month" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <YAxis yAxisId="left" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} label={{ value: "Gallons", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="right" orientation="right" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} label={{ value: "Cost ($)", angle: 90, position: "insideRight" }} />
            <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} />
            <Legend />
            <Bar yAxisId="left" dataKey="totalGallons" name="Gallons" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="totalCost" name="Cost ($)" fill="#EA580C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Truck Performance Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm">Truck Fuel Efficiency Ranking</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : truckEfficiency.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No trucks with fuel expense data</div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
              <span>Truck</span>
              <span className="text-right">MPG</span>
              <span className="text-right">Miles</span>
              <span className="text-right">Gallons</span>
              <span className="text-right">Loads</span>
              <span className="text-right">Fuel Cost</span>
              <span className="text-right">$/Mile</span>
            </div>
            <div className="divide-y divide-white/5">
              {truckEfficiency.map((truck, i) => {
                const isGood = truck.mpg >= avgMpg;
                return (
                  <div key={truck.id} className="grid grid-cols-7 gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors items-center">
                    <span className="text-white text-sm font-medium">
                      #{truck.unit} · {truck.year} {truck.make.slice(0, 10)}
                    </span>
                    <span className={`text-right font-bold ${isGood ? "text-green-400" : "text-red-400"}`}>
                      {truck.mpg}
                      {i === 0 && <TrendingUp className="w-3 h-3 inline ml-1" />}
                      {i === truckEfficiency.length - 1 && <TrendingDown className="w-3 h-3 inline ml-1" />}
                    </span>
                    <span className="text-right text-slate-300 text-sm">{truck.miles.toLocaleString()}</span>
                    <span className="text-right text-slate-300 text-sm">{Math.round(truck.gallons)}</span>
                    <span className="text-right text-slate-300 text-sm">{truck.loads}</span>
                    <span className="text-right text-orange-400 text-sm">${truck.cost.toLocaleString()}</span>
                    <span className="text-right text-slate-300 text-sm">${truck.costPerMile}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Alerts */}
      {worstMpg && worstMpg.mpg < avgMpg * 0.8 && (
        <div className="glass-card rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-400 font-semibold text-sm">Low Fuel Efficiency Alert</div>
              <p className="text-slate-400 text-xs mt-1">
                Truck #{worstMpg.unit} ({worstMpg.mpg} MPG) is {Math.round((1 - worstMpg.mpg / avgMpg) * 100)}% below fleet average. Consider inspection or route optimization.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}