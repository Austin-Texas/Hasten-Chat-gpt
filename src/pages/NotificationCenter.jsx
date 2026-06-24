import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Bell, MessageSquare, FileText, Truck, Package, CheckCircle,
  AlertCircle, Clock, Loader2, RefreshCw, Filter
} from "lucide-react";
import { Link } from "react-router-dom";

// ── Config ────────────────────────────────────────────────────────────────────
const NOTIF_TYPES = [
  { key: "all",          label: "All",             icon: Bell },
  { key: "message",      label: "Messages",        icon: MessageSquare },
  { key: "support",      label: "Support",         icon: AlertCircle },
  { key: "document",     label: "Documents",       icon: FileText },
  { key: "load",         label: "Load Updates",    icon: Package },
  { key: "driver",       label: "Driver Status",   icon: Truck },
];

function notifIcon(type) {
  const map = {
    message: { icon: MessageSquare, cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    support: { icon: AlertCircle,   cls: "bg-red-500/10 border-red-500/20 text-red-400" },
    document: { icon: FileText,     cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    load:    { icon: Package,       cls: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" },
    driver:  { icon: Truck,         cls: "bg-green-500/10 border-green-500/20 text-green-400" },
    pod_uploaded: { icon: FileText, cls: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
  };
  return map[type] || { icon: Bell, cls: "bg-white/5 border-white/10 text-slate-400" };
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Notification Item ──────────────────────────────────────────────────────────
function NotifItem({ item, onRead }) {
  const cfg = notifIcon(item.type);
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer hover:bg-white/3 ${
        !item.read ? "border-orange-500/15 bg-orange-500/3" : "border-white/5 bg-transparent"
      }`}
      onClick={() => onRead(item)}
    >
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${cfg.cls}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold ${!item.read ? "text-white" : "text-slate-300"}`}>
              {item.title}
            </div>
            <div className="text-slate-500 text-xs mt-0.5 truncate">{item.message}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!item.read && <div className="w-2 h-2 rounded-full bg-orange-500" />}
            <span className="text-slate-600 text-[10px]">{timeAgo(item.created_date)}</span>
          </div>
        </div>
        {item.action_url && (
          <Link
            to={item.action_url}
            onClick={e => e.stopPropagation()}
            className="mt-1.5 inline-flex items-center gap-1 text-orange-400 text-xs font-medium hover:text-orange-300 transition-colors"
          >
            {item.cta_label || 'View'} →
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotificationCenter({ user }) {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setType]     = useState("all");

  const markRead = async (item) => {
    try {
      await base44.entities.Notification.update(item.id, {
        read: true,
        read_at: new Date().toISOString()
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, read: true } : i));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      for (const item of items.filter(i => !i.read)) {
        await base44.entities.Notification.update(item.id, {
          read: true,
          read_at: new Date().toISOString()
        });
      }
      setItems(prev => prev.map(i => ({ ...i, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const notifications = await base44.entities.Notification.filter(
          { user_id: user.id },
          "-created_date",
          100
        );
        setItems(notifications || []);
      } catch (err) { console.error('Error loading notifications:', err); }
      finally { setLoading(false); }
    };
    load();

    // Subscribe to real-time updates
    const unsubscribe = base44.entities.Notification.subscribe(event => {
      if (event.data?.user_id === user?.id) {
        if (event.type === 'create') {
          setItems(prev => [event.data, ...prev]);
        } else if (event.type === 'update') {
          setItems(prev => prev.map(i => i.id === event.data.id ? event.data : i));
        } else if (event.type === 'delete') {
          setItems(prev => prev.filter(i => i.id !== event.data.id));
        }
      }
    });

    return unsubscribe;
  }, [user?.id]);

  const filtered = items
    .filter(i => typeFilter === "all" || i.type === typeFilter)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const unreadCount = items.filter(i => !i.read).length;

  return (
    <div className="space-y-5 animate-slide-up max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">{unreadCount}</span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Messages, tickets, document uploads, and system events</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* Type filters */}
      <div className="flex gap-1.5 flex-wrap">
        {NOTIF_TYPES.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setType(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${typeFilter === key ? "bg-orange-500 text-white" : "bg-white/5 border border-white/5 text-slate-400 hover:text-white"}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No notifications</p>
          <p className="text-slate-600 text-sm mt-1">New activity will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <NotifItem key={item._id} item={item} onRead={markRead} />
          ))}
        </div>
      )}
    </div>
  );
}