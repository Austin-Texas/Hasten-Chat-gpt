import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  TicketIcon, Search, Filter, ChevronDown, ChevronUp, Loader2,
  AlertCircle, Clock, CheckCircle, XCircle, RefreshCw, User,
  Truck, Package, Building2, Paperclip, Send, Tag, ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/hasten/StatusBadge";

// ── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open:        { label: "Open",        icon: AlertCircle,  cls: "bg-red-500/10 border-red-500/25 text-red-400" },
  in_progress: { label: "In Progress", icon: RefreshCw,    cls: "bg-blue-500/10 border-blue-500/25 text-blue-400" },
  waiting:     { label: "Waiting",     icon: Clock,        cls: "bg-amber-500/10 border-amber-500/25 text-amber-400" },
  resolved:    { label: "Resolved",    icon: CheckCircle,  cls: "bg-green-500/10 border-green-500/25 text-green-400" },
  closed:      { label: "Closed",      icon: XCircle,      cls: "bg-slate-500/10 border-slate-500/25 text-slate-400" },
};

const PRIORITY_CONFIG = {
  low:      { cls: "bg-slate-500/10 border-slate-500/20 text-slate-400" },
  medium:   { cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  high:     { cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  critical: { cls: "bg-red-500/10 border-red-500/20 text-red-400" },
};

const CATEGORIES = ["all", "tracking", "billing", "dispatch", "driver", "technical", "other"];
const STATUS_FILTERS = ["all", "open", "in_progress", "waiting", "resolved", "closed"];
const PRIORITY_FILTERS = ["all", "critical", "high", "medium", "low"];

// ── Ticket Row ────────────────────────────────────────────────────────────────
function TicketRow({ ticket, drivers, loads, active, onClick }) {
  const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StIcon = st.icon;
  const pr = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const driver = ticket.requester_id ? drivers[ticket.requester_id] : null;
  const load   = ticket.load_id ? loads[ticket.load_id] : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-4 border-b border-white/5 transition-all ${
        active ? "bg-orange-500/8 border-l-2 border-l-orange-500" : "hover:bg-white/3 border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${st.cls}`}>
          <StIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white font-semibold text-sm truncate">{ticket.subject}</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border flex-shrink-0 ${pr.cls}`}>
              {ticket.priority}
            </span>
          </div>
          <div className="text-slate-500 text-xs truncate mb-1.5">{ticket.description}</div>
          <div className="flex items-center gap-3 flex-wrap">
            {driver && (
              <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                <User className="w-2.5 h-2.5" /> {driver.first_name} {driver.last_name}
              </span>
            )}
            {!driver && ticket.requester_name && (
              <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                <User className="w-2.5 h-2.5" /> {ticket.requester_name}
              </span>
            )}
            {load && (
              <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                <Package className="w-2.5 h-2.5" /> {load.load_number || load.id?.slice(-6)}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${st.cls}`}>
              {st.label}
            </span>
            <span className="text-slate-600 text-[10px] ml-auto">
              {ticket.created_date ? new Date(ticket.created_date).toLocaleDateString() : ""}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Ticket Detail ─────────────────────────────────────────────────────────────
function TicketDetail({ ticket, drivers, loads, user, onUpdate }) {
  const [replyText, setReplyText]   = useState("");
  const [isNote, setIsNote]         = useState(false);
  const [sending, setSending]       = useState(false);
  const [notes, setNotes]           = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StIcon = st.icon;
  const driver = ticket.requester_id ? drivers[ticket.requester_id] : null;
  const load   = ticket.load_id     ? loads[ticket.load_id]         : null;

  useEffect(() => {
    if (!ticket.id) return;
    setLoadingNotes(true);
    base44.entities.Manifest.filter({ load_id: `ticket-${ticket.id}` }, "created_date", 50)
      .then(setNotes)
      .catch(console.error)
      .finally(() => setLoadingNotes(false));
  }, [ticket.id]);

  const handleStatusChange = async (newStatus) => {
    await base44.entities.SupportTicket.update(ticket.id, { status: newStatus });
    await base44.entities.Manifest.create({
      load_id: `ticket-${ticket.id}`,
      event_type: "note_added",
      event_title: `Status changed to ${newStatus}`,
      event_timestamp: new Date().toISOString(),
      performed_by: user?.full_name || "Dispatcher",
      performed_by_role: "dispatcher",
      is_system_event: true,
    }).catch(() => {});
    onUpdate({ ...ticket, status: newStatus });
  };

  const handleAssign = async () => {
    const name = user?.full_name || "Dispatcher";
    await base44.entities.SupportTicket.update(ticket.id, { assigned_to: name });
    await base44.entities.Manifest.create({
      load_id: `ticket-${ticket.id}`,
      event_type: "note_added",
      event_title: `Ticket assigned to ${name}`,
      event_timestamp: new Date().toISOString(),
      performed_by: name,
      performed_by_role: "dispatcher",
      is_system_event: true,
    }).catch(() => {});
    onUpdate({ ...ticket, assigned_to: name });
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const entry = await base44.entities.Manifest.create({
        load_id: `ticket-${ticket.id}`,
        event_type: "note_added",
        event_title: isNote ? "Internal Note" : "Reply",
        event_description: replyText.trim(),
        event_timestamp: new Date().toISOString(),
        performed_by: user?.full_name || "Dispatcher",
        performed_by_role: "dispatcher",
        is_system_event: isNote,
      });
      setNotes(prev => [...prev, entry]);
      setReplyText("");
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex-shrink-0" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${st.cls}`}>
                <StIcon className="w-3 h-3" /> {st.label}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${PRIORITY_CONFIG[ticket.priority]?.cls || PRIORITY_CONFIG.medium.cls}`}>
                {ticket.priority}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-medium capitalize">{ticket.category}</span>
            </div>
            <h2 className="text-white font-bold text-base mt-2 leading-snug">{ticket.subject}</h2>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 flex-wrap text-xs">
          {driver && (
            <Link to={`/drivers/${ticket.requester_id}`} className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 transition-colors">
              <User className="w-3 h-3" /> {driver.first_name} {driver.last_name}
            </Link>
          )}
          {!driver && ticket.requester_name && (
            <span className="flex items-center gap-1.5 text-slate-400"><User className="w-3 h-3" /> {ticket.requester_name}</span>
          )}
          {load && (
            <Link to={`/loads/${ticket.load_id}`} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors">
              <Package className="w-3 h-3" /> {load.load_number || load.id?.slice(-6)}
            </Link>
          )}
          {ticket.assigned_to && (
            <span className="flex items-center gap-1.5 text-slate-400"><Tag className="w-3 h-3" /> {ticket.assigned_to}</span>
          )}
          <span className="text-slate-600">{ticket.created_date ? new Date(ticket.created_date).toLocaleString() : ""}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Status dropdown */}
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            ticket.status !== key && (
              <button
                key={key}
                onClick={() => handleStatusChange(key)}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all hover:scale-105 ${cfg.cls}`}
              >
                {cfg.label}
              </button>
            )
          ))}
          {!ticket.assigned_to && (
            <button
              onClick={handleAssign}
              className="px-2.5 py-1 rounded-lg border border-orange-500/25 bg-orange-500/10 text-orange-400 text-[10px] font-bold hover:bg-orange-500/20 transition-colors"
            >
              Assign to me
            </button>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {/* Original message */}
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="text-slate-500 text-xs mb-2 font-semibold uppercase tracking-wider">Original Request</div>
          <p className="text-slate-200 text-sm leading-relaxed">{ticket.description}</p>
          {ticket.requester_email && (
            <div className="mt-2 text-slate-500 text-xs">{ticket.requester_email}</div>
          )}
        </div>

        {/* Notes / replies */}
        {loadingNotes ? (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-4"><Loader2 className="w-3 h-3 animate-spin" /> Loading activity…</div>
        ) : notes.map(note => (
          <div key={note.id} className={`rounded-xl border p-3.5 ${
            note.is_system_event ? "border-white/5 bg-white/2" : "border-orange-500/15 bg-orange-500/5"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold ${note.is_system_event ? "text-slate-500" : "text-orange-400"}`}>
                {note.is_system_event ? "⚙ System" : `💬 ${note.performed_by}`}
                {note.event_title === "Internal Note" && " · Internal Note"}
              </span>
              <span className="text-slate-600 text-[10px]">{new Date(note.event_timestamp).toLocaleString()}</span>
            </div>
            {note.event_description && (
              <p className="text-slate-300 text-sm">{note.event_description}</p>
            )}
            {!note.event_description && (
              <p className="text-slate-500 text-xs italic">{note.event_title}</p>
            )}
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-white/5 space-y-2.5" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNote(false)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${!isNote ? "bg-orange-500/15 border-orange-500/25 text-orange-400" : "bg-white/5 border-white/10 text-slate-400"}`}
          >
            Reply
          </button>
          <button
            onClick={() => setIsNote(true)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${isNote ? "bg-blue-500/15 border-blue-500/25 text-blue-400" : "bg-white/5 border-white/10 text-slate-400"}`}
          >
            Internal Note
          </button>
        </div>
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={2}
            placeholder={isNote ? "Add internal note…" : "Reply to requester…"}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 resize-none"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            className="px-4 rounded-xl disabled:opacity-40 flex items-center gap-1.5 text-sm font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#EA580C,#F97316)" }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SupportTickets({ user }) {
  const [tickets, setTickets]       = useState([]);
  const [drivers, setDrivers]       = useState({});
  const [loads, setLoads]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [priorityFilter, setPriority] = useState("all");
  const [categoryFilter, setCategory] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.SupportTicket.list("-created_date", 200),
      base44.entities.Driver.list("-created_date", 500),
      base44.entities.Load.list("-created_date", 200),
    ]).then(([tix, drvs, lds]) => {
      setTickets(tix);
      const dm = {}; drvs.forEach(d => { dm[d.id] = d; if (d.user_id) dm[d.user_id] = d; });
      setDrivers(dm);
      const lm = {}; lds.forEach(l => { lm[l.id] = l; });
      setLoads(lm);
      if (tix.length > 0) setSelected(tix[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const updateTicket = (updated) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelected(updated);
  };

  const filtered = tickets.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject?.toLowerCase().includes(q) &&
          !t.description?.toLowerCase().includes(q) &&
          !t.requester_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openCount     = tickets.filter(t => t.status === "open").length;
  const criticalCount = tickets.filter(t => t.priority === "critical" && t.status !== "closed").length;

  return (
    <div className="flex h-full -m-4 lg:-m-6 animate-slide-up overflow-hidden">

      {/* ── LEFT: Ticket List ── */}
      <div className="w-96 flex-shrink-0 flex flex-col border-r border-white/5 overflow-hidden" style={{ background: "hsl(var(--sidebar-background))" }}>
        {/* Header */}
        <div className="p-4 border-b border-white/5 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-white font-heading font-bold text-lg">Support Tickets</h1>
            {openCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-[10px] font-bold">{openCount} open</span>
            )}
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-[10px] font-bold animate-pulse">{criticalCount} critical</span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-orange-500/40"
            />
          </div>

          {/* Filters */}
          <div className="space-y-1.5">
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {STATUS_FILTERS.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all ${statusFilter === s ? "bg-orange-500 text-white" : "bg-white/5 border border-white/5 text-slate-500 hover:text-white"}`}>
                  {s === "all" ? "All" : s.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {PRIORITY_FILTERS.map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all ${priorityFilter === p ? "bg-orange-500 text-white" : "bg-white/5 border border-white/5 text-slate-500 hover:text-white"}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all ${categoryFilter === c ? "bg-orange-500 text-white" : "bg-white/5 border border-white/5 text-slate-500 hover:text-white"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No tickets found</p>
            </div>
          ) : filtered.map(t => (
            <TicketRow
              key={t.id} ticket={t} drivers={drivers} loads={loads}
              active={selected?.id === t.id}
              onClick={() => setSelected(t)}
            />
          ))}
        </div>
      </div>

      {/* ── RIGHT: Detail ── */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <TicketDetail
            ticket={selected} drivers={drivers} loads={loads}
            user={user} onUpdate={updateTicket}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Select a ticket to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}