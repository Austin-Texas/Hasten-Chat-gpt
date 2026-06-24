import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Save, AlertCircle } from 'lucide-react';

export default function SettlementBrandingPanel() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const configs = await base44.asServiceRole.entities.SettlementBrandingConfig.list('-created_date', 1);
      if (configs[0]) {
        setConfig(configs[0]);
      } else {
        // Create default
        const defaultConfig = await base44.asServiceRole.entities.SettlementBrandingConfig.create({
          company_name: 'HASTEN',
          company_tagline: 'Freight & Transport Management',
          header_color: '#EA580C',
          accent_color: '#22C55E',
          footer_contact_email: 'dispatch@hasten.com',
          enable_custom_branding: false
        });
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    try {
      let logoUrl = config.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const uploadResponse = await base44.integrations.Core.UploadFile({
          file: logoFile
        });
        logoUrl = uploadResponse.file_url;
      }

      const user = await base44.auth.me().catch(() => null);

      await base44.asServiceRole.entities.SettlementBrandingConfig.update(config.id, {
        company_name: config.company_name,
        company_tagline: config.company_tagline,
        header_color: config.header_color,
        accent_color: config.accent_color,
        footer_text: config.footer_text,
        footer_contact_email: config.footer_contact_email,
        logo_url: logoUrl,
        enable_custom_branding: config.enable_custom_branding,
        updated_by: user?.id || 'system'
      });

      setLogoFile(null);
      setPreview(null);
      await fetchConfig();
      alert('Branding configuration saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-96 rounded-xl" />;

  return (
    <div className="glass-card rounded-xl border border-white/5 p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-white font-semibold text-lg mb-1">PDF Branding Configuration</h2>
        <p className="text-slate-400 text-sm">Customize the look and feel of settlement PDF summaries</p>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white">Company Logo</label>
        <p className="text-xs text-slate-500 mb-3">Recommended size: 200x60px (PNG, JPG, or SVG)</p>
        
        {preview && (
          <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <img src={preview} alt="Logo preview" className="h-12 object-contain" />
          </div>
        )}

        {config?.logo_url && !preview && (
          <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <img src={config.logo_url} alt="Current logo" className="h-12 object-contain" />
          </div>
        )}

        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
            id="logo-upload"
          />
          <label
            htmlFor="logo-upload"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" /> Upload Logo
          </label>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Company Name</label>
          <input
            type="text"
            value={config?.company_name || ''}
            onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40"
            placeholder="e.g., HASTEN"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Tagline</label>
          <input
            type="text"
            value={config?.company_tagline || ''}
            onChange={(e) => setConfig({ ...config, company_tagline: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40"
            placeholder="e.g., Freight & Transport Management"
          />
        </div>
      </div>

      {/* Colors */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Header Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={config?.header_color || '#EA580C'}
              onChange={(e) => setConfig({ ...config, header_color: e.target.value })}
              className="w-12 h-10 rounded-lg border border-white/10 cursor-pointer"
            />
            <input
              type="text"
              value={config?.header_color || ''}
              onChange={(e) => setConfig({ ...config, header_color: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40 font-mono"
              placeholder="#EA580C"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Accent Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={config?.accent_color || '#22C55E'}
              onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
              className="w-12 h-10 rounded-lg border border-white/10 cursor-pointer"
            />
            <input
              type="text"
              value={config?.accent_color || ''}
              onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40 font-mono"
              placeholder="#22C55E"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Footer Contact Email</label>
        <input
          type="email"
          value={config?.footer_contact_email || ''}
          onChange={(e) => setConfig({ ...config, footer_contact_email: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40"
          placeholder="dispatch@hasten.com"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Footer Text (Optional)</label>
        <textarea
          value={config?.footer_text || ''}
          onChange={(e) => setConfig({ ...config, footer_text: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40 resize-none"
          placeholder="Additional footer text or disclaimer..."
          rows={3}
        />
      </div>

      {/* Enable Custom Branding */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <input
          type="checkbox"
          checked={config?.enable_custom_branding || false}
          onChange={(e) => setConfig({ ...config, enable_custom_branding: e.target.checked })}
          className="rounded cursor-pointer"
          id="custom-branding"
        />
        <label htmlFor="custom-branding" className="flex-1 cursor-pointer">
          <div className="text-sm font-medium text-white">Use Custom Branding</div>
          <div className="text-xs text-slate-400">Apply these settings to settlement PDFs (HASTEN branding used if disabled)</div>
        </label>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Branding Configuration'}
      </button>

      {/* Info */}
      <div className="flex gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">Changes will be applied to all new settlement PDFs generated after this update.</p>
      </div>
    </div>
  );
}