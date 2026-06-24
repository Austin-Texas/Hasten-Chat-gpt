import { useMemo } from "react";
import { TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function DriverScorecard({ driver, loads = [] }) {
  const metrics = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Filter loads from last 90 days
    const recentLoads = loads.filter(l => {
      const loadDate = new Date(l.created_date);
      return loadDate >= ninetyDaysAgo && loadDate <= now;
    });

    // Calculate HOS compliance (hours_driving_today vs hours_on_duty_today)
    const hosDriving = driver.hours_driving_today || 0;
    const hosOnDuty = driver.hours_on_duty_today || 0;
    const hosCompliance = hosOnDuty > 0 ? Math.min(100, Math.round((hosDriving / 14) * 100)) : 100; // 14 hr FMCSA limit

    // Calculate safety score (existing field)
    const safetyScore = driver.safety_score || 100;

    // Calculate load performance metrics
    const completedLoads = recentLoads.filter(l => l.status === "completed");
    const totalLoads = recentLoads.length;
    const completionRate = totalLoads > 0 ? Math.round((completedLoads.length / totalLoads) * 100) : 100;
    
    // Average revenue per load
    const totalRevenue = completedLoads.reduce((s, l) => s + (l.rate || 0), 0);
    const avgRevenuePerLoad = completedLoads.length > 0 ? Math.round(totalRevenue / completedLoads.length) : 0;

    // Average miles per load
    const totalMiles = completedLoads.reduce((s, l) => s + (l.miles || 0), 0);
    const avgMilesPerLoad = completedLoads.length > 0 ? Math.round(totalMiles / completedLoads.length) : 0;

    // On-time delivery rate
    const onTimeLoads = completedLoads.filter(l => {
      if (!l.delivery_date || !l.actual_delivery) return false;
      return new Date(l.actual_delivery) <= new Date(l.delivery_date);
    });
    const onTimeRate = completedLoads.length > 0 ? Math.round((onTimeLoads.length / completedLoads.length) * 100) : 0;

    // Weekly load distribution
    const weeklyLoads = Array.from({ length: 12 }, (_, i) => {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      const count = completedLoads.filter(l => {
        const d = new Date(l.created_date);
        return d >= weekStart && d <= weekEnd;
      }).length;
      return { week: `W${12 - i}`, loads: count };
    }).reverse();

    return {
      hosDriving,
      hosOnDuty,
      hosCompliance,
      safetyScore,
      completionRate,
      avgRevenuePerLoad,
      avgMilesPerLoad,
      onTimeRate,
      totalLoads,
      completedLoads: completedLoads.length,
      weeklyLoads,
    };
  }, [driver, loads]);

  const scoreColor = (score) => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-amber-400";
    return "text-red-400";
  };

  const scoreBg = (score) => {
    if (score >= 90) return "bg-green-500/10 border-green-500/25";
    if (score >= 75) return "bg-amber-500/10 border-amber-500/25";
    return "bg-red-500/10 border-red-500/25";
  };

  return (
    <div className="space-y-5">
      {/* Main Score Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* HOS Compliance */}
        <div className={`glass-card rounded-xl p-4 border ${scoreBg(metrics.hosCompliance)}`}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase">HOS Compliance</span>
            <Clock className={`w-4 h-4 ${scoreColor(metrics.hosCompliance)}`} />
          </div>
          <div className={`text-2xl font-bold ${scoreColor(metrics.hosCompliance)}`}>{metrics.hosCompliance}%</div>
          <div className="text-slate-500 text-xs mt-2">
            {metrics.hosDriving.toFixed(1)}h driving / {metrics.hosOnDuty.toFixed(1)}h on-duty
          </div>
        </div>

        {/* Safety Score */}
        <div className={`glass-card rounded-xl p-4 border ${scoreBg(metrics.safetyScore)}`}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase">Safety Score</span>
            <AlertCircle className={`w-4 h-4 ${scoreColor(metrics.safetyScore)}`} />
          </div>
          <div className={`text-2xl font-bold ${scoreColor(metrics.safetyScore)}`}>{metrics.safetyScore}</div>
          <div className="text-slate-500 text-xs mt-2">Based on safety incidents</div>
        </div>

        {/* Completion Rate */}
        <div className={`glass-card rounded-xl p-4 border ${scoreBg(metrics.completionRate)}`}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase">Completion</span>
            <CheckCircle2 className={`w-4 h-4 ${scoreColor(metrics.completionRate)}`} />
          </div>
          <div className={`text-2xl font-bold ${scoreColor(metrics.completionRate)}`}>{metrics.completionRate}%</div>
          <div className="text-slate-500 text-xs mt-2">{metrics.completedLoads} / {metrics.totalLoads} loads</div>
        </div>

        {/* On-Time Rate */}
        <div className={`glass-card rounded-xl p-4 border ${scoreBg(metrics.onTimeRate)}`}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase">On-Time</span>
            <TrendingUp className={`w-4 h-4 ${scoreColor(metrics.onTimeRate)}`} />
          </div>
          <div className={`text-2xl font-bold ${scoreColor(metrics.onTimeRate)}`}>{metrics.onTimeRate}%</div>
          <div className="text-slate-500 text-xs mt-2">Deliveries on schedule</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Load Performance */}
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-semibold text-sm mb-4">Load Performance (90 days)</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs">Avg Revenue / Load</span>
                <span className="text-green-400 font-bold text-sm">${metrics.avgRevenuePerLoad.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, (metrics.avgRevenuePerLoad / 2000) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs">Avg Miles / Load</span>
                <span className="text-blue-400 font-bold text-sm">{metrics.avgMilesPerLoad.toLocaleString()} mi</span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (metrics.avgMilesPerLoad / 1000) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs">Total Loads (90 days)</span>
                <span className="text-orange-400 font-bold text-sm">{metrics.totalLoads}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Load Trend */}
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-semibold text-sm mb-4">Weekly Load Volume</h3>
          {metrics.weeklyLoads.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={metrics.weeklyLoads} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)" }} />
                <Bar dataKey="loads" fill="#EA580C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No load data</div>
          )}
        </div>
      </div>

      {/* Overall Performance Score */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm mb-4">Overall Performance Score</h3>
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-4xl font-bold ${scoreColor((metrics.hosCompliance + metrics.safetyScore + metrics.completionRate + metrics.onTimeRate) / 4)}`}>
              {Math.round((metrics.hosCompliance + metrics.safetyScore + metrics.completionRate + metrics.onTimeRate) / 4)}
            </div>
            <div className="text-slate-400 text-xs mt-1">Average of all metrics</div>
          </div>
          <div className="text-right space-y-1 text-xs">
            <div><span className="text-slate-500">HOS:</span> <span className="text-white font-semibold">{metrics.hosCompliance}%</span></div>
            <div><span className="text-slate-500">Safety:</span> <span className="text-white font-semibold">{metrics.safetyScore}</span></div>
            <div><span className="text-slate-500">Completion:</span> <span className="text-white font-semibold">{metrics.completionRate}%</span></div>
            <div><span className="text-slate-500">On-Time:</span> <span className="text-white font-semibold">{metrics.onTimeRate}%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}