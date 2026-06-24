import { Info } from "lucide-react";
import { useState } from "react";
import { SECTION_DESCRIPTIONS } from "@/lib/brandingDefaults";

export default function SectionHoverDescription({ sectionId, children }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const description = SECTION_DESCRIPTIONS[sectionId];

  if (!description) return children;

  return (
    <div className="relative group inline-flex items-center gap-2">
      {children}
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="p-1 rounded-full text-slate-400 hover:text-orange-400 hover:bg-white/5 transition-colors"
        title={description}
        aria-label="Section description"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-2 z-50 glass-card rounded-lg border border-white/10 p-3 w-64 animate-slide-up">
          <p className="text-slate-300 text-xs leading-relaxed">{description}</p>
          <div className="absolute top-full left-0 w-2 h-2 bg-card transform -translate-y-1 ml-3" style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }} />
        </div>
      )}
    </div>
  );
}