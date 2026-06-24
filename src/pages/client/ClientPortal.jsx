import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, MapPin, DollarSign, MessageSquare, LogOut, Menu, ChevronLeft, Folder, LayoutDashboard, LifeBuoy } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ClientDashboard from "@/components/client/ClientDashboard";
import ClientTracking from "@/components/client/ClientTracking";
import ClientInvoices from "@/components/client/ClientInvoices";
import ClientDocuments from "@/components/client/ClientDocuments";
import ClientShipments from "@/components/client/ClientShipments";
import ClientSupport from "@/components/client/ClientSupport";
import ClientChat from "@/components/client/ClientChat";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/client" },
  { label: "Shipments & Quotes", icon: Package, path: "/client/shipments" },
  { label: "Tracking", icon: MapPin, path: "/client/tracking" },
  { label: "Documents", icon: Folder, path: "/client/documents" },
  { label: "Invoices", icon: DollarSign, path: "/client/invoices" },
  { label: "Messages", icon: MessageSquare, path: "/client/chat" },
  { label: "Support", icon: LifeBuoy, path: "/client/support" },
];

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
    ])
      .then(async (currentUser) => {
        setUser(currentUser);
        
        // Fetch client profile
        const clients = await base44.entities.Client.filter({ 
          user_id: currentUser.id 
        }, "-created_date", 1);
        
        if (clients.length > 0) {
          setClient(clients[0]);
        }
      })
      .catch(err => {
        console.error("Auth error:", err);
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Live unread chat count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      base44.entities.Message.filter({ 
        recipient_id: user.id, 
        is_read: false 
      }, "-created_date", 100)
        .then(msgs => setUnreadCount(msgs.length))
        .catch(() => {});
    };
    fetchUnread();
    const unsub = base44.entities.Message.subscribe(() => fetchUnread());
    return () => unsub();
  }, [user]);

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center animate-pulse-glow">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div className="text-white font-heading font-bold text-xl">HASTEN</div>
          <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const currentTab = location.pathname.split("/client")[1] || "";
  const activeItem = NAV_ITEMS.find(item => item.path === `/client${currentTab}`) || NAV_ITEMS[0];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
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
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                  active ? "bg-green-500/12 text-green-400 border-l-2 border-green-500" : "text-slate-400 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.path === "/client/chat" && unreadCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-black text-[9px] font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
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
              <div className="text-white text-sm font-medium truncate">{client?.company_name || "Client"}</div>
              <div className="text-slate-500 text-xs">{client?.customer_type || "customer"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 border-r border-white/5 flex flex-col" style={{ background: "hsl(var(--sidebar-background))" }}>
            <div className="p-3 border-b border-white/5">
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/5">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === item.path ? "bg-orange-500/12 text-orange-400" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0" style={{ background: "hsl(var(--card))" }}>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-400 text-xs">System Online</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right">
              <div className="text-white text-sm font-medium">{client?.company_name || "Client"}</div>
              <div className="text-slate-500 text-xs">{client?.contact_name || user?.full_name}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <span className="text-green-400 text-xs font-bold">{(client?.company_name || "C").charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {location.pathname === "/client" && <ClientDashboard client={client} user={user} />}
          {(location.pathname === "/client/shipments" || location.pathname === "/client/booking") && <ClientShipments client={client} user={user} />}
          {location.pathname === "/client/tracking" && <ClientTracking client={client} />}
          {location.pathname === "/client/invoices" && <ClientInvoices client={client} />}
          {location.pathname === "/client/documents" && <ClientDocuments client={client} user={user} />}
          {location.pathname === "/client/support" && <ClientSupport client={client} user={user} />}
          {location.pathname === "/client/chat" && <ClientChat client={client} user={user} />}
        </main>
      </div>
    </div>
  );
}