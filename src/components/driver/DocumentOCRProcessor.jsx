import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScanLine, Upload, Loader2, CheckCircle2, AlertTriangle,
  FileText, X, RefreshCw,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const MAX_UPLOAD_MB = 15;

const DOCUMENT_TYPES = [
  { key: "bol", label: "BOL" },
  { key: "pod", label: "POD" },
  { key: "rate_confirmation", label: "RC" },
  { key: "fuel_receipt", label: "Fuel" },
  { key: "lumper_receipt", label: "Lumper" },
  { key: "repair_receipt", label: "Repair" },
];

const EXTRACTED_FIELDS = [
  "bol_number",
  "load_number",
  "weight",
  "pieces",
  "delivery_date",
  "signature_detected",
  "confidence_score",
];

function getDocumentLabel(type) {
  return DOCUMENT_TYPES.find((item) => item.key === type)?.label || String(type || "document").replace(/_/g, " ").toUpperCase();
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeExtractedData(data = {}) {
  const extracted = data.extractedData || data.extracted_data || data || {};
  const confidence = numberOrNull(data.confidence_score ?? data.confidenceScore ?? extracted.confidence_score ?? extracted.confidenceScore);
  const signatureDetected = Boolean(data.signature_detected ?? data.signatureDetected ?? extracted.signature_detected ?? extracted.signatureDetected);

  return {
    extracted,
    mismatches: data.mismatches || data.ocr_mismatches || [],
    confidence_score: confidence,
    signature_detected: signatureDetected,
  };
}

async function safeCreate(entityName, payload) {
  try {
    return await base44.entities[entityName].create(payload);
  } catch (error) {
    console.warn(`[DocumentOCRProcessor] ${entityName} create skipped`, error?.message || error);
    return null;
  }
}

async function safeInvoke(functionName, payload) {
  try {
    return await base44.functions.invoke(functionName, payload);
  } catch (error) {
    console.warn(`[DocumentOCRProcessor] ${functionName} invoke skipped`, error?.message || error);
    return null;
  }
}

function getDispatcherRecipient(load = {}) {
  return load.dispatcher_id || load.dispatcher_user_id || load.assigned_dispatcher_id || load.created_by || "dispatch";
}

async function createDriverScanLifecycle({ load, currentUser, fileUrl, documentType, ocrData }) {
  const now = new Date().toISOString();
  const label = getDocumentLabel(documentType);
  const dispatcherRecipient = getDispatcherRecipient(load);
  const route = `${load.origin_city || load.pickup_city || "Pickup"} → ${load.destination_city || load.delivery_city || "Delivery"}`;
  const fileName = `${label}_${load.load_number || load.id}_${Date.now()}`;

  const document = await base44.entities.LoadDocument.create({
    load_id: load.id,
    load_number: load.load_number,
    driver_id: load.driver_id,
    uploaded_by: currentUser?.id,
    uploaded_by_name: currentUser?.full_name || currentUser?.email || "Driver",
    document_type: documentType,
    status: "uploaded",
    lifecycle_status: "pending_dispatch_review",
    review_status: "pending_review",
    file_url: fileUrl,
    file_name: fileName,
    uploaded_at: now,
    ocr_extracted_data: JSON.stringify(ocrData.extracted),
    extracted_fields: JSON.stringify(EXTRACTED_FIELDS.reduce((acc, field) => ({ ...acc, [field]: ocrData.extracted?.[field] ?? null }), {})),
    ocr_mismatches: JSON.stringify(ocrData.mismatches || []),
    ocr_processed: true,
    confidence_score: ocrData.confidence_score,
    signature_detected: ocrData.signature_detected,
    verified: (ocrData.mismatches || []).length === 0,
    resubmission_of_document_id: load.rejected_document_id || undefined,
    mobile_activity_audit_log: JSON.stringify([{
      action: "driver_scan_upload",
      at: now,
      user_id: currentUser?.id,
      load_id: load.id,
      document_type: documentType,
      confidence_score: ocrData.confidence_score,
      signature_detected: ocrData.signature_detected,
    }]),
  });

  await safeInvoke("documentLifecycleEngine", {
    action: "driver_upload_document",
    document_id: document.id,
    load_id: load.id,
    driver_id: load.driver_id,
    document_type: documentType,
    file_url: fileUrl,
    status: "uploaded",
    review_status: "pending_review",
    confidence_score: ocrData.confidence_score,
    signature_detected: ocrData.signature_detected,
    ocr_extracted_data: ocrData.extracted,
  });

  await safeCreate("TimelineEvent", {
    entity_type: "LoadDocument",
    entity_id: document.id,
    load_id: load.id,
    event_type: "driver_document_uploaded",
    description: `${label} uploaded by driver for ${load.load_number || load.id} (${route})`,
    metadata: JSON.stringify({
      load_id: load.id,
      driver_id: load.driver_id,
      document_id: document.id,
      document_type: documentType,
      confidence_score: ocrData.confidence_score,
      signature_detected: ocrData.signature_detected,
      status: "uploaded",
    }),
    created_at: now,
    created_by: currentUser?.id || "driver",
  });

  await safeCreate("Notification", {
    user_id: dispatcherRecipient,
    recipient_id: dispatcherRecipient,
    recipient_role: "dispatcher",
    type: "driver_document_uploaded",
    title: `${label} ready for review`,
    message: `${currentUser?.full_name || "Driver"} uploaded ${label} for ${load.load_number || load.id}. Review it in Documents → Lifecycle.`,
    load_id: load.id,
    document_id: document.id,
    is_read: false,
    read: false,
    created_at: now,
  });

  await safeCreate("Message", {
    sender_id: currentUser?.id || "driver",
    sender_name: currentUser?.full_name || currentUser?.email || "Driver",
    recipient_id: dispatcherRecipient,
    recipient_role: "dispatcher",
    load_id: load.id,
    document_id: document.id,
    subject: `${label} uploaded for ${load.load_number || load.id}`,
    content: `${label} uploaded from Driver Scan. Status: uploaded / pending dispatch review. ${ocrData.signature_detected ? "Signature detected." : "Signature not detected."}`,
    message_type: "driver_document_upload",
    channel: "load_document",
    is_read: false,
    created_at: now,
  });

  return document;
}

export default function DocumentOCRProcessor({ load, onProcessed }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [documentType, setDocumentType] = useState("bol");
  const [result, setResult] = useState(null);
  const [createdDocument, setCreatedDocument] = useState(null);
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
      const nextFileUrl = uploadResult.file_url || uploadResult.url || uploadResult.data?.file_url || URL.createObjectURL(file);
      setFileUrl(nextFileUrl);
      setResult(null);
      setCreatedDocument(null);
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
      const currentUser = await base44.auth.me().catch(() => ({ id: "driver", full_name: "Driver", role: "driver" }));
      const response = await base44.functions.invoke("processDocumentOCR", {
        fileUrl,
        loadId: load.id,
        documentType,
      });

      const data = response.data || response || {};
      if (data.error) {
        setError(data.error);
        return;
      }

      const ocrData = normalizeExtractedData(data);
      const document = await createDriverScanLifecycle({ load, currentUser, fileUrl, documentType, ocrData });

      const finalResult = { ...data, ...ocrData, document_id: document.id, lifecycle_status: document.lifecycle_status };
      setResult(finalResult);
      setCreatedDocument(document);

      if (onProcessed) onProcessed(finalResult);
    } catch (err) {
      setError("OCR processing failed: " + (err.message || "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFileUrl(null);
    setResult(null);
    setCreatedDocument(null);
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
          Driver Scan → Document Lifecycle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => setDocumentType(type.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${documentType === type.key ? "bg-green-500/15 border border-green-500/40 text-green-400" : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"}`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              {type.label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
          Phone users can take a photo or upload from files. Successful scans create a LoadDocument, enter dispatcher review, notify dispatch, add a timeline event, and open a message trail for resubmit/review.
        </div>

        {!fileUrl && (
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full border-2 border-dashed border-white/15 rounded-xl p-8 text-center hover:border-green-500/40 transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="w-8 h-8 mx-auto text-green-400 mb-2 animate-spin" /> : <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />}
            <p className="text-sm text-slate-400">{uploading ? "Uploading..." : "Upload BOL, POD, RC, or receipt"}</p>
            <p className="text-xs text-slate-600 mt-1">JPG, PNG, or PDF · max {MAX_UPLOAD_MB}MB</p>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileSelect} className="hidden" />

        {fileUrl && !result && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-white/10">
              {fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) || fileUrl.startsWith("blob:") ? (
                <img src={fileUrl} alt="Document preview" className="w-full max-h-48 object-cover" />
              ) : (
                <div className="flex items-center justify-center h-32 bg-white/5"><FileText className="w-8 h-8 text-slate-400" /></div>
              )}
              <button onClick={reset} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>

            <Button onClick={handleProcessOCR} disabled={processing} className="w-full bg-green-500 hover:bg-green-600 text-black font-bold">
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />}
              {processing ? "Processing OCR + lifecycle..." : "Extract Data & Send to Dispatch Review"}
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium text-sm">Scan Complete — Sent to Dispatch Review</span>
              </div>
              <button onClick={reset} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Scan another document"><RefreshCw className="w-4 h-4" /></button>
            </div>

            {createdDocument && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-100">
                Document ID {createdDocument.id} created with status <strong>uploaded</strong> and lifecycle status <strong>pending_dispatch_review</strong>.
              </div>
            )}

            {result.mismatches?.length > 0 && (
              <div className="space-y-2">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{result.mismatches.length} Mismatch(es) Detected</p>
                {result.mismatches.map((m, idx) => (
                  <div key={idx} className={`rounded-lg p-2.5 border text-xs ${mismatchSeverity(m.severity)}`}>
                    <div className="font-semibold mb-1 capitalize">{String(m.field || "field").replace(/_/g, " ")}</div>
                    <div className="flex justify-between"><span>Extracted: <strong>{String(m.extracted)}</strong></span><span>Stored: <strong>{String(m.stored)}</strong></span></div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Extracted Data</p>
              {Object.entries(result.extracted || result.extractedData || {}).map(([key, val]) => {
                if (val === null || val === undefined || val === "") return null;
                return <div key={key} className="flex justify-between text-xs"><span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}:</span><span className="text-slate-200 font-medium">{String(val)}</span></div>;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
