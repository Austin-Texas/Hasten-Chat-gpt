import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { logRCSigned, logRCRejected } from "@/lib/timelineLogger";

export default function RCSigningPanel({ rc, load, onUpdate }) {
  const [signing, setSigning] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [clarificationText, setClarificationText] = useState("");

  const handleSignRC = async () => {
    if (!rc) return;
    setSigning(true);
    try {
      // Get current user (driver)
      let currentUser = { id: 'system', role: 'driver', full_name: 'Driver' };
      try {
        const user = await base44.auth.me();
        Object.assign(currentUser, user);
      } catch {}

      // Update RC to signed
      const updated = await base44.entities.RateConfirmation.update(rc.id, {
        status: "signed",
        signed_at: new Date().toISOString(),
      });

      // Log timeline event
      await logRCSigned(rc.id, load.id, load.load_number || load.id, currentUser);

      if (onUpdate) onUpdate(updated);
      alert("Rate confirmation signed successfully!");
    } catch (err) {
      console.error("Failed to sign RC:", err);
      alert("Failed to sign RC");
    } finally {
      setSigning(false);
    }
  };

  const handleRejectRC = async () => {
    if (!rc || !rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    setRejecting(true);
    try {
      let currentUser = { id: 'system', role: 'driver', full_name: 'Driver' };
      try {
        const user = await base44.auth.me();
        Object.assign(currentUser, user);
      } catch {}

      const updated = await base44.entities.RateConfirmation.update(rc.id, {
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      });

      await logRCRejected(rc.id, load.id, load.load_number || load.id, rejectionReason, currentUser);

      if (onUpdate) onUpdate(updated);
      setRejectionReason("");
      alert("Rate confirmation rejected");
    } catch (err) {
      console.error("Failed to reject RC:", err);
      alert("Failed to reject RC");
    } finally {
      setRejecting(false);
    }
  };

  const handleRequestClarification = async () => {
    if (!rc || !clarificationText.trim()) {
      alert("Please enter clarification request");
      return;
    }
    setClarifying(true);
    try {
      const updated = await base44.entities.RateConfirmation.update(rc.id, {
        clarification_request: clarificationText,
      });

      if (onUpdate) onUpdate(updated);
      setClarificationText("");
      alert("Clarification request sent to dispatcher");
    } catch (err) {
      console.error("Failed to request clarification:", err);
      alert("Failed to request clarification");
    } finally {
      setClarifying(false);
    }
  };

  if (!rc || rc.status === "signed") return null;

  return (
    <div className="glass-card rounded-xl border border-white/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-semibold">Driver Actions</h3>
      </div>

      {rc.status === "sent" && (
        <div className="space-y-3">
          <div className="text-sm text-slate-400">
            Review the rate confirmation and sign to accept, or reject with reason.
          </div>

          {/* Sign */}
          <button
            onClick={handleSignRC}
            disabled={signing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {signing ? "Signing…" : "Sign & Accept"}
          </button>

          {/* Reject */}
          <div className="space-y-2">
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/40"
              rows="2"
            />
            <button
              onClick={handleRejectRC}
              disabled={rejecting || !rejectionReason.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/25 disabled:opacity-50 transition-colors"
            >
              {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {rejecting ? "Rejecting…" : "Reject RC"}
            </button>
          </div>

          {/* Request Clarification */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <textarea
              value={clarificationText}
              onChange={(e) => setClarificationText(e.target.value)}
              placeholder="Ask dispatcher for clarification (optional)"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/40"
              rows="2"
            />
            <button
              onClick={handleRequestClarification}
              disabled={clarifying || !clarificationText.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/25 disabled:opacity-50 transition-colors"
            >
              {clarifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
              {clarifying ? "Sending…" : "Request Clarification"}
            </button>
          </div>
        </div>
      )}

      {rc.status === "rejected" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="text-red-400 text-xs font-semibold">Rejected</div>
          <div className="text-slate-300 text-sm mt-1">{rc.rejection_reason}</div>
        </div>
      )}
    </div>
  );
}