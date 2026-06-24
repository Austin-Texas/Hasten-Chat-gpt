import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import GlobalSearch from "@/components/GlobalSearch";
import {
  LayoutDashboard, Truck, MapPin, FileText, MessageSquare,
  DollarSign, Settings, LogOut, Bell, Menu, X,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Package, ClipboardList, Wrench, BarChart3,
  Shield, UserCheck, Building2, Calculator, Route, Fuel, Receipt,
  Search, BookOpen, Users, HelpCircle, LifeBuoy, Inbox,
  TrendingUp, Layers, Car, CreditCard, Star, AlertCircle, TicketCheck, Activity,
  Signature, DollarSignIcon, Plug, Bot, ScanLine, Palette, Clock, Sparkles
} from "lucide-react";

// ── Grouped sidebar config ────────────────────────────────────────────────────
const ADMIN_GROUPS = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard",     icon: LayoutDashboard, path: "/dashboard" },
      { label: "Approvals",     icon: ClipboardList,   path: "/approvals", roles: ["admin", "super_admin"] },
      { label: "Reports",       icon: BarChart3,       path: "/reports", roles: ["admin", "super_admin"] },
      { label: "Activity",      icon: Activity,        path: "/timeline" },
      { label: "Notifications", icon: Bell,            path: "/notifications", badge: "notifications" },
    ],
  },
  {
    label: "Dispatch",
    icon: ClipboardList,
    items: [
      { label: "Dispatch Board",   icon: ClipboardList, path: "/dispatch" },
      { label: "Load Marketplace", icon: Layers,        path: "/dispatch/load-marketplace" },
      { label: "Loads",            icon: Package,       path: "/loads" },
      { label: "Load Templates",   icon: Layers,        path: "/load-templates" },
      { label: "Quotes",           icon: FileText,      path: "/quotes" },
      { label: "Shipments",        icon: Route,         path: "/shipments" },
      { label: "Tracking",         icon: MapPin,        path: "/tracking" },
      { label: "Detention",        icon: Clock,         path: "/detention-dashboard" },
    ],
  },
  {
    label: "Drivers",
    icon: UserCheck,
    items: [
      { label: "Drivers",           icon: UserCheck, path: "/drivers" },
      { label: "Contractors",       icon: Users,     path: "/contractors", roles: ["admin", "super_admin"] },
      { label: "Scorecards",        icon: BarChart3, path: "/driver-scorecards" },
    ],
  },
  {
    label: "Fleet",
    icon: Truck,
    items: [
      { label: "Fleet",       icon: Truck,    path: "/fleet" },
      { label: "Equipment",   icon: Car,      path: "/fleet" },
      { label: "Maintenance", icon: Wrench,   path: "/maintenance" },
      { label: "Safety",      icon: Shield,   path: "/safety" },
      { label: "Compliance",  icon: Shield,   path: "/compliance" },
      { label: "Utilization", icon: Activity, path: "/fleet/utilization" },
      { label: "IFTA",        icon: Fuel,     path: "/ifta" },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    items: [
      { label: "Finance",          icon: Calculator, path: "/finance" },
      { label: "Settlements",      icon: Calculator, path: "/finance/settlements", roles: ["admin", "super_admin"] },
      { label: "Payroll",          icon: DollarSign, path: "/payroll", roles: ["admin", "super_admin"] },
      { label: "Expenses",         icon: Receipt,    path: "/expense-approvals", roles: ["admin", "super_admin"] },
      { label: "Factoring",        icon: Building2,  path: "/finance" },
      { label: "Tax Center",       icon: FileText,   path: "/finance/tax-center", roles: ["admin", "super_admin"] },
      { label: "Payment Profiles", icon: CreditCard, path: "/finance/payment-profiles", roles: ["admin", "super_admin"] },
      { label: "Profitability",    icon: TrendingUp, path: "/profitability", roles: ["admin", "super_admin"] },
    ],
  },
  {
    label: "Documents",
    icon: FileText,
    items: [
      { label: "Document Portal",      icon: FileText,  path: "/documents" },
      { label: "Pending Documents",    icon: Signature, path: "/documents/pending", roles: ["admin", "super_admin"] },
      { label: "Contractor Documents", icon: FileText,  path: "/documents/contractor", roles: ["admin", "super_admin"] },
      { label: "Lifecycle",            icon: Layers,    path: "/documents/lifecycle", roles: ["admin", "super_admin"] },
    ],
  },
  {
    label: "Customers",
    icon: Building2,
    items: [
      { label: "Customers",      icon: Building2, path: "/crm" },
      { label: "Quote Requests", icon: FileText,  path: "/quotes" },
      { label: "Shipments",      icon: Route,     path: "/shipments" },
    ],
  },
  {
    label: "Support",
    icon: MessageSquare,
    items: [
      { label: "Messages",             icon: Inbox,       path: "/messages", badge: "messages" },
      { label: "Support Tickets",      icon: TicketCheck, path: "/support-tickets", badge: "tickets" },
      { label: "Feedback",             icon: Star,        path: "/feedback" },
      { label: "Help Center",          icon: HelpCircle,  path: "/help" },
      { label: "Incident Center",      icon: AlertCircle, path: "/incidents", roles: ["admin", "super_admin", "dispatcher"] },
      { label: "Admin Assistant",      icon: Bot,         path: "/agent/admin_assistant", roles: ["admin", "super_admin"] },
      { label: "Dispatcher Assistant", icon: Bot,         path: "/agent/dispatcher_assistant" },
    ],
  },
  {
    label: "Administration",
    icon: Settings,
    items: [
      { label: "Settings",           icon: Settings, path: "/settings" },
      { label: "Theme Showcase",     icon: Palette,  path: "/theme-showcase", roles: ["admin", "super_admin"] },
      { label: "App Blueprint",      icon: Sparkles, path: "/app-blueprint", roles: ["admin", "super_admin"] },
      { label: "API Integrations",   icon: Plug,     path: "/super-admin/settings/integrations/load-board-apis", roles: ["super_admin"] },
      { label: "System Diagnostics", icon: Activity, path: "/super-admin/settings/system-diagnostics", roles: ["super_admin"] },
      { label: "Security",           icon: Shield,   path: "/security-dashboard", roles: ["super_admin"] },
    ],
  },
];

