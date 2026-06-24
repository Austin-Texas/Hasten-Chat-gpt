import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BrandingPanel({ branding, onUpdate, isSaving }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (type) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onUpdate({ ...branding, [`logo_${type}`]: file_url });
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-5">
      {/* Company Name */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Company Display Name</label>
        <input
          type="text"
          value={branding?.company_display_name || ""}
          onChange={(e) => onUpdate({ ...branding, company_display_name: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40"
          placeholder="HASTEN"
        />
      </div>

      {/* Tagline */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Company Tagline</label>
        <input
          type="text"
          value={branding?.company_tagline || ""}
          onChange={(e) => onUpdate({ ...branding, company_tagline: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40"
          placeholder="Freight & Transport"
        />
      </div>

      {/* Support Contact */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <label className="text-white font-medium text-sm block mb-2">Support Email</label>
          <input
            type="email"
            value={branding?.support_email || ""}
            onChange={(e) => onUpdate({ ...branding, support_email: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40"
            placeholder="support@hasten.local"
          />
        </div>
        <div>
          <label className="text-white font-medium text-sm block mb-2">Support Phone</label>
          <input
            type="tel"
            value={branding?.support_phone || ""}
            onChange={(e) => onUpdate({ ...branding, support_phone: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40"
            placeholder="+1-555-HASTEN-1"
          />
        </div>
      </div>

      {/* Logo Management */}
      <div className="pt-4 border-t border-white/5">
        <h3 className="text-white font-semibold text-sm mb-4">Logo Management</h3>
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Light Logo */}
          <div>
            <label className="text-slate-400 font-medium text-xs block mb-2">Light Logo</label>
            <div className="border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:border-orange-500/30 transition-colors">
              {branding?.logo_light ? (
                <div className="space-y-2">
                  <img
                    src={branding.logo_light}
                    alt="Light logo"
                    className="h-12 mx-auto"
                  />
                  <button
                    onClick={() => handleFileUpload("light")}
                    disabled={uploading || isSaving}
                    className="text-orange-400 text-xs hover:text-orange-300 disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Change"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleFileUpload("light")}
                  disabled={uploading || isSaving}
                  className="flex items-center justify-center gap-2 text-slate-400 hover:text-white disabled:opacity-50 w-full"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span className="text-xs">Upload Light Logo</span>
                </button>
              )}
            </div>
          </div>

          {/* Dark Logo */}
          <div>
            <label className="text-slate-400 font-medium text-xs block mb-2">Dark Logo</label>
            <div className="border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:border-orange-500/30 transition-colors">
              {branding?.logo_dark ? (
                <div className="space-y-2">
                  <img
                    src={branding.logo_dark}
                    alt="Dark logo"
                    className="h-12 mx-auto"
                  />
                  <button
                    onClick={() => handleFileUpload("dark")}
                    disabled={uploading || isSaving}
                    className="text-orange-400 text-xs hover:text-orange-300 disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Change"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleFileUpload("dark")}
                  disabled={uploading || isSaving}
                  className="flex items-center justify-center gap-2 text-slate-400 hover:text-white disabled:opacity-50 w-full"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span className="text-xs">Upload Dark Logo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logo Mode */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Logo Mode</label>
        <div className="flex gap-2">
          {["light", "dark", "automatic"].map((mode) => (
            <button
              key={mode}
              onClick={() => onUpdate({ ...branding, logo_mode: mode })}
              className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                branding?.logo_mode === mode
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Accent Color */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Brand Accent Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={branding?.brand_accent_color || "#EA580C"}
            onChange={(e) => onUpdate({ ...branding, brand_accent_color: e.target.value })}
            className="w-20 h-10 rounded-lg cursor-pointer"
          />
          <span className="text-slate-400 text-xs">{branding?.brand_accent_color || "#EA580C"}</span>
        </div>
      </div>
    </div>
  );
}