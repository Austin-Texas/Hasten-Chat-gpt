import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Eye, CheckCircle, Clock, Upload, Trash2, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import OfflineBanner from "@/components/driver/OfflineBanner";

const CATEGORIES = [
  { key: "bol",         label: "BOL",              desc: "Bill of Lading",         emoji: "📋" },
  { key: "pod",         label: "POD",              desc: "Proof of Delivery",       emoji: "✅" },
  { key: "receipt",     label: "Receipt",          desc: "Expense / fuel receipt",  emoji: "🧾" },
  { key: "maintenance", label: "Maintenance Log",  desc: "Service / repair record", emoji: "🔧" },
  { key: "fuel",        label: "Fuel Receipt",     desc: "Fuel card / pump receipt", emoji: "⛽" },
  { key: "insurance",   label: "Insurance",        desc: "Insurance document",      emoji: "📄" },
  { key: "compliance",  label: "Compliance Doc",   desc: "License, medical, TWIC",  emoji: "🪪" },
  { key: "other",       label: "Other",            desc: "Miscellaneous",           emoji: "📎" },
];

function UploadSheet({ onClose, onUploaded }) {
  const [category, setCategory] = useState("receipt");
  const [docType, setDocType]   = useState("");
  const [notes, setNotes]       = useState("");
  const [amount, setAmount]     = useState("");
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState("");

  const cat = CATEGORIES.find(c => c.key === category);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) { setError("Please select a file to upload."); return; }
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUploaded({ file_url, file_name: file.name, category, doc_type: docType || cat.label, notes, amount: amount ? parseFloat(amount) : undefined });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={onClose}>
      <div
        className="w-full glass-card rounded-t-3xl p-5 border-t border-white/10 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto" />
        <h2 className="text-white font-bold text-lg">Upload Document</h2>

        {/* Category */}
        <div>
          <label className="block text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm text-left transition-all active:scale-95 ${
                  category === c.key
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                    : "border-white/5 bg-white/3 text-slate-400"
                }`}
              >
                <span>{c.emoji}</span>
                <div>
                  <div className="font-semibold text-xs">{c.label}</div>
                  <div className="text-[10px] text-slate-600">{c.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Doc type (optional label) */}
        <div>
          <label className="block text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1.5">Label <span className="text-slate-700 normal-case">(optional)</span></label>
          <input
            type="text"
            value={docType}
            onChange={e => setDocType(e.target.value)}
            placeholder={`e.g. ${cat?.label} - June 2024`}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40"
          />
        </div>

        {/* Amount (for receipts) */}
        {["receipt", "fuel", "maintenance"].includes(category) && (
          <div>
            <label className="block text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1.5">Amount ($) <span className="text-slate-700 normal-case">(optional)</span></label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1.5">Notes <span className="text-slate-700 normal-case">(optional)</span></label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional details..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 resize-none"
          />
        </div>

        {/* File picker */}
        <div>
          <label className="block text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1.5">File *</label>
          <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
            file ? "border-green-500/30 bg-green-500/5" : "border-dashed border-white/15 hover:border-orange-500/30 bg-white/3"
          }`}>
            {file
              ? <><CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /><span className="text-green-400 text-sm font-medium truncate">{file.name}</span></>
              : <><Upload className="w-5 h-5 text-slate-500 flex-shrink-0" /><span className="text-slate-400 text-sm">Tap to select photo or PDF</span></>
            }
            <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" capture="environment" />
          </label>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pb-2">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !file}
            className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  pending:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
  reviewed: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  approved: "bg-green-500/10 border-green-500/20 text-green-400",
  rejected: "bg-red-500/10 border-red-500/20 text-red-400",
};

export default function DriverDocuments({ user }) {
  const [driver, setDriver]         = useState(null);
  const [documents, setDocuments]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter]         = useState("all");
  const [deleting, setDeleting]     = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const init = async () => {
      try {
        const drivers = await base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1);
        const d = drivers[0] || null;
        setDriver(d);
        if (d) {
          const docs = await base44.entities.DriverDocument.filter({ driver_id: d.id }, "-created_date", 100);
          setDocuments(docs);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    init();
  }, [user?.id]);

  const handleUploaded = async ({ file_url, file_name, category, doc_type, notes, amount }) => {
    if (!driver) return;
    const newDoc = await base44.entities.DriverDocument.create({
      driver_id: driver.id,
      driver_name: `${driver.first_name} ${driver.last_name}`,
      category,
      doc_type,
      file_name,
      file_url,
      notes,
      amount,
      status: "pending",
    });
    // Manifest audit
    await base44.entities.Manifest.create({
      load_id: driver.current_load_id || "no-load",
      event_type: "note_added",
      event_title: `Document Uploaded: ${doc_type || category}`,
      event_description: `File: ${file_name}`,
      event_timestamp: new Date().toISOString(),
      performed_by: `${driver.first_name} ${driver.last_name}`,
      performed_by_role: "driver",
      attachment_url: file_url,
      is_system_event: false,
    }).catch(() => {});
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Remove this document?")) return;
    setDeleting(docId);
    try {
      await base44.entities.DriverDocument.delete(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  const FILTERS = ["all", "receipt", "maintenance", "compliance", "bol", "pod", "fuel", "other"];
  const filtered = filter === "all" ? documents : documents.filter(d => d.category === filter);

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      <OfflineBanner />

      <div className="flex items-center justify-between">
        <h1 className="text-white font-heading font-bold text-xl">My Documents</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          <Plus className="w-4 h-4" /> Upload
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
              filter === f ? "bg-orange-500 text-white" : "bg-white/5 border border-white/5 text-slate-400"
            }`}
          >
            {f === "all" ? `All (${documents.length})` : f}
          </button>
        ))}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="text-center py-14">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">No documents yet</p>
          <p className="text-slate-600 text-xs mt-1">Upload receipts, maintenance logs, compliance docs, and more</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const cat = CATEGORIES.find(c => c.key === doc.category);
            return (
              <div key={doc.id} className="glass-card rounded-2xl border border-white/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-xl flex-shrink-0">
                    {cat?.emoji || "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-sm truncate">{doc.doc_type || cat?.label || doc.category}</div>
                        <div className="text-slate-600 text-xs truncate">{doc.file_name}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${STATUS_COLORS[doc.status] || STATUS_COLORS.pending}`}>
                        {doc.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {doc.amount && (
                        <span className="text-green-400 text-xs font-bold">${doc.amount.toFixed(2)}</span>
                      )}
                      {doc.notes && (
                        <span className="text-slate-500 text-xs truncate max-w-[140px]">{doc.notes}</span>
                      )}
                      <span className="text-slate-700 text-xs ml-auto">
                        {doc.created_date ? new Date(doc.created_date).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="p-2 rounded-xl bg-white/5 border border-white/8 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deleting === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && (
        <UploadSheet onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />
      )}
    </div>
  );
}