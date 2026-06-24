import { useState } from "react";
import { SKIN_OPTIONS } from "@/lib/themeSkins";
import { Check } from "lucide-react";

export default function ThemeSkinPicker({ currentSkin, onSkinSelect }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-white font-medium text-sm block mb-3">Theme Skin Presets</label>
        <p className="text-slate-400 text-xs mb-4">Select a preset theme or customize below</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SKIN_OPTIONS.map((skin) => (
          <button
            key={skin.id}
            onClick={() => onSkinSelect(skin)}
            className={`p-3 rounded-lg border-2 transition-all duration-150 text-left ${
              currentSkin?.id === skin.id
                ? "border-green-400 bg-green-500/10"
                : "border-white/10 bg-white/5 hover:border-green-400/30"
            }`}
          >
            {currentSkin?.id === skin.id && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 text-xs font-bold">Active</span>
                <Check className="w-4 h-4 text-green-400" />
              </div>
            )}
            <div className="text-white font-medium text-xs mb-1">{skin.name}</div>
            <div className="text-slate-500 text-[10px]">{skin.description}</div>
            {/* Color preview */}
            <div
              className="w-full h-2 rounded-full mt-2"
              style={{ background: skin.accent_color }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}