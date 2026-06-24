import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Send, Eye, RotateCcw, AlertCircle, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { logRCSent, logRCSigned, logRCRejected, logRCViewed } from "@/lib/timelineLogger";

export default function RCSection({ load }) {
  const [rc, setRC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const fetchRC = async () => {
      try {
        const rcs = await base44.entities.RateConfirmation.filter(
          { load_id: load.id },
          "-created_date",
          1
        );
        const rc = rcs[0] || null;
        setRC(rc);
        
        // Log RC viewed event when dispatcher views RC
        if (rc && !rc.viewed_at) {
          const currentUser = { id: 'system', role: 'system', full_name: 'System' };
          try {
            const user = await base44.auth.me();
            Object.assign(currentUser, user);
          } catch {}
          await logRCViewed(rc.id, load.id, load.load_number || load.id, currentUser);
          // Update RC viewed_at timestamp
          await base44.entities.RateConfirmation.update(rc.id, { 
            viewed_at: new Date().toISOString() 
          });
        }
        
        if (rcs[0]) {
          const logs = await base44.entities.AuditLog.filter(
            { entity_id: rcs[0].id, entity_type: "RateConfirmation" },
            "-timestamp",
            10
          );
          setAuditLogs(logs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRC();
  }, [load.id]);

  const handleGenerateRC = async () => {
    setGenerating(true);
    try {
      // Create draft RC
      const newRC = await base44.entities.RateConfirmation.create({
        load_id: load.id,
        status: "draft",
        generated_by: (await base44.auth.me()).id,
        version: (rc?.version || 0) + 1,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      // Generate PDF
      const pdfRes = await base44.functions.invoke("generateRCPDF", {
        load_id: load.id,
        version: newRC.version,
      });
      
      if (pdfRes.data.success) {
        // Store PDF (base64 - in production, upload to file storage)
        await base44.entities.RateConfirmation.update(newRC.id, {
          pdf_url: `data:application/pdf;base64,${pdfRes.data.pdf_base64}`,
        });
        setRC(newRC);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate RC");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendRC = async () => {
    if (!rc || !load.driver_id) return;
    setSending(true);
    try {
      // Get current user for timeline
      let currentUser = null;
      try {
        currentUser = await base44.auth.me();
      } catch {
        currentUser = { id: 'system', role: 'system', full_name: 'System' };
      }

      await base44.functions.invoke("sendRCToDriver", {
        rc_id: rc.id,
        load_id: load.id,
        driver_id: load.driver_id,
        pdf_url: rc.pdf_url,
      });
      
      // Log timeline event
      await logRCSent(rc.id, load.id, load.load_number || load.id, currentUser);
      
      setRC(prev => ({ ...prev, status: "sent", sent_at: new Date().toISOString() }));
    } catch (err) {
      console.error(err);
      alert("Failed to send RC");
    } finally {
      setSending(false);
    }
  };

  const statusIcons = {
    draft: { icon: FileText, color: "text-slate-400" },
    sent: { icon: Send, color: "text-blue-400" },
    viewed: { icon: Eye, color: "text-cyan-400" },
    signed: { icon: CheckCircle2, color: "text-green-400" },
    rejected: { icon: XCircle, color: "text-red-400" },
    revised: { icon: RotateCcw, color: "text-amber-400" },
    expired: { icon: Clock, color: "text-red-500" },
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <div className="text-white font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-400" />
          Rate Confirmation
        </div>
        <div className="text-slate-400 text-sm">Loading RC status…</div>
      </div>
    );
  }

  const StatusIcon = statusIcons[rc?.status]?.icon || FileText;

  return (
    <div className="glass-card rounded-xl border border-white/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-semibold">Rate Confirmation</h3>
        </div>
        {rc && <StatusBadge status={rc.status} />}
      </div>

      {!rc ? (
        <button
          onClick={handleGenerateRC}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {generating ? "Generating…" : "Generate RC"}
        </button>
      ) : (
        <div className="space-y-3">
          {/* Status timeline */}
          <div className="bg-white/3 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Generated:</span>
              <span className="text-white">{new Date(rc.created_date).toLocaleString()}</span>
            </div>
            {rc.sent_at && (
              <div className="flex items-center gap-2 text-slate-400">
                <Send className="w-3.5 h-3.5 text-blue-400" />
                <span>Sent:</span>
                <span className="text-white">{new Date(rc.sent_at).toLocaleString()}</span>
              </div>
            )}
            {rc.viewed_at && (
              <div className="flex items-center gap-2 text-slate-400">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Viewed:</span>
                <span className="text-white">{new Date(rc.viewed_at).toLocaleString()}</span>
              </div>
            )}
            {rc.signed_at && (
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span>Signed:</span>
                <span className="text-white">{new Date(rc.signed_at).toLocaleString()}</span>
              </div>
            )}
            {rc.rejected_at && (
              <div className="flex items-center gap-2 text-slate-400">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Rejected:</span>
                <span className="text-white">{new Date(rc.rejected_at).toLocaleString()}</span>
                {rc.rejection_reason && <span className="text-red-300 ml-auto italic">({rc.rejection_reason})</span>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {rc.status === "draft" && (
              <button
                onClick={handleSendRC}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/25 disabled:opacity-50 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending…" : "Send to Driver"}
              </button>
            )}
            
            {rc.pdf_url && (
              <a
                href={rc.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View PDF
              </a>
            )}

            {rc.status === "rejected" && (
              <button
                onClick={handleGenerateRC}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Revise & Resend
              </button>
            )}

            {rc.clarification_request && (
              <div className="w-full flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-amber-400 text-xs font-semibold">Driver Clarification Request:</div>
                  <div className="text-amber-200 text-xs mt-1">{rc.clarification_request}</div>
                </div>
              </div>
            )}
          </div>

          {/* Audit history */}
          {auditLogs.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/3 text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              {showHistory ? "Hide" : "Show"} Audit History ({auditLogs.length})
            </button>
          )}

          {showHistory && auditLogs.length > 0 && (
            <div className="space-y-1 text-xs text-slate-500 bg-white/2 rounded-lg p-2">
              {auditLogs.map(log => (
                <div key={log.id} className="flex justify-between">
                  <span>{log.action.replace(/_/g, " ")}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}