const DISPATCHER_GROUPS = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard",          icon: LayoutDashboard, path: "/dashboard" },
      { label: "Dispatch Analytics", icon: TrendingUp,       path: "/dispatch/analytics" },
    ],
  },
  {
    label: "Dispatch",
    icon: ClipboardList,
    items: [
      { label: "Dispatch Board",   icon: ClipboardList, path: "/dispatch" },
      { label: "Load Marketplace", icon: Layers,         path: "/dispatch/load-marketplace" },
      { label: "Loads",            icon: Package,        path: "/loads" },
      { label: "Live Tracking",    icon: MapPin,         path: "/tracking" },
    ],
  },
  {
    label: "Drivers",
    icon: Truck,
    items: [
      { label: "Drivers", icon: UserCheck, path: "/drivers" },
      { label: "Contractor Mgmt", icon: Users, path: "/contractors", roles: ["admin", "super_admin"] },
    ],
  },
  {
    label: "Support",
    icon: MessageSquare,
    items: [
      { label: "Messages",        icon: Inbox,        path: "/messages",        badge: "messages" },
      { label: "Support Tickets", icon: TicketCheck,  path: "/support-tickets", badge: "tickets" },
      { label: "Notifications",   icon: Bell,         path: "/notifications",   badge: "notifications" },
      { label: "Documents",       icon: FileText,     path: "/documents" },
      { label: "Incidents",       icon: AlertCircle,  path: "/incidents" },
      { label: "Help Center",     icon: HelpCircle,   path: "/help" },
    ],
  },
];

