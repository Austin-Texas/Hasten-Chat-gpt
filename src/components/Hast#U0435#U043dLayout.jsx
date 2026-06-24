import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Truck, MapPin, FileText, MessageSquare,
  DollarSign, Users, Settings, LogOut, Bell, Menu, X,
  ChevronDown, Package, ClipboardList, Wrench, BarChart3,
  Shield, UserCheck, Building2, Calculator, Route
} from "lucide-react";

const ROLE_MENUS = {
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Dispatch Board", icon: ClipboardList, path: "/dispatch" },
    { label: "Loads", icon: Package, path: "/loads" },
    { label: "Fleet", icon: Truck, path: "/fleet" },
    { label: "Drivers", icon: UserCheck, path: "/drivers" },
    { label: "Live Tracking", icon: MapPin, path: "/tracking" },
    { label: "CRM", icon: Building2, path: "/crm" },
    { label: "Finance", icon: Calculator, path: "/finance" },
    { label: "Manifests", icon: Route, path: "/manifests" },
    { label: "Documents", icon: FileText, path: "/documents" },
    { label: "Maintenance", icon: Wrench, path: "/maintenance" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Support", icon: Shield, path: "/support" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ],
  dispatcher: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Dispatch Board", icon: ClipboardList, path: "/dispatch" },
    { label: "Loads", icon: Package, path: "/loads" },
    { label: "Drivers", icon: UserCheck, path: "/drivers" },
    { label: "Live Tracking", icon: MapPin, path: "/tracking" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Documents", icon: FileText, path: "/documents" },
  ],
  driver: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/driver/dashboard" },
    { label: "My Loads", icon: Package, path: "/driver/loads" },
    { label: "Navigation", icon: MapPin, path: "/driver/map" },
    { label: "Documents", icon: FileText, path: "/driver/documents" },
    { label: "Messages", icon: MessageSquare, path: "/driver/messages" },
    { label: "Earnings", icon: DollarSign, path: "/driver/earnings" },
  ],
  broker: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/broker/dashboard" },
    { label: "Book Load", icon: Package, path: "/broker/loads" },
    { label: "Tracking", icon: MapPin, path: "/broker/tracking" },
    { label: "Documents", icon: FileText, path: "/broker/documents" },
    { label: "Invoices", icon: DollarSign, path: "/broker/invoices" },
  ],
  client: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/client/dashboard" },
    { label: "Shipments", icon: Package, path: "/client/shipments" },
    { label: "Track", icon: MapPin, path: "/client/tracking" },
    { label: "Invoices", icon: DollarSign, path: "/client/invoices" },
    { label: "Support", icon: Shield, path: "/client/support" },
  ],
};

export default function HastenLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || "admin";
  const menuItems = ROLE_MENUS[role] || ROLE_MENUS.admin;

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
          <Truck className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <div>
            <div className="text-white font-heading font-bold text-lg leading-none">HASTEN</div>
            <div className="text-orange-400 text-xs font-medium">Freight & Transport</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`nav-item ${active ? "active" : ""}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/5 p-3">
        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${sidebarOpen ? "" : "justify-center"}`}>
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-400 text-xs font-bold">
              {(user?.full_name || "U").charAt(0).toUpperCase()}
            </span>
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.full_name || "User"}</div>
              <div className="text-slate-500 text-xs capitalize">{role}</div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="nav-item w-full mt-1"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-300 flex-shrink-0 border-r border-white/5`}
        style={{
          width: sidebarOpen ? "220px" : "64px",
          background: "hsl(var(--sidebar-background))"
        }}
      >
        <SidebarContent />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center z-10 hidden lg:flex"
          style={{ left: sidebarOpen ? "208px" : "52px" }}
          aria-label="Toggle sidebar"
        >
          <ChevronDown className={`w-3 h-3 text-white transition-transform ${sidebarOpen ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 border-r border-white/5" style={{ background: "hsl(var(--sidebar-background))" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0" style={{ background: "hsl(var(--card))" }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-400 text-xs">System Online</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
            </button>
            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <span className="text-orange-400 text-xs font-bold">
                {(user?.full_name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}