import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Upload, X, CheckCircle, AlertCircle, Image } from "lucide-react";

/**
 * Mobile-native camera + file upload component.
 * Uses `capture="environment"` for rear camera on mobile.
 * Falls back to file picker on desktop.
 * Queues uploads offline and retries on reconnect.
 */
export default function CameraUpload({ onUploaded, label = "Upload Document", accept = "image/*,application/pdf", docType = "document" }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setDone(false);

    // Generate local preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // If offline — queue it
    if (!navigator.onLine) {
      setError("You're offline. Upload will retry when connected.");
      const reader = new FileReader();
      reader.onload = (e) => {
        const pending = JSON.parse(localStorage.getItem("hasten_pending_uploads") || "[]");
        pending.push({ data: e.target.result, name: file.name, type: file.type, docType, queuedAt: Date.now() });
        localStorage.setItem("hasten_pending_uploads", JSON.stringify(pending));
      };
      reader.readAsDataURL(file);
      return;
    }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setDone(true);
      onUploaded?.(result.file_url, file.name, docType);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setPreview(null); setDone(false); setError(""); };

  return (
    <div className="space-y-3">
      {/* Preview */}
      {preview && (
        <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ maxHeight: "220px" }}>
          <img src={preview} alt="Preview" className="w-full object-cover" style={{ maxHeight: "220px" }} />
          <button onClick={reset} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {done ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
          <CheckCircle className="w-5 h-5 flex-shrink-0" /> Uploaded successfully
          <button onClick={reset} className="ml-auto text-xs text-green-300 underline">Upload another</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Camera capture — rear camera on mobile */}
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-orange-400" />
            )}
            <span className="text-slate-300 text-xs font-medium">{uploading ? "Uploading…" : "Camera"}</span>
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => handleFile(e.target.files?.[0])} />

          {/* File picker */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            <Upload className="w-6 h-6 text-slate-400" />
            <span className="text-slate-300 text-xs font-medium">Browse Files</span>
          </button>
          <input ref={fileRef} type="file" accept={accept} className="hidden"
            onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}