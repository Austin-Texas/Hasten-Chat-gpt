import { UI_CONTROLS } from "@/lib/themeSkins";

const THEME_MODES = ["system", "dark", "light", "compact_dark", "high_contrast"];
const DENSITY_MODES = ["comfortable", "compact", "ultra_compact"];
const FONT_SIZES = ["small", "default", "large"];

export default function UIControlsPanel({ settings, onUpdate }) {
  const handleChange = (key, value) => {
    onUpdate({ ...settings, [key]: value });
  };

  const optionClass = (active) => `px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${active ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-white font-medium text-sm block mb-2">Theme Mode</label>
        <div className="flex gap-2 flex-wrap">
          {THEME_MODES.map((opt) => (
            <button key={opt} onClick={() => handleChange("theme_mode", opt)} className={optionClass((settings?.theme_mode || "dark") === opt)}>
              {opt.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white font-medium text-sm block mb-2">Density</label>
        <div className="flex gap-2 flex-wrap">
          {DENSITY_MODES.map((opt) => (
            <button key={opt} onClick={() => handleChange("density", opt)} className={optionClass((settings?.density || "compact") === opt)}>
              {opt.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white font-medium text-sm block mb-2">Accent Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={settings?.accent_color || "#00E678"} onChange={(event) => handleChange("accent_color", event.target.value)} className="h-9 w-16 rounded-lg border border-white/10 bg-transparent" />
          <input value={settings?.accent_color || "#00E678"} onChange={(event) => handleChange("accent_color", event.target.value)} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
        </div>
      </div>

      <div>
        <label className="text-white font-medium text-sm block mb-2">Font Size</label>
        <div className="flex gap-2 flex-wrap">
          {FONT_SIZES.map((opt) => (
            <button key={opt} onClick={() => handleChange("font_size", opt)} className={optionClass((settings?.font_size || "default") === opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white font-medium text-sm block mb-2">Glassmorphism Intensity</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.glassmorphism_intensity.map((opt) => (
            <button key={opt} onClick={() => handleChange("glassmorphism_intensity", opt)} className={optionClass((settings?.glassmorphism_intensity || "medium") === opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white font-medium text-sm block mb-2">Card Transparency</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.card_transparency.map((opt) => (
            <button key={opt} onClick={() => handleChange("card_transparency", opt)} className={optionClass(settings?.card_transparency === opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white font-medium text-sm block mb-2">Gloss Highlight</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.gloss_highlight.map((opt) => (
            <button key={opt} onClick={() => handleChange("gloss_highlight", opt)} className={optionClass(settings?.gloss_highlight === opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white font-medium text-sm block mb-2">Shadow Level</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.shadow_level.map((opt) => (
            <button key={opt} onClick={() => handleChange("shadow_level", opt)} className={optionClass(settings?.shadow_level === opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white font-medium text-sm block mb-2">Border Style</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.border_style.map((opt) => (
            <button key={opt} onClick={() => handleChange("border_style", opt)} className={optionClass(settings?.border_style === opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
