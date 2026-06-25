import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import GlobalSearch from "@/components/GlobalSearch";
import { FEATURE_ACCESS_EVENT, featureSections, isFeatureEnabled, loadFeatureAccess, STORAGE_FEATURES } from "@/lib/featureAccess";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Fuel,
  HelpCircle,
  Inbox,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Palette,
  Plug,
  Receipt,
  Route,
  ScanLine,
  Search,
  Settings,
  Shield,
  Signature,
  SlidersHorizontal,
  Sparkles,
  Star,
  TicketCheck,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wrench,
  ClipboardList,
} from "lucide-react";

const group = (label, icon, items, featureKey = label) => ({ label, icon, items, featureKey });
const item = (label, icon, path, featureKey, roles) => ({ label, icon, path, featureKey, roles });

const ADMIN_GROUPS = [
  group("Dashboard", LayoutDashboard, [
    item("Dashboard", LayoutDashboard, "/dashboard", "Dashboard"),
    item("Approvals", ClipboardList, "/approvals", "Approvals", ["admin", "super_admin"]),
    item("Reports", BarChart3, "/reports", "Reports", ["admin", "super_admin"]),
    item("Activity", Activity, "/timeline", "Activity"),
    item("Alerts", Bell, "/notifications", "Notifications"),
  ]),
  group("Dispatch", ClipboardList, [
    item("Board", ClipboardList, "/dispatch", "Dispatch Board"),
    item("Marketplace", Layers, "/dispatch/load-marketplace", "Load Marketplace"),
    item("Loads", Package, "/loads", "Loads"),
    item("Templates", Layers, "/load-templates", "Load Templates"),
    item("Quotes", FileText, "/quotes", "Quotes"),
    item("Shipments", Route, "/shipments", "Shipments"),
    item("Tracking", MapPin, "/tracking", "Tracking"),
    item("Detention", Clock, "/detention-dashboard", "Detention"),
  ]),
  group("Drivers", UserCheck, [
    item("Drivers", UserCheck, "/drivers", "Drivers"),
    item("Contractors", Users, "/contractors", "Contractors", ["admin", "super_admin"]),
    item("Scorecards", BarChart3, "/driver-scorecards", "Scorecards"),
  ]),
  group("Fleet", Truck, [
    item("Fleet", Truck, "/fleet", "Fleet"),
    item("Maintenance", Wrench, "/maintenance", "Maintenance"),
    item("Safety", Shield, "/safety", "Safety"),
    item("Compliance", Shield, "/compliance", "Compliance"),
    item("Utilization", Activity, "/fleet/utilization", "Utilization"),
  ]),
  group("Finance", DollarSign, [
    item("Overview", Calculator, "/finance", "Finance"),
    item("Settlements", Calculator, "/finance/settlements", "Settlements", ["admin", "super_admin"]),
    item("Weekly", DollarSign, "/finance/weekly-settlements", "Settlements", ["admin", "super_admin"]),
    item("Payments", CreditCard, "/finance/payment-profiles", "Payment Profiles", ["admin", "super_admin"]),
    item("Factoring", Building2, "/finance/factoring", "Factoring", ["admin", "super_admin"]),
    item("Tax Center", FileText, "/finance/tax-center", "Tax Center", ["admin", "super_admin"]),
    item("Expenses", Receipt, "/expense-approvals", "Expenses", ["admin", "super_admin"]),
    item("Profit", TrendingUp, "/profitability", "Profitability", ["admin", "super_admin"]),
    item("IFTA", Fuel, "/ifta", "IFTA"),
  ]),
  group("Documents", FileText, [
    item("Portal", FileText, "/documents", "Document Portal"),
    item("Pending", Signature, "/documents/pending", "Pending Documents", ["admin", "super_admin"]),
    item("Contractor Docs", FileText, "/documents/contractor", "Contractor Documents", ["admin", "super_admin"]),
    item("Lifecycle", Layers, "/documents/lifecycle", "Lifecycle", ["admin", "super_admin"]),
  ]),
  group("Customers", Building2, [
    item("Customers", Building2, "/crm", "Customers"),
    item("Quotes", FileText, "/quotes", "Quote Requests"),
    item("Shipments", Route, "/shipments", "Customer Shipments"),
  ]),
  group("Support", MessageSquare, [
    item("Messages", Inbox, "/messages", "Messages"),
    item("Tickets", TicketCheck, "/support-tickets", "Support Tickets"),
    item("Feedback", Star, "/feedback", "Feedback"),
    item("Help", HelpCircle, "/help", "Help Center"),
    item("Incidents", AlertCircle, "/incidents", "Incident Center", ["admin", "super_admin", "dispatcher"]),
    item("Admin AI", Bot, "/agent/admin_assistant", "Admin Assistant", ["admin", "super_admin"]),
    item("Dispatch AI", Bot, "/agent/dispatcher_assistant", "Dispatcher Assistant"),
  ]),
  group("Administration", Settings, [
    item("Access", SlidersHorizontal, "/admin/users-access", "Users & Access", ["admin", "super_admin"]),
    item("Settings", Settings, "/settings", "Settings"),
    item("Themes", Palette, "/theme-showcase", "Theme Showcase", ["admin", "super_admin"]),
    item("Blueprint", Sparkles, "/app-blueprint", "App Blueprint", ["admin", "super_admin"]),
    item("APIs", Plug, "/super-admin/settings/integrations/load-board-apis", "API Integrations", ["super_admin"]),
    item("Diagnostics", Activity, "/super-admin/settings/system-diagnostics", "System Diagnostics", ["super_admin"]),
    item("Security", Shield, "/security-dashboard", "Security", ["super_admin"]),
  ], "Administration"),
];

