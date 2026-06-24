import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, DollarSign, TrendingUp, TrendingDown, Minus, Loader2, Send } from "lucide-react";

const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors";

function RpmBadge({ rpm }) {
  if (!rpm || rpm <= 0) return null;
  const isHigh = rpm >= 3.0;
  const isGood = rpm >= 2.0 && rpm < 3.0;
  const isLow = rpm < 2.0;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
      isHigh ? "bg-green-500/15 border-green-500/25 text-green-400" :
      isGood ? "bg-blue-500/15 border-blue-500/25 text-blue-400" :
               "bg-red-500/15 border-red-500/25 text-red-400"
    }`}>
      {isHigh ? <TrendingUp className="w-3 h-3" /> : isLow ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      ${rpm.toFixed(2)}/mi — {isHigh ? "High Value" : isGood ? "Good RPM" : "Low RPM"}
    </span>
  );
}

export default function SendQuoteModal({ quote, onClose, onSaved }) {
  const [form, setForm] = useState({
    quoted_rate: quote.quoted_rate || "",
    estimated_miles: quote.estimated_miles || "",
    fuel_surcharge: quote.fuel_surcharge || "",
    accessorial_charges: quote.accessorial_charges || "",
    detention_terms: quote.detention_terms || "",
    quote_expires_at: quote.quote_expires_at ? quote.quote_expires_at.slice(0, 16) : "",
    internal_notes: quote.internal_notes || "",
    customer_notes: quote.customer_notes || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const rate = parseFloat(form.quoted_rate) || 0;
  const miles = parseFloat(form.estimated_miles) || 0;
  const fsc = parseFloat(form.fuel_surcharge) || 0;
  const accessorial = parseFloat(form.accessorial_charges) || 0;
  const totalRevenue = rate + fsc + accessorial;
  const rpm = miles > 0 ? rate / miles : 0;
  const fscPerMile = miles > 0 ? fsc / miles : 0;

  // Simple cost estimate: fuel at $3.80/gal, 7 mpg + 25% driver pay
  const estimatedFuel = miles > 0 ? (miles / 7) * 3.8 : 0;
  const estimatedDriverPay = rate * 0.25;
  const estimatedMargin = totalRevenue > 0 ? ((totalRevenue - estimatedFuel - estimatedDriverPay) / totalRevenue) * 100 : null;

  const handleSend = async () => {
    if (!form.quoted_rate) return;
    setSaving(true);
    try {
      const payload = {
        status: "quoted",
        quoted_rate: parseFloat(form.quoted_rate) || undefined,
        estimated_miles: parseFloat(form.estimated_miles) || undefined,
        fuel_surcharge: parseFloat(form.fuel_surcharge) || undefined,
        accessorial_charges: parseFloat(form.accessorial_charges) || undefined,
        detention_terms: form.detention_terms || undefined,
        quote_expires_at: form.quote_expires_at ? new Date(form.quote_expires_at).toISOString() : undefined,
        internal_notes: form.internal_notes || undefined,
        customer_notes: form.customer_notes || undefined,
      };
      // Remove undefined keys
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      await base44.entities.QuoteRequest.update(quote.id, payload);

      // Notify client via email
      base44.integrations.Core.SendEmail({
        to: quote.requester_email,
        subject: `Your Freight Quote — ${quote.origin_city}, ${quote.origin_state} to ${quote.destination_city}, ${quote.destination_state}`,
        body: `Dear ${quote.requester_name},\n\nThank you for your freight request. Here is your quote:\n\nRoute: ${quote.origin_city}, ${quote.origin_state} → ${quote.destination_city}, ${quote.destination_state}\nEquipment: ${quote.equipment_type || "—"}\nQuoted Rate: $${rate.toLocaleString()}${fsc ? `\nFuel Surcharge: $${fsc.toLocaleString()}` : ""}${accessorial ? `\nAccessorial: $${accessorial.toLocaleString()}` : ""}${form.customer_notes ? `\n\nNotes: ${form.customer_notes}` : ""}${form.quote_expires_at ? `\n\nThis quote expires on ${new Date(form.quote_expires_at).toLocaleString()}.` : ""}\n\nTo accept or request changes, please contact your dispatcher.\n\nHASTEN Freight`,
      }).catch(() => {});

      // Manifest is logged on load conversion; no load_id exists at quote stage yet

      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="glass-card rounded-2xl border border-white/10 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-white font-heading font-bold text-lg">Send Quote</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {quote.company_name || quote.requester_name} · {quote.origin_city} → {quote.destination_city}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Rate & Miles */}
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" /> Rate & Miles
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Quoted Rate ($) *</label>
                <input type="number" step="0.01" value={form.quoted_rate} onChange={e => set("quoted_rate", e.target.value)} className={inputClass} placeholder="e.g. 2400" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Estimated Miles</label>
                <input type="number" value={form.estimated_miles} onChange={e => set("estimated_miles", e.target.value)} className={inputClass} placeholder="e.g. 850" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Fuel Surcharge ($)</label>
                <input type="number" step="0.01" value={form.fuel_surcharge} onChange={e => set("fuel_surcharge", e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Accessorial Charges ($)</label>
                <input type="number" step="0.01" value={form.accessorial_charges} onChange={e => set("accessorial_charges", e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* RPM Dashboard */}
          {rate > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Quote Analytics</span>
                <RpmBadge rpm={rpm} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">Total Revenue</div>
                  <div className="text-green-400 font-bold">${totalRevenue.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">RPM</div>
                  <div className="text-white font-bold">{rpm > 0 ? `$${rpm.toFixed(2)}` : "—"}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">FSC/Mile</div>
                  <div className="text-white font-bold">{fscPerMile > 0 ? `$${fscPerMile.toFixed(2)}` : "—"}</div>
                </div>
              </div>
              {estimatedMargin !== null && totalRevenue > 0 && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${estimatedMargin >= 20 ? "bg-green-500/8 text-green-400" : estimatedMargin >= 5 ? "bg-amber-500/8 text-amber-400" : "bg-red-500/8 text-red-400"}`}>
                  {estimatedMargin >= 20 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  Est. margin: ~{estimatedMargin.toFixed(0)}% (fuel + driver pay estimate)
                </div>
              )}
            </div>
          )}

          {/* Terms & Expiry */}
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Terms</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Detention Terms</label>
                <input type="text" value={form.detention_terms} onChange={e => set("detention_terms", e.target.value)} className={inputClass} placeholder="e.g. $75/hr after 2hrs free" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Quote Expires</label>
                <input type="datetime-local" value={form.quote_expires_at} onChange={e => set("quote_expires_at", e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Notes</div>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Customer-Facing Notes</label>
                <textarea value={form.customer_notes} onChange={e => set("customer_notes", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Notes included in quote email to client…" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Internal Notes</label>
                <textarea value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Internal dispatcher notes (not shared with client)…" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleSend} disabled={saving || !form.quoted_rate}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg,#EA580C,#F97316)", boxShadow: "0 4px 20px rgba(234,88,12,0.25)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {saving ? "Sending…" : "Send Quote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}