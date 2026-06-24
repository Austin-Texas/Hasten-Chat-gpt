import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Loader2, Save, Bell, Globe, Ruler, Weight,
  Sun, Moon, Monitor, Type, CheckCircle
} from "lucide-react";

// ── Generic toggle ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
    </label>
  );
}

// ── Radio group ───────────────────────────────────────────────────────────────
function RadioGroup({ name, value, onChange, options }) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 cursor-pointer transition-colors active:bg-white/5">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            value === opt.value ? "border-orange-500 bg-orange-500" : "border-slate-600"
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

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color = "orange", children }) {
  const colorMap = {
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    blue:   "bg-blue-500/10 border-blue-500/20 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    cyan:   "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    slate:  "bg-slate-500/10 border-slate-500/20 text-slate-400",
    green:  "bg-green-500/10 border-green-500/20 text-green-400",
  };
  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DriverSettings({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver]   = useState(null);
  const [settings, setSettings] = useState({
    preferred_language:      "en",
    preferred_distance_unit: "miles",
    preferred_weight_unit:   "lbs",
    preferred_font_size:     "normal",
    preferred_color_scheme:  "dark",
    notification_preferences: true,
    availability_reminders:   true,
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1)
      .then(drivers => {
        if (drivers.length > 0) {
          const d = drivers[0];
          setDriver(d);
          setSettings({
            preferred_language:       d.preferred_language       || "en",
            preferred_distance_unit:  d.preferred_distance_unit  || "miles",
            preferred_weight_unit:    d.preferred_weight_unit     || "lbs",
            preferred_font_size:      d.preferred_font_size       || "normal",
            preferred_color_scheme:   d.preferred_color_scheme    || "dark",
            notification_preferences: d.notification_preferences !== false,
            availability_reminders:   d.availability_reminders   !== false,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!driver) return;
    setSaving(true);
    try {
      await base44.entities.Driver.update(driver.id, settings);
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate("/driver/profile"); }, 1500);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 pb-24"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      {/* Header */}
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

      {/* Language */}
      <Section icon={Globe} title="Language" color="blue">
        <RadioGroup
          name="language"
          value={settings.preferred_language}
          onChange={v => set("preferred_language", v)}
          options={[
            { value: "en", label: "English" },
            { value: "es", label: "Spanish — Español" },
            { value: "pt", label: "Portuguese — Português" },
            { value: "ru", label: "Russian — Русский" },
            { value: "fr", label: "French — Français" },
          ]}
        />
      </Section>

      {/* Font size */}
      <Section icon={Type} title="Font Size" color="purple">
        <RadioGroup
          name="font_size"
          value={settings.preferred_font_size}
          onChange={v => set("preferred_font_size", v)}
          options={[
            { value: "small",  label: "Small",  sub: "Compact — fits more on screen" },
            { value: "normal", label: "Normal", sub: "Default — recommended" },
            { value: "big",    label: "Large",  sub: "Larger text for easier reading" },
          ]}
        />
      </Section>

      {/* Color scheme */}
      <Section icon={Sun} title="Color Scheme" color="amber">
        <RadioGroup
          name="color_scheme"
          value={settings.preferred_color_scheme}
          onChange={v => set("preferred_color_scheme", v)}
          options={[
            { value: "dark",   label: "Dark",   sub: "Dark navy — default HASTEN theme",  icon: Moon },
            { value: "light",  label: "Light",  sub: "Light background — bright conditions", icon: Sun },
            { value: "system", label: "System", sub: "Follows device setting",             icon: Monitor },
          ]}
        />
      </Section>

      {/* Distance unit */}
      <Section icon={Ruler} title="Distance" color="cyan">
        <RadioGroup
          name="distance"
          value={settings.preferred_distance_unit}
          onChange={v => set("preferred_distance_unit", v)}
          options={[
            { value: "miles", label: "Miles (mi)",      sub: "Standard in USA / Canada" },
            { value: "km",    label: "Kilometers (km)", sub: "Standard internationally" },
          ]}
        />
      </Section>

      {/* Weight unit */}
      <Section icon={Weight} title="Weight" color="orange">
        <RadioGroup
          name="weight"
          value={settings.preferred_weight_unit}
          onChange={v => set("preferred_weight_unit", v)}
          options={[
            { value: "lbs",    label: "Pounds (lbs)",    sub: "Standard in USA" },
            { value: "kg",     label: "Kilograms (kg)",  sub: "Metric" },
            { value: "ton",    label: "Metric Tons",     sub: "Large freight" },
          ]}
        />
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications" color="green">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-white text-sm font-semibold">Push Notifications</div>
              <div className="text-slate-500 text-xs">Load updates, messages & system alerts</div>
            </div>
            <Toggle checked={settings.notification_preferences} onChange={v => set("notification_preferences", v)} />
          </div>
          <div className="border-t border-white/5 pt-4 flex items-center justify-between py-1">
            <div>
              <div className="text-white text-sm font-semibold">Availability Reminders</div>
              <div className="text-slate-500 text-xs">Remind me to update my status daily</div>
            </div>
            <Toggle checked={settings.availability_reminders} onChange={v => set("availability_reminders", v)} />
          </div>
        </div>
      </Section>

      {/* App info */}
      <div className="glass-card rounded-2xl p-4 border border-white/5 text-center">
        <div className="text-white font-semibold text-sm">HASTEN Driver App</div>
        <div className="text-slate-500 text-xs mt-0.5">Version 1.0.0 · hasten.io</div>
        <div className="text-slate-600 text-[10px] mt-2">© 2024 HASTEN Freight & Transport</div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", boxShadow: "0 4px 20px rgba(234,88,12,0.3)" }}
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Settings</>}
      </button>
    </div>
  );
}