const DISPATCHER_GROUPS = [
  group("Dashboard", LayoutDashboard, [
    item("Dashboard", LayoutDashboard, "/dashboard", "Dashboard"),
    item("Analytics", TrendingUp, "/dispatch/analytics", "Reports"),
  ]),
  group("Dispatch", ClipboardList, [
    item("Board", ClipboardList, "/dispatch", "Dispatch Board"),
    item("Marketplace", Layers, "/dispatch/load-marketplace", "Load Marketplace"),
    item("Loads", Package, "/loads", "Loads"),
    item("Tracking", MapPin, "/tracking", "Tracking"),
  ]),
  group("Drivers", Truck, [
    item("Drivers", UserCheck, "/drivers", "Drivers"),
  ]),
  group("Support", MessageSquare, [
    item("Messages", Inbox, "/messages", "Messages"),
    item("Tickets", TicketCheck, "/support-tickets", "Support Tickets"),
    item("Alerts", Bell, "/notifications", "Notifications"),
    item("Documents", FileText, "/documents", "Document Portal"),
    item("Incidents", AlertCircle, "/incidents", "Incident Center"),
    item("Help", HelpCircle, "/help", "Help Center"),
  ]),
];

const CUSTOMER_GROUPS = [
  group("Dashboard", LayoutDashboard, [item("Dashboard", LayoutDashboard, "/client", "Dashboard")]),
  group("Shipments & Quotes", Package, [item("Shipments & Quotes", Package, "/client/shipments", "Customer Shipments")], "Customers"),
  group("Tracking", MapPin, [item("Tracking", MapPin, "/client/tracking", "Customer Tracking")], "Tracking"),
  group("Documents", FileText, [item("Documents", FileText, "/client/documents", "Customer Documents")], "Documents"),
  group("Invoices", DollarSign, [item("Invoices", FileText, "/client/invoices", "Customer Invoices")], "Finance"),
  group("Messages", MessageSquare, [item("Messages", Inbox, "/client/chat", "Messages")]),
  group("Support", LifeBuoy, [item("Support", LifeBuoy, "/client/support", "Support Tickets"), item("Help", HelpCircle, "/help", "Help Center")]),
];

const DRIVER_GROUPS = [
  group("Driver App", LayoutDashboard, [
    item("Home", LayoutDashboard, "/driver/dashboard", "Driver Home"),
    item("Loads", Package, "/driver/loads", "Driver Loads"),
    item("Scan", ScanLine, "/driver/scan", "Driver Scan"),
    item("Chat", MessageSquare, "/driver/messages", "Messages"),
    item("Profile", UserCheck, "/driver/profile", "Driver Profile"),
  ], "Driver App"),
];

function getGroups(role) {
  if (role === "dispatcher") return DISPATCHER_GROUPS;
  if (role === "customer") return CUSTOMER_GROUPS;
  if (role === "driver") return DRIVER_GROUPS;
  return ADMIN_GROUPS;
}

function hasRoleAccess(navItem, userRole) {
  return !navItem.roles || navItem.roles.includes(userRole);
}

function getItemFeatureKey(navItem) {
  if (navItem.featureKey) return navItem.featureKey;
  return featureSections.includes(navItem.label) ? navItem.label : null;
}

function routeIsActive(pathname, navPath) {
  if (pathname === navPath) return true;
  if (["/finance", "/crm", "/dispatch", "/documents", "/fleet", "/drivers", "/client"].includes(navPath)) return false;
  return pathname.startsWith(`${navPath}/`);
}

