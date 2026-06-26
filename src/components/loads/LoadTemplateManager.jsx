import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { normalizeLoadPayload, logDispatcherEvent } from "@/lib/dispatcherWorkflow";

export default function LoadTemplateManager({ template, onClose, onSaved }) {
  const [form, setForm] = useState(template || {
    name: "",
    origin_city: "",
    origin_state: "",
    origin_address: "",
    origin_zip: "",
    destination_city: "",
    destination_state: "",
    destination_address: "",
    destination_zip: "",
    equipment_type: "Dry Van",
    commodity: "",
    weight: "",
    miles: "",
    rate: "",
    rate_per_mile: "",
    fuel_surcharge: "",
    priority: "standard",
    special_instructions: "",
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (["rate", "miles"].includes(name)) {
        const normalized = normalizeLoadPayload(next);
        if (!normalized.__rateConflict && normalized.rate_per_mile !== undefined) next.rate_per_mile = normalized.rate_per_mile;
      }
      return next;
    });
  };

  const validate = () => {
    const normalized = normalizeLoadPayload(form);
    const errors = [];
    if (!normalized.name?.trim()) errors.push("Template name is required.");
    if (!normalized.origin_city?.trim() && !normalized.origin_address?.trim()) errors.push("Origin is required.");
    if (!normalized.destination_city?.trim() && !normalized.destination_address?.trim()) errors.push("Destination is required.");
    if (!normalized.equipment_type) errors.push("Equipment type is required.");
    if (normalized.__rateConflict) errors.push(normalized.__rateConflict);
    ["miles", "weight", "rate", "rate_per_mile", "fuel_surcharge"].forEach((field) => {
      const value = normalized[field];
      if (value !== "" && value !== null && value !== undefined && Number.isNaN(Number(value))) {
        errors.push(`${field.replace(/_/g, " ")} must be numeric.`);
      }
    });
    return { normalized, errors };
  };

  const handleSave = async () => {
    const { normalized, errors } = validate();
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...normalized,
        template_status: "active",
        updated_at: new Date().toISOString(),
        times_used: normalized.times_used || 0,
      };
      const savedTemplate = template?.id
        ? await base44.entities.LoadTemplate.update(template.id, payload)
        : await base44.entities.LoadTemplate.create({ ...payload, created_at: new Date().toISOString() });

      await logDispatcherEvent(template?.id ? "LOAD_TEMPLATE_UPDATED" : "LOAD_TEMPLATE_CREATED", {
        entity_type: "LoadTemplate",
        entity_id: savedTemplate.id,
        title: `Load template ${template?.id ? "updated" : "created"}`,
        description: `${payload.origin_city || "Origin"} → ${payload.destination_city || "Destination"}`,
      });

      setSaved(true);
      await onSaved?.(savedTemplate);
    } catch (err) {
      setError(err.message || "Failed to save load template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template?.id) return;
    if (!confirm("Delete this template?")) return;

    setDeleting(true);
    try {
      await base44.entities.LoadTemplate.delete(template.id);
      await onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const EQUIPMENT_TYPES = ["Dry Van", "Flatbed", "Reefer", "Step Deck", "Lowboy", "Box Truck", "Tanker", "Hotshot", "Sprinter", "Cargo Van", "Power Only", "Car Hauler"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-white/5 bg-card">
          <h2 className="text-white font-heading font-bold text-lg">{template ? "Edit Template" : "Create Load Template"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-300 text-xs">{error}</div>}
          {saved && <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-green-300 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Template saved and library refreshed.</div>}

          <div className="grid grid-cols-2 gap-4">
            <Input className="col-span-2" label="Template Name *" name="name" value={form.name} onChange={handleChange} placeholder="e.g., Atlanta to Miami Weekly" />
            <Input label="Origin City *" name="origin_city" value={form.origin_city} onChange={handleChange} />
            <Input label="Origin State" name="origin_state" value={form.origin_state} onChange={handleChange} placeholder="GA" maxLength="2" extra="uppercase" />
            <Input className="col-span-2" label="Origin Address" name="origin_address" value={form.origin_address} onChange={handleChange} />
            <Input label="Origin ZIP" name="origin_zip" value={form.origin_zip} onChange={handleChange} />
            <Input label="Destination City *" name="destination_city" value={form.destination_city} onChange={handleChange} />
            <Input label="Destination State" name="destination_state" value={form.destination_state} onChange={handleChange} placeholder="FL" maxLength="2" extra="uppercase" />
            <Input className="col-span-2" label="Destination Address" name="destination_address" value={form.destination_address} onChange={handleChange} />
            <Input label="Destination ZIP" name="destination_zip" value={form.destination_zip} onChange={handleChange} />

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Equipment Type *</label>
              <select name="equipment_type" value={form.equipment_type} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40 transition-colors">
                {EQUIPMENT_TYPES.map(et => <option key={et} value={et} style={{ background: "#0F1829" }}>{et}</option>)}
              </select>
            </div>
            <Input label="Commodity" name="commodity" value={form.commodity} onChange={handleChange} />
            <Input label="Weight (lbs)" type="number" name="weight" value={form.weight} onChange={handleChange} />
            <Input label="Miles" type="number" name="miles" value={form.miles} onChange={handleChange} />
            <Input label="Rate" type="number" name="rate" value={form.rate} onChange={handleChange} step="0.01" />
            <Input label="Rate / Mile" type="number" name="rate_per_mile" value={form.rate_per_mile} onChange={handleChange} step="0.01" />
            <Input label="Fuel Surcharge" type="number" name="fuel_surcharge" value={form.fuel_surcharge} onChange={handleChange} step="0.01" />
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40 transition-colors">
                <option value="standard" style={{ background: "#0F1829" }}>Standard</option>
                <option value="express" style={{ background: "#0F1829" }}>Express</option>
                <option value="critical" style={{ background: "#0F1829" }}>Critical</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-white text-xs font-semibold mb-1.5">Special Instructions</label>
              <textarea name="special_instructions" value={form.special_instructions} onChange={handleChange} rows="2" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40 transition-colors resize-none" />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 p-5 border-t border-white/5 bg-card">
          {template && <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/15 transition-colors disabled:opacity-50">{deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Delete</button>}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:border-white/20 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-950 text-sm font-semibold disabled:opacity-50 transition-all bg-green-500 hover:bg-green-400">{saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Template</>}</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, className = "", extra = "", ...props }) {
  return (
    <div className={className}>
      <label className="block text-white text-xs font-semibold mb-1.5">{label}</label>
      <input {...props} className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40 transition-colors ${extra}`} />
    </div>
  );
}
