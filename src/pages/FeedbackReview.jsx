import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Star, Search, Loader2, Eye, CheckCircle, RefreshCw,
  ArrowRight, MessageSquare, AlertCircle, Lightbulb, Zap, Bug
} from "lucide-react";
import { Link } from "react-router-dom";

// ── Config ────────────────────────────────────────────────────────────────────
const FEEDBACK_STATUS = {
  open:     { label: "New",      cls: "bg-red-500/10 border-red-500/20 text-red-400" },
  reviewed: { label: "Reviewed", cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  planned:  { label: "Planned",  cls: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
  resolved: { label: "Resolved", cls: "bg-green-500/10 border-green-500/20 text-green-400" },
};

const CATEGORY_ICONS = {
  tracking: "📍", billing: "💳", dispatch: "📋", driver: "🚛",
  technical: "⚙️", other: "💬",
};

const CATEGORY_FILTERS = ["all", "tracking", "billing", "dispatch", "driver", "technical", "other"];
const STATUS_FILTERS   = ["all", "open", "reviewed", "planned", "resolved"];

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
      ))}
      <span className="text-slate-500 text-xs ml-1">{rating}/5</span>
    </div>
  );
}

// ── Feedback Card ─────────────────────────────────────────────────────────────
function FeedbackCard({ ticket, drivers, onStatusChange, onConvert }) {
  const [expanded, setExpanded] = useState(false);
  const status = FEEDBACK_STATUS[ticket.status] || FEEDBACK_STATUS.open;
  const driver = ticket.requester_id ? drivers[ticket.requester_id] : null;
  const rating = parseInt(ticket.ticket_number?.replace("RATING-", "") || "0");
  const catIcon = CATEGORY_ICONS[ticket.category] || "💬";

  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-xl flex-shrink-0">
            {catIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-white font-semibold text-sm">{ticket.subject}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  {driver ? `${driver.first_name} ${driver.last_name}` : ticket.requester_name || "Unknown"} ·{" "}
                  {ticket.created_date ? new Date(ticket.created_date).toLocaleDateString() : ""}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${status.cls}`}>
                {status.label}
              </span>
            </div>
            {rating > 0 && (
              <div className="mt-1.5">
                <StarRow rating={rating} />
              </div>
            )}
          </div>
        </div>

        {/* Description preview */}
        <div className={`text-slate-400 text-sm mt-3 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {ticket.description}
        </div>

        {ticket.description && ticket.description.length > 120 && (
          <button onClick={() => setExpanded(e => !e)} className="text-orange-400 text-xs font-medium mt-1 hover:text-orange-300 transition-colors">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {/* Screenshot */}
        {ticket.resolution && ticket.resolution.startsWith("http") && (
          <div className="mt-3">
            <a href={ticket.resolution} target="_blank" rel="noopener noreferrer">
              <img src={ticket.resolution} alt="Screenshot" className="w-full max-h-36 object-cover rounded-xl border border-white/10 hover:opacity-80 transition-opacity" />
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap border-t border-white/5 pt-3">
        {/* Status transitions */}
        {Object.entries(FEEDBACK_STATUS)
          .filter(([key]) => key !== ticket.status)
          .map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => onStatusChange(ticket.id, key)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all hover:scale-105 ${cfg.cls}`}
            >
              → {cfg.label}
            </button>
          ))
        }
        {/* Convert to ticket */}
        {ticket.status !== "resolved" && (
          <button
            onClick={() => onConvert(ticket)}
            className="px-2.5 py-1 rounded-lg border border-purple-500/25 bg-purple-500/10 text-purple-400 text-[10px] font-bold hover:bg-purple-500/20 transition-colors ml-auto"
          >
            + Create Ticket
          </button>
        )}
        {driver && (
          <Link
            to={`/drivers/${ticket.requester_id}`}
            className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-400 text-[10px] font-bold hover:text-white transition-colors"
          >
            Driver Profile
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FeedbackReview({ user }) {
  const [feedback, setFeedback]   = useState([]);
  const [drivers, setDrivers]     = useState({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [catFilter, setCat]       = useState("all");
  const [statusFilter, setStatus] = useState("all");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    Promise.all([
      // Feedback items are SupportTickets with requester_email starting "feedback" or a specific tag
      // Since the driver feedback form uses the SupportTicket entity with category = any and subject includes "Feedback"
      // We filter all tickets where the subject or ticket_number indicates feedback
      base44.entities.SupportTicket.list("-created_date", 300),
      base44.entities.Driver.list("-created_date", 500),
    ]).then(([tix, drvs]) => {
      // Feedback items: tickets from driver feedback form have ticket_number starting with FEEDBACK- or RATING-
      const fb = tix.filter(t =>
        t.ticket_number?.startsWith("FEEDBACK-") ||
        t.ticket_number?.startsWith("RATING-") ||
        t.subject?.toLowerCase().includes("feedback") ||
        t.subject?.toLowerCase().includes("app feedback") ||
        t.subject?.toLowerCase().includes("feature request") ||
        t.subject?.toLowerCase().includes("bug report")
      );
      setFeedback(fb);
      const dm = {}; drvs.forEach(d => { dm[d.id] = d; if (d.user_id) dm[d.user_id] = d; });
      setDrivers(dm);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (ticketId, newStatus) => {
    await base44.entities.SupportTicket.update(ticketId, { status: newStatus });
    setFeedback(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
  };

  const handleConvert = async (ticket) => {
    setConverting(true);
    try {
      const newTicket = await base44.entities.SupportTicket.create({
        ticket_number: `TKT-${Date.now().toString(36).toUpperCase()}`,
        subject: `[From Feedback] ${ticket.subject}`,
        description: ticket.description,
        category: ticket.category,
        priority: "medium",
        status: "open",
        requester_id: ticket.requester_id,
        requester_name: ticket.requester_name,
        requester_email: ticket.requester_email,
      });
      await base44.entities.SupportTicket.update(ticket.id, { status: "planned" });
      setFeedback(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "planned" } : t));
      alert(`Support ticket created: ${newTicket.ticket_number}`);
    } catch (err) { console.error(err); }
    finally { setConverting(false); }
  };

  const filtered = feedback.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q) &&
          !t.requester_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const newCount = feedback.filter(t => t.status === "open").length;
  const avgRating = (() => {
    const rated = feedback.filter(t => t.ticket_number?.startsWith("RATING-"));
    if (!rated.length) return null;
    const sum = rated.reduce((s, t) => s + parseInt(t.ticket_number.replace("RATING-","") || 0), 0);
    return (sum / rated.length).toFixed(1);
  })();

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400" /> Driver Feedback
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">App feedback and feature requests from drivers</p>
        </div>
        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
              {newCount} new
            </div>
          )}
          {avgRating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-amber-400 font-bold text-sm">{avgRating}</span>
              <span className="text-slate-500 text-xs">avg</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Feedback",  value: feedback.length,                                      color: "text-white" },
          { label: "New / Unreviewed", value: feedback.filter(t => t.status === "open").length,    color: "text-red-400" },
          { label: "In Progress",     value: feedback.filter(t => t.status === "reviewed").length, color: "text-blue-400" },
          { label: "Resolved",        value: feedback.filter(t => t.status === "resolved").length, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl border border-white/5 p-4">
            <div className={`font-bold text-2xl ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search feedback…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? "bg-orange-500 text-white" : "bg-white/5 border border-white/5 text-slate-400"}`}>
              {s === "all" ? "All Status" : FEEDBACK_STATUS[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORY_FILTERS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${catFilter === c ? "bg-orange-500 text-white" : "bg-white/5 border border-white/5 text-slate-400"}`}>
              {c === "all" ? "All Categories" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Star className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No feedback submissions yet</p>
          <p className="text-slate-600 text-sm mt-1">Driver feedback submitted via the app will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(t => (
            <FeedbackCard
              key={t.id} ticket={t} drivers={drivers}
              onStatusChange={handleStatusChange}
              onConvert={handleConvert}
            />
          ))}
        </div>
      )}
    </div>
  );
}