const CUSTOMER_GROUPS = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/client" },
    ],
  },
  {
    label: "Shipments & Quotes",
    icon: Package,
    items: [
      { label: "Shipments & Quotes", icon: Package, path: "/client/shipments" },
    ],
  },
  {
    label: "Tracking",
    icon: MapPin,
    items: [
      { label: "Live Tracking", icon: MapPin, path: "/client/tracking" },
    ],
  },
  {
    label: "Documents",
    icon: FileText,
    items: [
      { label: "Documents", icon: FileText, path: "/client/documents" },
    ],
  },
  {
    label: "Invoices",
    icon: DollarSign,
    items: [
      { label: "Invoices", icon: FileText, path: "/client/invoices" },
    ],
  },
  {
    label: "Messages",
    icon: MessageSquare,
    items: [
      { label: "Messages", icon: Inbox, path: "/messages", badge: "messages" },
    ],
  },
  {
    label: "Support",
    icon: LifeBuoy,
    items: [
      { label: "Support",     icon: LifeBuoy,    path: "/support-tickets" },
      { label: "Help Center", icon: HelpCircle,  path: "/help" },
    ],
  },
];

const DRIVER_GROUPS = [
  {
    label: "Driver App",
    icon: LayoutDashboard,
    items: [
      { label: "Home",    icon: LayoutDashboard, path: "/driver/dashboard" },
      { label: "Loads",   icon: Package,         path: "/driver/loads" },
      { label: "Scan",    icon: ScanLine,        path: "/driver/scan" },
      { label: "Chat",    icon: MessageSquare,   path: "/driver/messages", badge: "messages" },
      { label: "Profile", icon: UserCheck,       path: "/driver/profile" },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGroups(role) {
  if (role === "dispatcher") return DISPATCHER_GROUPS;
  if (role === "customer") return CUSTOMER_GROUPS;
  if (role === "driver") return DRIVER_GROUPS;
  return ADMIN_GROUPS;
}

function filterItemsByRole(items, userRole) {
  return items.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });
}

function allPaths(groups) {
  return groups.flatMap(g => g.items.map(i => i.path));
}

export default function HastenLayout({ children, user }) {
  const [collapsed, setCollapsed]           = useState(false);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [ticketCount, setTicketCount]       = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const businessRole = user?.businessRole || user?.role || "admin";
  const [activeSection, setActiveSection]   = useState(null);
  const [search, setSearch]             = useState("");
  const [showSearch, setShowSearch]     = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const location = useLocation();

  // Global search keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const role   = businessRole;
  const groups = getGroups(role);

  // Auto-expand the section containing the active route
  useEffect(() => {
    let activeIdx = null;
    groups.forEach((g, idx) => {
      const hasActive = g.items.some(
        i => location.pathname === i.path || location.pathname.startsWith(i.path + "/")
      );
      if (hasActive) activeIdx = idx;
    });
    setActiveSection(activeIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Unread message badge
  useEffect(() => {
    const fetchUnread = () => {
      base44.entities.Message.filter({ is_read: false, sender_role: "driver" }, "-created_date", 500)
        .then(msgs => setUnreadCount(msgs.length))
        .catch(() => {});
    };
    fetchUnread();
    const unsub = base44.entities.Message.subscribe(event => {
      if (event.data?.sender_role === "driver") fetchUnread();
    });
    return () => unsub();
  }, []);

  // Open support ticket badge
  useEffect(() => {
    base44.entities.SupportTicket.filter({ status: "open" }, "-created_date", 100)
      .then(tix => setTicketCount(tix.length))
      .catch(() => {});
    const unsub = base44.entities.SupportTicket.subscribe(() => {
      base44.entities.SupportTicket.filter({ status: "open" }, "-created_date", 100)
        .then(tix => setTicketCount(tix.length)).catch(() => {});
    });
    return () => unsub();
  }, []);

  // Unread notifications badge
  useEffect(() => {
    if (!user?.id) return;
    const fetchUnreadNotifications = () => {
      base44.entities.Notification.filter(
        { user_id: user.id, read: false },
        "-created_date",
        100
      )
        .then(notifs => setUnreadNotifications(notifs.length))
        .catch(() => {});
    };
    fetchUnreadNotifications();
    const unsub = base44.entities.Notification.subscribe(event => {
      if (event.data?.user_id === user.id) fetchUnreadNotifications();
    });
    return () => unsub();
  }, [user?.id]);

  const toggleGroup = (idx) => {
    if (collapsed) return;
    // Toggle: if clicking active section, close it; otherwise open it
    setActiveSection(activeSection === idx ? null : idx);
  };

  const handleLogout = () => base44.auth.logout("/login");

  // Search filter — flatten all items
  const allItems = groups.flatMap(g => g.items);
  const filteredItems = search.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
          <Truck className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-white font-heading font-bold text-lg leading-none">HASTEN</div>
            <div className="text-orange-400 text-xs font-medium">Freight & Transport</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setShowSearch(s => !s)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Search pages"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search bar */}
      {!collapsed && showSearch && (
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pages…"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-orange-500/40"
          />
          {filteredItems.length > 0 && (
            <div className="mt-1 rounded-lg bg-card border border-white/5 overflow-hidden shadow-xl z-50">
              {filteredItems.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path + item.label}
                    to={item.path}
                    onClick={() => { setSearch(""); setShowSearch(false); setMobileOpen(false); }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors ${active ? "text-orange-400" : "text-slate-300"}`}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Grouped nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {groups.map((group, idx) => {
          const filteredItems = filterItemsByRole(group.items, role);
          if (filteredItems.length === 0) return null;
          
          const isOpen = activeSection === idx;
          const hasActive = filteredItems.some(
            i => location.pathname === i.path || location.pathname.startsWith(i.path + "/")
          );

          return (
            <div key={idx}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(idx)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                  collapsed ? "justify-center" : ""
                } ${
                  hasActive
                    ? "text-orange-400 bg-orange-500/8"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
                title={collapsed ? group.label : undefined}
              >
                <group.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </>
                )}
              </button>

              {/* Group items */}
              {(isOpen || collapsed) && (
                <div className={`${collapsed ? "" : "ml-2 border-l border-white/5 pl-2"} space-y-0.5 mt-0.5`}>
                  {filteredItems.map(item => {
                    const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                    return (
                      <Link
                        key={item.path + item.label}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`nav-item relative ${active ? "active" : ""} ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                        {/* Typed badges */}
                         {(() => {
                           const count = item.badge === "messages" ? unreadCount
                             : item.badge === "tickets" ? ticketCount
                             : item.badge === "notifications" ? unreadNotifications
                             : 0;
                           if (!count) return null;
                           if (!collapsed) return (
                             <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[9px] font-bold">
                               {count > 99 ? "99+" : count}
                             </span>
                           );
                           return <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />;
                         })()}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/5 p-3 flex-shrink-0 space-y-1">
        <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-400 text-xs font-bold">
              {(user?.full_name || "U").charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.full_name || "User"}</div>
              <div className="text-slate-500 text-xs capitalize">{role}</div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`nav-item w-full ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {globalSearchOpen && <GlobalSearch onClose={() => setGlobalSearchOpen(false)} />}
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col relative transition-all duration-300 flex-shrink-0 border-r border-white/5"
        style={{ width: collapsed ? "64px" : "228px", background: "hsl(var(--sidebar-background))" }}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center z-10 shadow-lg"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="w-3 h-3 text-white" /> : <ChevronLeft className="w-3 h-3 text-white" />}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 border-r border-white/5 overflow-y-auto" style={{ background: "hsl(var(--sidebar-background))" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0" style={{ background: "hsl(var(--card))" }}>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-400 text-xs">System Online</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Link
              to="/help"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Help
            </Link>
            <button
              onClick={() => setGlobalSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-green-500/10 text-slate-400 hover:text-green-400 text-xs font-medium transition-colors"
              title="Search (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <span className="text-slate-600 text-[10px]">⌘K</span>
            </button>
            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[9px] font-bold">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <span className="text-orange-400 text-xs font-bold">{(user?.full_name || "U").charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">{children}</main>
      </div>
    </div>
  );
}