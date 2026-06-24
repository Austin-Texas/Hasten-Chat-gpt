import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, Loader2, Edit2 } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function DetentionApprovalQueue() {
  const [pendingDetentions, setPendingDetentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPending = async () => {
    try {
      const records = await base44.entities.DetentionRecord.filter(
        { status: "pending_approval" },
        "-created_date",
        50
      );
      setPendingDetentions(records);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const submitReview = async (detention) => {
    setActionInProgress(detention.id);
    try {
      const billableMinutesReviewed = editValues[detention.id]?.billableMinutes ?? detention.billable_minutes;
      const reviewNotes = editValues[detention.id]?.notes ?? "";

      await base44.functions.invoke("detentionApprovalWorkflow", {
        action: "review_detention",
        detention_id: detention.id,
        billable_minutes_reviewed: billableMinutesReviewed,
        review_notes: reviewNotes,
      });

      await fetchPending();
      setEditingId(null);
      setEditValues({});
      alert("Detention reviewed and ready for approval");
    } catch (err) {
      console.error(err);
      alert("Failed to review detention");
    } finally {
      setActionInProgress(null);
    }
  };

  const approve = async (detention) => {
    setActionInProgress(detention.id);
    try {
      await base44.functions.invoke("detentionApprovalWorkflow", {
        action: "approve_detention",
        detention_id: detention.id,
      });
      await fetchPending();
      alert("Detention approved for billing");
    } catch (err) {
      console.error(err);
      alert("Failed to approve detention");
    } finally {
      setActionInProgress(null);
    }
  };

  const reject = async (detention) => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    setActionInProgress(detention.id);
    try {
      await base44.functions.invoke("detentionApprovalWorkflow", {
        action: "reject_detention",
        detention_id: detention.id,
        rejection_reason: reason,
      });
      await fetchPending();
      alert("Detention rejected for review");
    } catch (err) {
      console.error(err);
      alert("Failed to reject detention");
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return <div className="skeleton h-96 rounded-lg" />;
  }

  if (pendingDetentions.length === 0) {
    return (
      <div className="glass-card rounded-lg border border-white/5 p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No pending detention approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Pending Approvals ({pendingDetentions.length})</h3>
      </div>

      {pendingDetentions.map((detention) => (
        <div
          key={detention.id}
          className="glass-card rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium text-sm">Stop {detention.stop_number}: {detention.facility_name}</span>
                <StatusBadge status={detention.status} />
              </div>
              <p className="text-slate-500 text-xs">
                Load: {detention.load_id?.slice(-6).toUpperCase()} | Arrived: {new Date(detention.arrived_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setExpandedId(expandedId === detention.id ? null : detention.id)}
              className="text-slate-400 hover:text-white text-xs font-medium"
            >
              {expandedId === detention.id ? "Hide" : "Show"} Details
            </button>
          </div>

          {/* Current Amounts */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white/3 rounded p-2">
              <div className="text-slate-500 text-xs">Total Wait</div>
              <div className="text-white font-bold text-sm">{detention.total_minutes} min</div>
            </div>
            <div className="bg-white/3 rounded p-2">
              <div className="text-slate-500 text-xs">Billable (calc)</div>
              <div className="text-white font-bold text-sm">{detention.billable_minutes} min</div>
            </div>
            <div className="bg-amber-500/15 rounded p-2 border border-amber-500/30">
              <div className="text-amber-300 text-xs">Amount</div>
              <div className="text-amber-200 font-bold text-sm">${detention.billable_amount.toFixed(2)}</div>
            </div>
          </div>

          {/* Edit Mode */}
          {editingId === detention.id ? (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-3 space-y-3">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Billable Minutes (editable)</label>
                <input
                  type="number"
                  value={editValues[detention.id]?.billableMinutes ?? detention.billable_minutes}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      [detention.id]: {
                        ...editValues[detention.id],
                        billableMinutes: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-sm"
                />
                <div className="text-slate-500 text-xs mt-1">
                  New amount: ${(((editValues[detention.id]?.billableMinutes ?? detention.billable_minutes) / 60) * detention.rate_per_hour).toFixed(2)}
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Review Notes</label>
                <textarea
                  value={editValues[detention.id]?.notes ?? ""}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      [detention.id]: {
                        ...editValues[detention.id],
                        notes: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs"
                  placeholder="e.g., Reduced from 120 to 90 min due to facility scheduling"
                  rows="2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => submitReview(detention)}
                  disabled={actionInProgress === detention.id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {actionInProgress === detention.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  Save & Continue
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  disabled={actionInProgress === detention.id}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-slate-300 text-xs font-medium hover:text-white hover:bg-white/15 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            expandedId === detention.id && (
              <div className="bg-white/3 rounded-lg p-3 border border-white/10 mb-3 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Free Wait Period:</span>
                  <span className="text-white">{detention.free_until ? new Date(detention.free_until).toLocaleTimeString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate per Hour:</span>
                  <span className="text-white">${detention.rate_per_hour}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Detention Started:</span>
                  <span className="text-white">
                    {detention.detention_started_at ? new Date(detention.detention_started_at).toLocaleTimeString() : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Detention Ended:</span>
                  <span className="text-white">
                    {detention.detention_ended_at ? new Date(detention.detention_ended_at).toLocaleTimeString() : "—"}
                  </span>
                </div>
                {detention.review_notes && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-slate-400 text-xs">Previous Review Notes:</span>
                    <p className="text-slate-300 mt-1">{detention.review_notes}</p>
                  </div>
                )}
              </div>
            )
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {editingId !== detention.id && (
              <>
                <button
                  onClick={() => setEditingId(detention.id)}
                  disabled={actionInProgress === detention.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/25 disabled:opacity-50 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit & Review
                </button>
                <button
                  onClick={() => approve(detention)}
                  disabled={actionInProgress === detention.id}
                  className="flex items-center justify-center gap-1 flex-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {actionInProgress === detention.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => reject(detention)}
                  disabled={actionInProgress === detention.id}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 disabled:opacity-50 transition-colors"
                >
                  {actionInProgress === detention.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}