import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, MapPin, Navigation, FileText, MessageSquare,
  DollarSign, CheckCircle, Clock, ChevronRight, AlertCircle, Loader2, Send
} from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import CameraUpload from "@/components/driver/CameraUpload";
import GPSTracker from "@/components/driver/GPSTracker";
import ArrivalModal from "@/components/driver/ArrivalModal";

// ─── Status workflow ──────────────────────────────────────────────────────────
const STATUS_SEQUENCE = [
  "assigned","accepted","en_route","arrived_pickup",
  "loaded","in_transit","arrived_delivery","delivered","pod_uploaded","completed"
];
const STATUS_ACTIONS = {
  assigned:         { next: "accepted",         label: "Accept Load",           color: "green" },
  accepted:         { next: "en_route",          label: "En Route to Pickup",      color: "blue" },
  en_route:         { next: "arrived_pickup",    label: "Arrived at Pickup",       color: "orange" },
  arrived_pickup:   { next: "loaded",            label: "Confirm Loaded",        color: "orange" },
  loaded:           { next: "in_transit",        label: "Depart — Start Transit", color: "orange" },
  in_transit:       { next: "arrived_delivery",  label: "Arrived at Delivery",   color: "blue" },
  arrived_delivery: { next: "delivered",         label: "Confirm Delivered",     color: "green" },
  delivered:        { next: "pod_uploaded",      label: "Upload POD to Complete", color: "green" },
};
const STEP_LABELS = {
  assigned: "Assigned", accepted: "Accepted",   en_route: "En Route to Pickup",
  arrived_pickup: "At Pickup", loaded: "Loaded", in_transit: "In Transit",
  arrived_delivery: "At Delivery", delivered: "Delivered",
  pod_uploaded: "POD Uploaded", completed: "Completed",
};

// ─── Document types drivers must upload ──────────────────────────────────────
const DOC_TYPES = [
  { key: "rc",           label: "Rate Confirmation", field: null },
  { key: "bol",          label: "Bill of Lading (BOL)", field: "bol_url" },
  { key: "pickup_photo", label: "Pickup Photos",     field: null },
  { key: "pod",          label: "Proof of Delivery (POD)", field: "pod_url" },
  { key: "delivery_photo", label: "Delivery Photos", field: null },
  { key: "receipt",      label: "Receipts / Other",  field: null },
];

