import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, TrendingUp, Loader2 } from "lucide-react";

export default function RouteProfitabilityHeatmap() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeData, setRouteData] = useState([]);
  const [sortBy, setSortBy] = useState("revenue");

  useEffect(() => {
    base44.entities.Load.filter({ status: "completed" }, "-created_date", 300)
      .then(lds => {
        setLoads(lds);
        calculateProfitability(lds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const calculateProfitability = (loads) => {
    const routes = {};

    loads.forEach(load => {
      if (!load.origin_city || !load.destination_city) return;

      const route = `${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}`;
      
      if (!routes[route]) {
        routes[route] = {
          route,
          origin: `${load.origin_city}, ${load.origin_state}`,
          destination: `${load.destination_city}, ${load.destination_state}`,
          loads: 0,
          totalRevenue: 0,
          totalExpenses: 0,
          totalMiles: 0,
        };
      }

      routes[route].loads += 1;
      routes[route].totalRevenue += load.rate || 0;
      routes[route].totalMiles += load.miles || 0;
    });

    const routeArray = Object.values(routes)
      .map(r => ({
        ...r,
        profit: r.totalRevenue,
        profitMargin: r.loads > 0 ? Math.round((r.totalRevenue / r.loads) * 10) / 10 : 0,
        avgMiles: r.loads > 0 ? Math.round(r.totalMiles / r.loads) : 0,
        revenuePerMile: r.totalMiles > 0 ? Math.round((r.totalRevenue / r.totalMiles) * 100) / 100 : 0,
      }))
      .sort((a, b) => b[sortBy === "revenue" ? "totalRevenue" : sortBy === "margin" ? "profitMargin" : "revenuePerMile"] - a[b][sortBy === "revenue" ? "totalRevenue" : sortBy === "margin" ? "profitMargin" : "revenuePerMile"]);

    setRouteData(routeArray);
  };

  // Find min/max for color scaling
  const maxRevenue = routeData.length > 0 ? Math.max(...routeData.map(r => r.totalRevenue)) : 1;
  const minRevenue = routeData.length > 0 ? Math.min(...routeData.map(r => r.totalRevenue)) : 0;

  const getColor = (revenue) => {
    if (maxRevenue === minRevenue) return "hsl(142, 70%, 45%)";
    
    const ratio = (revenue - minRevenue) / (maxRevenue - minRevenue);
    
    // Red (low) → Yellow → Green (high)
    if (ratio < 0.5) {
      const localRatio = ratio * 2;
      const red = Math.round(255);
      const green = Math.round(165 + (255 - 165) * localRatio);
      return `rgb(${red}, ${green}, 0)`;
    } else {
      const localRatio = (ratio - 0.5) * 2;
      const red = Math.round(255 - (255 - 34) * localRatio);
      const green = 255;
      return `rgb(${red}, ${green}, 0)`;
    }
  };

  const stats = {
    totalRoutes: routeData.length,
    totalRevenue: routeData.reduce((s, r) => s + r.totalRevenue, 0),
    avgRoute: routeData.length > 0 ? Math.round(routeData.reduce((s, r) => s + r.totalRevenue, 0) / routeData.length) : 0,
    topRoute: routeData.length > 0 ? routeData[0] : null,
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Active Routes</div>
          <div className="text-2xl font-bold text-white">{stats.totalRoutes}</div>
          <div className="text-slate-500 text-xs mt-1">completed lanes</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Route Revenue</div>
          <div className="text-2xl font-bold text-green-400">${(stats.totalRevenue / 1000).toFixed(0)}k</div>
          <div className="text-slate-500 text-xs mt-1">all routes</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Revenue/Route</div>
          <div className="text-2xl font-bold text-blue-400">${stats.avgRoute.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">per lane</div>
        </div>
        {stats.topRoute && (
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Top Profitable Route</div>
            <div className="text-white text-xs font-mono truncate">{stats.topRoute.origin.split(",")[0]}</div>
            <div className="text-slate-500 text-xs mt-0.5">→ {stats.topRoute.destination.split(",")[0]}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {[
          { key: "revenue", label: "Total Revenue" },
          { key: "margin", label: "Avg Per Load" },
          { key: "revenuePerMile", label: "$/Mile" },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => {
              setSortBy(opt.key);
              setRouteData(prev => [...prev].sort((a, b) => b[opt.key === "revenue" ? "totalRevenue" : opt.key === "margin" ? "profitMargin" : "revenuePerMile"] - a[opt.key === "revenue" ? "totalRevenue" : opt.key === "margin" ? "profitMargin" : "revenuePerMile"]));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sortBy === opt.key ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Heatmap Table */}
      {loading ? (
        <div className="glass-card rounded-xl p-8 flex items-center justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading route data...
        </div>
      ) : routeData.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-slate-500">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No completed routes yet</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Route</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Loads</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total Revenue</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Avg/Load</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Miles</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">$/Mile</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Profitability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {routeData.map((route, i) => {
                  const color = getColor(route.totalRevenue);
                  return (
                    <tr key={i} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium truncate">{route.origin}</div>
                            <div className="text-slate-500 text-xs">→ {route.destination}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300 text-sm">{route.loads}</td>
                      <td className="px-5 py-3 text-right text-white font-bold">${route.totalRevenue.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-slate-300 text-sm">${route.profitMargin.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-slate-300 text-sm">{route.avgMiles.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-slate-300 text-sm">${route.revenuePerMile}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2 items-center">
                          <div
                            className="w-16 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-lg"
                            style={{ background: color }}
                          >
                            {Math.round((route.totalRevenue / maxRevenue) * 100)}%
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="glass-card rounded-xl p-4 border border-white/5">
        <div className="text-slate-400 text-xs font-semibold uppercase mb-3">Profitability Scale</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 rounded-lg" style={{ background: "rgb(255, 0, 0)" }} />
            <span className="text-slate-400 text-xs">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 rounded-lg" style={{ background: "rgb(255, 200, 0)" }} />
            <span className="text-slate-400 text-xs">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 rounded-lg" style={{ background: "rgb(34, 197, 94)" }} />
            <span className="text-slate-400 text-xs">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}