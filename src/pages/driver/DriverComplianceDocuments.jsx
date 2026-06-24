import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertCircle, Loader2, ChevronLeft, Trash2, Eye, RefreshCw, Lock, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CameraUpload from "@/components/driver/CameraUpload";

const DOC_TYPES = [
  {
    key: "license_front",
    label: "Driver License (Front)",
    icon: "🪪",
    accept: "image/*,.pdf",
    expiryField: "license_expiry",
    expiryLabel: "License Expiry Date",
    required: true,
  },
  {
    key: "license_back",
    label: "Driver License (Back)",
    icon: "🪪",
    accept: "image/*,.pdf",
    required: true,
  },
  {
    key: "medical_card",
    label: "Medical Card",
    icon: "🏥",
    accept: "image/*,.pdf",
    expiryField: "medical_expiry",
    expiryLabel: "Medical Card Expiry",
    required: true,
  },
  {
    key: "insurance_doc",
    label: "Insurance Document",
    icon: "📋",
    accept: "image/*,.pdf",
    required: true,
  },
  {
    key: "registration_doc",
    label: "Vehicle Registration",
    icon: "📄",
    accept: "image/*,.pdf",
    required: false,
  },
  {
    key: "tax_doc",
    label: "Tax Document (W-9/1099)",
    icon: "💼",
    accept: ".pdf,.doc,.docx,image/*",
    required: false,
  },
  {
    key: "other_docs",
    label: "Other Documents",
    icon: "📎",
    accept: "image/*,.pdf,.doc,.docx",
    required: false,
  },
];

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((new Date(dateStr) - new Date()) / 86400000);
  if (days < 0)  return { color: "text-red-400",   bg: "bg-red-500/10 border-red-500/20",   label: "EXPIRED" };
  if (days < 30) return { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: `${days}d left` };
  return            { color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",  label: "Valid" };
}

