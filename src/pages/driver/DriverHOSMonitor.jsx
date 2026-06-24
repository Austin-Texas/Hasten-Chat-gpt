import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, AlertTriangle, CheckCircle, Zap, Pause, Play, Loader2 } from "lucide-react";

const HOS_LIMITS = {
  daily_driving: 11,      // 11 hours max driving per day
  on_duty_window: 14,     // 14 hour on-duty window
  off_duty_minimum: 10,   // 10 hours off-duty before driving
  break_interval: 8,      // 30-min break required after 8 hours driving
};

export default function DriverHOSMonitor({ user }) {
  const [driver, setDriver] = useState(null);
  const [shiftLog, setShiftLog] = useState(null);
  const [hosStatus, setHosStatus] = useState(null);
  const [currentShiftStart, setCurrentShiftStart] = useState(null);
  const [breakTaken, setBreakTaken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    fetchDriverData();
  }, [user?.id]);

  const fetchDriverData = async () => {
    try {
      const drivers = await base44.entities.Driver.filter({ user_id: user?.id }, "-created_date", 1);
      if (drivers.length > 0) {
        setDriver(drivers[0]);
        fetchTodayShiftLog(drivers[0].id);
      }
    } catch (err) {
      console.error("Error fetching driver:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayShiftLog = async (driverId) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const logs = await base44.entities.ShiftLog.filter(
        { driver_id: driverId, shift_date: today },
        "-created_date",
        1
      );
      
      if (logs.length > 0) {
        const log = logs[0];
        setShiftLog(log);
        setCurrentShiftStart(new Date(log.start_time));
        calculateHOS(log);
      } else {
        setCurrentShiftStart(null);
        setHosStatus({
          driving_hours: 0,
          on_duty_hours: 0,
          remaining_drive_time: HOS_LIMITS.daily_driving,
          violation: false,
          break_needed: false,
        });
      }
    } catch (err) {
      console.error("Error fetching shift log:", err);
    }
  };

  const calculateHOS = (log) => {
    const startTime = new Date(log.start_time);
    const endTime = log.end_time ? new Date(log.end_time) : new Date();
    
    const totalMinutes = (endTime - startTime) / (1000 * 60);
    const on_duty_hours = Math.round((totalMinutes / 60) * 10) / 10;
    
    // Estimate driving time based on load status
    // In a real system, this would come from GPS/ELD data
    const driving_hours = Math.max(0, on_duty_hours * 0.75);
    const remaining_drive_time = Math.max(0, HOS_LIMITS.daily_driving - driving_hours);
    
    const violation = driving_hours > HOS_LIMITS.daily_driving;
    const break_needed = driving_hours > HOS_LIMITS.break_interval && !breakTaken;
    
    const status = {
      driving_hours: Math.round(driving_hours * 10) / 10,
      on_duty_hours: Math.round(on_duty_hours * 10) / 10,
      remaining_drive_time,
      violation,
      break_needed,
      shift_start: startTime,
      shift_elapsed: Math.round(on_duty_hours),
    };
    
    setHosStatus(status);
    
    // Auto-notify dispatch if violation approaching or exists
    if ((remaining_drive_time < 1.5 || violation) && !alertSent) {
      sendDispatchAlert(status);
      setAlertSent(true);
    }
  };

  const sendDispatchAlert = async (status) => {
    try {
      await base44.functions.invoke("hosViolationAlert", {
        driver_id: driver.id,
        driver_name: `${driver.first_name} ${driver.last_name}`,
        driving_hours: status.driving_hours,
        violation: status.violation,
        break_needed: status.break_needed,
      });
    } catch (err) {
      console.error("Error sending HOS alert:", err);
    }
  };

  const handleBreakStart = async () => {
    setOnBreak(true);
    setBreakStartTime(new Date());
  };

  const handleBreakEnd = async () => {
    setOnBreak(false);
    if (hosStatus && hosStatus.driving_hours > HOS_LIMITS.break_interval) {
      setBreakTaken(true);
    }
    setBreakStartTime(null);
  };

  const handleStartShift = async () => {
    try {
      const log = await base44.entities.ShiftLog.create({
        driver_id: driver.id,
        shift_date: new Date().toISOString().split("T")[0],
        start_time: new Date().toISOString(),
      });
      setShiftLog(log);
      setCurrentShiftStart(new Date(log.start_time));
      setHosStatus({
        driving_hours: 0,
        on_duty_hours: 0,
        remaining_drive_time: HOS_LIMITS.daily_driving,
        violation: false,
        break_needed: false,
      });
    } catch (err) {
      console.error("Error starting shift:", err);
    }
  };

  const handleEndShift = async () => {
    if (!shiftLog) return;
    try {
      await base44.entities.ShiftLog.update(shiftLog.id, {
        end_time: new Date().toISOString(),
      });
      setShiftLog(null);
      setCurrentShiftStart(null);
      setBreakTaken(false);
      setAlertSent(false);
    } catch (err) {
      console.error("Error ending shift:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 pb-24">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-4 pb-24">
        <div className="glass-card rounded-xl p-6 border border-red-500/20 bg-red-500/5 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-semibold">No driver profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 animate-slide-up">
      {/* Header */}
      <div className="px-4 pt-2">
        <h1 className="text-white font-bold text-xl">Hours of Service</h1>
        <p className="text-slate-400 text-xs mt-0.5">Federal HOS compliance tracking</p>
      </div>

      {!currentShiftStart ? (
        // No shift — show start button
        <div className="px-4 space-y-3">
          <div className="glass-card rounded-xl p-5 border border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-semibold">No Active Shift</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">Start your shift to begin HOS tracking.</p>
            <button
              onClick={handleStartShift}
              className="w-full px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors"
            >
              Start Shift
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* HOS Status Cards */}
          {hosStatus && (
            <>
              {/* Alert if violation */}
              {(hosStatus.violation || hosStatus.break_needed) && (
                <div className="px-4">
                  <div className={`glass-card rounded-xl p-4 border ${
                    hosStatus.violation 
                      ? "border-red-500/30 bg-red-500/10" 
                      : "border-amber-500/30 bg-amber-500/10"
                  }`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                        hosStatus.violation ? "text-red-400" : "text-amber-400"
                      }`} />
                      <div>
                        {hosStatus.violation && (
                          <div>
                            <p className="text-red-400 font-bold text-sm">⚠️ HOS Violation</p>
                            <p className="text-red-300/80 text-xs mt-0.5">You have exceeded your 11-hour daily driving limit. Stop driving immediately.</p>
                          </div>
                        )}
                        {hosStatus.break_needed && !hosStatus.violation && (
                          <div>
                            <p className="text-amber-400 font-bold text-sm">⚠️ Break Required</p>
                            <p className="text-amber-300/80 text-xs mt-0.5">You must take a 30-minute break before continuing to drive.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main HOS Gauges */}
              <div className="px-4 space-y-3">
                {/* Driving Hours Gauge */}
                <div className="glass-card rounded-xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Driving Time Today</h3>
                      <div className="text-2xl font-bold text-white mt-1">
                        {hosStatus.driving_hours}h <span className="text-lg text-slate-500">/ {HOS_LIMITS.daily_driving}h</span>
                      </div>
                    </div>
                    <div className={`text-3xl font-bold ${
                      hosStatus.violation ? "text-red-400" : 
                      hosStatus.remaining_drive_time < 2 ? "text-amber-400" : 
                      "text-green-400"
                    }`}>
                      {Math.max(0, hosStatus.remaining_drive_time)}h
                    </div>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hosStatus.violation ? "bg-red-500" :
                        hosStatus.remaining_drive_time < 2 ? "bg-amber-500" :
                        "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (hosStatus.driving_hours / HOS_LIMITS.daily_driving) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    {hosStatus.remaining_drive_time > 0
                      ? `${hosStatus.remaining_drive_time}h remaining`
                      : "Limit reached"}
                  </p>
                </div>

                {/* On-Duty Hours Gauge */}
                <div className="glass-card rounded-xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-slate-400 text-xs uppercase font-semibold tracking-wider">On-Duty Hours</h3>
                      <div className="text-2xl font-bold text-white mt-1">
                        {hosStatus.on_duty_hours}h <span className="text-lg text-slate-500">/ {HOS_LIMITS.on_duty_window}h</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hosStatus.on_duty_hours > HOS_LIMITS.on_duty_window ? "bg-red-500" :
                        hosStatus.on_duty_hours > HOS_LIMITS.on_duty_window - 1 ? "bg-amber-500" :
                        "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (hosStatus.on_duty_hours / HOS_LIMITS.on_duty_window) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    14-hour on-duty window limit
                  </p>
                </div>

                {/* Break Status */}
                {hosStatus.driving_hours > HOS_LIMITS.break_interval && (
                  <div className={`glass-card rounded-xl p-4 border ${
                    breakTaken ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {breakTaken ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <div>
                              <p className="text-green-400 font-semibold text-sm">Break Completed</p>
                              <p className="text-green-300/70 text-xs">30-minute break requirement met</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                            <div>
                              <p className="text-amber-400 font-semibold text-sm">Break Required</p>
                              <p className="text-amber-300/70 text-xs">After {HOS_LIMITS.break_interval}h of driving</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-4 space-y-2 flex gap-2">
                {!onBreak ? (
                  <>
                    <button
                      onClick={handleBreakStart}
                      disabled={hosStatus.violation}
                      className="flex-1 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/60 disabled:opacity-50 text-blue-400 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Start Break
                    </button>
                    <button
                      onClick={handleEndShift}
                      className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 font-bold text-sm transition-colors"
                    >
                      End Shift
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleBreakEnd}
                      className="flex-1 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 hover:border-green-500/60 text-green-400 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Resume Driving
                    </button>
                  </>
                )}
              </div>

              {/* Break Timer */}
              {onBreak && breakStartTime && (
                <div className="px-4">
                  <BreakTimer startTime={breakStartTime} />
                </div>
              )}

              {/* Info Box */}
              <div className="px-4 glass-card rounded-xl p-4 border border-slate-500/20 bg-slate-500/5 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">📋 Federal HOS Regulations:</p>
                <ul className="space-y-0.5">
                  <li>• Max 11 hours driving in a 14-hour on-duty period</li>
                  <li>• Must take 30-minute break after 8 hours driving</li>
                  <li>• Must have 10 hours off-duty before next shift</li>
                  <li>• Violations subject to fines and penalties</li>
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function BreakTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const mins = Math.floor((now - startTime) / 60000);
      setElapsed(mins);
      if (mins >= 30) setComplete(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const remaining = Math.max(0, 30 - elapsed);

  return (
    <div className="glass-card rounded-xl p-4 border border-green-500/30 bg-green-500/10">
      <div className="text-center">
        <p className="text-green-400 font-bold text-lg">{remaining}min remaining</p>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-green-500 transition-all duration-1000"
            style={{ width: `${Math.min(100, (elapsed / 30) * 100)}%` }}
          />
        </div>
        {complete && (
          <p className="text-green-300 font-semibold text-sm mt-2">✓ Break completed!</p>
        )}
      </div>
    </div>
  );
}