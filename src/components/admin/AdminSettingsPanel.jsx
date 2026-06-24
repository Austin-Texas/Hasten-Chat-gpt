import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Settings, Users, Lock, Eye, Palette, Bell, Shield, BarChart3,
  Database, Plus, Trash2, Edit2, Check, X, Save
} from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import RoleVisibilityMatrix from "@/components/admin/RoleVisibilityMatrix";
import ThemeSkinPicker from "@/components/admin/ThemeSkinPicker";
import UIControlsPanel from "@/components/admin/UIControlsPanel";
import BrandingPanel from "@/components/admin/BrandingPanel";
import ThemePreview from "@/components/admin/ThemePreview";
import InviteUserModal from "@/components/admin/InviteUserModal";
import UserActionMenu from "@/components/admin/UserActionMenu";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function AdminSettingsPanel() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [themeSettings, setThemeSettings] = useState(null);
  const [userThemeOverride, setUserThemeOverride] = useState(null);
  const [branding, setBranding] = useState(null);
  const [portalOverrides, setPortalOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);

  const ROLE_OPTIONS = [
    "admin",
    "system_manager",
    "dispatcher",
    "fleet_manager",
    "finance",
    "safety_compliance",
    "driver",
    "client",
    "broker"
  ];

  const [rcEnforcementEnabled, setRCEnforcementEnabled] = useState(false);

  const SECTION_OPTIONS = [
    "dashboard",
    "dispatch",
    "loads",
    "fleet",
    "fleet_manager",
    "drivers",
    "maintenance",
    "compliance",
    "safety",
    "tracking",
    "crm",
    "clients_brokers",
    "finance",
    "payroll",
    "expenses",
    "invoices",
    "documents",
    "messages",
    "support",
    "notifications",
    "analytics",
    "settings",
    "security",
    "audit_logs"
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        // Use getAllUsers function to bypass RLS
        const usersResp = await base44.functions.invoke('getAllUsers', {});
        const u = usersResp.data?.users || [];

        const [t, b, portals, userTheme] = await Promise.all([
          base44.entities.ThemeSetting.list("-created_date", 10).catch(() => null),
          base44.entities.Branding?.list?.("-created_date", 10).catch(() => []),
          base44.entities.ThemeSetting.filter({ scope: 'role' }, '-created_date', 100).catch(() => []),
          currentUser?.id ? base44.entities.ThemeSetting.filter({ scope: 'user', target_id: currentUser.id }, '-created_date', 1).catch(() => []) : Promise.resolve([]),
        ]);

        setUsers(u);
        setThemeSettings(t?.[0] || null);
        setBranding(b?.[0] || null);
        setUserThemeOverride(userTheme?.[0] || null);
        const overridesMap = {};
        (portals || []).forEach(p => {
          if (p.target_role) overridesMap[p.target_role] = p;
        });
        setPortalOverrides(overridesMap);
      } catch (err) {
        console.error('Error loading admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser?.id]);



  const handleInviteUserSubmit = async (formData) => {
    setInviting(true);
    try {
      // Call backend function to handle all user/profile creation
      const response = await base44.functions.invoke('inviteUserWithProfile', {
        fullName: formData.full_name,
        email: formData.email,
        businessRole: formData.businessRole,
        isActive: formData.is_active,
        createBusinessProfile: formData.create_profile,
        sendInviteEmail: formData.send_email
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Invitation failed');
      }

      console.log('User invited with profile:', response.data);

      // Reload users
      const usersResp = await base44.functions.invoke('getAllUsers', {});
      setUsers(usersResp.data?.users || []);

      setShowInviteModal(false);
      alert(`✓ User invited: ${formData.email} (${formData.businessRole})`);
    } catch (err) {
      console.error('Invite error:', err);
      alert("Failed to invite user: " + (err.message || 'Unknown error'));
    } finally {
      setInviting(false);
    }
  };

  const handleThemeSave = async (newSettings) => {
    setSaving(true);
    try {
      // Save to global theme
      if (themeSettings?.id) {
        await base44.entities.ThemeSetting.update(themeSettings.id, newSettings);
      } else {
        await base44.entities.ThemeSetting.create({ scope: "global", ...newSettings });
      }
      setThemeSettings(newSettings);

      // Also save to user-specific override
      if (currentUser?.id) {
        const userThemeData = {
          scope: 'user',
          target_id: currentUser.id,
          theme_mode: newSettings.theme_mode,
          accent_color: newSettings.accent_color,
          density: newSettings.density,
          font_size: newSettings.font_size,
          glassmorphism_intensity: newSettings.glassmorphism_intensity,
          card_transparency: newSettings.card_transparency,
          gloss_highlight: newSettings.gloss_highlight,
          shadow_level: newSettings.shadow_level,
          border_style: newSettings.border_style,
          logo_mode: newSettings.logo_mode
        };

        if (userThemeOverride?.id) {
          await base44.entities.ThemeSetting.update(userThemeOverride.id, userThemeData);
        } else {
          await base44.entities.ThemeSetting.create(userThemeData);
        }
        setUserThemeOverride(userThemeData);
      }

      await base44.asServiceRole.entities.AuditLog.create({
        action: "theme_preferences_saved",
        user_id: currentUser?.id || "system",
        user_role: "admin",
        result: "success",
        action_details: `Theme preferences updated and saved to user account`,
        timestamp: new Date().toISOString()
      }).catch(() => {});
    } catch (err) {
      console.error('[handleThemeSave]', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePortalOverride = async (portal, skinId) => {
    setSaving(true);
    try {
      const skin = skinId === 'global' ? null : themeSettings;
      if (!skin) {
        if (portalOverrides[portal]?.id) {
          await base44.entities.ThemeSetting.delete(portalOverrides[portal].id);
          const updated = { ...portalOverrides };
          delete updated[portal];
          setPortalOverrides(updated);
        }
      } else {
        const existingOverride = portalOverrides[portal];
        const overrideData = {
          scope: 'role',
          target_role: portal,
          theme_mode: skin.theme_mode,
          accent_color: skin.accent_color,
          density: skin.density,
          font_size: skin.font_size,
          glassmorphism_intensity: skin.glassmorphism_intensity,
          card_transparency: skin.card_transparency,
          gloss_highlight: skin.gloss_highlight,
          shadow_level: skin.shadow_level,
          border_style: skin.border_style,
          logo_mode: skin.logo_mode
        };
        
        if (existingOverride?.id) {
          await base44.entities.ThemeSetting.update(existingOverride.id, overrideData);
        } else {
          await base44.entities.ThemeSetting.create(overrideData);
        }
        
        setPortalOverrides({ ...portalOverrides, [portal]: overrideData });
      }

      await base44.asServiceRole.entities.AuditLog.create({
        action: "portal_override_changed",
        user_id: "system",
        user_role: "admin",
        result: "success",
        action_details: `Portal theme override for ${portal} set to ${skinId === 'global' ? 'global theme' : 'custom'}`,
        timestamp: new Date().toISOString()
      }).catch(() => {});
    } catch (err) {
      console.error('[handlePortalOverride]', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-slate-400">Loading…</p></div>;
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Admin Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">System configuration, users, roles, and permissions</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 overflow-x-auto">
        {[
          { id: "users", label: "👥 Users", icon: Users },
          { id: "roles", label: "🔐 Roles", icon: Lock },
          { id: "visibility", label: "👁️ Visibility", icon: Eye },
          { id: "access", label: "📊 Data Access", icon: Database },
          { id: "theme", label: "🎨 Theme", icon: Palette },
          { id: "audit", label: "📋 Audit Logs", icon: BarChart3 }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              tab === t.id ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-white font-semibold">User Management</h2>
              <p className="text-slate-400 text-xs mt-1">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
            </div>
            <button onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
              <Plus className="w-4 h-4" /> Invite User
            </button>
          </div>
          <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
            {users.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No users found</div>
            ) : (
              users.map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{u.full_name || u.email}</div>
                    <div className="text-slate-500 text-xs">{u.email}</div>
                    <div className="flex gap-2 mt-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        u.role === 'admin' ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/15 text-slate-400'
                      }`}>
                        Auth: {u.role}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/15 text-orange-400">
                        Business: {u.businessRole}
                      </span>
                      {u.linked_profile && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/15 text-green-400">
                          {u.linked_profile.type}
                        </span>
                      )}
                      {!u.active && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/15 text-slate-400">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <UserActionMenu user={u} onUserUpdated={() => {
                    const usersResp = base44.functions.invoke('getAllUsers', {});
                    usersResp.then(resp => setUsers(resp.data?.users || [])).catch(() => {});
                  }} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ROLES TAB */}
      {tab === "roles" && (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">Role Permissions Matrix</h2>
          <div className="glass-card rounded-xl border border-white/5 p-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-2 text-slate-400">Role</th>
                  <th className="text-center py-2 px-2 text-slate-400">View</th>
                  <th className="text-center py-2 px-2 text-slate-400">Create</th>
                  <th className="text-center py-2 px-2 text-slate-400">Edit</th>
                  <th className="text-center py-2 px-2 text-slate-400">Delete</th>
                  <th className="text-center py-2 px-2 text-slate-400">Approve</th>
                  <th className="text-center py-2 px-2 text-slate-400">Export</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_OPTIONS.map(role => (
                  <tr key={role} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-2 px-2 text-white capitalize font-medium">{role}</td>
                    <td className="text-center py-2 px-2">
                      <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked={role !== "client" && role !== "broker"} />
                    </td>
                    <td className="text-center py-2 px-2">
                      <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked={role === "admin" || role === "system_manager" || role === "dispatcher" || role === "fleet_manager" || role === "finance"} />
                    </td>
                    <td className="text-center py-2 px-2">
                      <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked={role === "admin" || role === "system_manager" || role === "dispatcher" || role === "fleet_manager"} />
                    </td>
                    <td className="text-center py-2 px-2">
                      <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked={role === "admin"} />
                    </td>
                    <td className="text-center py-2 px-2">
                      <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked={role === "admin" || role === "system_manager" || role === "finance"} />
                    </td>
                    <td className="text-center py-2 px-2">
                      <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked={role !== "driver" && role !== "client"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-xs">Manage granular permissions via RolePermission entity</p>
        </div>
      )}

      {/* VISIBILITY TAB */}
      {tab === "visibility" && (
        <div className="space-y-4">
          <RoleVisibilityMatrix />
        </div>
      )}

      {/* DATA ACCESS TAB */}
      {tab === "access" && (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">Role-Based Data Access</h2>
          <p className="text-slate-400 text-sm">Each role sees only data relevant to their workflow</p>
          
          <div className="grid lg:grid-cols-2 gap-4">
            {[
              {
                role: 'Dispatcher',
                icon: '📦',
                sees: ['Loads status & assignments', 'Driver locations & status', 'Pickup/delivery points', 'Messages from drivers'],
                cannot: ['Driver pay rates', 'Invoice amounts', 'Financial data', 'Compliance details']
              },
              {
                role: 'Driver',
                icon: '🚙',
                sees: ['Own assigned loads', 'Route map & ETA', 'Earnings & payments', 'Documents & compliance'],
                cannot: ['Other drivers data', 'Pricing & rates', 'Company finances', 'Dispatch board']
              },
              {
                role: 'Fleet Manager',
                icon: '🚛',
                sees: ['All trucks & status', 'Maintenance records', 'Compliance docs', 'Driver certifications'],
                cannot: ['Invoice amounts', 'Payroll details', 'Dispatch operations', 'Client info']
              },
              {
                role: 'Finance',
                icon: '💰',
                sees: ['Invoices & payments', 'Payroll & taxes', 'Expenses & deductions', 'Client balances'],
                cannot: ['Driver personal info', 'Dispatch assignments', 'Operational details', 'Route planning']
              },
              {
                role: 'Admin',
                icon: '👤',
                sees: ['Everything', 'All users & roles', 'All settings', 'Audit logs'],
                cannot: ['Nothing—full access']
              },
              {
                role: 'Client',
                icon: '📋',
                sees: ['Own shipments', 'Own invoices', 'Delivery tracking', 'Proof of delivery'],
                cannot: ['Other clients', 'Pricing details', 'Driver info', 'Internal docs']
              }
            ].map(item => (
              <div key={item.role} className="glass-card rounded-xl border border-white/5 p-4">
                <h3 className="text-white font-semibold text-sm mb-3">{item.icon} {item.role}</h3>
                
                <div className="mb-3">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1.5">✓ Can See</p>
                  <ul className="space-y-1">
                    {item.sees.map((s, i) => (
                      <li key={i} className="text-xs text-green-400">• {s}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1.5">✗ Cannot See</p>
                  <ul className="space-y-1">
                    {item.cannot.map((c, i) => (
                      <li key={i} className="text-xs text-slate-500">• {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THEME TAB */}
      {tab === "theme" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-white font-semibold mb-4">Theme Skins & Customization</h2>
          </div>

          {/* Live Preview */}
          <ThemePreview themeSettings={themeSettings} />

          {/* Skins */}
          <div className="glass-card rounded-xl border border-white/5 p-5">
            <ThemeSkinPicker
              currentSkin={themeSettings}
              onSkinSelect={(skin) => handleThemeSave({ ...themeSettings, ...skin })}
            />
          </div>

          {/* UI Controls */}
          <div className="glass-card rounded-xl border border-white/5 p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Advanced UI Controls</h3>
            <UIControlsPanel
              settings={themeSettings}
              onUpdate={(updated) => handleThemeSave({ ...themeSettings, ...updated })}
            />
          </div>

          {/* Basic Theme */}
          <div className="glass-card rounded-xl border border-white/5 p-5 space-y-4">
            <div>
              <label className="text-white font-medium text-sm block mb-3">Theme Mode</label>
              <div className="flex gap-2">
                {["dark", "light", "system"].map(m => (
                  <button key={m} onClick={() => handleThemeSave({ ...themeSettings, theme_mode: m })}
                    className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                      themeSettings?.theme_mode === m
                        ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white font-medium text-sm block mb-3">Accent Color</label>
              <input type="color" value={themeSettings?.accent_color || "#EA580C"}
                onChange={e => handleThemeSave({ ...themeSettings, accent_color: e.target.value })}
                className="w-20 h-10 rounded-lg cursor-pointer" />
            </div>
            <div>
              <label className="text-white font-medium text-sm block mb-3">Density</label>
              <div className="flex gap-2">
                {["comfortable", "compact"].map(d => (
                  <button key={d} onClick={() => handleThemeSave({ ...themeSettings, density: d })}
                    className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                      themeSettings?.density === d
                        ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white font-medium text-sm block mb-3">Font Size</label>
              <div className="flex gap-2">
                {["small", "normal", "large"].map(f => (
                  <button key={f} onClick={() => handleThemeSave({ ...themeSettings, font_size: f })}
                    className={`px-4 py-2 rounded-lg border capitalize text-xs font-medium transition-colors ${
                      themeSettings?.font_size === f
                        ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="glass-card rounded-xl border border-white/5 p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Company Branding</h3>
            <BrandingPanel
              branding={branding}
              onUpdate={(updated) => {
                setBranding(updated);
                handleThemeSave(updated);
              }}
              isSaving={saving}
            />
          </div>

          {/* Portal Theme Overrides */}
          <div className="glass-card rounded-xl border border-white/5 p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm mb-4">Portal Theme Overrides</h3>
            <p className="text-slate-400 text-xs mb-4">Assign different themes to different user portals. Leave unset to use global theme.</p>

            <div className="grid lg:grid-cols-2 gap-4">
              {['admin', 'dispatcher', 'fleet_manager', 'driver', 'client', 'broker'].map(portal => {
                const isOverridden = !!portalOverrides[portal];
                return (
                  <div key={portal}>
                    <label className="text-slate-400 font-medium text-xs block mb-2 capitalize">{portal.replace('_', ' ')} Portal</label>
                    <select 
                      value={isOverridden ? 'custom' : 'global'}
                      onChange={(e) => handlePortalOverride(portal, e.target.value)}
                      disabled={saving}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none focus:border-orange-500/40 disabled:opacity-50"
                    >
                      <option value="global">Use Global Theme</option>
                      <option value="custom">Use Current Theme</option>
                    </select>
                    {isOverridden && <p className="text-orange-400 text-xs mt-1">✓ Override active</p>}
                  </div>
                );
              })}
            </div>

            <p className="text-slate-500 text-xs mt-4 pt-4 border-t border-white/5">
              Portal overrides are stored in ThemeSetting entity with scope='role' and target_role set to the portal type. Changes apply globally in real-time.
            </p>
          </div>
          </div>
          )}

      {/* AUDIT TAB */}
      {tab === "audit" && (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">Audit Logs</h2>
          <div className="glass-card rounded-xl border border-white/5 p-5">
            <p className="text-slate-500 text-sm">All admin actions are logged in the AuditLog entity</p>
            <div className="mt-4 text-xs text-slate-600">
              <p>• User role changes</p>
              <p>• Permission changes</p>
              <p>• Visibility changes</p>
              <p>• Theme changes</p>
              <p>• User disabled/enabled</p>
              <p>• Settings changes</p>
              <p>• RC generated, sent, viewed, signed, rejected</p>
            </div>
          </div>
        </div>
      )}

      {/* RC ENFORCEMENT TAB */}
      <div className="hidden">
        {tab === "rc" && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Rate Confirmation (RC) Settings</h2>
            <div className="glass-card rounded-xl border border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Require RC Signature Before Load Activation</div>
                  <div className="text-slate-400 text-xs mt-1">When enabled, loads cannot move to "in_transit" without signed RC</div>
                </div>
                <button
                  onClick={() => {
                    setRCEnforcementEnabled(!rcEnforcementEnabled);
                    base44.asServiceRole.entities.AuditLog.create({
                      action: "rc_enforcement_toggled",
                      user_id: currentUser?.id,
                      user_role: "admin",
                      result: "success",
                      action_details: `RC enforcement ${!rcEnforcementEnabled ? "enabled" : "disabled"}`,
                      timestamp: new Date().toISOString(),
                    }).catch(() => {});
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    rcEnforcementEnabled ? "bg-green-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      rcEnforcementEnabled ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-white/5">
                <p>When enabled:</p>
                <p>✓ Dispatcher must generate and send RC to driver</p>
                <p>✓ Driver must sign RC</p>
                <p>✓ Load status locked until RC is signed</p>
                <p>✓ All RC actions logged to AuditLog</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteUserSubmit}
        isSubmitting={inviting}
      />
    </div>
  );
}