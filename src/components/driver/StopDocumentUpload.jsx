import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Upload, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

const DOC_TYPES = [
  { key: "bol", label: "Bill of Lading", icon: "📋" },
  { key: "pod", label: "Proof of Delivery", icon: "✅" },
  { key: "scale_ticket", label: "Scale Ticket", icon: "⚖️" },
  { key: "lumper_receipt", label: "Lumper Receipt", icon: "🧾" },
  { key: "damage_photo", label: "Damage Photo", icon: "📸" },
  { key: "other", label: "Other", icon: "📎" },
];

export default function StopDocumentUpload({ load, stop, onDocumentUploaded }) {
  const [selectedType, setSelectedType] = useState("pod");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const user = await base44.auth.me();
      const response = await base44.functions.invoke("documentLifecycleEngine", {
        action: "upload_document",
        load_id: load.id,
        stop_id: stop.id,
        driver_id: user.id,
        document_type: selectedType,
        file_url,
        file_name: file.name,
        notes,
      });

      alert("Document uploaded for review");
      setFile(null);
      setNotes("");
      setSelectedType("pod");
      onDocumentUploaded?.();
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-card rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-400" />
        <h4 className="text-white font-semibold text-sm">Upload Documents for Stop {stop.stop_number}</h4>
      </div>

      {/* Document type selector */}
      <div>
        <label className="text-slate-500 text-xs font-medium block mb-2">Document Type</label>
        <div className="grid grid-cols-2 gap-2">
          {DOC_TYPES.map((dt) => (
            <button
              key={dt.key}
              onClick={() => setSelectedType(dt.key)}
              className={`p-2 rounded-lg border text-xs font-medium transition-all text-left ${
                selectedType === dt.key
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  : "border-white/5 bg-white/3 text-slate-400"
              }`}
            >
              <span className="text-base">{dt.icon}</span>
              <span className="block text-[10px] mt-0.5">{dt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-slate-500 text-xs font-medium block mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Signature on page 2, weight: 45,000 lbs"
          className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs placeholder-slate-600"
          rows="2"
        />
      </div>

      {/* File picker */}
      <div>
        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
          file ? "border-green-500/30 bg-green-500/5" : "border-dashed border-white/15 hover:border-blue-500/30 bg-white/3"
        }`}>
          {file ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs font-medium truncate">{file.name}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400 text-xs">Tap to select photo or PDF</span>
            </>
          )}
          <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" capture="environment" />
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-xs">{error}</span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={uploading || !file}
        className="w-full py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        style={{
          background: uploading ? "rgba(100,100,100,0.3)" : "linear-gradient(135deg, #EA580C, #F97316)",
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5" />
            Upload Document
          </>
        )}
      </button>
    </div>
  );
}