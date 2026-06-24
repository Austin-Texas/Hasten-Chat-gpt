import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, AlertTriangle, CheckCircle2, Loader2, ZapOff } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function DetentionStopCard({ load, stop, onRefresh }) {
  const [detention, setDetention] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    fetchDetention();
    const interval = setInterval(fetchDetention, 15000); // Check every 15 sec
    return () => clearInterval(interval);
  }, [stop.id]);

  useEffect(() => {
    if (!detention || !detention.free_until) return;
    const timer = setInterval(() => {
      const now = new Date();
      const free = new Date(detention.free_until);
      const remaining = Math.max(0, Math.floor((free.getTime() - now.getTime()) / 60000));
      setTimeRemaining(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [detention?.free_until]);

  const fetchDetention = async () => {
    try {
      const detentions = await base44.entities.DetentionRecord.filter(
        { load_id: load.id, stop_id: stop.id },
        "-created_date",
        1
      );
      if (detentions.length > 0) {
        setDetention(detentions[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const startDetention = async () => {
    setActionInProgress(true);
    try {
      const res = await base44.functions.invoke("detentionTimerEngine", {
        action: "start_detention",
        load_id: load.id,
        stop_id: stop.id,
        driver_id: load.driver_id,
      });
      await fetchDetention();
      onRefresh?.();
      alert("Detention timer started");
    } catch (err) {
      console.error(err);
      alert("Failed to start detention timer");
    } finally {
      setActionInProgress(false);
    }
  };

  const endDetention = async () => {
    setActionInProgress(true);
    try {
      await base44.functions.invoke("detentionTimerEngine", {
        action: "end_detention",
        load_id: load.id,
        stop_id: stop.id,
      });
      await fetchDetention();
      onRefresh?.();
      alert("Detention timer ended");
    } catch (err) {
      console.error(err);
      alert("Failed to end detention");
    } finally {
      setActionInProgress(false);
    }
  };

  const waiveDetention = async () => {
    const reason = prompt("Reason for waiving detention:");
    if (!reason) return;
    setActionInProgress(true);
    try {
      const user = await base44.auth.me();
      await base44.functions.invoke("detentionTimerEngine", {
        action: "waive_detention",
        load_id: load.id,
        stop_id: stop.id,
        reason,
        user_id: user.id,
      });
      await fetchDetention();
      onRefresh?.();
      alert("Detention waived");
    } catch (err) {
      console.error(err);
      alert("Failed to waive detention");
    } finally {
      setActionInProgress(false);
    }
  };

  const submitForApproval = async () => {
    setActionInProgress(true);
    try {
      await base44.functions.invoke("detentionApprovalWorkflow", {
        action: "submit_for_approval",
        detention_id: detention.id,
      });
      await fetchDetention();
      onRefresh?.();
      alert("Detention submitted for manager approval");
    } catch (err) {
      console.error(err);
      alert("Failed to submit detention");
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-32 rounded-lg" />;
  }

  if (!detention) {
    return (
      <div className="glass-card rounded-lg border border-white/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Stop {stop.stop_number}: {stop.facility_name}</p>
            <p className="text-slate-500 text-xs mt-1">No detention timer active</p>
          </div>
          <button
            onClick={startDetention}
            disabled={actionInProgress}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/25 disabled:opacity-50 transition-colors"
          >
            {actionInProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            {actionInProgress ? "Starting..." : "Start Timer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-lg border p-4 transition-all ${
      detention.status === "active"
        ? "border-red-500/30 bg-red-500/5"
        : detention.status === "waived"
        ? "border-slate-500/30 bg-slate-500/5"
        : "border-white/5"
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white font-medium text-sm">Stop {detention.stop_number}: {detention.facility_name}</p>
            <StatusBadge status={detention.status} />
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Arrived: {new Date(detention.arrived_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Free Time Remaining */}
        {(detention.status === "free_wait" || detention.status === "active") && timeRemaining !== null && (
          <>
            {detention.status === "free_wait" && (
              <div className="bg-white/3 rounded-lg p-2 border border-green-500/20">
                <div className="text-green-400 text-xs font-bold">{Math.max(0, timeRemaining)} min</div>
                <div className="text-slate-500 text-xs">Free time left</div>
              </div>
            )}
            {detention.status === "active" && (
              <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/30 col-span-2">
                <div className="text-red-400 text-xs font-bold">Detention Active</div>
                <div className="text-red-300/80 text-xs">Billable: ${detention.billable_amount.toFixed(2)}</div>
              </div>
            )}
          </>
        )}

        {/* Billable Amount */}
        {(detention.status === "resolved" || detention.status === "disputed") && (
          <div className="bg-white/3 rounded-lg p-2 border border-amber-500/20">
            <div className="text-amber-400 text-xs font-bold">${detention.billable_amount.toFixed(2)}</div>
            <div className="text-slate-500 text-xs">{detention.billable_minutes} min billable</div>
          </div>
        )}

        {/* Total Time */}
        <div className="bg-white/3 rounded-lg p-2 border border-white/10">
          <div className="text-white text-xs font-bold">{detention.total_minutes} min</div>
          <div className="text-slate-500 text-xs">Total wait</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {detention.status === "free_wait" && (
          <button
            onClick={endDetention}
            disabled={actionInProgress}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/25 disabled:opacity-50 transition-colors"
          >
            {actionInProgress ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Complete
          </button>
        )}

        {detention.status === "active" && (
          <button
            onClick={endDetention}
            disabled={actionInProgress}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/25 disabled:opacity-50 transition-colors flex-1"
          >
            {actionInProgress ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            End Detention
          </button>
        )}

        {detention.status === "resolved" && !detention.waived && (
          <>
            <button
              onClick={waiveDetention}
              disabled={actionInProgress}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-500/15 border border-slate-500/30 text-slate-400 text-xs font-medium hover:bg-slate-500/25 disabled:opacity-50 transition-colors"
            >
              {actionInProgress ? <Loader2 className="w-3 h-3 animate-spin" /> : <ZapOff className="w-3 h-3" />}
              Waive
            </button>
            <button
              onClick={submitForApproval}
              disabled={actionInProgress}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/25 disabled:opacity-50 transition-colors flex-1"
            >
              {actionInProgress ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Submit for Approval
            </button>
          </>
        )}
        {detention.status === "pending_approval" && (
          <div className="text-amber-400 text-xs font-semibold py-1.5 px-2">⏳ Pending Manager Review</div>
        )}
        {detention.status === "approved" && (
          <div className="text-green-400 text-xs font-semibold py-1.5 px-2">✓ Approved for Billing</div>
        )}

        {detention.waived && (
          <div className="text-slate-400 text-xs py-1.5 px-2 italic">Waived: {detention.waived_reason}</div>
        )}
      </div>
    </div>
  );
}