import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Eye, Trash2, Loader2, CheckCircle, XCircle, Clock, RefreshCw, Upload } from "lucide-react";

const CATEGORIES = [
  { key: "all",         label: "All",           emoji: "📂" },
  { key: "receipt",     label: "Receipts",      emoji: "🧾" },
  { key: "maintenance", label: "Maintenance",   emoji: "🔧" },
  { key: "compliance",  label: "Compliance",    emoji: "🪪" },
  { key: "bol",         label: "BOL",           emoji: "📋" },
  { key: "pod",         label: "POD",           emoji: "✅" },
  { key: "fuel",        label: "Fuel",          emoji: "⛽" },
  { key: "insurance",   label: "Insurance",     emoji: "📄" },
  { key: "other",       label: "Other",         emoji: "📎" },
];

const STATUS_CONFIG = {
  pending:  { label: "Pending",  icon: Clock,         cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  reviewed: { label: "Reviewed", icon: RefreshCw,     cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  approved: { label: "Approved", icon: CheckCircle,   cls: "bg-green-500/10 border-green-500/20 text-green-400" },
  rejected: { label: "Rejected", icon: XCircle,       cls: "bg-red-500/10 border-red-500/20 text-red-400" },
};

export default function DriverDocumentsSection({ driverId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [updating, setUpdating]   = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    fetchDocs();
  }, [driverId]);

  const fetchDocs = () => {
    setLoading(true);
    base44.entities.DriverDocument.filter({ driver_id: driverId }, "-created_date", 100)
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Admin can upload docs on behalf of driver
  const handleAdminUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.DriverDocument.create({
        driver_id: driverId,
        category: "other",
        doc_type: "Admin Upload",
        file_name: file.name,
        file_url,
        status: "approved",
      });
      fetchDocs();
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const updateStatus = async (docId, status) => {
    setUpdating(docId);
    try {
      await base44.entities.DriverDocument.update(docId, {
        status,
        reviewed_at: new Date().toISOString(),
      });
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const deleteDoc = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await base44.entities.DriverDocument.delete(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) { console.error(err); }
  };

  const filtered = filter === "all" ? documents : documents.filter(d => d.category === filter);
  const pending  = documents.filter(d => d.status === "pending").length;

  return (
    <div className="glass-card rounded-xl border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Driver Documents</h2>
          {pending > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
              {pending} pending
            </span>
          )}
        </div>
        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold cursor-pointer hover:bg-orange-500/20 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" onChange={handleAdminUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filter === c.key ? "bg-orange-500 text-white" : "bg-white/5 border border-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No documents in this category</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            const StIcon = st.icon;
            const catInfo = CATEGORIES.find(c => c.key === doc.category);
            const isUpdating = updating === doc.id;

            return (
              <div key={doc.id} className="rounded-xl border border-white/5 bg-white/2 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-lg flex-shrink-0">
                    {catInfo?.emoji || "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-sm truncate">{doc.doc_type || catInfo?.label}</div>
                        <div className="text-slate-600 text-xs truncate">{doc.file_name}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${st.cls}`}>
                        <StIcon className="w-2.5 h-2.5" />
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {doc.amount && <span className="text-green-400 text-xs font-bold">${doc.amount.toFixed(2)}</span>}
                      {doc.notes && <span className="text-slate-500 text-xs truncate max-w-[150px]">{doc.notes}</span>}
                      <span className="text-slate-700 text-xs ml-auto">
                        {doc.created_date ? new Date(doc.created_date).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/5">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> View
                  </a>

                  {doc.status === "pending" && (
                    <>
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(doc.id, "approved")}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                      </button>
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(doc.id, "rejected")}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}

                  {doc.status !== "pending" && (
                    <button
                      onClick={() => updateStatus(doc.id, "pending")}
                      disabled={isUpdating}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  )}

                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="ml-auto p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}