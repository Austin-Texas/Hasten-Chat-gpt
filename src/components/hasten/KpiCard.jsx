import { TrendingUp, TrendingDown } from "lucide-react";

export default function KpiCard({ label, value, sub, icon: Icon, color = "orange", trend, trendLabel, onClick }) {
  const colorMap = {
    orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", icon: "text-orange-400", glow: "hover:shadow-orange-500/10" },
    green: { bg: "bg-green-500/10", border: "border-green-500/20", icon: "text-green-400", glow: "hover:shadow-green-500/10" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-400", glow: "hover:shadow-blue-500/10" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: "text-cyan-400", glow: "hover:shadow-cyan-500/10" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400", glow: "hover:shadow-amber-500/10" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-400", glow: "hover:shadow-red-500/10" },
  };
  const c = colorMap[color] || colorMap.orange;

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-xl p-5 kpi-card hover:shadow-lg ${c.glow} transition-all duration-200 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
          <p className="text-white text-2xl font-bold font-heading truncate animate-counter">{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend >= 0 ? "+" : ""}{trend}%</span>
              {trendLabel && <span className="text-slate-500 font-normal">{trendLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
}