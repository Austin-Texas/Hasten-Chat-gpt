import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save } from "lucide-react";

const EQUIPMENT_TYPES = ["Dry Van", "Flatbed", "Reefer", "Step Deck", "Lowboy", "Box Truck", "Tanker", "Hotshot"];
const PRIORITIES = ["standard", "express", "critical"];

const FIELD = ({ label, children }) => (
  <div>
    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

const INPUT_CLS = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors";
const SELECT_CLS = INPUT_CLS + " appearance-none";

export default function LoadTemplateModal({ template, onClose, onSaved }) {
  const blank = {
    name: "", origin_city: "", origin_state: "", origin_address: "", origin_zip: "",
    destination_city: "", destination_state: "", destination_address: "", destination_zip: "",
    equipment_type: "Dry Van", commodity: "", weight: "", miles: "", rate: "", rate_per_mile: "",
    fuel_surcharge: "", priority: "standard", special_instructions: "",
  };
  const [form, setForm] = useState(template ? { ...template } : blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const num = (k, v) => set(k, v === "" ? "" : parseFloat(v));

  const handleSave = async () => {
    if (!form.name || !form.origin_city || !form.destination_city || !form.equipment_type) {
      setError("Name, origin city, destination city and equipment type are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      ["weight", "miles", "rate", "rate_per_mile", "fuel_surcharge"].forEach(k => {
        payload[k] = payload[k] !== "" ? Number(payload[k]) : undefined;
      });
      if (template?.id) {
        await base44.entities.LoadTemplate.update(template.id, payload);
      } else {
        await base44.entities.LoadTemplate.create({ ...payload, times_used: 0 });
      }
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl glass-card rounded-2xl border border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <h2 className="text-white font-heading font-bold text-lg">{template?.id ? "Edit Template" : "New Load Template"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <FIELD label="Template Name">
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Dallas → Chicago Weekly" className={INPUT_CLS} />
          </FIELD>

          <div className="grid grid-cols-2 gap-5">
            {/* Origin */}
            <div className="space-y-3">
              <div className="text-orange-400 text-xs font-semibold uppercase tracking-widest">Origin</div>
              <FIELD label="City *">
                <input value={form.origin_city} onChange={e => set("origin_city", e.target.value)} placeholder="Dallas" className={INPUT_CLS} />
              </FIELD>
              <FIELD label="State">
                <input value={form.origin_state} onChange={e => set("origin_state", e.target.value)} placeholder="TX" maxLength={2} className={INPUT_CLS} />
              </FIELD>
              <FIELD label="Address">
                <input value={form.origin_address} onChange={e => set("origin_address", e.target.value)} placeholder="123 Warehouse Rd" className={INPUT_CLS} />
              </FIELD>
              <FIELD label="ZIP">
                <input value={form.origin_zip} onChange={e => set("origin_zip", e.target.value)} placeholder="75001" className={INPUT_CLS} />
              </FIELD>
            </div>

            {/* Destination */}
            <div className="space-y-3">
              <div className="text-green-400 text-xs font-semibold uppercase tracking-widest">Destination</div>
              <FIELD label="City *">
                <input value={form.destination_city} onChange={e => set("destination_city", e.target.value)} placeholder="Chicago" className={INPUT_CLS} />
              </FIELD>
              <FIELD label="State">
                <input value={form.destination_state} onChange={e => set("destination_state", e.target.value)} placeholder="IL" maxLength={2} className={INPUT_CLS} />
              </FIELD>
              <FIELD label="Address">
                <input value={form.destination_address} onChange={e => set("destination_address", e.target.value)} placeholder="456 Distribution Dr" className={INPUT_CLS} />
              </FIELD>
              <FIELD label="ZIP">
                <input value={form.destination_zip} onChange={e => set("destination_zip", e.target.value)} placeholder="60601" className={INPUT_CLS} />
              </FIELD>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FIELD label="Equipment Type *">
              <select value={form.equipment_type} onChange={e => set("equipment_type", e.target.value)} className={SELECT_CLS}>
                {EQUIPMENT_TYPES.map(t => <option key={t} value={t} style={{ background: "#0F1829" }}>{t}</option>)}
              </select>
            </FIELD>
            <FIELD label="Priority">
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className={SELECT_CLS}>
                {PRIORITIES.map(p => <option key={p} value={p} style={{ background: "#0F1829" }} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </FIELD>
            <FIELD label="Commodity">
              <input value={form.commodity} onChange={e => set("commodity", e.target.value)} placeholder="Electronics" className={INPUT_CLS} />
            </FIELD>
            <FIELD label="Weight (lbs)">
              <input type="number" value={form.weight} onChange={e => num("weight", e.target.value)} placeholder="42000" className={INPUT_CLS} />
            </FIELD>
            <FIELD label="Miles">
              <input type="number" value={form.miles} onChange={e => num("miles", e.target.value)} placeholder="921" className={INPUT_CLS} />
            </FIELD>
            <FIELD label="Rate ($)">
              <input type="number" value={form.rate} onChange={e => num("rate", e.target.value)} placeholder="3200" className={INPUT_CLS} />
            </FIELD>
            <FIELD label="Rate per Mile ($/mi)">
              <input type="number" value={form.rate_per_mile} onChange={e => num("rate_per_mile", e.target.value)} placeholder="3.47" className={INPUT_CLS} />
            </FIELD>
            <FIELD label="Fuel Surcharge ($)">
              <input type="number" value={form.fuel_surcharge} onChange={e => num("fuel_surcharge", e.target.value)} placeholder="280" className={INPUT_CLS} />
            </FIELD>
          </div>

          <FIELD label="Special Instructions">
            <textarea value={form.special_instructions} onChange={e => set("special_instructions", e.target.value)}
              placeholder="Any recurring instructions for this route…" rows={3} className={INPUT_CLS + " resize-none"} />
          </FIELD>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-3">
          {error && <p className="text-red-400 text-sm flex-1">{error}</p>}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition-all"
              style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}