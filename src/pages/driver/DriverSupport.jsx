import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Phone, Mail, MessageSquare, Plus,
  Loader2, CheckCircle, AlertCircle, ChevronRight, FileText, HelpCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const SUPPORT_CONTACTS = {
  phone:    "tel:+18005551234",
  email:    "mailto:support@hasten.io",
  whatsapp: "https://wa.me/18005551234",
};

const PRIORITY_OPTIONS = [
  { value: "low",      label: "Low — General question" },
  { value: "medium",   label: "Medium — Needs attention" },
  { value: "high",     label: "High — Urgent issue" },
  { value: "critical", label: "Critical — Load stopped / safety" },
];

export default function DriverSupport({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver]         = useState(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [form, setForm]             = useState({ subject: "", description: "", priority: "medium", category: "dispatch" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");
  const [tickets, setTickets]       = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1)
      .then(drivers => { if (drivers.length) setDriver(drivers[0]); })
      .catch(console.error);

    base44.entities.SupportTicket.filter({ requester_id: user.id }, "-created_date", 10)
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, [user?.id]);

  const handleSubmitTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const ticket = await base44.entities.SupportTicket.create({
        ticket_number: `TK-${Date.now().toString().slice(-6)}`,
        status: "open",
        priority: form.priority,
        category: form.category,
        subject: form.subject,
        description: form.description,
        requester_id: user?.id || "",
        requester_name: driver ? `${driver.first_name} ${driver.last_name}` : user?.full_name || "",
        requester_email: driver?.email || user?.email || "",
      });

      // Manifest audit
      await base44.entities.Manifest.create({
        load_id: driver?.current_load_id || "no-load",
        event_type: "note_added",
        event_title: "Support Ticket Created",
        event_description: form.subject,
        event_timestamp: new Date().toISOString(),
        performed_by: driver ? `${driver.first_name} ${driver.last_name}` : user?.full_name || "",
        performed_by_role: "driver",
        is_system_event: true,
      }).catch(() => {});

      setTickets(prev => [ticket, ...prev]);
      setSubmitted(true);
      setShowTicketForm(false);
      setForm({ subject: "", description: "", priority: "medium", category: "dispatch" });
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error(err);
      setError("Failed to create ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = {
    open:        "bg-blue-500/10 border-blue-500/20 text-blue-400",
    in_progress: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    waiting:     "bg-amber-500/10 border-amber-500/20 text-amber-400",
    resolved:    "bg-green-500/10 border-green-500/20 text-green-400",
    closed:      "bg-slate-500/10 border-slate-500/20 text-slate-500",
  };

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <button onClick={() => navigate("/driver/profile")} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">Contact Support</h1>
        <div className="w-9" />
      </div>

      {submitted && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 animate-slide-up">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span className="text-green-400 text-sm font-medium">Support ticket created! We'll respond within 24 hours.</span>
        </div>
      )}

      {/* Quick contact cards */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-white font-semibold text-sm">Reach Us Directly</h2>
        </div>
        <div className="divide-y divide-white/5">
          <a
            href={SUPPORT_CONTACTS.phone}
            className="flex items-center gap-4 p-4 hover:bg-white/3 active:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">Call Support</div>
              <div className="text-slate-500 text-xs">Mon–Fri 8am–8pm EST</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </a>

          <a
            href={SUPPORT_CONTACTS.email}
            className="flex items-center gap-4 p-4 hover:bg-white/3 active:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">Email Support</div>
              <div className="text-slate-500 text-xs">support@hasten.io · replies within 24h</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </a>

          <a
            href={SUPPORT_CONTACTS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 hover:bg-white/3 active:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">WhatsApp</div>
              <div className="text-slate-500 text-xs">Chat with support instantly</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </a>

          <Link
            to="/driver/messages"
            className="flex items-center gap-4 p-4 hover:bg-white/3 active:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">Message Dispatcher</div>
              <div className="text-slate-500 text-xs">In-app chat with your dispatcher</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Link>
        </div>
      </div>

      {/* Create Ticket */}
      <button
        onClick={() => setShowTicketForm(!showTicketForm)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, rgba(234,88,12,0.08), rgba(249,115,22,0.04))",
          borderColor: "rgba(234,88,12,0.25)",
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
          <Plus className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-white font-semibold text-sm">Create Support Ticket</div>
          <div className="text-slate-500 text-xs">Report an issue or ask a question</div>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${showTicketForm ? "rotate-90" : ""}`} />
      </button>

      {/* Ticket Form */}
      {showTicketForm && (
        <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-4 animate-slide-up">
          <h3 className="text-white font-semibold text-sm">New Support Ticket</h3>

          {/* Priority */}
          <div>
            <label className="block text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">Priority</label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  className={`p-2.5 rounded-xl border text-xs text-left font-medium transition-all active:scale-95 ${
                    form.priority === p.value
                      ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                      : "border-white/5 bg-white/3 text-slate-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => { setForm(f => ({ ...f, subject: e.target.value })); setError(""); }}
              placeholder="Brief summary of your issue"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">Description *</label>
            <textarea
              value={form.description}
              onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setError(""); }}
              placeholder="Describe your issue in detail. Include load numbers, dates, or any relevant information."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setShowTicketForm(false); setError(""); }}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitTicket}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Ticket"}
            </button>
          </div>
        </div>
      )}

      {/* Past tickets */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">My Tickets</h2>
          <span className="text-slate-600 text-xs">{tickets.length} total</span>
        </div>
        {loadingTickets ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-slate-600 animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">No tickets yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tickets.map(t => (
              <div key={t.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{t.subject}</div>
                    <div className="text-slate-600 text-xs mt-0.5 font-mono">{t.ticket_number}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${statusColors[t.status] || statusColors.open}`}>
                    {t.status?.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help center link */}
      <Link
        to="/help"
        className="flex items-center gap-4 p-4 glass-card rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold text-sm">Help Center</div>
          <div className="text-slate-500 text-xs">Browse guides, FAQs, and documentation</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </Link>
    </div>
  );
}