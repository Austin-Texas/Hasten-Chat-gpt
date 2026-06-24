import { useEffect } from 'react';
import { Package, Users, DollarSign, Truck, TrendingUp } from 'lucide-react';
import KpiCard from '@/components/hasten/KpiCard';

export default function ThemePreview({ themeSettings }) {
  useEffect(() => {
    if (!themeSettings) return;

    // Create a preview root element with isolated styles
    const previewContainer = document.getElementById('theme-preview-root');
    if (!previewContainer) return;

    // Apply theme to preview container
    const tempRoot = previewContainer;
    
    // Theme mode
    if (themeSettings.theme_mode === 'light') {
      tempRoot.classList.remove('dark');
    } else if (themeSettings.theme_mode === 'dark') {
      tempRoot.classList.add('dark');
    }

    // Accent color
    if (themeSettings.accent_color) {
      const hex = themeSettings.accent_color;
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
        const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
        let h = 0;
        if (max !== min) {
          const d = max - min;
          switch (max) {
            case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
            case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
            case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
          }
        }
        const s = max === 0 ? 0 : (max - min) / (1 - Math.abs(2 * ((max + min) / 2) - 1));
        const l = (max + min) / 2;
        tempRoot.style.setProperty('--primary', `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`);
      }
    }

    // Density
    if (themeSettings.density === 'compact') {
      tempRoot.classList.add('density-compact');
    } else {
      tempRoot.classList.remove('density-compact');
    }

    // Glassmorphism
    const glassIntensity = {
      low: 'blur(10px)',
      medium: 'blur(20px)',
      high: 'blur(30px)'
    };
    if (themeSettings.glassmorphism_intensity) {
      tempRoot.style.setProperty('--glass-blur', glassIntensity[themeSettings.glassmorphism_intensity] || 'blur(20px)');
    }
  }, [themeSettings]);

  return (
    <div className="glass-card rounded-xl border border-white/5 p-5">
      <div className="mb-4">
        <h3 className="text-white font-semibold text-sm">Live Preview</h3>
        <p className="text-slate-400 text-xs mt-1">See how your theme looks on the dashboard</p>
      </div>

      <div
        id="theme-preview-root"
        className="rounded-lg overflow-hidden border border-white/10 dark bg-slate-950"
        style={{
          minHeight: '320px',
          padding: '16px',
          '--glass-blur': 'blur(20px)'
        }}
      >
        <div className="space-y-4">
          {/* Preview Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-heading font-bold text-lg">Dashboard Preview</div>
              <div className="text-slate-400 text-xs mt-0.5">Theme changes appear instantly</div>
            </div>
          </div>

          {/* Preview KPI Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-orange-400" />
                <span className="text-slate-400 text-xs">Active Loads</span>
              </div>
              <div className="text-white font-bold text-xl">12</div>
            </div>
            <div className="glass-card rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400 text-xs">Drivers</span>
              </div>
              <div className="text-white font-bold text-xl">8</div>
            </div>
            <div className="glass-card rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-slate-400 text-xs">Revenue MTD</span>
              </div>
              <div className="text-white font-bold text-xl">$45k</div>
            </div>
            <div className="glass-card rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400 text-xs">Trucks</span>
              </div>
              <div className="text-white font-bold text-xl">6</div>
            </div>
          </div>

          {/* Preview Glass Card */}
          <div className="glass-card rounded-lg p-3 border border-white/5 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-slate-300 text-xs font-medium">Glass Morphism Sample</span>
            </div>
            <div className="text-slate-500 text-xs">This card demonstrates the glassmorphism and accent color settings</div>
          </div>
        </div>
      </div>

      <p className="text-slate-500 text-xs mt-3 italic">💡 Adjust theme settings above to see changes in real-time</p>
    </div>
  );
}