import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save, Loader2, Trash2 } from "lucide-react";

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.name || !form.origin_city || !form.destination_city) {
      setError("Name, origin, and destination are required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (template?.id) {
        await base44.entities.LoadTemplate.update(template.id, form);
      } else {
        await base44.entities.LoadTemplate.create(form);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
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
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const EQUIPMENT_TYPES = ["Dry Van", "Flatbed", "Reefer", "Step Deck", "Lowboy", "Box Truck", "Tanker", "Hotshot"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-white/5 bg-card">
          <h2 className="text-white font-heading font-bold text-lg">
            {template ? "Edit Template" : "Create Load Template"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-300 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-white text-xs font-semibold mb-1.5">Template Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., Atlanta to Miami Weekly"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            {/* Origin */}
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Origin City *</label>
              <input
                type="text"
                name="origin_city"
                value={form.origin_city}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Origin State</label>
              <input
                type="text"
                name="origin_state"
                value={form.origin_state}
                onChange={handleChange}
                placeholder="GA"
                maxLength="2"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors uppercase"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-white text-xs font-semibold mb-1.5">Origin Address</label>
              <input
                type="text"
                name="origin_address"
                value={form.origin_address}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Origin ZIP</label>
              <input
                type="text"
                name="origin_zip"
                value={form.origin_zip}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Destination City *</label>
              <input
                type="text"
                name="destination_city"
                value={form.destination_city}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Destination State</label>
              <input
                type="text"
                name="destination_state"
                value={form.destination_state}
                onChange={handleChange}
                placeholder="FL"
                maxLength="2"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors uppercase"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-white text-xs font-semibold mb-1.5">Destination Address</label>
              <input
                type="text"
                name="destination_address"
                value={form.destination_address}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Destination ZIP</label>
              <input
                type="text"
                name="destination_zip"
                value={form.destination_zip}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            {/* Load Details */}
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Equipment Type</label>
              <select
                name="equipment_type"
                value={form.equipment_type}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              >
                {EQUIPMENT_TYPES.map(et => (
                  <option key={et} value={et} style={{ background: "#0F1829" }}>{et}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Commodity</label>
              <input
                type="text"
                name="commodity"
                value={form.commodity}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Weight (lbs)</label>
              <input
                type="number"
                name="weight"
                value={form.weight}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Miles</label>
              <input
                type="number"
                name="miles"
                value={form.miles}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Rate</label>
              <input
                type="number"
                name="rate"
                value={form.rate}
                onChange={handleChange}
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Rate / Mile</label>
              <input
                type="number"
                name="rate_per_mile"
                value={form.rate_per_mile}
                onChange={handleChange}
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Fuel Surcharge</label>
              <input
                type="number"
                name="fuel_surcharge"
                value={form.fuel_surcharge}
                onChange={handleChange}
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              >
                <option value="standard" style={{ background: "#0F1829" }}>Standard</option>
                <option value="express" style={{ background: "#0F1829" }}>Express</option>
                <option value="critical" style={{ background: "#0F1829" }}>Critical</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-white text-xs font-semibold mb-1.5">Special Instructions</label>
              <textarea
                name="special_instructions"
                value={form.special_instructions}
                onChange={handleChange}
                rows="2"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 p-5 border-t border-white/5 bg-card">
          {template && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/15 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}