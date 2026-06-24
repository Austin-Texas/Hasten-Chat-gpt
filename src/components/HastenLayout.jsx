import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import GlobalSearch from "@/components/GlobalSearch";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  FileText,
  MessageSquare,
  DollarSign,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  ClipboardList,
  Wrench,
  BarChart3,
  Shield,
  UserCheck,
  Building2,
  Calculator,
  Route,
  Fuel,
  Receipt,
  Search,
  HelpCircle,
  LifeBuoy,
  Inbox,
  TrendingUp,
  Layers,
  Car,
  CreditCard,
  Star,
  AlertCircle,
  TicketCheck,
  Activity,
  Signature,
  Plug,
  Bot,
  ScanLine,
  Palette,
  Clock,
  Sparkles,
  Users,
  SlidersHorizontal,
} from "lucide-react";

const ADMIN_GROUPS = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Approvals", icon: ClipboardList, path: "/approvals", roles: ["admin", "super_admin"] },
      { label: "Reports", icon: BarChart3, path: "/reports", roles: ["admin", "super_admin"] },
      { label: "Activity", icon: Activity, path: "/timeline" },
      { label: "Notifications", icon: Bell, path: "/notifications", badge: "notifications" },
    ],
  },
  {
    label: "Dispatch",
    icon: ClipboardList,
    items: [
      { label: "Dispatch Board", icon: ClipboardList, path: "/dispatch" },
      { label: "Load Marketplace", icon: Layers, path: "/dispatch/load-marketplace" },
      { label: "Loads", icon: Package, path: "/loads" },
      { label: "Load Templates", icon: Layers, path: "/load-templates" },
      { label: "Quotes", icon: FileText, path: "/quotes" },
      { label: "Shipments", icon: Route, path: "/shipments" },
      { label: "Tracking", icon: MapPin, path: "/tracking" },
      { label: "Detention", icon: Clock, path: "/detention-dashboard" },
    ],
  },
  {
    label: "Drivers",
    icon: UserCheck,
    items: [
      { label: "Drivers", icon: UserCheck, path: "/drivers" },
      { label: "Contractors", icon: Users, path: "/contractors", roles: ["admin", "super_admin"] },
      { label: "Scorecards", icon: BarChart3, path: "/driver-scorecards" },
    ],
  },
  {
    label: "Fleet",
    icon: Truck,
    items: [
      { label: "Fleet", icon: Truck, path: "/fleet" },
      { label: "Equipment", icon: Car, path: "/fleet" },
      { label: "Maintenance", icon: Wrench, path: "/maintenance" },
      { label: "Safety", icon: Shield, path: "/safety" },
      { label: "Compliance", icon: Shield, path: "/compliance" },
      { label: "Utilization", icon: Activity, path: "/fleet/utilization" },
      { label: "IFTA", icon: Fuel, path: "/ifta" },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    items: [
      { label: "Finance", icon: Calculator, path: "/finance" },
      { label: "Settlements", icon: Calculator, path: "/finance/settlements", roles: ["admin", "super_admin"] },
      { label: "Payroll", icon: DollarSign, path: "/payroll", roles: ["admin", "super_admin"] },
      { label: "Expenses", icon: Receipt, path: "/expense-approvals", roles: ["admin", "super_admin"] },
      { label: "Factoring", icon: Building2, path: "/finance" },
      { label: "Tax Center", icon: FileText, path: "/finance/tax-center", roles: ["admin", "super_admin"] },
      { label: "Payment Profiles", icon: CreditCard, path: "/finance/payment-profiles", roles: ["admin", "super_admin"] },
      { label: "Profitability", icon: TrendingUp, path: "/profitability", roles: ["admin", "super_admin"] },
    ],
  },
  {
    label: "Documents",
    icon: FileText,
    items: [
      { label: "Document Portal", icon: FileText, path: "/documents" },
      { label: "Pending Documents", icon: Signature, path: "/documents/pending", roles: ["admin", "super_admin"] },
      { label: "Contractor Documents", icon: FileText, path: "/documents/contractor", roles: ["admin", "super_admin"] },
      { label: "Lifecycle", icon: Layers, path: "/documents/lifecycle", roles: ["admin", "super_admin"] },
    ],
  },
  {
    label: "Customers",
    icon: Building2,
    items: [
      { label: "Customers", icon: Building2, path: "/crm" },
      { label: "Quote Requests", icon: FileText, path: "/quotes" },
      { label: "Shipments", icon: Route, path: "/shipments" },
    ],
  },
  {
    label: "Support",
    icon: MessageSquare,
    items: [
      { label: "Messages", icon: Inbox, path: "/messages", badge: "messages" },
      { label: "Support Tickets", icon: TicketCheck, path: "/support-tickets", badge: "tickets" },
      { label: "Feedback", icon: Star, path: "/feedback" },
      { label: "Help Center", icon: HelpCircle, path: "/help" },
      { label: "Incident Center", icon: AlertCircle, path: "/incidents", roles: ["admin", "super_admin", "dispatcher"] },
      { label: "Admin Assistant", icon: Bot, path: "/agent/admin_assistant", roles: ["admin", "super_admin"] },
      { label: "Dispatcher Assistant", icon: Bot, path: "/agent/dispatcher_assistant" },
    ],
  },
  {
    label: "Administration",
    icon: Settings,
    items: [
      { label: "Users & Access", icon: SlidersHorizontal, path: "/admin/users-access", roles: ["admin", "super_admin"] },
      { label: "Settings", icon: Settings, path: "/settings" },
      { label: "Theme Showcase", icon: Palette, path: "/theme-showcase", roles: ["admin", "super_admin"] },
      { label: "App Blueprint", icon: Sparkles, path: "/app-blueprint", roles: ["admin", "super_admin"] },
      { label: "API Integrations", icon: Plug, path: "/super-admin/settings/integrations/load-board-apis", roles: ["super_admin"] },
      { label: "System Diagnostics", icon: Activity, path: "/super-admin/settings/system-diagnostics", roles: ["super_admin"] },
      { label: "Security", icon: Shield, path: "/security-dashboard", roles: ["super_admin"] },
    ],
  },
];

