import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScanLine, Upload, Loader2, CheckCircle2, AlertTriangle,
  FileText, X, RefreshCw,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const MAX_UPLOAD_MB = 15;

/**
 * DocumentOCRProcessor — adapted from Hastenload-main secondary project.
 * Uploads a BOL/POD document, runs OCR extraction via processDocumentOCR backend function,
 * and displays extracted data with mismatch warnings against the stored Load record.
 *
 * @param {object} load - the Load entity to verify documents against
 * @param {function} onProcessed - callback after successful OCR processing
 */
export default function DocumentOCRProcessor({ load, onProcessed }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [documentType, setDocumentType] = useState("bol");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_UPLOAD_MB) {
      setError(`File is too large. Maximum upload size is ${MAX_UPLOAD_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setError("");
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(uploadResult.file_url);
      setResult(null);
    } catch (err) {
      setError("File upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleProcessOCR = async () => {
    if (!fileUrl || !load?.id) return;

    setProcessing(true);
    setError("");
    try {
      const response = await base44.functions.invoke("processDocumentOCR", {
        fileUrl,
        loadId: load.id,
        documentType,
      });

      const data = response.data || response;
      if (data.error) {
        setError(data.error);
        return;
      }

      setResult(data);

      // Save as LoadDocument
      await base44.entities.LoadDocument.create({
        load_id: load.id,
        document_type: documentType,
        file_url: fileUrl,
        file_name: `${documentType.toUpperCase()}_${load.load_number || load.id}`,
        ocr_extracted_data: JSON.stringify(data.extractedData),
        ocr_mismatches: JSON.stringify(data.mismatches),
        ocr_processed: true,
        verified: data.mismatches.length === 0,
      });

      if (onProcessed) onProcessed(data);
    } catch (err) {
      setError("OCR processing failed: " + (err.message || "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFileUrl(null);
    setResult(null);
    setError("");
  };

  const mismatchSeverity = (severity) => {
    if (severity === "warning") return "text-amber-400 border-amber-500/20 bg-amber-500/10";
    return "text-blue-400 border-blue-500/20 bg-blue-500/10";
  };

  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <ScanLine className="w-4 h-4 text-green-400" />
          Document OCR Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setDocumentType("bol")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              documentType === "bol"
                ? "bg-green-500/15 border border-green-500/40 text-green-400"
                : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            BOL
          </button>
          <button
            onClick={() => setDocumentType("pod")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              documentType === "pod"
                ? "bg-green-500/15 border border-green-500/40 text-green-400"
                : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            POD
          </button>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
          Phone users can take a photo or upload from files. Use clear lighting and capture the full page.
        </div>

        {/* Upload Area */}
        {!fileUrl && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-white/15 rounded-xl p-8 text-center hover:border-green-500/40 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 mx-auto text-green-400 mb-2 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            )}
            <p className="text-sm text-slate-400">
              {uploading ? "Uploading..." : "Upload BOL or POD document"}
            </p>
            <p className="text-xs text-slate-600 mt-1">JPG, PNG, or PDF · max {MAX_UPLOAD_MB}MB</p>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Preview */}
        {fileUrl && !result && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-white/10">
              {fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img src={fileUrl} alt="Document preview" className="w-full max-h-48 object-cover" />
              ) : (
                <div className="flex items-center justify-center h-32 bg-white/5">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <button
                onClick={reset}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <Button
              onClick={handleProcessOCR}
              disabled={processing}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-bold"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ScanLine className="w-4 h-4 mr-2" />
              )}
              {processing ? "Processing OCR..." : "Extract Data with OCR"}
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium text-sm">OCR Extraction Complete</span>
              </div>
              <button
                onClick={reset}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="Scan another document"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Mismatches */}
            {result.mismatches?.length > 0 && (
              <div className="space-y-2">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {result.mismatches.length} Mismatch(es) Detected
                </p>
                {result.mismatches.map((m, idx) => (
                  <div key={idx} className={`rounded-lg p-2.5 border text-xs ${mismatchSeverity(m.severity)}`}>
                    <div className="font-semibold mb-1 capitalize">{m.field.replace(/_/g, " ")}</div>
                    <div className="flex justify-between">
                      <span>Extracted: <strong>{String(m.extracted)}</strong></span>
                      <span>Stored: <strong>{String(m.stored)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Extracted Data */}
            <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">
                Extracted Data
              </p>
              {Object.entries(result.extractedData || {}).map(([key, val]) => {
                if (val === null || val === undefined || val === "") return null;
                return (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}:</span>
                    <span className="text-slate-200 font-medium">{String(val)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