// ─── Expense categories ───────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { key: "fuel",       label: "Fuel",       emoji: "⛽" },
  { key: "tolls",      label: "Tolls",      emoji: "🛣️" },
  { key: "meals",      label: "Meals",      emoji: "🍔" },
  { key: "lodging",    label: "Lodging/Hotel", emoji: "🏨" },
  { key: "scales",     label: "Scales",     emoji: "⚖️" },
  { key: "permits",    label: "Permits",    emoji: "📋" },
  { key: "maintenance",label: "Repair",     emoji: "🔧" },
  { key: "other",      label: "Other",      emoji: "📎" },
];

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "progress", label: "Progress", icon: CheckCircle },
  { key: "docs",     label: "Docs",     icon: FileText },
  { key: "map",      label: "Map",      icon: MapPin },
  { key: "chat",     label: "Chat",     icon: MessageSquare },
  { key: "expenses", label: "Expenses", icon: DollarSign },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressTab({ load, user, onStatusUpdate, updating }) {
  const idx = STATUS_SEQUENCE.indexOf(load.status);
  const action = STATUS_ACTIONS[load.status];
  const progress = idx >= 0 ? ((idx + 1) / STATUS_SEQUENCE.length) * 100 : 100;

  return (
    <div className="space-y-5">
      {/* Route summary */}
      <div className="glass-card rounded-2xl p-4 border border-orange-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Origin</div>
            <div className="text-white font-semibold">{load.origin_city}, {load.origin_state}</div>
            {load.origin_address && <div className="text-slate-500 text-xs">{load.origin_address}</div>}
          </div>
          <ChevronRight className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <div className="flex-1 text-right">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Destination</div>
            <div className="text-white font-semibold">{load.destination_city}, {load.destination_state}</div>
            {load.destination_address && <div className="text-slate-500 text-xs">{load.destination_address}</div>}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mb-1">
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-700"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex justify-between text-xs text-slate-600 mb-4">
          <span>Pickup</span><span>In Transit</span><span>Delivered</span>
        </div>

        {/* Step badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STATUS_SEQUENCE.map((s, i) => (
            <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              i < idx ? "bg-green-500/10 border-green-500/20 text-green-400"
              : i === idx ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
              : "bg-white/3 border-white/5 text-slate-600"
            }`}>
              {i < idx ? "✓ " : ""}{STEP_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      {/* Load details */}
      <div className="glass-card rounded-2xl p-4 border border-white/5">
        <h3 className="text-white font-semibold text-sm mb-3">Load Details</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
          {[
            ["Equipment", load.equipment_type],
            ["Miles", load.miles ? `${load.miles} mi` : "—"],
            ["Weight", load.weight ? `${load.weight.toLocaleString()} lbs` : "—"],
            ["Commodity", load.commodity || "—"],
            ["Rate", `$${(load.rate || 0).toLocaleString()}`],
            ["BOL #", load.bol_number || "—"],
            ["PO #", load.po_number || "—"],
            ["Priority", load.priority || "standard"],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-slate-500 text-xs uppercase tracking-wider">{label}</div>
              <div className={`text-white font-medium mt-0.5 ${label === "Rate" ? "text-green-400" : ""}`}>{value}</div>
            </div>
          ))}
        </div>
        {load.special_instructions && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">⚠️ Special Instructions</div>
            <div className="text-slate-300 text-sm">{load.special_instructions}</div>
          </div>
        )}
      </div>

      {/* Pickup / Delivery dates */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Pickup", date: load.pickup_date, actual: load.actual_pickup },
          { label: "Delivery", date: load.delivery_date, actual: load.actual_delivery },
        ].map(d => (
          <div key={d.label} className="glass-card rounded-xl p-3 border border-white/5">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">{d.label}</div>
            <div className="text-white text-sm font-medium">
              {d.date ? new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
            </div>
            {d.actual && (
              <div className="text-green-400 text-xs mt-0.5">
                Actual: {new Date(d.actual).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action button */}
      {action && (
        <button
          onClick={onStatusUpdate}
          disabled={updating}
          className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-200 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", boxShadow: "0 6px 24px rgba(234,88,12,0.35)" }}
        >
          {updating
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <><Navigation className="w-5 h-5" /> {action.label}</>}
        </button>
      )}
      {load.status === "completed" && (
        <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-semibold">
          <CheckCircle className="w-5 h-5" /> Load Completed
        </div>
      )}
    </div>
  );
}

function DocsTab({ load, user, onDocUploaded }) {
  const [activeDoc, setActiveDoc] = useState(null);

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs">Upload all required documents for this load.</p>
      {DOC_TYPES.map(dt => {
        const uploaded = dt.field ? !!load[dt.field] : false;
        const isActive = activeDoc === dt.key;
        return (
          <div key={dt.key} className="glass-card rounded-xl border border-white/5 overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-4"
              onClick={() => setActiveDoc(isActive ? null : dt.key)}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                uploaded ? "bg-green-500/10 border border-green-500/20" : "bg-white/5 border border-white/10"
              }`}>
                {uploaded
                  ? <CheckCircle className="w-4 h-4 text-green-400" />
                  : <FileText className="w-4 h-4 text-slate-500" />}
              </div>
              <div className="flex-1 text-left">
                <div className="text-white text-sm font-medium">{dt.label}</div>
                <div className={`text-xs ${uploaded ? "text-green-400" : "text-slate-500"}`}>
                  {uploaded ? "Uploaded ✓" : "Pending upload"}
                </div>
              </div>
              {uploaded && load[dt.field] && (
                <a href={load[dt.field]} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="px-2 py-1 rounded-lg bg-white/5 text-slate-400 text-xs hover:text-white transition-colors"
                >
                  View
                </a>
              )}
              <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isActive ? "rotate-90" : ""}`} />
            </button>
            {isActive && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3">
                <CameraUpload
                  docType={dt.key}
                  label={`Upload ${dt.label}`}
                  onUploaded={(url, name, type) => onDocUploaded(url, name, type)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MapTab({ load, driverRecord }) {
  return (
    <div className="space-y-3 -mx-4">
      {/* Simulated map */}
      <div className="relative w-full rounded-xl overflow-hidden"
        style={{ height: "280px", background: "linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #091525 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 280">
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2="400" y2={i * 40} stroke="#334155" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="280" stroke="#334155" strokeWidth="0.5" />
          ))}
          <path d="M60 220 Q150 130 200 150 Q260 170 340 60" stroke="#EA580C" strokeWidth="3"
            strokeDasharray="8 4" fill="none" strokeLinecap="round" opacity="0.9" />
          <circle cx="60" cy="220" r="7" fill="#EA580C" />
          <circle cx="340" cy="60" r="9" fill="#22C55E" />
          <circle cx="200" cy="150" r="12" fill="none" stroke="#F97316" strokeWidth="2" opacity="0.7" />
          <text x="195" y="155" fill="#F97316" fontSize="12">🚛</text>
        </svg>
        {/* Labels */}
        <div className="absolute bottom-3 left-3 glass-card rounded-lg px-2 py-1.5 border border-white/10">
          <div className="text-xs text-slate-400">Origin</div>
          <div className="text-white text-xs font-semibold">{load.origin_city}, {load.origin_state}</div>
        </div>
        <div className="absolute top-3 right-3 glass-card rounded-lg px-2 py-1.5 border border-white/10">
          <div className="text-xs text-slate-400">Destination</div>
          <div className="text-white text-xs font-semibold">{load.destination_city}, {load.destination_state}</div>
        </div>
      </div>

      {/* GPS Tracker */}
      <div className="px-4">
        <GPSTracker driverId={driverRecord?.id} loadId={load.id} />
      </div>

      {/* Route info */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-3 border border-white/5">
          <div className="text-slate-500 text-xs mb-0.5">Distance</div>
          <div className="text-white font-semibold">{load.miles ? `${load.miles} mi` : "—"}</div>
        </div>
        <div className="glass-card rounded-xl p-3 border border-white/5">
          <div className="text-slate-500 text-xs mb-0.5">ETA</div>
          <div className="text-orange-400 font-semibold text-sm">
            {load.delivery_date
              ? new Date(load.delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatTab({ load, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);
  const convId    = `load_${load.id}`;

  // Real-time subscription
  useEffect(() => {
    // Initial load
    base44.entities.Message.filter({ conversation_id: convId }, "created_date", 100)
      .then(data => {
        setMessages(data);
        // mark dispatcher messages as read
        data.filter(m => !m.is_read && m.sender_id !== user?.id)
            .forEach(m => base44.entities.Message.update(m.id, { is_read: true }).catch(() => {}));
      }).catch(() => {});

    // Subscribe for live updates
    const unsub = base44.entities.Message.subscribe((event) => {
      if (!event.data || event.data.conversation_id !== convId) return;
      if (event.type === "create") {
        setMessages(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        if (event.data.sender_id !== user?.id) {
          base44.entities.Message.update(event.data.id, { is_read: true }).catch(() => {});
        }
      }
    });
    return () => unsub();
  }, [convId, user?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      await base44.entities.Message.create({
        conversation_id: convId,
        load_id: load.id,
        sender_id: user?.id,
        sender_name: user?.full_name || "Driver",
        sender_role: "driver",
        content,
        message_type: "text",
        is_read: false,
      });
    } catch { setInput(content); }
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col -mx-4" style={{ height: "62vh" }}>
      {/* Load context banner */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-slate-400 text-xs">Dispatch Chat</span>
        <span className="text-slate-600 text-xs">·</span>
        <span className="text-orange-400 font-mono text-xs font-bold">
          {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
        </span>
        <span className="text-slate-500 text-xs truncate">{load.origin_city} → {load.destination_city}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No messages yet</p>
            <p className="text-xs text-slate-600 mt-1">Send a message to dispatch below</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                isMe
                  ? "bg-orange-500 text-white rounded-br-sm"
                  : "glass-card text-slate-200 border border-white/5 rounded-bl-sm"
              }`}>
                {!isMe && (
                  <div className="text-orange-400 text-xs font-medium mb-0.5">
                    {msg.sender_name || "Dispatcher"}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <div className={`text-xs mt-1 ${isMe ? "text-orange-200" : "text-slate-500"}`}>
                  {new Date(msg.created_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 px-4 pb-2 flex-shrink-0 border-t border-white/5 pt-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Message dispatch…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
          {sending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send className="w-4 h-4 text-white" />}
        </button>
      </div>
    </div>
  );
}

function ExpensesTab({ load, user, driverRecord }) {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "fuel", amount: "", description: "", vendor: "", location_state: "" });
  const [receiptUrl, setReceiptUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Expense.filter({ load_id: load.id }, "-created_date", 50)
      .then(setExpenses).catch(() => {});
  }, [load.id]);

  const submit = async () => {
    if (!form.amount || isNaN(parseFloat(form.amount))) return;
    setSaving(true);
    try {
      const exp = await base44.entities.Expense.create({
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
        vendor: form.vendor,
        location_state: form.location_state,
        load_id: load.id,
        driver_id: driverRecord?.id || user?.id,
        truck_id: driverRecord?.truck_id,
        date: new Date().toISOString().slice(0, 10),
        receipt_url: receiptUrl || undefined,
        status: "pending",
      });
      setExpenses(prev => [exp, ...prev]);
      setForm({ category: "fuel", amount: "", description: "", vendor: "", location_state: "" });
      setReceiptUrl("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-wider">Total Expenses</div>
          <div className="text-red-400 font-bold text-xl font-mono">-${totalExpenses.toLocaleString()}</div>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          + Add Expense
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card rounded-2xl p-4 border border-orange-500/15 space-y-3 animate-slide-up">
          <h3 className="text-white font-semibold text-sm">New Expense</h3>

          {/* Category grid */}
          <div className="grid grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                  form.category === cat.key
                    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}>
                <span className="text-base">{cat.emoji}</span>
                <span className="leading-tight text-center">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="text-slate-400 text-xs block mb-1">Amount ($) *</label>
            <input
              type="number" step="0.01" placeholder="0.00"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Vendor</label>
              <input placeholder="e.g. Pilot Flying J"
                value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">State</label>
              <input placeholder="e.g. TX" maxLength={2}
                value={form.location_state} onChange={e => setForm(f => ({ ...f, location_state: e.target.value.toUpperCase() }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">Description</label>
            <input placeholder="Optional note"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
          </div>

          {/* Receipt upload */}
          <div>
            <label className="text-slate-400 text-xs block mb-1">Receipt Photo</label>
            <CameraUpload
              docType="receipt"
              label="Attach Receipt"
              onUploaded={(url) => setReceiptUrl(url)}
            />
            {receiptUrl && <div className="text-green-400 text-xs mt-1">✓ Receipt attached</div>}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={submit} disabled={saving || !form.amount}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
              {saving ? "Saving…" : "Submit Expense"}
            </button>
          </div>
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 && !showForm ? (
        <div className="text-center py-10">
          <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No expenses yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => {
            const cat = EXPENSE_CATEGORIES.find(c => c.key === exp.category);
            return (
              <div key={exp.id} className="glass-card rounded-xl p-3 flex items-center gap-3 border border-white/5">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                  {cat?.emoji || "📎"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium capitalize">{exp.category?.replace("_", " ")}</div>
                  <div className="text-slate-500 text-xs">{exp.vendor || exp.description || "—"} {exp.location_state ? `· ${exp.location_state}` : ""}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-red-400 font-bold text-sm">-${(exp.amount || 0).toLocaleString()}</div>
                  <div className={`text-xs capitalize ${
                    exp.status === "approved" ? "text-green-400" : exp.status === "rejected" ? "text-red-400" : "text-amber-400"
                  }`}>{exp.status || "pending"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DriverLoadDetail({ user }) {
  const { id } = useParams();
  const [load, setLoad]             = useState(null);
  const [driverRecord, setDriverRecord] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("progress");
  const [updating, setUpdating]     = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [arrivalInfo, setArrivalInfo] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [loadData, drivers] = await Promise.all([
          base44.entities.Load.filter({ id }, "-created_date", 1),
          user?.id ? base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1) : Promise.resolve([]),
        ]);
        setLoad(loadData[0] || null);
        setDriverRecord(drivers[0] || null);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, user?.id]);

  const handleStatusUpdate = async () => {
    if (!load) return;
    const action = STATUS_ACTIONS[load.status];
    if (!action) return;

    // Intercept arrival actions — require photo proof via ArrivalModal
    if (action.next === "arrived_pickup" || action.next === "arrived_delivery") {
      setArrivalInfo({
        arrivalType: action.next === "arrived_pickup" ? "pickup" : "delivery",
        targetStatus: action.next,
      });
      setShowArrivalModal(true);
      return;
    }

    setUpdating(true);
    try {
      const result = await base44.functions.invoke('updateLoadStatus', { load_id: load.id, new_status: action.next });
      setLoad(prev => ({ ...prev, status: action.next }));
    } catch (err) { console.error(err); }
    finally { setUpdating(false); }
  };

  const handleArrivalComplete = () => {
    setShowArrivalModal(false);
    if (arrivalInfo) {
      setLoad(prev => ({ ...prev, status: arrivalInfo.targetStatus }));
    }
    setArrivalInfo(null);
  };

  const handleDocUploaded = async (url, name, type) => {
    const updates = {};
    if (type === "bol") { updates.bol_url = url; updates.bol_status = "pending"; }
    if (type === "pod") { updates.pod_url = url; updates.pod_status = "pending"; }
    if (Object.keys(updates).length > 0) {
      await base44.entities.Load.update(load.id, updates);
      setLoad(prev => ({ ...prev, ...updates }));
    }
    // Manifest event for doc upload
    await base44.entities.Manifest.create({
      load_id: load.id,
      event_type: "pod_uploaded",
      event_title: `${type.toUpperCase()} uploaded`,
      event_timestamp: new Date().toISOString(),
      performed_by: user?.id,
      performed_by_role: "driver",
      attachment_url: url,
      is_system_event: false,
    });
  };

  if (loading) return (
    <div className="space-y-4 animate-slide-up">
      <div className="skeleton h-12 rounded-xl" />
      <div className="skeleton h-48 rounded-2xl" />
      <div className="skeleton h-32 rounded-2xl" />
    </div>
  );

  if (!load) return (
    <div className="text-center py-20">
      <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">Load not found</p>
      <Link to="/driver/loads" className="text-orange-400 text-sm mt-2 inline-block">← Back to Loads</Link>
    </div>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/driver/loads" className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-orange-400 font-mono font-bold text-lg">
              {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
            </span>
            <StatusBadge status={load.status} />
          </div>
          <div className="text-slate-400 text-xs">{load.origin_city} → {load.destination_city}</div>
        </div>
        {/* Quick-chat shortcut — navigates to Messages tab of this load */}
        <button
          onClick={() => setTab("chat")}
          title="Message Dispatch"
          className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-colors flex-shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 p-1 rounded-xl bg-white/5 border border-white/5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
              tab === t.key ? "bg-orange-500 text-white" : "text-slate-500 hover:text-white"
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "progress" && <ProgressTab load={load} user={user} onStatusUpdate={handleStatusUpdate} updating={updating} />}
      {tab === "docs"     && <DocsTab load={load} user={user} onDocUploaded={handleDocUploaded} />}
      {tab === "map"      && <MapTab load={load} driverRecord={driverRecord} />}
      {tab === "chat"     && <ChatTab load={load} user={user} />}
      {tab === "expenses" && <ExpensesTab load={load} user={user} driverRecord={driverRecord} />}

      {/* Arrival confirmation modal with photo proof */}
      {showArrivalModal && arrivalInfo && (
        <ArrivalModal
          isOpen={showArrivalModal}
          onClose={handleArrivalComplete}
          arrivalType={arrivalInfo.arrivalType}
          load={load}
          targetStatus={arrivalInfo.targetStatus}
        />
      )}
    </div>
  );
}