export default function DriverComplianceDocuments({ user }) {
  const navigate    = useNavigate();
  const [driver, setDriver]           = useState(null);
  const [expiries, setExpiries]       = useState({});
  const [loading, setLoading]         = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [savingExpiry, setSavingExpiry] = useState(null);
  const [success, setSuccess]         = useState("");
  const [error, setError]             = useState("");
  const [previewUrl, setPreviewUrl]   = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1)
      .then(drivers => {
        if (drivers.length > 0) {
          const d = drivers[0];
          setDriver(d);
          setExpiries({
            license_expiry: d.license_expiry || "",
            medical_expiry: d.medical_expiry || "",
          });
        }
      })
      .catch(() => setError("Failed to load documents"))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 2500); }
  };

  const handleDocUpload = async (file_url, fileName, docType) => {
    if (!driver) return;
    setUploadingDoc(docType);
    try {
      const fieldName = `${docType}_url`;
      const updates = { [fieldName]: file_url };
      // Save associated expiry if currently set
      const dt = DOC_TYPES.find(d => d.key === docType);
      if (dt?.expiryField && expiries[dt.expiryField]) {
        updates[dt.expiryField] = expiries[dt.expiryField];
      }
      await base44.entities.Driver.update(driver.id, updates);

      // Sync to ContractorProfile / ContractorDocument for compliance tracking
      await base44.functions.invoke("syncDriverComplianceDoc", {
        driver_id: driver.id,
        doc_type: docType,
        file_url,
        file_name: fileName,
        expiration_date: dt?.expiryField ? expiries[dt.expiryField] || undefined : undefined,
      }).catch(e => console.error("[compliance sync]", e.message));

      await base44.entities.Manifest.create({
        load_id: driver.current_load_id || "no-load",
        event_type: "note_added",
        event_title: `${DOC_TYPES.find(d => d.key === docType)?.label} uploaded`,
        event_timestamp: new Date().toISOString(),
        performed_by: `${driver.first_name} ${driver.last_name}`,
        performed_by_role: "driver",
        attachment_url: file_url,
        is_system_event: false,
      }).catch(() => {});
      setDriver(prev => ({ ...prev, ...updates }));
      flash(`${DOC_TYPES.find(d => d.key === docType)?.label} saved!`);
    } catch {
      flash("Upload failed. Please try again.", true);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleReplaceDoc = (docType) => {
    const dt = DOC_TYPES.find(d => d.key === docType);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = dt?.accept || "image/*,.pdf";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingDoc(docType);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await handleDocUpload(file_url, file.name, docType);
      } catch {
        flash("Upload failed. Please try again.", true);
        setUploadingDoc(null);
      }
    };
    input.click();
  };

  const handleDeleteDoc = async (docType) => {
    if (!driver || !window.confirm(`Remove ${DOC_TYPES.find(d => d.key === docType)?.label}?`)) return;
    try {
      const fieldName = `${docType}_url`;
      await base44.entities.Driver.update(driver.id, { [fieldName]: null });
      setDriver(prev => ({ ...prev, [fieldName]: null }));
      flash("Document removed");
    } catch {
      flash("Failed to remove document", true);
    }
  };

  const handleSaveExpiry = async (field) => {
    if (!driver || !expiries[field]) return;
    setSavingExpiry(field);
    try {
      await base44.entities.Driver.update(driver.id, { [field]: expiries[field] });
      setDriver(prev => ({ ...prev, [field]: expiries[field] }));
      flash("Expiry date saved");
    } catch {
      flash("Failed to save expiry date", true);
    } finally {
      setSavingExpiry(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>;
  }

  if (!driver) {
    return (
      <div className="space-y-4 pb-24">
        <div className="glass-card rounded-xl p-6 border border-red-500/20 bg-red-500/5 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-semibold">No profile found</p>
        </div>
      </div>
    );
  }

  const uploadedCount = DOC_TYPES.filter(dt => driver[`${dt.key}_url`]).length;
  const requiredCount = DOC_TYPES.filter(dt => dt.required).length;
  const requiredDone  = DOC_TYPES.filter(dt => dt.required && driver[`${dt.key}_url`]).length;

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <button onClick={() => navigate("/driver/profile")} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">ID & Compliance Docs</h1>
        <div className="w-9" />
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span className="text-green-400 text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Progress */}
      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold text-sm">Required Documents</span>
          <span className="text-slate-400 text-sm font-mono">{requiredDone}/{requiredCount}</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(requiredDone / requiredCount) * 100}%`,
              background: requiredDone === requiredCount ? "linear-gradient(90deg,#22C55E,#4ADE80)" : "linear-gradient(90deg,#EA580C,#F97316)",
            }}
          />
        </div>
        <p className="text-slate-600 text-xs mt-2">{uploadedCount} of {DOC_TYPES.length} total documents uploaded</p>
      </div>

      {/* Security notice */}
      <div className="rounded-xl p-3 border border-blue-500/20 bg-blue-500/5 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-blue-300 text-xs">Your documents are encrypted and only accessible to you and authorized HASTEN dispatchers. They are never shared with third parties.</p>
      </div>

      {/* Document cards */}
      <div className="space-y-3">
        {DOC_TYPES.map(docType => {
          const field      = `${docType.key}_url`;
          const fileUrl    = driver[field];
          const isUploading = uploadingDoc === docType.key;
          const expStatus  = docType.expiryField ? expiryStatus(driver[docType.expiryField]) : null;
          const isImage    = fileUrl && !fileUrl.endsWith(".pdf");

          return (
            <div key={docType.key} className="glass-card rounded-2xl border border-white/5 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 p-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border ${
                  fileUrl ? "bg-green-500/8 border-green-500/20" : "bg-white/5 border-white/8"
                }`}>
                  {docType.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm">{docType.label}</h3>
                    {docType.required && !fileUrl && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400">REQUIRED</span>
                    )}
                  </div>
                  {fileUrl ? (
                    <p className="text-green-400 text-xs font-semibold mt-0.5 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Uploaded
                    </p>
                  ) : (
                    <p className="text-slate-600 text-xs mt-0.5">Not uploaded yet</p>
                  )}
                </div>
                {/* Expiry status pill */}
                {expStatus && fileUrl && (
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${expStatus.bg} ${expStatus.color}`}>
                    {expStatus.label}
                  </span>
                )}
              </div>

              {/* Preview thumbnail for images */}
              {fileUrl && isImage && (
                <div className="px-4 pb-3">
                  <button onClick={() => setPreviewUrl(fileUrl)} className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10 group">
                    <img src={fileUrl} alt={docType.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </button>
                </div>
              )}

              {/* Expiry date input */}
              {docType.expiryField && (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-white/5">
                    <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="block text-slate-600 text-[10px] uppercase tracking-wider font-semibold mb-1">{docType.expiryLabel}</label>
                      <input
                        type="date"
                        value={expiries[docType.expiryField] || ""}
                        onChange={e => setExpiries(prev => ({ ...prev, [docType.expiryField]: e.target.value }))}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                    {expiries[docType.expiryField] !== (driver[docType.expiryField] || "") && (
                      <button
                        onClick={() => handleSaveExpiry(docType.expiryField)}
                        disabled={savingExpiry === docType.expiryField}
                        className="p-1.5 rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-400 text-xs font-semibold flex-shrink-0"
                      >
                        {savingExpiry === docType.expiryField ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Upload / action buttons */}
              <div className="px-4 pb-4 space-y-2">
                {!fileUrl ? (
                  <CameraUpload
                    label={`Upload ${docType.label}`}
                    accept={docType.accept}
                    docType={docType.key}
                    onUploaded={handleDocUpload}
                  />
                ) : (
                  <div className="flex gap-2">
                    {/* View */}
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </a>
                    {/* Replace */}
                    <button
                      onClick={() => handleReplaceDoc(docType.key)}
                      disabled={isUploading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold disabled:opacity-50 hover:bg-white/10 transition-colors"
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      {isUploading ? "Uploading…" : "Replace"}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteDoc(docType.key)}
                      className="p-2.5 rounded-xl bg-white/3 border border-white/8 text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Best practices */}
      <div className="glass-card rounded-2xl p-4 border border-slate-500/15 bg-slate-500/3">
        <h3 className="text-slate-300 font-semibold text-sm mb-2">📝 Tips for Best Results</h3>
        <ul className="text-slate-500 text-xs space-y-1.5">
          <li>• Use a flat, well-lit surface — avoid shadows on the document</li>
          <li>• Capture the entire document including all four corners</li>
          <li>• Ensure all text is sharp and clearly readable</li>
          <li>• Upload both front and back of your driver license</li>
          <li>• Submit renewed documents before the old ones expire</li>
        </ul>
      </div>

      {/* Full-screen image preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="Document preview" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white" onClick={() => setPreviewUrl(null)}>✕</button>
        </div>
      )}
    </div>
  );
}