import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Loader2, Save, Bell, Globe, Ruler, Weight,
  Sun, Moon, Monitor, Type, CheckCircle, Palette, Layers
} from "lucide-react";

const DEFAULT_THEME = {
  scope: "user",
  theme_mode: "dark",
  density: "comfortable",
  accent_color: "#00E678",
  secondary_accent_color: "#3B82F6",
  custom_accent_enabled: true,
  glassmorphism_intensity: "medium",
  font_size: "default",
  skin_preset: "enterprise_dark",
};

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
    </label>
  );
}

function RadioGroup({ name, value, onChange, options }) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 cursor-pointer transition-colors active:bg-white/5">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            value === opt.value ? "border-green-500 bg-green-500" : "border-slate-600"
          }`}>
            {value === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={e => onChange(e.target.value)} className="sr-only" />
          <div className="flex-1">
            <span className="text-white text-sm font-medium">{opt.label}</span>
            {opt.sub && <p className="text-slate-500 text-xs">{opt.sub}</p>}
          </div>
          {opt.icon && <opt.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />}
        </label>
      ))}
    </div>
  );
}

function PillGroup({ name, value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${value === opt.value ? "border-green-500/50 bg-green-500/15 text-green-300" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, color = "orange", children }) {
  const colorMap = {
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
  };
  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.orange}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DriverSettings({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [themeRecordId, setThemeRecordId] = useState(null);
  const [themeSettings, setThemeSettings] = useState(DEFAULT_THEME);
  const [settings, setSettings] = useState({
    preferred_language: "en",
    preferred_distance_unit: "miles",
    preferred_weight_unit: "lbs",
    preferred_font_size: "normal",
    preferred_color_scheme: "dark",
    notification_preferences: true,
    availability_reminders: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const [drivers, themeRecords] = await Promise.all([
          base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1).catch(() => []),
          base44.entities.ThemeSetting.filter({ scope: "user", target_id: user.id }, "-created_date", 1).catch(() => []),
        ]);

        if (!mounted) return;
        const d = drivers?.[0];
        if (d) {
          setDriver(d);
          setSettings({
            preferred_language: d.preferred_language || "en",
            preferred_distance_unit: d.preferred_distance_unit || "miles",
            preferred_weight_unit: d.preferred_weight_unit || "lbs",
            preferred_font_size: d.preferred_font_size || "normal",
            preferred_color_scheme: d.preferred_color_scheme || "dark",
            notification_preferences: d.notification_preferences !== false,
            availability_reminders: d.availability_reminders !== false,
          });
        }

        const savedTheme = themeRecords?.[0];
        if (savedTheme) {
          setThemeRecordId(savedTheme.id);
          setThemeSettings({ ...DEFAULT_THEME, ...savedTheme, target_id: user.id });
        } else {
          setThemeSettings({ ...DEFAULT_THEME, target_id: user.id });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSettings();
    return () => { mounted = false; };
  }, [user?.id]);

  const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));
  const setTheme = (key, val) => setThemeSettings(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const normalizedTheme = {
        ...DEFAULT_THEME,
        ...themeSettings,
        scope: "user",
        target_id: user.id,
        custom_accent_enabled: true,
        font_size: themeSettings.font_size === "normal" ? "default" : themeSettings.font_size || "default",
      };

      if (driver?.id) {
        await base44.entities.Driver.update(driver.id, {
          ...settings,
          preferred_color_scheme: normalizedTheme.theme_mode,
          preferred_font_size: normalizedTheme.font_size === "default" ? "normal" : normalizedTheme.font_size,
        });
      }

      if (themeRecordId) await base44.entities.ThemeSetting.update(themeRecordId, normalizedTheme);
      else {
        const created = await base44.entities.ThemeSetting.create(normalizedTheme);
        setThemeRecordId(created?.id || null);
      }

      localStorage.setItem("hasten_theme", JSON.stringify(normalizedTheme));
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate("/driver/profile"); }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 pb-24"><Loader2 className="w-6 h-6 text-green-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      <div className="flex items-center justify-between pt-2 pb-2">
        <button onClick={() => navigate("/driver/profile")} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">App Settings</h1>
        <div className="w-9" />
      </div>

      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 animate-slide-up">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-medium">Settings saved!</span>
        </div>
      )}

      <Section icon={Palette} title="Appearance" color="green">
        <div className="space-y-4">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Theme Mode</p>
            <RadioGroup
              name="theme_mode"
              value={themeSettings.theme_mode}
              onChange={v => setTheme("theme_mode", v)}
              options={[
                { value: "system", label: "System", sub: "Follows phone or browser setting", icon: Monitor },
                { value: "dark", label: "Dark", sub: "Premium HASTEN dark navy", icon: Moon },
                { value: "light", label: "Light", sub: "Bright mode for daylight", icon: Sun },
                { value: "compact_dark", label: "Compact Dark", sub: "Dense dark UI for power users", icon: Layers },
                { value: "high_contrast", label: "High Contrast", sub: "Maximum readability", icon: Type },
              ]}
            />
          </div>

          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Density</p>
            <PillGroup
              name="density"
              value={themeSettings.density || "comfortable"}
              onChange={v => setTheme("density", v)}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
                { value: "ultra_compact", label: "Ultra" },
              ]}
            />
          </div>

          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Glass Effect</p>
            <PillGroup
              name="glass"
              value={themeSettings.glassmorphism_intensity || "medium"}
              onChange={v => setTheme("glassmorphism_intensity", v)}
              options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]}
            />
          </div>

          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Font Size</p>
            <PillGroup
              name="font"
              value={themeSettings.font_size || "default"}
              onChange={v => setTheme("font_size", v)}
              options={[{ value: "small", label: "Small" }, { value: "default", label: "Default" }, { value: "large", label: "Large" }]}
            />
          </div>

          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Accent Color</p>
            <div className="flex items-center gap-2">
              <input type="color" value={themeSettings.accent_color || "#00E678"} onChange={e => setTheme("accent_color", e.target.value)} className="h-10 w-16 rounded-lg border border-white/10 bg-transparent" />
              <input value={themeSettings.accent_color || "#00E678"} onChange={e => setTheme("accent_color", e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
            </div>
          </div>
        </div>
      </Section>

      <Section icon={Globe} title="Language" color="blue">
        <RadioGroup name="language" value={settings.preferred_language} onChange={v => set("preferred_language", v)} options={[{ value: "en", label: "English" }, { value: "es", label: "Spanish — Español" }, { value: "pt", label: "Portuguese — Português" }, { value: "ru", label: "Russian — Русский" }, { value: "fr", label: "French — Français" }]} />
      </Section>

      <Section icon={Ruler} title="Distance" color="cyan">
        <RadioGroup name="distance" value={settings.preferred_distance_unit} onChange={v => set("preferred_distance_unit", v)} options={[{ value: "miles", label: "Miles (mi)", sub: "Standard in USA / Canada" }, { value: "km", label: "Kilometers (km)", sub: "Standard internationally" }]} />
      </Section>

      <Section icon={Weight} title="Weight" color="orange">
        <RadioGroup name="weight" value={settings.preferred_weight_unit} onChange={v => set("preferred_weight_unit", v)} options={[{ value: "lbs", label: "Pounds (lbs)", sub: "Standard in USA" }, { value: "kg", label: "Kilograms (kg)", sub: "Metric" }, { value: "ton", label: "Metric Tons", sub: "Large freight" }]} />
      </Section>

      <Section icon={Bell} title="Notifications" color="green">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div><div className="text-white text-sm font-semibold">Push Notifications</div><div className="text-slate-500 text-xs">Load updates, messages & system alerts</div></div>
            <Toggle checked={settings.notification_preferences} onChange={v => set("notification_preferences", v)} />
          </div>
          <div className="border-t border-white/5 pt-4 flex items-center justify-between py-1">
            <div><div className="text-white text-sm font-semibold">Availability Reminders</div><div className="text-slate-500 text-xs">Remind me to update my status daily</div></div>
            <Toggle checked={settings.availability_reminders} onChange={v => set("availability_reminders", v)} />
          </div>
        </div>
      </Section>

      <div className="glass-card rounded-2xl p-4 border border-white/5 text-center">
        <div className="text-white font-semibold text-sm">HASTEN Driver App</div>
        <div className="text-slate-500 text-xs mt-0.5">Version 1.0.0 · HASTEN Cargo LLC</div>
      </div>

      <button onClick={handleSave} disabled={saving || saved} className="w-full py-3.5 rounded-2xl font-bold text-slate-950 text-sm disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 shadow-lg shadow-green-500/20">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Settings</>}
      </button>
    </div>
  );
}
