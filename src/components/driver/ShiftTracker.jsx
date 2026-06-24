import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Play, Square, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

const HOS_LIMIT_HOURS = 11; // FMCSA daily driving limit

function fmt(ms) {
  if (ms <= 0) return "0h 00m";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function ShiftTracker({ user }) {
  const [todayShift, setTodayShift] = useState(null);
  const [elapsed, setElapsed]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [expanded, setExpanded]     = useState(true);
  const [recentShifts, setRecentShifts] = useState([]);
  const timerRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);

  // Fetch today's open shift + last 5 shifts
  useEffect(() => {
    const load = async () => {
      try {
        const shifts = await base44.entities.ShiftLog.filter(
          { driver_id: user?.id },
          "-shift_date",
          6
        );
        const open = shifts.find(s => s.shift_date === today && !s.end_time);
        setTodayShift(open || null);
        setRecentShifts(shifts.filter(s => s.end_time).slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  // Live elapsed timer when a shift is open
  useEffect(() => {
    clearInterval(timerRef.current);
    if (todayShift && !todayShift.end_time) {
      const tick = () => setElapsed(Date.now() - new Date(todayShift.start_time).getTime());
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [todayShift]);

  const startShift = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const shift = await base44.entities.ShiftLog.create({
        driver_id: user?.id,
        shift_date: today,
        start_time: now,
      });
      setTodayShift(shift);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const endShift = async () => {
    if (!todayShift) return;
    setSaving(true);
    try {
      const now = new Date();
      const startMs = new Date(todayShift.start_time).getTime();
      const totalHours = parseFloat(((now.getTime() - startMs) / 3600000).toFixed(2));
      const updated = await base44.entities.ShiftLog.update(todayShift.id, {
        end_time: now.toISOString(),
        total_hours: totalHours,
      });
      setTodayShift(null);
      setRecentShifts(prev => [updated, ...prev].slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const hosPercent = Math.min((elapsed / (HOS_LIMIT_HOURS * 3600000)) * 100, 100);
  const hosWarning = hosPercent >= 80;
  const hosDanger  = hosPercent >= 100;

  if (loading) return <div className="skeleton h-32 rounded-2xl" />;

  return (
    <div className={`glass-card rounded-2xl border transition-colors ${
      hosDanger ? "border-red-500/30" : hosWarning ? "border-amber-500/30" : "border-white/5"
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${todayShift ? "text-orange-400" : "text-slate-500"}`} />
          <span className="text-white font-semibold text-sm">Shift Tracker</span>
          {todayShift && (
            <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {todayShift && (
            <span className={`font-mono font-bold text-sm ${hosDanger ? "text-red-400" : hosWarning ? "text-amber-400" : "text-white"}`}>
              {fmt(elapsed)}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* HOS progress bar */}
          {todayShift && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500">HOS Progress ({HOS_LIMIT_HOURS}h limit)</span>
                <span className={hosDanger ? "text-red-400 font-medium" : hosWarning ? "text-amber-400 font-medium" : "text-slate-400"}>
                  {fmt(elapsed)} / {HOS_LIMIT_HOURS}h
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    hosDanger ? "bg-red-500" : hosWarning ? "bg-amber-400" : "bg-gradient-to-r from-orange-500 to-orange-400"
                  }`}
                  style={{ width: `${hosPercent}%` }}
                />
              </div>
              {hosWarning && (
                <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${hosDanger ? "text-red-400" : "text-amber-400"}`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {hosDanger ? "HOS limit reached — end shift now" : "Approaching HOS limit"}
                </div>
              )}
            </div>
          )}

          {/* Start / End button */}
          {todayShift ? (
            <button
              onClick={endShift}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-150 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)" }}
            >
              <Square className="w-4 h-4" />
              {saving ? "Ending shift…" : "End Shift"}
            </button>
          ) : (
            <button
              onClick={startShift}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-150 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", boxShadow: "0 4px 16px rgba(234,88,12,0.25)" }}
            >
              <Play className="w-4 h-4" />
              {saving ? "Starting shift…" : "Start Shift"}
            </button>
          )}

          {/* Recent shift history */}
          {recentShifts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Recent Shifts</p>
              {recentShifts.map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs bg-white/3 rounded-lg px-3 py-2">
                  <span className="text-slate-400">{new Date(s.shift_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className="text-white font-medium font-mono">{fmt((s.total_hours || 0) * 3600000)}</span>
                  <span className={`font-medium ${(s.total_hours || 0) >= HOS_LIMIT_HOURS ? "text-red-400" : "text-green-400"}`}>
                    {(s.total_hours || 0) >= HOS_LIMIT_HOURS ? "Over limit" : "OK"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}