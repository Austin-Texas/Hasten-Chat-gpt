import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Save, Loader2 } from "lucide-react";

export default function TruckForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const [truck, setTruck] = useState({
    unit_number: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    vin: "",
    license_plate: "",
    license_plate_state: "",
    color: "",
    fuel_type: "diesel",
    fuel_capacity: "",
    mpg: "",
    status: "idle",
    registration_expiry: "",
    insurance_expiry: "",
    annual_inspection_expiry: "",
    odometer: "",
    engine_hours: "",
    last_service_date: "",
    last_service_odometer: "",
    next_service_miles: "",
    eld_device_id: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      base44.entities.Truck.get(id)
        .then(setTruck)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = (key, val) => {
    setTruck(t => ({ ...t, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!truck.unit_number?.trim()) errs.unit_number = "Required";
    if (!truck.make?.trim()) errs.make = "Required";
    if (!truck.model?.trim()) errs.model = "Required";
    if (!truck.year) errs.year = "Required";
    if (!truck.license_plate?.trim()) errs.license_plate = "Required";
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...truck };
      Object.keys(payload).forEach(k => { if (payload[k] === "") delete payload[k]; });

      if (isEdit) {
        await base44.entities.Truck.update(id, payload);
        navigate(`/fleet/${id}`);
      } else {
        const created = await base44.entities.Truck.create(payload);
        navigate(`/fleet/${created.id}`);
      }
    } catch (err) {
      setErrors({ _save: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-96 rounded-xl" />;

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors";
  const selectClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors";

  return (
    <div className="max-w-3xl space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={isEdit ? `/fleet/${id}` : "/fleet"}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">{isEdit ? "Edit Truck" : "Add Truck"}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage vehicle information and compliance dates</p>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-white font-heading font-semibold">Vehicle Information</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Unit Number *</label>
            <input type="text" value={truck.unit_number} onChange={e => set("unit_number", e.target.value)}
              className={inputClass} placeholder="e.g., #001" />
            {errors.unit_number && <p className="text-red-400 text-xs mt-0.5">{errors.unit_number}</p>}
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Year *</label>
            <input type="number" value={truck.year} onChange={e => set("year", parseInt(e.target.value) || "")}
              className={inputClass} />
            {errors.year && <p className="text-red-400 text-xs mt-0.5">{errors.year}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Make *</label>
            <input type="text" value={truck.make} onChange={e => set("make", e.target.value)}
              className={inputClass} placeholder="e.g., Freightliner" />
            {errors.make && <p className="text-red-400 text-xs mt-0.5">{errors.make}</p>}
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Model *</label>
            <input type="text" value={truck.model} onChange={e => set("model", e.target.value)}
              className={inputClass} placeholder="e.g., Cascadia" />
            {errors.model && <p className="text-red-400 text-xs mt-0.5">{errors.model}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">License Plate *</label>
            <input type="text" value={truck.license_plate} onChange={e => set("license_plate", e.target.value.toUpperCase())}
              className={inputClass} placeholder="e.g., ABC123" />
            {errors.license_plate && <p className="text-red-400 text-xs mt-0.5">{errors.license_plate}</p>}
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">State</label>
            <input type="text" value={truck.license_plate_state} onChange={e => set("license_plate_state", e.target.value.toUpperCase())} maxLength="2"
              className={inputClass} placeholder="e.g., TX" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">VIN</label>
            <input type="text" value={truck.vin} onChange={e => set("vin", e.target.value)}
              className={inputClass} placeholder="17-digit VIN" />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Color</label>
            <input type="text" value={truck.color} onChange={e => set("color", e.target.value)}
              className={inputClass} placeholder="e.g., White" />
          </div>
        </div>
      </div>

      {/* Compliance & Expiry */}
      <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
        <h2 className="text-white font-heading font-semibold mb-2">Compliance & Expiry</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Registration Expiry</label>
            <input type="date" value={truck.registration_expiry} onChange={e => set("registration_expiry", e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Insurance Expiry</label>
            <input type="date" value={truck.insurance_expiry} onChange={e => set("insurance_expiry", e.target.value)}
              className={inputClass} />
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-xs block mb-1">Annual Inspection Expiry</label>
          <input type="date" value={truck.annual_inspection_expiry} onChange={e => set("annual_inspection_expiry", e.target.value)}
            className={inputClass} />
        </div>
      </div>

      {/* Fuel & Maintenance */}
      <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
        <h2 className="text-white font-heading font-semibold mb-2">Fuel & Maintenance</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Fuel Type</label>
            <select value={truck.fuel_type} onChange={e => set("fuel_type", e.target.value)}
              className={selectClass} style={{ background: "#0F1829" }}>
              <option value="diesel" style={{ background: "#0F1829" }}>Diesel</option>
              <option value="gasoline" style={{ background: "#0F1829" }}>Gasoline</option>
              <option value="electric" style={{ background: "#0F1829" }}>Electric</option>
              <option value="natural_gas" style={{ background: "#0F1829" }}>Natural Gas</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Fuel Capacity (gal)</label>
            <input type="number" value={truck.fuel_capacity} onChange={e => set("fuel_capacity", e.target.value)}
              className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">MPG</label>
            <input type="number" step="0.1" value={truck.mpg} onChange={e => set("mpg", e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Odometer (miles)</label>
            <input type="number" value={truck.odometer} onChange={e => set("odometer", e.target.value)}
              className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Next Service Miles</label>
            <input type="number" value={truck.next_service_miles} onChange={e => set("next_service_miles", e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Last Service Date</label>
            <input type="date" value={truck.last_service_date} onChange={e => set("last_service_date", e.target.value)}
              className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Last Service Odometer</label>
            <input type="number" value={truck.last_service_odometer} onChange={e => set("last_service_odometer", e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Engine Hours</label>
            <input type="number" value={truck.engine_hours} onChange={e => set("engine_hours", e.target.value)}
              className={inputClass} />
          </div>
        </div>
      </div>

      {/* Optional */}
      <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
        <h2 className="text-white font-heading font-semibold mb-2">Optional</h2>

        <div>
          <label className="text-slate-400 text-xs block mb-1">ELD Device ID</label>
          <input type="text" value={truck.eld_device_id} onChange={e => set("eld_device_id", e.target.value)}
            className={inputClass} placeholder="If equipped" />
        </div>

        <div>
          <label className="text-slate-400 text-xs block mb-1">Notes</label>
          <textarea value={truck.notes} onChange={e => set("notes", e.target.value)} rows={3}
            className={`${inputClass} resize-none`} />
        </div>
      </div>

      {errors._save && (
        <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5">
          <p className="text-red-400 text-sm">{errors._save}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-6">
        <Link to={isEdit ? `/fleet/${id}` : "/fleet"}
          className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-medium text-center hover:text-white transition-colors">
          Cancel
        </Link>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", boxShadow: "0 4px 20px rgba(234,88,12,0.25)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Truck"}
        </button>
      </div>
    </div>
  );
}