import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  FileText, Eye, CheckCircle2, XCircle, AlertCircle, Loader2,
  ChevronDown, ChevronUp
} from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import DocumentVersionHistory from "@/components/documents/DocumentVersionHistory";
import { logDocumentApproved, logDocumentRejected, logTimelineEvent } from "@/lib/timelineLogger";

const DOC_TYPE_LABELS = {
  rate_confirmation: "Rate Confirmation",
  bol: "Bill of Lading",
  pod: "Proof of Delivery",
  scale_ticket: "Scale Ticket",
  lumper_receipt: "Lumper Receipt",
  fuel_receipt: "Fuel Receipt",
  damage_photo: "Damage Photo",
  insurance: "Insurance",
  permit: "Permit",
  other: "Other",
};

export default function DocumentReviewQueue() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [rejectNotes, setRejectNotes] = useState({});

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPending = async () => {
    try {
      const docs = await base44.entities.LoadDocument.filter(
        { status: "uploaded" },
        "-created_date",
        100
      );
      setDocuments(docs);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const approve = async (doc) => {
    setActionInProgress(doc.id);
    try {
      // Get current user for timeline
      let currentUser = null;
      try {
        currentUser = await base44.auth.me();
      } catch {
        currentUser = { id: 'system', role: 'system', full_name: 'System' };
      }

      await base44.functions.invoke("documentLifecycleEngine", {
        action: "approve_document",
        document_id: doc.id,
        load_id: doc.load_id,
        notes: "",
      });
      // Log timeline event
      await logDocumentApproved(doc.id, doc.document_type, currentUser);
      await fetchPending();
      alert("Document approved");
    } catch (err) {
      console.error(err);
      alert("Failed to approve document");
    } finally {
      setActionInProgress(null);
    }
  };

  const reject = async (doc) => {
    const reason = rejectNotes[doc.id] || prompt("Reason for rejection:");
    if (!reason) return;
    setActionInProgress(doc.id);
    try {
      // Get current user for timeline
      let currentUser = null;
      try {
        currentUser = await base44.auth.me();
      } catch {
        currentUser = { id: 'system', role: 'system', full_name: 'System' };
      }

      await base44.functions.invoke("documentLifecycleEngine", {
        action: "reject_document",
        document_id: doc.id,
        load_id: doc.load_id,
        rejection_reason: reason,
      });
      // Log timeline event
      await logDocumentRejected(doc.id, doc.document_type, reason, currentUser);
      await fetchPending();
      setRejectNotes(prev => {
        const updated = { ...prev };
        delete updated[doc.id];
        return updated;
      });
      alert("Document rejected");
    } catch (err) {
      console.error(err);
      alert("Failed to reject document");
    } finally {
      setActionInProgress(null);
    }
  };

  const requestReupload = async (doc) => {
    const reason = prompt("Reason for reupload request:");
    if (!reason) return;
    setActionInProgress(doc.id);
    try {
      await base44.functions.invoke("documentLifecycleEngine", {
        action: "request_reupload",
        document_id: doc.id,
        load_id: doc.load_id,
        reupload_reason: reason,
      });
      await fetchPending();
      alert("Reupload requested from driver");
    } catch (err) {
      console.error(err);
      alert("Failed to request reupload");
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return <div className="skeleton h-96 rounded-lg" />;
  }

  if (documents.length === 0) {
    return (
      <div className="glass-card rounded-lg border border-white/5 p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">All documents reviewed</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Pending Review ({documents.length})</h3>
      </div>

      {documents.map((doc) => (
        <div
          key={doc.id}
          className="glass-card rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-white font-medium text-sm">
                  {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                </span>
                <StatusBadge status={doc.status} />
              </div>
              <p className="text-slate-500 text-xs">
                Load: {doc.load_id?.slice(-6).toUpperCase()} | Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
              </p>
            </div>
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors flex-shrink-0"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </a>
          </div>

          {/* File Info */}
          <div className="text-xs text-slate-500 mb-3">
            {doc.file_name} | Uploaded by: {doc.uploaded_by?.slice(0, 8) || "unknown"}
          </div>

          {expandedId === doc.id && doc.notes && (
            <div className="bg-white/3 rounded p-2 mb-3 text-xs text-slate-300">
              <span className="text-slate-500">Notes: </span>
              {doc.notes}
            </div>
          )}

          {/* Reject Notes Textarea */}
          {expandedId === doc.id && (
            <div className="mb-3">
              <textarea
                value={rejectNotes[doc.id] || ""}
                onChange={(e) =>
                  setRejectNotes(prev => ({
                    ...prev,
                    [doc.id]: e.target.value,
                  }))
                }
                placeholder="Reason for rejection (optional — you can type here or be prompted)"
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs placeholder-slate-600"
                rows="2"
              />
            </div>
          )}

          {/* Version History */}
          {expandedId === doc.id && (
            <DocumentVersionHistory documentId={doc.id} loadId={doc.load_id} />
          )}

          {/* Toggle Details */}
          <button
            onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
            className="text-slate-400 hover:text-white text-xs font-medium mb-3"
          >
            {expandedId === doc.id ? "Hide Details" : "Show Details"}
          </button>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => approve(doc)}
              disabled={actionInProgress === doc.id}
              className="flex items-center justify-center gap-1 flex-1 px-3 py-2 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {actionInProgress === doc.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Approve
            </button>
            <button
              onClick={() => reject(doc)}
              disabled={actionInProgress === doc.id}
              className="flex items-center justify-center gap-1 flex-1 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/25 disabled:opacity-50 transition-colors"
            >
              {actionInProgress === doc.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Reject
            </button>
            <button
              onClick={() => requestReupload(doc)}
              disabled={actionInProgress === doc.id}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
            >
              {actionInProgress === doc.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              Reupload
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}