export default function HastenLayout({ children, user }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [featureAccess, setFeatureAccess] = useState(() => loadFeatureAccess());
  const { logout } = useAuth();
  const location = useLocation();
  const role = user?.businessRole || user?.role || "admin";

  useEffect(() => {
    const refresh = (event) => setFeatureAccess(event?.detail || loadFeatureAccess());
    const onStorage = (event) => {
      if (event.key === STORAGE_FEATURES) refresh();
    };
    window.addEventListener(FEATURE_ACCESS_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(FEATURE_ACCESS_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const groups = useMemo(() => getGroups(role).map((navGroup) => {
    const groupKey = navGroup.featureKey || navGroup.label;
    const keepGroup = navGroup.label === "Administration" || !groupKey || isFeatureEnabled(featureAccess, role, groupKey);
    if (!keepGroup) return null;

    const items = navGroup.items
      .filter((navItem) => hasRoleAccess(navItem, role))
      .filter((navItem) => isFeatureEnabled(featureAccess, role, getItemFeatureKey(navItem)));

    return items.length ? { ...navGroup, items } : null;
  }).filter(Boolean), [featureAccess, role]);

  const activeSection = useMemo(() => groups.findIndex((navGroup) =>
    navGroup.items.some((navItem) => routeIsActive(location.pathname, navItem.path))
  ), [groups, location.pathname]);

  const [manualSection, setManualSection] = useState(null);
  const openSection = manualSection ?? activeSection;
  const allItems = groups.flatMap((navGroup) => navGroup.items);
  const filteredItems = search.trim()
    ? allItems.filter((navItem) => navItem.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const closeMobile = () => setMobileOpen(false);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/5 px-4 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500 animate-pulse-glow">
          <Truck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-heading text-lg font-bold leading-none text-white">HASTEN</div>
            <div className="text-xs font-medium text-green-400">Cargo LLC</div>
          </div>
        )}
        {!collapsed && (
          <button onClick={() => setShowSearch((value) => !value)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" title="Search pages">
            <Search className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!collapsed && showSearch && (
        <div className="flex-shrink-0 px-3 pb-1 pt-3">
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pages…"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-green-500/40 focus:outline-none"
          />
          {filteredItems.length > 0 && (
            <div className="mt-1 overflow-hidden rounded-lg border border-white/5 bg-card shadow-xl">
              {filteredItems.map((navItem) => (
                <Link
                  key={navItem.path + navItem.label}
                  to={navItem.path}
                  onClick={() => { setSearch(""); setShowSearch(false); closeMobile(); }}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/5 ${location.pathname === navItem.path ? "text-green-400" : "text-slate-300"}`}
                >
                  <navItem.icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                  {navItem.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {groups.map((navGroup, index) => {
          const isOpen = openSection === index || collapsed;
          const hasActive = navGroup.items.some((navItem) => routeIsActive(location.pathname, navItem.path));
          return (
            <div key={navGroup.label}>
              <button
                onClick={() => setManualSection(openSection === index ? null : index)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${collapsed ? "justify-center" : ""} ${hasActive ? "bg-green-500/10 text-green-400" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}
                title={collapsed ? navGroup.label : undefined}
              >
                <navGroup.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{navGroup.label}</span>
                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </>
                )}
              </button>
              {isOpen && (
                <div className={`${collapsed ? "" : "ml-2 border-l border-white/5 pl-2"} mt-0.5 space-y-0.5`}>
                  {navGroup.items.map((navItem) => {
                    const active = routeIsActive(location.pathname, navItem.path);
                    return (
                      <Link
                        key={navItem.path + navItem.label}
                        to={navItem.path}
                        onClick={closeMobile}
                        className={`nav-item relative ${active ? "active" : ""} ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? navItem.label : undefined}
                      >
                        <navItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {!collapsed && <span className="flex-1">{navItem.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex-shrink-0 space-y-1 border-t border-white/5 p-3">
        <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-green-500/30 bg-green-500/20">
            <span className="text-xs font-bold text-green-400">{(user?.full_name || user?.name || "U").charAt(0).toUpperCase()}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user?.full_name || user?.name || "User"}</div>
              <div className="text-xs capitalize text-slate-500">{role}</div>
            </div>
          )}
        </div>
        <button onClick={() => logout(true)} className={`nav-item w-full ${collapsed ? "justify-center" : ""}`} title={collapsed ? "Sign Out" : undefined}>
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {globalSearchOpen && <GlobalSearch onClose={() => setGlobalSearchOpen(false)} />}
      <aside
        className="relative hidden flex-shrink-0 flex-col border-r border-white/5 transition-all duration-300 lg:flex"
        style={{ width: collapsed ? "64px" : "228px", background: "hsl(var(--sidebar-background))" }}
      >
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-lg" aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight className="h-3 w-3 text-white" /> : <ChevronLeft className="h-3 w-3 text-white" />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 w-64 overflow-y-auto border-r border-white/5" style={{ background: "hsl(var(--sidebar-background))" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 px-4" style={{ background: "hsl(var(--card))" }}>
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs text-slate-400">System Online</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/help" className="hidden items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white sm:flex">
              <HelpCircle className="h-3.5 w-3.5" /> Help
            </Link>
            <button onClick={() => setGlobalSearchOpen(true)} className="hidden items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-green-500/10 hover:text-green-400 md:flex" title="Search">
              <Search className="h-3.5 w-3.5" /><span>Search</span>
            </button>
            <Link to="/notifications" className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/30 bg-green-500/20">
              <span className="text-xs font-bold text-green-400">{(user?.full_name || user?.name || "U").charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
