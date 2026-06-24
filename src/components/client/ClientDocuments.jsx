import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Download, Trash2, CheckCircle, AlertCircle, Clock, Eye } from "lucide-react";

const ALLOWED_DOC_TYPES = [
  { key: "rate_confirmation", label: "Rate Confirmation", icon: "📋" },
  { key: "bol", label: "Bill of Lading", icon: "📦" },
  { key: "pod", label: "Proof of Delivery", icon: "✓" },
  { key: "shipping_instructions", label: "Shipping Instructions", icon: "📝" },
  { key: "other", label: "Other Document", icon: "📄" },
];

function statusIcon(status) {
  if (status === "approved") return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === "rejected") return <AlertCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-amber-400" />;
}

export default function ClientDocuments({ client, user }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ type: "other", notes: "" });
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    if (!client?.id) return;
    const fetchDocs = async () => {
      try {
        const clientDocs = await base44.entities.DriverDocument.filter(
          { driver_id: client.id },
          "-created_date",
          100
        );
        setDocs(clientDocs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
    const unsub = base44.entities.DriverDocument.subscribe(() => fetchDocs());
    return () => unsub();
  }, [client?.id]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      if (uploaded.file_url) {
        await base44.entities.DriverDocument.create({
          driver_id: client.id,
          driver_name: client.company_name || client.contact_name,
          category: "other",
          doc_type: uploadForm.type,
          file_name: file.name,
          file_url: uploaded.file_url,
          notes: uploadForm.notes || undefined,
          status: "pending",
        });
        setUploadForm({ type: "other", notes: "" });
        e.target.value = "";
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm("Delete this document?")) return;
    await base44.entities.DriverDocument.delete(docId).catch(console.error);
  };

  const docTypeLabel = (type) => ALLOWED_DOC_TYPES.find(d => d.key === type)?.label || type;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Documents</h1>
        <p className="text-slate-400 text-sm mt-0.5">Upload and manage shipment documents</p>
      </div>

      {/* Upload Card */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Upload Document</div>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs block mb-2">Document Type</label>
            <select value={uploadForm.type} onChange={e => setUploadForm(f => ({ ...f, type: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40">
              {ALLOWED_DOC_TYPES.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-2">Notes (Optional)</label>
            <textarea value={uploadForm.notes} onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Add any notes about this document…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/40 resize-none" />
          </div>
          <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-white/20 hover:border-orange-500/50 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400 hover:text-white">
              {uploading ? "Uploading…" : "Click to upload or drag & drop"}
            </span>
            <input type="file" onChange={handleFileSelect} disabled={uploading} className="hidden" />
          </label>
        </div>
      </div>

      {/* Documents List */}
      <div>
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Your Documents</div>
        {loading ? (
          <div className="skeleton h-20 rounded-xl" />
        ) : docs.length === 0 ? (
          <div className="glass-card rounded-xl border border-white/5 p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
            {docs.map(doc => (
              <div key={doc.id} className="p-4 hover:bg-white/2 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{ALLOWED_DOC_TYPES.find(d => d.key === doc.doc_type)?.icon || "📄"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{doc.file_name}</div>
                        <div className="text-slate-500 text-xs">{docTypeLabel(doc.doc_type)}</div>
                      </div>
                    </div>
                    {doc.notes && <p className="text-slate-400 text-xs mt-1">{doc.notes}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className={`flex items-center gap-1 ${
                        doc.status === "approved" ? "text-green-400" :
                        doc.status === "rejected" ? "text-red-400" :
                        "text-amber-400"
                      }`}>
                        {statusIcon(doc.status)}
                        {doc.status === "approved" ? "Approved" : doc.status === "rejected" ? "Rejected" : "Pending Review"}
                      </span>
                      {doc.reviewed_at && (
                        <span className="text-slate-500">
                          {new Date(doc.reviewed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setPreviewDoc(doc)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => handleDelete(doc.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-black font-bold">{previewDoc.file_name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="text-gray-500 hover:text-black">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewDoc.file_url?.toLowerCase().endsWith(".pdf") ? (
                <iframe src={previewDoc.file_url} className="w-full h-full" />
              ) : previewDoc.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={previewDoc.file_url} alt={previewDoc.file_name} className="max-w-full max-h-full mx-auto" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p>Preview not available for this file type</p>
                    <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-4 block">
                      Open in new tab
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}