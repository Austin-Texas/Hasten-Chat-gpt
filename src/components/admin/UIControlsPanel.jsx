import { UI_CONTROLS } from "@/lib/themeSkins";

export default function UIControlsPanel({ settings, onUpdate }) {
  const handleChange = (key, value) => {
    onUpdate({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-5">
      {/* Glassmorphism Intensity */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Glassmorphism Intensity</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.glassmorphism_intensity.map((opt) => (
            <button
              key={opt}
              onClick={() => handleChange("glassmorphism_intensity", opt)}
              className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                settings?.glassmorphism_intensity === opt
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Card Transparency */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Card Transparency</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.card_transparency.map((opt) => (
            <button
              key={opt}
              onClick={() => handleChange("card_transparency", opt)}
              className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                settings?.card_transparency === opt
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Gloss Highlight */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Gloss Highlight</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.gloss_highlight.map((opt) => (
            <button
              key={opt}
              onClick={() => handleChange("gloss_highlight", opt)}
              className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                settings?.gloss_highlight === opt
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Shadow Level */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Shadow Level</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.shadow_level.map((opt) => (
            <button
              key={opt}
              onClick={() => handleChange("shadow_level", opt)}
              className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                settings?.shadow_level === opt
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Border Style */}
      <div>
        <label className="text-white font-medium text-sm block mb-2">Border Style</label>
        <div className="flex gap-2 flex-wrap">
          {UI_CONTROLS.border_style.map((opt) => (
            <button
              key={opt}
              onClick={() => handleChange("border_style", opt)}
              className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                settings?.border_style === opt
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}