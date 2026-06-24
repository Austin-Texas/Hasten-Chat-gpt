import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Download, ThumbsUp, ThumbsDown, HelpCircle, Loader2, ChevronLeft, ZoomIn, ZoomOut } from "lucide-react";
import SignatureCanvas from "./SignatureCanvas";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function RCViewer({ load, rc: initialRC }) {
  const [rc, setRC] = useState(initialRC);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [showSignature, setShowSignature] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showClarifyDialog, setShowClarifyDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [clarifyRequest, setClarifyRequest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [docViewed, setDocViewed] = useState(false);

  // Mark as viewed after 3 seconds
  useEffect(() => {
    if (!docViewed && rc?.status === "sent") {
      const timeout = setTimeout(async () => {
        try {
          await base44.entities.RateConfirmation.update(rc.id, {
            status: "viewed",
            viewed_at: new Date().toISOString(),
          });
          setRC(prev => ({ ...prev, status: "viewed", viewed_at: new Date().toISOString() }));
          setDocViewed(true);
        } catch (err) {
          console.error(err);
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [rc, docViewed]);

  const handleSign = async (signatureBase64) => {
    setSubmitting(true);
    try {
      await base44.functions.invoke("processRCSignature", {
        rc_id: rc.id,
        signature_base64: signatureBase64,
        action: "sign",
      });
      setRC(prev => ({ ...prev, status: "signed", signed_at: new Date().toISOString() }));
      setShowSignature(false);
      alert("Rate Confirmation signed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to sign RC");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke("processRCSignature", {
        rc_id: rc.id,
        action: "reject",
        reason: rejectReason,
      });
      setRC(prev => ({ ...prev, status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: rejectReason }));
      setShowRejectDialog(false);
      setRejectReason("");
    } catch (err) {
      console.error(err);
      alert("Failed to reject RC");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClarify = async () => {
    if (!clarifyRequest.trim()) {
      alert("Please provide your clarification request");
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke("processRCSignature", {
        rc_id: rc.id,
        action: "clarify",
        clarification: clarifyRequest,
      });
      setRC(prev => ({ ...prev, clarification_request: clarifyRequest }));
      setShowClarifyDialog(false);
      setClarifyRequest("");
      alert("Clarification request sent to dispatcher");
    } catch (err) {
      console.error(err);
      alert("Failed to send clarification request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!rc) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No Rate Confirmation available for this load</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-heading font-bold text-xl">Rate Confirmation</h2>
          <p className="text-slate-400 text-sm mt-1">Version {rc.version} • {rc.expires_at ? `Expires ${new Date(rc.expires_at).toLocaleDateString()}` : "No expiration"}</p>
        </div>
        <StatusBadge status={rc.status} />
      </div>

      {/* PDF Viewer */}
      {rc.pdf_url && (
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-semibold text-sm">Rate Confirmation Document</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPdfZoom(Math.max(50, pdfZoom - 10))}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-slate-400 text-xs w-12 text-center">{pdfZoom}%</span>
              <button
                onClick={() => setPdfZoom(Math.min(200, pdfZoom + 10))}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <a
                href={rc.pdf_url}
                download={`RC-${rc.id}.pdf`}
                className="p-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>

          {rc.pdf_url.startsWith("data:") ? (
            <iframe
              src={rc.pdf_url}
              title="Rate Confirmation PDF"
              className="w-full rounded-lg"
              style={{ height: `${pdfZoom * 5}px` }}
            />
          ) : (
            <div className="text-center py-8 text-slate-400">
              <a href={rc.pdf_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                Open PDF in new window
              </a>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {rc.status === "signed" && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex gap-3">
            <ThumbsUp className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <div className="text-green-400 font-semibold text-sm">Rate Confirmation Signed</div>
              <div className="text-green-200/80 text-xs mt-1">Signed on {new Date(rc.signed_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {rc.status === "rejected" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex gap-3">
            <ThumbsDown className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <div className="text-red-400 font-semibold text-sm">Rate Confirmation Rejected</div>
              <div className="text-red-200/80 text-xs mt-1">{rc.rejection_reason}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {rc.status === "viewed" && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <button
              onClick={() => setShowSignature(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              Accept & Sign
            </button>
            <button
              onClick={() => setShowRejectDialog(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/25 transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              Reject
            </button>
          </div>
          <button
            onClick={() => setShowClarifyDialog(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/25 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Request Clarification
          </button>
        </div>
      )}

      {/* Signature Canvas Modal */}
      {showSignature && (
        <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
          <div className="text-white font-semibold">Sign Rate Confirmation</div>
          <SignatureCanvas
            onSign={handleSign}
            disabled={submitting}
          />
          <button
            onClick={() => setShowSignature(false)}
            disabled={submitting}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
          <div className="text-white font-semibold">Reject Rate Confirmation</div>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Reason for rejection…"
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectDialog(false)}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={submitting || !rejectReason.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
            </button>
          </div>
        </div>
      )}

      {/* Clarify Dialog */}
      {showClarifyDialog && (
        <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
          <div className="text-white font-semibold">Request Clarification</div>
          <textarea
            value={clarifyRequest}
            onChange={e => setClarifyRequest(e.target.value)}
            placeholder="What would you like to clarify?…"
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowClarifyDialog(false)}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClarify}
              disabled={submitting || !clarifyRequest.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}