import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings as SettingsIcon, Bell, Shield, Palette, Users, LogOut, Save, Check } from "lucide-react";
import AdminSettingsPanel from "@/components/admin/AdminSettingsPanel";
import { SKIN_OPTIONS } from "@/lib/themeSkins";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState({
    theme_mode: "dark",
    font_size: "normal",
    density: "normal",
    glassmorphism_intensity: "medium",
    accent_color: "#EA580C"
  });
  const [selectedSkin, setSelectedSkin] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
    loadTheme();
  }, []);

  // Apply theme changes immediately as user adjusts settings (live preview)
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const loadTheme = async () => {
    try {
      const userId = (await base44.auth.me()).id;
      const userTheme = await base44.entities.ThemeSetting.filter(
        { scope: 'user', target_id: userId },
        '-created_date',
        1
      ).catch(() => []);
      if (userTheme && userTheme.length > 0) {
        setTheme(userTheme[0]);
        setSelectedSkin(userTheme[0].skin_preset || null);
      }
    } catch (err) {
      console.error('Error loading theme:', err);
    }
  };

  const saveTheme = async () => {
    try {
      setSaving(true);
      const userId = user.id;
      const existing = await base44.entities.ThemeSetting.filter(
        { scope: 'user', target_id: userId }
      ).catch(() => []);

      const themeData = {
        scope: 'user',
        target_id: userId,
        ...theme,
        skin_preset: selectedSkin
      };

      if (existing && existing.length > 0) {
        await base44.entities.ThemeSetting.update(existing[0].id, themeData);
      } else {
        await base44.entities.ThemeSetting.create(themeData);
      }

      console.log('Theme saved:', themeData);
      alert('Theme saved and applied!');
    } catch (err) {
      console.error('Error saving theme:', err);
      alert('Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const applySkin = (skinId) => {
    const skin = SKIN_OPTIONS.find(s => s.id === skinId);
    if (skin) {
      const newTheme = {
        ...theme,
        theme_mode: skin.theme_mode,
        accent_color: skin.accent_color,
        glassmorphism_intensity: skin.glassmorphism_intensity
      };
      setTheme(newTheme);
      setSelectedSkin(skinId);
      applyTheme(newTheme); // Immediate preview
    }
  };

  const applyTheme = (themeSetting) => {
    const root = document.documentElement;
    if (themeSetting.theme_mode === 'light') {
      root.classList.remove('dark');
    } else if (themeSetting.theme_mode === 'dark') {
      root.classList.add('dark');
    } else if (themeSetting.theme_mode === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    if (themeSetting.accent_color) {
      root.style.setProperty('--ring', themeSetting.accent_color.replace('#', '') + ' 100% 50%');
    }
    if (themeSetting.font_size === 'small') {
      root.style.setProperty('--font-scale', '0.9');
    } else if (themeSetting.font_size === 'large') {
      root.style.setProperty('--font-scale', '1.1');
    } else {
      root.style.setProperty('--font-scale', '1');
    }
  };

  if (!user) {
    return <div className="text-center py-12"><p className="text-slate-400">Loading…</p></div>;
  }

  // Admin sees AdminSettingsPanel
  if (user.role === "admin" || user.role === "system_manager") {
    return <AdminSettingsPanel />;
  }

  return (
    <div className="space-y-5 animate-slide-up max-w-4xl">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage preferences and system configuration</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit overflow-x-auto">
        {["general", "notifications", "security", "appearance", "team"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 whitespace-nowrap ${
              tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}>
            {t === "general" ? "General" : t === "notifications" ? "Notifications" : t === "security" ? "Security" : t === "appearance" ? "Appearance" : "Team"}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="glass-card rounded-xl border border-white/5 p-6 space-y-5">
          <div>
            <label className="text-white font-medium text-sm block mb-2">Full Name</label>
            <input type="text" value={user.full_name || ""} disabled
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50" />
          </div>
          <div>
            <label className="text-white font-medium text-sm block mb-2">Email</label>
            <input type="email" value={user.email || ""} disabled
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50" />
          </div>
          <div>
            <label className="text-white font-medium text-sm block mb-2">Role</label>
            <input type="text" value={user.role || ""} disabled
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50 capitalize" />
          </div>
          <div className="pt-4 border-t border-white/5">
            <p className="text-slate-400 text-xs">Account ID: {user.id}</p>
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-white font-medium text-sm">In-App Notifications</p>
                <p className="text-slate-500 text-xs">Get alerts for loads, messages, and updates</p>
              </div>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 accent-orange-500" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium text-sm">Email Notifications</p>
                <p className="text-slate-500 text-xs">Receive email digests and alerts</p>
              </div>
            </div>
            <input type="checkbox" className="w-4 h-4 accent-orange-500" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-white font-medium text-sm">Push Notifications</p>
                <p className="text-slate-500 text-xs">Mobile app push messages</p>
              </div>
            </div>
            <input type="checkbox" className="w-4 h-4 accent-orange-500" />
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium text-sm">Two-Factor Authentication</p>
                <p className="text-slate-500 text-xs">Add extra layer of security</p>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium hover:bg-white/10 transition-colors">
              Enable
            </button>
          </div>
          <div className="pt-4 border-t border-white/5">
            <p className="text-white font-medium text-sm mb-3">Active Sessions</p>
            <div className="space-y-2 text-xs text-slate-400">
              <p>Browser (Chrome) - Last active now</p>
              <p>Mobile App (iOS) - Last active 2 hours ago</p>
            </div>
          </div>
        </div>
      )}

      {tab === "appearance" && (
        <div className="glass-card rounded-xl border border-white/5 p-6 space-y-6">
          <h3 className="text-white font-heading font-bold text-lg">Appearance</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Theme */}
            <div className="space-y-2">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block">Theme</label>
              <select
                value={theme.theme_mode || "dark"}
                onChange={e => {
                  const v = e.target.value;
                  setTheme(prev => ({ ...prev, theme_mode: v }));
                  if (window.HASTEN_UI) {
                    const themeMap = { dark: 'theme-dark', light: 'theme-light', high_contrast: 'theme-high-contrast' };
                    if (themeMap[v]) window.HASTEN_UI.setTheme(themeMap[v]);
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/40 transition-colors"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="high_contrast">High Contrast</option>
                <option value="system">System</option>
              </select>
            </div>

            {/* Density */}
            <div className="space-y-2">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block">Density</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "comfortable", label: "Comfortable", desc: "More padding", icon: "▱" },
                  { value: "compact", label: "Compact", desc: "Balanced", icon: "▮" },
                  { value: "ultra_compact", label: "Ultra", desc: "Max density", icon: "█" },
                ].map(opt => {
                  const active = (theme.density || "compact") === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        const v = opt.value;
                        setTheme(prev => ({ ...prev, density: v }));
                        if (window.HASTEN_UI) {
                          const densityMap = { comfortable: 'h-density-comfortable', compact: 'h-density-compact', ultra_compact: 'h-density-ultra' };
                          if (densityMap[v]) window.HASTEN_UI.setDensity(densityMap[v]);
                        }
                      }}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all ${
                        active
                          ? "bg-green-500/15 border-green-500/50 text-green-400 shadow-[0_0_12px_rgba(0,230,120,0.15)]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <span className="text-lg leading-none">{opt.icon}</span>
                      <span>{opt.label}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Glass Effect */}
            <div className="space-y-2">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block">Glass Effect</label>
              <select
                value={theme.glassmorphism_intensity || "medium"}
                onChange={e => {
                  const v = e.target.value;
                  setTheme(prev => ({ ...prev, glassmorphism_intensity: v }));
                  if (window.HASTEN_UI) window.HASTEN_UI.setGlass(`glass-${v}`);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/40 transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block">Font Size</label>
              <select
                value={theme.font_size || "default"}
                onChange={e => {
                  const v = e.target.value;
                  setTheme(prev => ({ ...prev, font_size: v }));
                  if (window.HASTEN_UI) window.HASTEN_UI.setFont(`font-${v}`);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/40 transition-colors"
              >
                <option value="small">Small</option>
                <option value="default">Default</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block">Accent Color</label>
            <div className="flex gap-3 items-center">
              <input type="color"
                value={theme.accent_color || "#00E678"}
                onChange={e => setTheme(prev => ({ ...prev, accent_color: e.target.value, custom_accent_enabled: true }))}
                className="w-16 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10" />
              <input type="text"
                value={theme.accent_color || "#00E678"}
                onChange={e => setTheme(prev => ({ ...prev, accent_color: e.target.value, custom_accent_enabled: true }))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40 transition-colors" />
            </div>
          </div>

          {/* Skin Presets */}
          <div className="space-y-2">
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block">Theme Presets</label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {SKIN_OPTIONS.map(skin => (
                <button key={skin.id}
                  onClick={() => applySkin(skin.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedSkin === skin.id
                      ? "border-green-500 bg-green-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: skin.accent_color }} />
                    {selectedSkin === skin.id && <Check className="w-4 h-4 text-green-400" />}
                  </div>
                  <p className="text-white text-xs font-medium">{skin.name}</p>
                  <p className="text-slate-500 text-xs mt-1">{skin.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-white/5">
            <button onClick={saveTheme}
              disabled={saving}
              className="btn-premium flex items-center gap-2 px-6 py-2.5 text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Appearance'}
            </button>
          </div>
        </div>
      )}

      {tab === "team" && (
        <div className="glass-card rounded-xl border border-white/5 p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Team Members</h3>
            <button className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors">
              Invite User
            </button>
          </div>
          <div className="text-center py-8 text-slate-500 text-sm">
            User management is available via admin dashboard
          </div>
        </div>
      )}
    </div>
  );
}