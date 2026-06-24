import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Zap, DollarSign, Route } from "lucide-react";

const FUEL_PRICE_PER_GALLON = 3.50;
const DEFAULT_MPG = 6;

export default function LoadMetricsCalculator() {
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricsData, setMetricsData] = useState([]);
  const [sortBy, setSortBy] = useState("margin");
  const [fuelPrice, setFuelPrice] = useState(FUEL_PRICE_PER_GALLON);

  useEffect(() => {
    Promise.all([
      base44.entities.Load.list("-created_date", 300),
      base44.entities.Driver.list("-created_date", 100),
      base44.entities.Truck.list("-created_date", 100),
    ])
      .then(([lds, drv, trk]) => {
        setLoads(lds);
        setDrivers(drv);
        setTrucks(trk);
        calculateMetrics(lds, drv, trk);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const calculateMetrics = (loadList, driverList, truckList) => {
    const driverMap = Object.fromEntries(driverList.map(d => [d.id, d]));
    const truckMap = Object.fromEntries(truckList.map(t => [t.id, t]));

    const metrics = loadList
      .map(load => {
        const lane = `${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}`;
        const miles = load.miles || 0;
        
        // Get truck MPG
        const truck = load.truck_id ? truckMap[load.truck_id] : null;
        const mpg = truck?.mpg || DEFAULT_MPG;

        // Calculate fuel estimate
        const fuelGallons = miles > 0 ? Math.round((miles / mpg) * 100) / 100 : 0;
        const fuelCost = fuelGallons * fuelPrice;

        // Get lane rate (revenue per load)
        const laneRate = load.rate || 0;

        // Calculate driver pay
        const driver = load.driver_id ? driverMap[load.driver_id] : null;
        let driverPay = 0;
        if (driver) {
          switch (driver.pay_type) {
            case "per_mile":
              driverPay = miles * (driver.pay_rate || 0);
              break;
            case "percentage":
              driverPay = laneRate * ((driver.pay_rate || 0) / 100);
              break;
            case "flat_rate":
              driverPay = driver.pay_rate || 0;
              break;
            case "hourly":
              driverPay = (driver.pay_rate || 0) * 8;
              break;
          }
        }

        // Calculate profit and margin
        const costPerMile = miles > 0 ? Math.round(((fuelCost + driverPay) / miles) * 100) / 100 : 0;
        const ratePerMile = miles > 0 ? Math.round((laneRate / miles) * 100) / 100 : 0;
        const profit = laneRate - (fuelCost + driverPay);
        const margin = laneRate > 0 ? Math.round(((profit / laneRate) * 100) * 10) / 10 : 0;

        return {
          loadId: load.id,
          loadNumber: load.load_number,
          lane,
          origin: `${load.origin_city}, ${load.origin_state}`,
          destination: `${load.destination_city}, ${load.destination_state}`,
          status: load.status,
          miles,
          mpg,
          fuelGallons,
          fuelCost: Math.round(fuelCost * 100) / 100,
          laneRate,
          ratePerMile,
          driverPay: Math.round(driverPay * 100) / 100,
          costPerMile,
          profit: Math.round(profit * 100) / 100,
          margin,
          equipment: load.equipment_type,
        };
      })
      .filter(m => m.miles > 0)
      .sort((a, b) => {
        if (sortBy === "margin") return b.margin - a.margin;
        if (sortBy === "profit") return b.profit - a.profit;
        if (sortBy === "miles") return b.miles - a.miles;
        if (sortBy === "rate") return b.ratePerMile - a.ratePerMile;
        return 0;
      });

    setMetricsData(metrics);
  };

  const stats = {
    totalLoads: metricsData.length,
    totalMiles: metricsData.reduce((s, m) => s + m.miles, 0),
    totalRevenue: metricsData.reduce((s, m) => s + m.laneRate, 0),
    totalFuelCost: metricsData.reduce((s, m) => s + m.fuelCost, 0),
    totalProfit: metricsData.reduce((s, m) => s + m.profit, 0),
    avgMargin: metricsData.length > 0 ? Math.round((metricsData.reduce((s, m) => s + m.margin, 0) / metricsData.length) * 10) / 10 : 0,
    avgRatePerMile: metricsData.length > 0 ? Math.round((metricsData.reduce((s, m) => s + m.ratePerMile, 0) / metricsData.length) * 100) / 100 : 0,
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Miles</div>
          <div className="text-2xl font-bold text-white">{stats.totalMiles.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">all loads</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Revenue</div>
          <div className="text-2xl font-bold text-green-400">${stats.totalRevenue.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">${stats.avgRatePerMile}/mi avg</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Fuel Cost</div>
          <div className="text-2xl font-bold text-orange-400">${stats.totalFuelCost.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">@ ${fuelPrice}/gal</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Profit Margin</div>
          <div className={`text-2xl font-bold ${stats.avgMargin >= 15 ? "text-green-400" : stats.avgMargin >= 10 ? "text-amber-400" : "text-red-400"}`}>
            {stats.avgMargin}%
          </div>
          <div className="text-slate-500 text-xs mt-1">profit: ${stats.totalProfit.toLocaleString()}</div>
        </div>
      </div>

      {/* Fuel Price Control */}
      <div className="glass-card rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Fuel Price Per Gallon</label>
            <div className="flex items-center gap-2">
              <span className="text-white text-lg font-bold">${fuelPrice}</span>
              <input
                type="range"
                min="2"
                max="6"
                step="0.05"
                value={fuelPrice}
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value);
                  setFuelPrice(newPrice);
                  calculateMetrics(loads, drivers, trucks);
                }}
                className="flex-1"
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-xs uppercase mb-1">Recalculating margins...</div>
            <p className="text-slate-400 text-xs">Adjust to see impact on profitability</p>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2">
        {[
          { key: "margin", label: "Profit Margin %" },
          { key: "profit", label: "Total Profit" },
          { key: "rate", label: "Rate/Mile" },
          { key: "miles", label: "Distance" },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => {
              setSortBy(opt.key);
              setMetricsData([...metricsData].sort((a, b) => {
                if (opt.key === "margin") return b.margin - a.margin;
                if (opt.key === "profit") return b.profit - a.profit;
                if (opt.key === "rate") return b.ratePerMile - a.ratePerMile;
                return b.miles - a.miles;
              }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sortBy === opt.key ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Metrics Table */}
      {loading ? (
        <div className="glass-card rounded-xl p-8 flex items-center justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Calculating metrics...
        </div>
      ) : metricsData.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-slate-500">
          <Route className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No loads with distance data</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Load</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Lane</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Miles</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">MPG</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Fuel Gal</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Fuel Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Rate/Mile</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Lane Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Driver Pay</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {metricsData.map(m => (
                  <tr key={m.loadId} className="hover:bg-white/2 transition-colors text-xs">
                    <td className="px-4 py-2.5">
                      <span className="text-orange-400 font-mono font-bold">{m.loadNumber || `#${m.loadId.slice(-6)}`}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-slate-300 text-xs max-w-xs">
                        <div className="truncate">{m.origin}</div>
                        <div className="truncate text-slate-500">→ {m.destination}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-white font-semibold">{m.miles.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{m.mpg}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{m.fuelGallons}</td>
                    <td className="px-4 py-2.5 text-right text-orange-400 font-semibold">${m.fuelCost.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">${m.ratePerMile}</td>
                    <td className="px-4 py-2.5 text-right text-green-400 font-semibold">${m.laneRate.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">${m.driverPay.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ color: m.profit > 500 ? "#22c55e" : m.profit > 200 ? "#eab308" : "#ef4444" }}>
                      ${m.profit.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold" style={{ color: m.margin >= 20 ? "#22c55e" : m.margin >= 10 ? "#eab308" : "#ef4444" }}>
                      {m.margin}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="px-4 py-4 bg-orange-500/5 border-t border-orange-500/20 grid grid-cols-6 gap-4 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1">Total Miles</div>
              <div className="text-white font-bold text-sm">{stats.totalMiles.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1">Total Fuel</div>
              <div className="text-white font-bold text-sm">${stats.totalFuelCost.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1">Total Revenue</div>
              <div className="text-white font-bold text-sm">${stats.totalRevenue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1">Total Profit</div>
              <div className="text-green-400 font-bold text-sm">${stats.totalProfit.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1">Avg Margin</div>
              <div className="text-white font-bold text-sm">{stats.avgMargin}%</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1">Avg $/Mile</div>
              <div className="text-white font-bold text-sm">${stats.avgRatePerMile}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}