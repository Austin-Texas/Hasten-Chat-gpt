import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

const HOS_LIMIT = 11; // FMCSA daily driving limit in hours

function fmt(hours) {
  if (!hours) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function HosBar({ hours }) {
  const pct = Math.min((hours / HOS_LIMIT) * 100, 100);
  const danger  = hours >= HOS_LIMIT;
  const warning = hours >= HOS_LIMIT * 0.8;
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: danger ? "#EF4444" : warning ? "#F59E0B" : "#EA580C",
        }}
      />
    </div>
  );
}

export default function DailyShiftSummary() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch today's shift logs and all drivers in parallel
        const [shifts, drivers] = await Promise.all([
          base44.entities.ShiftLog.filter({ shift_date: today }, "-start_time", 100),
          base44.entities.Driver.list("-created_date", 100),
        ]);

        const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));

        // One row per driver that has a shift today
        const byDriver = {};
        shifts.forEach(s => {
          if (!byDriver[s.driver_id]) byDriver[s.driver_id] = [];
          byDriver[s.driver_id].push(s);
        });

        const result = Object.entries(byDriver).map(([driverId, dShifts]) => {
          const driver = driverMap[driverId];
          const name = driver ? `${driver.first_name} ${driver.last_name}` : `Driver ${driverId.slice(-4)}`;
          const openShift = dShifts.find(s => !s.end_time);
          const closedHours = dShifts.filter(s => s.end_time).reduce((sum, s) => sum + (s.total_hours || 0), 0);
          const liveHours = openShift
            ? (Date.now() - new Date(openShift.start_time).getTime()) / 3600000
            : 0;
          const totalHours = closedHours + liveHours;
          const firstStart = dShifts.reduce((min, s) => (!min || s.start_time < min ? s.start_time : min), null);
          const lastEnd    = dShifts.filter(s => s.end_time).reduce((max, s) => (!max || s.end_time > max ? s.end_time : max), null);

          return { driverId, name, totalHours, openShift, firstStart, lastEnd };
        }).sort((a, b) => b.totalHours - a.totalHours);

        setRows(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const overLimit  = rows.filter(r => r.totalHours >= HOS_LIMIT).length;
  const nearLimit  = rows.filter(r => r.totalHours >= HOS_LIMIT * 0.8 && r.totalHours < HOS_LIMIT).length;
  const activeNow  = rows.filter(r => r.openShift).length;

  if (loading) return <div className="skeleton h-48 rounded-xl" />;
  if (rows.length === 0) return null;

  return (
    <div className="glass-card rounded-xl border border-white/5">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-white/5"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-orange-400" />
          <h2 className="text-white font-heading font-semibold">Daily Shift Summary</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">Today</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick pills */}
          <div className="hidden sm:flex items-center gap-2">
            {activeNow > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/15 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {activeNow} on shift
              </span>
            )}
            {nearLimit > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> {nearLimit} near limit
              </span>
            )}
            {overLimit > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> {overLimit} over limit
              </span>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <>
          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-3 px-5 py-2 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider bg-white/[0.02]">
            <span>Driver</span>
            <span>Start</span>
            <span>End</span>
            <span>Total</span>
            <span>HOS ({HOS_LIMIT}h limit)</span>
          </div>

          <div className="divide-y divide-white/5">
            {rows.map(row => {
              const danger  = row.totalHours >= HOS_LIMIT;
              const warning = row.totalHours >= HOS_LIMIT * 0.8 && !danger;

              return (
                <div key={row.driverId} className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-3 items-center px-5 py-3">
                  {/* Driver name + status */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-400 text-xs font-bold">{row.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{row.name}</div>
                      {row.openShift && (
                        <span className="text-[10px] text-green-400 font-medium flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Start */}
                  <span className="text-slate-300 text-xs">
                    {row.firstStart ? new Date(row.firstStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </span>

                  {/* End */}
                  <span className="text-slate-300 text-xs">
                    {row.openShift ? <span className="text-green-400 font-medium">Active</span>
                      : row.lastEnd ? new Date(row.lastEnd).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </span>

                  {/* Total hours */}
                  <span className={`text-sm font-bold font-mono ${danger ? "text-red-400" : warning ? "text-amber-400" : "text-white"}`}>
                    {fmt(row.totalHours)}
                  </span>

                  {/* HOS bar + compliance icon */}
                  <div className="flex items-center gap-2">
                    <HosBar hours={row.totalHours} />
                    {danger
                      ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      : warning
                      ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      : <CheckCircle className="w-3.5 h-3.5 text-green-500/50 flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer totals */}
          <div className="flex items-center gap-6 px-5 py-3 border-t border-white/5 bg-white/[0.02] text-xs text-slate-500">
            <span>{rows.length} driver{rows.length !== 1 ? "s" : ""} logged today</span>
            <span className="text-white font-medium">{fmt(rows.reduce((s, r) => s + r.totalHours, 0))} total fleet hours</span>
            {overLimit > 0 && (
              <span className="text-red-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {overLimit} HOS violation{overLimit !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}