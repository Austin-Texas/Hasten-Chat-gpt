import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, Truck, MapPin, CheckCircle, ArrowRight, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Truck SVG
function TruckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.22-3c-.55-.61-1.33-1-2.22-1s-1.67.39-2.22 1H3V6h12v9H8.22zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  );
}

export default function DriverEarnings({ user }) {
  const [loads, setLoads]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Load.filter({ driver_id: user?.id, status: "completed" }, "-actual_delivery", 100)
      .then(setLoads).catch(console.error).finally(() => setLoading(false));
  }, [user?.id]);

  const totalEarnings = loads.reduce((s, l) => s + (l.rate  || 0), 0);
  const totalMiles    = loads.reduce((s, l) => s + (l.miles || 0), 0);
  const avgPerLoad    = loads.length > 0 ? totalEarnings / loads.length : 0;
  const ratePerMile   = totalMiles   > 0 ? totalEarnings / totalMiles   : 0;

  // Group by day label for chart
  const weeklyData = loads.reduce((acc, load) => {
    if (!load.actual_delivery && !load.created_date) return acc;
    const date = new Date(load.actual_delivery || load.created_date);
    const key  = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    acc[key]   = (acc[key] || 0) + (load.rate || 0);
    return acc;
  }, {});
  const chartData = Object.entries(weeklyData).slice(-8).map(([week, amount]) => ({ week, amount }));

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="skeleton h-36 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">

      {/* ── Hero Earnings Banner ── */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(15,24,42,0.95) 60%)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        {/* Watermark */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-5">
          <DollarSign className="w-28 h-28 text-green-400" />
        </div>

        <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Total Earnings</div>
        <div className="text-green-400 font-heading font-bold text-4xl mb-1">
          ${totalEarnings.toLocaleString()}
        </div>
        <div className="text-slate-500 text-sm">
          {loads.length} completed load{loads.length !== 1 ? "s" : ""} · {totalMiles.toLocaleString()} total miles
        </div>
      </div>

      <Link
        to="/driver/settlement-preview"
        className="flex items-center justify-between rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-orange-200 active:scale-[0.98] transition-transform"
      >
        <div>
          <div className="text-sm font-bold text-orange-100">Weekly Settlement Preview</div>
          <div className="mt-0.5 text-xs text-orange-200/70">View current week payout estimate and load-by-load breakdown.</div>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0" />
      </Link>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Avg Per Load", value: `$${Math.round(avgPerLoad).toLocaleString()}`, icon: TrendingUp, color: "#EA580C" },
          { label: "Rate / Mile",  value: `$${ratePerMile.toFixed(2)}`,                  icon: MapPin,     color: "#3b82f6" },
          { label: "Total Miles",  value: totalMiles.toLocaleString(),                   icon: TruckIcon,  color: "#8b5cf6", isTruck: true },
          { label: "Loads Done",   value: loads.length,                                  icon: CheckCircle,color: "#22c55e" },
        ].map(({ label, value, icon: Icon, color, isTruck }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{
              background: "rgba(15,24,42,0.8)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}18` }}>
              {isTruck
                ? <Icon className="w-4 h-4" style={{ color }} />
                : <Icon className="w-4 h-4" style={{ color }} />
              }
            </div>
            <div className="text-white font-bold text-lg font-mono">{value}</div>
            <div className="text-slate-500 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Earnings Chart ── */}
      {chartData.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(15,24,42,0.8)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2 className="text-white font-semibold text-sm mb-4">Earnings by Day</h2>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0F1829",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={v => [`$${v.toLocaleString()}`, "Earned"]}
                cursor={{ fill: "rgba(234,88,12,0.06)" }}
              />
              <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === chartData.length - 1 ? "#EA580C" : "#1e3a5f"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Load History ── */}
      <div>
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">Completed Loads</h2>
        {loads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
              <TruckIcon className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">No completed loads yet</p>
            <p className="text-slate-600 text-sm mt-1">Accept your first load to start earning</p>
          </div>
        ) : (
          <div className="space-y-2">
            {loads.slice(0, 20).map(load => (
              <div
                key={load.id}
                className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{
                  background: "rgba(15,24,42,0.7)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="w-9 h-9 rounded-xl bg-green-500/8 border border-green-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-orange-400 font-mono text-xs font-bold mb-0.5">
                    {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                  </div>
                  <div className="text-slate-300 text-sm flex items-center gap-1 truncate">
                    <span className="truncate">{load.origin_city}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <span className="truncate">{load.destination_city}</span>
                  </div>
                  {(load.miles || load.equipment_type) && (
                    <div className="text-slate-600 text-xs mt-0.5">
                      {[load.miles ? `${load.miles}mi` : null, load.equipment_type].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-green-400 font-bold text-sm">${(load.rate || 0).toLocaleString()}</div>
                  <div className="text-slate-600 text-xs">
                    {load.actual_delivery
                      ? new Date(load.actual_delivery).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
