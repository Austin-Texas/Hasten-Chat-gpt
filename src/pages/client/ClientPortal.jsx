import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, MapPin, DollarSign, MessageSquare, LogOut, Menu, ChevronLeft, Folder, LayoutDashboard, LifeBuoy, Settings as SettingsIcon, Save, CheckCircle2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import ClientDashboard from "@/components/client/ClientDashboard";
import ClientTracking from "@/components/client/ClientTracking";
import ClientInvoices from "@/components/client/ClientInvoices";
import ClientDocuments from "@/components/client/ClientDocuments";
import ClientShipments from "@/components/client/ClientShipments";
import ClientSupport from "@/components/client/ClientSupport";
import ClientChat from "@/components/client/ClientChat";

const DEFAULT_CUSTOMER_THEME = {
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

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/client" },
  { label: "Shipments & Quotes", icon: Package, path: "/client/shipments" },
  { label: "Tracking", icon: MapPin, path: "/client/tracking" },
  { label: "Documents", icon: Folder, path: "/client/documents" },
  { label: "Invoices", icon: DollarSign, path: "/client/invoices" },
  { label: "Messages", icon: MessageSquare, path: "/client/chat" },
  { label: "Support", icon: LifeBuoy, path: "/client/support" },
  { label: "Appearance", icon: SettingsIcon, path: "/client/settings" },
];

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_CUSTOMER_THEME);
  const [themeRecordId, setThemeRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    Promise.all([base44.auth.me()])
      .then(async ([currentUser]) => {
        setUser(currentUser);

        const [clients, themeRecords] = await Promise.all([
          base44.entities.Client.filter({ user_id: currentUser.id }, "-created_date", 1).catch(() => []),
          base44.entities.ThemeSetting.filter({ scope: "user", target_id: currentUser.id }, "-created_date", 1).catch(() => []),
        ]);

        if (clients.length > 0) setClient(clients[0]);
        if (themeRecords.length > 0) {
          setThemeRecordId(themeRecords[0].id);
          setTheme({ ...DEFAULT_CUSTOMER_THEME, ...themeRecords[0], target_id: currentUser.id });
        } else {
          setTheme({ ...DEFAULT_CUSTOMER_THEME, target_id: currentUser.id });
        }
      })
      .catch(err => {
        console.error("Auth error:", err);
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      base44.entities.Message.filter({ recipient_id: user.id, is_read: false }, "-created_date", 100)
        .then(msgs => setUnreadCount(msgs.length))
        .catch(() => {});
    };
    fetchUnread();
    const unsub = base44.entities.Message.subscribe(() => fetchUnread());
    return () => unsub();
  }, [user]);

  const handleLogout = () => logout(true);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center animate-pulse-glow">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div className="text-white font-heading font-bold text-xl">HASTEN</div>
          <div className="w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const currentTab = location.pathname.split("/client")[1] || "";
  const activeItem = NAV_ITEMS.find(item => item.path === `/client${currentTab}`) || NAV_ITEMS[0];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5" style={{ background: "hsl(var(--sidebar-background))" }}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-white font-heading font-bold text-lg leading-none">HASTEN</div>
            <div className="text-green-400 text-xs font-medium">Customer Portal</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative ${active ? "bg-green-500/12 text-green-400 border-l-2 border-green-500" : "text-slate-400 hover:text-white"}`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.path === "/client/chat" && unreadCount > 0 && <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-black text-[9px] font-bold">{unreadCount > 99 ? "99+" : unreadCount}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-3 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-xs font-bold">{(client?.company_name || "C").charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{client?.company_name || "Customer"}</div>
              <div className="text-slate-500 text-xs">{client?.customer_type || "customer"}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white transition-colors text-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 border-r border-white/5 flex flex-col" style={{ background: "hsl(var(--sidebar-background))" }}>
            <div className="p-3 border-b border-white/5">
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/5"><ChevronLeft className="w-5 h-5 text-white" /></button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(item => (
                <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${location.pathname === item.path ? "bg-green-500/12 text-green-400" : "text-slate-400 hover:text-white"}`}>
                  <item.icon className="w-4 h-4" /> <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0" style={{ background: "hsl(var(--card))" }}>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400"><Menu className="w-5 h-5" /></button>
          <div className="hidden lg:flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-slate-400 text-xs">System Online</span></div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right"><div className="text-white text-sm font-medium">{client?.company_name || "Customer"}</div><div className="text-slate-500 text-xs">{client?.contact_name || user?.full_name}</div></div>
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center"><span className="text-green-400 text-xs font-bold">{(client?.company_name || "C").charAt(0).toUpperCase()}</span></div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {location.pathname === "/client" && <ClientDashboard client={client} user={user} />}
          {(location.pathname === "/client/shipments" || location.pathname === "/client/booking") && <ClientShipments client={client} user={user} />}
          {location.pathname === "/client/tracking" && <ClientTracking client={client} />}
          {location.pathname === "/client/invoices" && <ClientInvoices client={client} />}
          {location.pathname === "/client/documents" && <ClientDocuments client={client} user={user} />}
          {location.pathname === "/client/support" && <ClientSupport client={client} user={user} />}
          {location.pathname === "/client/chat" && <ClientChat client={client} user={user} />}
          {location.pathname === "/client/settings" && <ClientAppearanceSettings user={user} theme={theme} setTheme={setTheme} themeRecordId={themeRecordId} setThemeRecordId={setThemeRecordId} />}
        </main>
      </div>
    </div>
  );
}