const DISPATCHER_GROUPS = [
  { label: "Dashboard", icon: LayoutDashboard, items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" }, { label: "Dispatch Analytics", icon: TrendingUp, path: "/dispatch/analytics" }] },
  { label: "Dispatch", icon: ClipboardList, items: [{ label: "Dispatch Board", icon: ClipboardList, path: "/dispatch" }, { label: "Load Marketplace", icon: Layers, path: "/dispatch/load-marketplace" }, { label: "Loads", icon: Package, path: "/loads" }, { label: "Live Tracking", icon: MapPin, path: "/tracking" }] },
  { label: "Drivers", icon: Truck, items: [{ label: "Drivers", icon: UserCheck, path: "/drivers" }] },
  { label: "Support", icon: MessageSquare, items: [{ label: "Messages", icon: Inbox, path: "/messages", badge: "messages" }, { label: "Support Tickets", icon: TicketCheck, path: "/support-tickets", badge: "tickets" }, { label: "Notifications", icon: Bell, path: "/notifications", badge: "notifications" }, { label: "Documents", icon: FileText, path: "/documents" }, { label: "Incidents", icon: AlertCircle, path: "/incidents" }, { label: "Help Center", icon: HelpCircle, path: "/help" }] },
];

const CUSTOMER_GROUPS = [
  { label: "Dashboard", icon: LayoutDashboard, items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/client" }] },
  { label: "Shipments & Quotes", icon: Package, items: [{ label: "Shipments & Quotes", icon: Package, path: "/client/shipments" }] },
  { label: "Tracking", icon: MapPin, items: [{ label: "Live Tracking", icon: MapPin, path: "/client/tracking" }] },
  { label: "Documents", icon: FileText, items: [{ label: "Documents", icon: FileText, path: "/client/documents" }] },
  { label: "Invoices", icon: DollarSign, items: [{ label: "Invoices", icon: FileText, path: "/client/invoices" }] },
  { label: "Messages", icon: MessageSquare, items: [{ label: "Messages", icon: Inbox, path: "/messages", badge: "messages" }] },
  { label: "Support", icon: LifeBuoy, items: [{ label: "Support", icon: LifeBuoy, path: "/support-tickets" }, { label: "Help Center", icon: HelpCircle, path: "/help" }] },
];

const DRIVER_GROUPS = [
  { label: "Driver App", icon: LayoutDashboard, items: [{ label: "Home", icon: LayoutDashboard, path: "/driver/dashboard" }, { label: "Loads", icon: Package, path: "/driver/loads" }, { label: "Scan", icon: ScanLine, path: "/driver/scan" }, { label: "Chat", icon: MessageSquare, path: "/driver/messages", badge: "messages" }, { label: "Profile", icon: UserCheck, path: "/driver/profile" }] },
];

function getGroups(role) {
  if (role === "dispatcher") return DISPATCHER_GROUPS;
  if (role === "customer") return CUSTOMER_GROUPS;
  if (role === "driver") return DRIVER_GROUPS;
  return ADMIN_GROUPS;
}

function filterItemsByRole(items, userRole) {
  return items.filter((item) => !item.roles || item.roles.includes(userRole));
}

export default function HastenLayout({ children, user }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();
  const businessRole = user?.businessRole || user?.role || "admin";
  const role = businessRole;
  const groups = getGroups(role);

  const activeSection = useMemo(() => {
    return groups.findIndex((group) => group.items.some((item) => location.pathname === item.path || location.pathname.startsWith(item.path + "/")));
  }, [groups, location.pathname]);

  const [manualSection, setManualSection] = useState(null);
  const openSection = manualSection ?? activeSection;

  const allItems = groups.flatMap((group) => filterItemsByRole(group.items, role));
  const filteredItems = search.trim()
    ? allItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/5 px-4 py-5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500 animate-pulse-glow">
          <Truck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-heading text-lg font-bold leading-none text-white">HASTEN</div>
            <div className="text-xs font-medium text-orange-400">Freight & Transport</div>
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
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/40 focus:outline-none"
          />
          {filteredItems.length > 0 && (
            <div className="mt-1 overflow-hidden rounded-lg border border-white/5 bg-card shadow-xl">
              {filteredItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link key={item.path + item.label} to={item.path} onClick={() => { setSearch(""); setShowSearch(false); setMobileOpen(false); }} className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/5 ${active ? "text-orange-400" : "text-slate-300"}`}>
                    <item.icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {groups.map((group, index) => {
          const visibleItems = filterItemsByRole(group.items, role);
          if (!visibleItems.length) return null;
          const isOpen = openSection === index || collapsed;
          const hasActive = visibleItems.some((item) => location.pathname === item.path || location.pathname.startsWith(item.path + "/"));

          return (
            <div key={group.label}>
              <button
                onClick={() => setManualSection(openSection === index ? null : index)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${collapsed ? "justify-center" : ""} ${hasActive ? "bg-orange-500/10 text-orange-400" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}
                title={collapsed ? group.label : undefined}
              >
                <group.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </>
                )}
              </button>

              {isOpen && (
                <div className={`${collapsed ? "" : "ml-2 border-l border-white/5 pl-2"} mt-0.5 space-y-0.5`}>
                  {visibleItems.map((item) => {
                    const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                    return (
                      <Link
                        key={item.path + item.label}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`nav-item relative ${active ? "active" : ""} ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {!collapsed && <span className="flex-1">{item.label}</span>}
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
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/20">
            <span className="text-xs font-bold text-orange-400">{(user?.full_name || user?.name || "U").charAt(0).toUpperCase()}</span>
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

      <aside className="relative hidden flex-shrink-0 flex-col border-r border-white/5 transition-all duration-300 lg:flex" style={{ width: collapsed ? "64px" : "228px", background: "hsl(var(--sidebar-background))" }}>
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
            <button onClick={() => setGlobalSearchOpen(true)} className="hidden items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-green-500/10 hover:text-green-400 md:flex" title="Search (Cmd+K)">
              <Search className="h-3.5 w-3.5" /> <span>Search</span> <span className="text-[10px] text-slate-600">⌘K</span>
            </button>
            <Link to="/notifications" className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/20">
              <span className="text-xs font-bold text-orange-400">{(user?.full_name || user?.name || "U").charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
