import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Package, Plus, Clock, CheckCircle, XCircle, Truck, ArrowRight,
  Loader2, FileText, MapPin, Weight, Calendar, StickyNote
} from "lucide-react";

const EQUIPMENT_TYPES = [
  "Sprinter", "Cargo Van", "Box Truck", "Hot Shot", "Gooseneck",
  "Dry Van", "Power Only", "Flatbed", "Car Hauler", "Reefer",
  "Step Deck", "Conestoga", "Final Mile", "LTL/Partial", "Expedited", "White Glove"
];

const TABS = [
  { key: "new_request", label: "New Request", icon: Plus },
  { key: "active", label: "Active", icon: Truck },
  { key: "pending", label: "Pending Quotes", icon: Clock },
  { key: "completed", label: "Completed", icon: CheckCircle },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
];

const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors";
const labelClass = "block text-slate-400 text-xs font-medium mb-1.5";

export default function ClientShipments({ client, user }) {
  const [tab, setTab] = useState("new_request");
  const [shipments, setShipments] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestType, setRequestType] = useState("quote");

  const emptyForm = {
    pickup_address: "", pickup_city: "", pickup_state: "", pickup_zip: "",
    delivery_address: "", delivery_city: "", delivery_state: "", delivery_zip: "",
    commodity: "", weight: "", length: "", width: "", height: "",
    equipment_type: "", pickup_date: "", delivery_date: "", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchData(); }, [client]);

  const fetchData = async () => {
    if (!client?.id) { setLoading(false); return; }
    try {
      const [s, q] = await Promise.all([
        base44.entities.Shipment.filter({ client_id: client.id }, "-created_date", 100).catch(() => []),
        base44.entities.QuoteRequest.filter({ requester_email: client?.email || user?.email }, "-created_date", 100).catch(() => []),
      ]);
      setShipments(s);
      setQuotes(q);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pickup_city || !form.delivery_city || !form.equipment_type) return;
    setSubmitting(true);
    setSuccess(false);
    try {
      const dims = [form.length, form.width, form.height].filter(Boolean).join(" × ");
      const notesWithDims = dims ? `Dimensions: ${dims}${form.notes ? " | " + form.notes : ""}` : form.notes;

      if (requestType === "quote") {
        await base44.entities.QuoteRequest.create({
          requester_name: client?.contact_name || user?.full_name,
          requester_email: client?.email || user?.email,
          requester_phone: client?.phone,
          company_name: client?.company_name,
          origin_city: form.pickup_city,
          origin_state: form.pickup_state,
          origin_zip: form.pickup_zip,
          destination_city: form.delivery_city,
          destination_state: form.delivery_state,
          destination_zip: form.delivery_zip,
          pickup_date: form.pickup_date || undefined,
          delivery_date: form.delivery_date || undefined,
          equipment_type: form.equipment_type,
          commodity: form.commodity,
          weight: form.weight ? parseFloat(form.weight) : undefined,
          notes: notesWithDims,
          special_requirements: form.pickup_address || form.delivery_address
            ? `Pickup: ${form.pickup_address} | Delivery: ${form.delivery_address}` : undefined,
          status: "pending",
        });
      } else {
        await base44.entities.Shipment.create({
          shipment_number: `SHP-${Date.now().toString().slice(-6)}`,
          client_id: client.id,
          origin_address: form.pickup_address,
          origin_city: form.pickup_city,
          origin_state: form.pickup_state,
          origin_zip: form.pickup_zip,
          destination_address: form.delivery_address,
          destination_city: form.delivery_city,
          destination_state: form.delivery_state,
          destination_zip: form.delivery_zip,
          pickup_date: form.pickup_date || undefined,
          delivery_date: form.delivery_date || undefined,
          equipment_type: form.equipment_type,
          commodity: form.commodity,
          weight: form.weight ? parseFloat(form.weight) : undefined,
          notes: notesWithDims,
          special_instructions: form.notes,
          status: "quote_received",
          payment_terms: client?.payment_terms || "net30",
        });
      }

      setForm(emptyForm);
      setSuccess(true);
      fetchData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const activeShipments = shipments.filter(s => ["dispatched", "in_transit", "load_created", "quote_approved"].includes(s.status));
  const pendingQuotes = [
    ...quotes.filter(q => ["pending", "quoted"].includes(q.status)),
    ...shipments.filter(s => s.status === "quote_received").map(s => ({ ...s, _isShipment: true })),
  ];
  const completedShipments = shipments.filter(s => ["delivered", "invoiced", "paid"].includes(s.status));
  const cancelledShipments = [...shipments.filter(s => s.status === "cancelled"), ...quotes.filter(q => q.status === "rejected" || q.status === "expired")];

  const renderList = () => {
    if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>;
    if (tab === "active") return <ShipmentList items={activeShipments} emptyText="No active shipments" />;
    if (tab === "pending") return <ShipmentList items={pendingQuotes} emptyText="No pending quotes" isQuote />;
    if (tab === "completed") return <ShipmentList items={completedShipments} emptyText="No completed shipments" />;
    if (tab === "cancelled") return <ShipmentList items={cancelledShipments} emptyText="No cancelled shipments" />;
    return null;
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Shipments &amp; Quotes</h1>
        <p className="text-slate-400 text-sm mt-0.5">Request quotes, book shipments, and track your freight</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${tab === t.key ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.key === "active" && activeShipments.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{activeShipments.length}</span>}
            {t.key === "pending" && pendingQuotes.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{pendingQuotes.length}</span>}
          </button>
        ))}
      </div>

      {/* New Request Form */}
      {tab === "new_request" && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 space-y-5">
          {/* Request Type Toggle */}
          <div className="flex gap-2 p-1 rounded-lg bg-white/5 border border-white/10 w-fit">
            <button type="button" onClick={() => setRequestType("quote")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${requestType === "quote" ? "bg-blue-500 text-white" : "text-slate-400"}`}>
              <FileText className="w-3.5 h-3.5 inline mr-1.5" /> Quote Only
            </button>
            <button type="button" onClick={() => setRequestType("book")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${requestType === "book" ? "bg-green-500 text-white" : "text-slate-400"}`}>
              <Package className="w-3.5 h-3.5 inline mr-1.5" /> Book Shipment
            </button>
          </div>

          {success && (
            <div className="px-4 py-3 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 text-sm">
              ✓ {requestType === "quote" ? "Quote request submitted! Our team will respond shortly." : "Shipment booked! We'll confirm details soon."}
            </div>
          )}

          {/* Pickup */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-orange-400 text-sm font-semibold">
              <MapPin className="w-4 h-4" /> Pickup Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className={labelClass}>Pickup Address</label>
                <input value={form.pickup_address} onChange={e => update("pickup_address", e.target.value)} className={inputClass} placeholder="123 Main St" />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input value={form.pickup_city} onChange={e => update("pickup_city", e.target.value)} className={inputClass} placeholder="Dallas" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>State</label>
                  <input value={form.pickup_state} onChange={e => update("pickup_state", e.target.value.toUpperCase().slice(0, 2))} className={inputClass} placeholder="TX" />
                </div>
                <div>
                  <label className={labelClass}>Zip</label>
                  <input value={form.pickup_zip} onChange={e => update("pickup_zip", e.target.value)} className={inputClass} placeholder="75001" />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-green-400 text-sm font-semibold">
              <MapPin className="w-4 h-4" /> Delivery Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className={labelClass}>Delivery Address</label>
                <input value={form.delivery_address} onChange={e => update("delivery_address", e.target.value)} className={inputClass} placeholder="456 Oak Ave" />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input value={form.delivery_city} onChange={e => update("delivery_city", e.target.value)} className={inputClass} placeholder="Atlanta" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>State</label>
                  <input value={form.delivery_state} onChange={e => update("delivery_state", e.target.value.toUpperCase().slice(0, 2))} className={inputClass} placeholder="GA" />
                </div>
                <div>
                  <label className={labelClass}>Zip</label>
                  <input value={form.delivery_zip} onChange={e => update("delivery_zip", e.target.value)} className={inputClass} placeholder="30301" />
                </div>
              </div>
            </div>
          </div>

          {/* Freight Details */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-cyan-400 text-sm font-semibold">
              <Package className="w-4 h-4" /> Freight Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Equipment Type *</label>
                <select value={form.equipment_type} onChange={e => update("equipment_type", e.target.value)} className={inputClass} required>
                  <option value="" style={{ background: "#0F1829" }}>Select…</option>
                  {EQUIPMENT_TYPES.map(e => <option key={e} value={e} style={{ background: "#0F1829" }}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Commodity</label>
                <input value={form.commodity} onChange={e => update("commodity", e.target.value)} className={inputClass} placeholder="Electronics" />
              </div>
              <div>
                <label className={labelClass}>Weight (lbs)</label>
                <input type="number" value={form.weight} onChange={e => update("weight", e.target.value)} className={inputClass} placeholder="15000" />
              </div>
              <div>
                <label className={labelClass}>Length (ft)</label>
                <input type="number" value={form.length} onChange={e => update("length", e.target.value)} className={inputClass} placeholder="48" />
              </div>
              <div>
                <label className={labelClass}>Width (ft)</label>
                <input type="number" value={form.width} onChange={e => update("width", e.target.value)} className={inputClass} placeholder="8.5" />
              </div>
              <div>
                <label className={labelClass}>Height (ft)</label>
                <input type="number" value={form.height} onChange={e => update("height", e.target.value)} className={inputClass} placeholder="9" />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-amber-400 text-sm font-semibold">
              <Calendar className="w-4 h-4" /> Appointment Dates
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Pickup Date</label>
                <input type="date" value={form.pickup_date} onChange={e => update("pickup_date", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Delivery Date</label>
                <input type="date" value={form.delivery_date} onChange={e => update("delivery_date", e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}><StickyNote className="w-3 h-3 inline mr-1" />Notes / Special Instructions</label>
            <textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className={inputClass} placeholder="Liftgate required, appointment needed, etc." />
          </div>

          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: requestType === "quote" ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "linear-gradient(135deg, #22C55E, #16A34A)" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : requestType === "quote" ? <FileText className="w-4 h-4" /> : <Package className="w-4 h-4" />}
            {submitting ? "Submitting…" : requestType === "quote" ? "Request Quote" : "Book Shipment"}
          </button>
        </form>
      )}

      {/* List Views */}
      {renderList()}
    </div>
  );
}

function ShipmentList({ items, emptyText, isQuote }) {
  if (items.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const status = item.status || "pending";
        const statusColor = {
          pending: "bg-amber-500/15 text-amber-400 border-amber-500/25",
          quoted: "bg-blue-500/15 text-blue-400 border-blue-500/25",
          quote_received: "bg-amber-500/15 text-amber-400 border-amber-500/25",
          quote_approved: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
          load_created: "bg-purple-500/15 text-purple-400 border-purple-500/25",
          dispatched: "bg-orange-500/15 text-orange-400 border-orange-500/25",
          in_transit: "bg-blue-500/15 text-blue-300 border-blue-500/25",
          delivered: "bg-green-500/15 text-green-400 border-green-500/25",
          invoiced: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
          paid: "bg-green-500/15 text-green-400 border-green-500/25",
          rejected: "bg-red-500/15 text-red-400 border-red-500/25",
          expired: "bg-slate-500/15 text-slate-400 border-slate-500/25",
          cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
        }[status] || "bg-slate-500/15 text-slate-400 border-slate-500/25";

        return (
          <div key={item.id || i} className="glass-card rounded-xl border border-white/5 p-4 hover:border-orange-500/20 transition-all">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-orange-400 font-mono text-xs font-bold">
                {item.shipment_number || `QR-${(item.id || "").slice(-6).toUpperCase()}`}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor}`}>
                {status.replace(/_/g, " ")}
              </span>
              <div className="flex-1 min-w-[200px] flex items-center gap-2 text-sm">
                <span className="text-white font-medium">{item.origin_city}, {item.origin_state}</span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <span className="text-white font-medium">{item.destination_city}, {item.destination_state}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {item.equipment_type && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{item.equipment_type}</span>}
                {item.weight > 0 && <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{item.weight.toLocaleString()} lbs</span>}
                {item.pickup_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.pickup_date).toLocaleDateString()}</span>}
              </div>
              {item.quoted_rate > 0 && <span className="text-green-400 font-bold text-sm">${item.quoted_rate.toLocaleString()}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}