function ClientAppearanceSettings({ user, theme, setTheme, themeRecordId, setThemeRecordId }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const update = (key, value) => setTheme((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = { ...DEFAULT_CUSTOMER_THEME, ...theme, scope: "user", target_id: user.id, custom_accent_enabled: true };
      if (themeRecordId) await base44.entities.ThemeSetting.update(themeRecordId, payload);
      else {
        const created = await base44.entities.ThemeSetting.create(payload);
        setThemeRecordId(created?.id || null);
      }
      localStorage.setItem("hasten_theme", JSON.stringify(payload));
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-green-400">Customer Settings</p>
          <h1 className="mt-1 text-2xl font-black text-white">Appearance</h1>
          <p className="mt-1 text-sm text-slate-400">Control customer portal theme, density, accent color, glass effect, and font size.</p>
        </div>
        {saved && <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</span>}
      </div>

      <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-5">
        <Setting label="Theme Mode">
          <OptionRow value={theme.theme_mode || "dark"} onChange={(value) => update("theme_mode", value)} options={["system", "dark", "light", "compact_dark", "high_contrast"]} />
        </Setting>
        <Setting label="Density">
          <OptionRow value={theme.density || "comfortable"} onChange={(value) => update("density", value)} options={["comfortable", "compact", "ultra_compact"]} />
        </Setting>
        <Setting label="Glass Effect">
          <OptionRow value={theme.glassmorphism_intensity || "medium"} onChange={(value) => update("glassmorphism_intensity", value)} options={["low", "medium", "high"]} />
        </Setting>
        <Setting label="Font Size">
          <OptionRow value={theme.font_size || "default"} onChange={(value) => update("font_size", value)} options={["small", "default", "large"]} />
        </Setting>
        <Setting label="Accent Color">
          <div className="flex items-center gap-2">
            <input type="color" value={theme.accent_color || "#00E678"} onChange={(event) => update("accent_color", event.target.value)} className="h-10 w-16 rounded-lg border border-white/10 bg-transparent" />
            <input value={theme.accent_color || "#00E678"} onChange={(event) => update("accent_color", event.target.value)} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
          </div>
        </Setting>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-green-400 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Appearance"}</button>
      </div>
    </div>
  );
}

function Setting({ label, children }) {
  return <div className="space-y-2"><label className="block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>{children}</div>;
}

function OptionRow({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-all ${value === option ? "border-green-500/50 bg-green-500/15 text-green-300" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}>
          {option.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
