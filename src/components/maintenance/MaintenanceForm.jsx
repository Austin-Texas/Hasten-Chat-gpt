import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save, Loader2 } from "lucide-react";

const MAINTENANCE_TYPES = [
  "preventive", "corrective", "inspection", "tire", "brake",
  "engine", "transmission", "electrical", "body", "oil", "other"
];

const SERVICE_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];

export default function MaintenanceForm({ trucks, editingRecord, onClose, onSaved }) {
  const [form, setForm] = useState({
    truck_id: "",
    type: "preventive",
    status: "scheduled",
    description: "",
    scheduled_date: "",
    completed_date: "",
    odometer_at_service: "",
    next_service_odometer: "",
    vendor: "",
    technician: "",
    labor_cost: "",
    parts_cost: "",
    parts_used: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingRecord) {
      setForm(editingRecord);
    } else {
      const today = new Date().toISOString().split("T")[0];
      setForm(prev => ({ ...prev, scheduled_date: today }));
    }
  }, [editingRecord]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.truck_id || !form.scheduled_date) {
      setError("Truck and scheduled date are required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        total_cost: (parseFloat(form.labor_cost || 0) + parseFloat(form.parts_cost || 0)) || undefined,
      };

      if (editingRecord?.id) {
        await base44.entities.MaintenanceRecord.update(editingRecord.id, payload);
      } else {
        await base44.entities.MaintenanceRecord.create(payload);
      }

      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalCost = (parseFloat(form.labor_cost || 0) + parseFloat(form.parts_cost || 0)) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-white/5 bg-card">
          <h2 className="text-white font-heading font-bold text-lg">
            {editingRecord ? "Edit Service Record" : "Schedule Maintenance"}
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
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Truck *</label>
              <select name="truck_id" value={form.truck_id} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors">
                <option value="">Select truck…</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id} style={{ background: "#0F1829" }}>
                    Unit #{t.unit_number} - {t.make} {t.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Service Type</label>
              <select name="type" value={form.type} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors">
                {MAINTENANCE_TYPES.map(t => (
                  <option key={t} value={t} style={{ background: "#0F1829" }}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Status</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors">
                {SERVICE_STATUSES.map(s => (
                  <option key={s} value={s} style={{ background: "#0F1829" }}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Scheduled Date *</label>
              <input type="date" name="scheduled_date" value={form.scheduled_date} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Completed Date</label>
              <input type="date" name="completed_date" value={form.completed_date} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Odometer at Service (mi)</label>
              <input type="number" name="odometer_at_service" value={form.odometer_at_service} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Next Service Due (mi)</label>
              <input type="number" name="next_service_odometer" value={form.next_service_odometer} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Vendor / Shop</label>
              <input type="text" name="vendor" value={form.vendor} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Technician</label>
              <input type="text" name="technician" value={form.technician} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Labor Cost</label>
              <input type="number" name="labor_cost" value={form.labor_cost} onChange={handleChange} step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>

            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Parts Cost</label>
              <input type="number" name="parts_cost" value={form.parts_cost} onChange={handleChange} step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>

          {totalCost > 0 && (
            <div className="glass-card rounded-xl p-3 border border-orange-500/25 bg-orange-500/5">
              <div className="flex items-center justify-between">
                <span className="text-orange-300 text-sm font-medium">Total Cost</span>
                <span className="text-orange-400 font-bold text-lg">${totalCost.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-white text-xs font-semibold mb-1.5">Parts Used</label>
            <input type="text" name="parts_used" value={form.parts_used} onChange={handleChange}
              placeholder="e.g., Oil filter OEM-123, Air filter OEM-456"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
          </div>

          <div>
            <label className="block text-white text-xs font-semibold mb-1.5">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows="2"
              placeholder="Work performed, observations, etc."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors resize-none" />
          </div>

          <div>
            <label className="block text-white text-xs font-semibold mb-1.5">Internal Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows="2"
              placeholder="Follow-up items, recurring issues, etc."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors resize-none" />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 p-5 border-t border-white/5 bg-card">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
            {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving…</>) : (<><Save className="w-4 h-4" />Save Record</>)}
          </button>
        </div>
      </div>
    </div>
  );
}