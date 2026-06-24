import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const LICENSE_CLASSES = ["A", "B", "C"];
const PAY_TYPES = ["per_mile", "percentage", "flat_rate", "hourly"];
const STATES = ["NY", "CA", "TX", "FL", "PA", "IL", "OH", "GA", "NC", "MI"];

export default function DriverForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    license_number: "",
    license_class: "A",
    license_state: "NY",
    license_expiry: "",
    medical_expiry: "",
    hazmat_cert: false,
    hire_date: "",
    pay_type: "per_mile",
    pay_rate: "",
    home_city: "",
    home_state: "NY",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  });

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [createContractor, setCreateContractor] = useState(true);

  useEffect(() => {
    if (!id) return;
    base44.entities.Driver.get(id)
      .then(d => setForm(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      let driverId;
      if (id) {
        await base44.entities.Driver.update(id, form);
        driverId = id;
      } else {
        const driver = await base44.entities.Driver.create(form);
        driverId = driver.id;
      }

      // Create contractor profile if checkbox is checked
      if (createContractor && !id) {
        try {
          const response = await base44.functions.invoke('linkDriverToContractor', {
            driver_id: driverId,
            create_contractor: true
          });
          console.log('Contractor profile created:', response.data);
        } catch (err) {
          console.error('Failed to create contractor profile:', err);
          // Don't fail driver creation if contractor fails
        }
      }

      navigate("/drivers");
    } catch (err) {
      console.error(err);
      alert("Failed to save driver");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-64 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/drivers")} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-white font-heading font-bold text-2xl">
            {id ? "Edit Driver" : "Add Driver"}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Driver"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Personal Info */}
        <div className="glass-card rounded-xl border border-white/5 p-5 lg:col-span-2">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">First Name *</label>
              <input type="text" name="first_name" value={form.first_name} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Last Name *</label>
              <input type="text" name="last_name" value={form.last_name} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Email *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Phone *</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>
        </div>

        {/* License & Certification */}
        <div className="glass-card rounded-xl border border-white/5 p-5 lg:col-span-2">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">License & Certification</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">License Number</label>
              <input type="text" name="license_number" value={form.license_number} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Class</label>
              <select name="license_class" value={form.license_class} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors">
                {LICENSE_CLASSES.map(c => <option key={c} value={c} style={{ background: "#0F1829" }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">License State</label>
              <select name="license_state" value={form.license_state} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors">
                {STATES.map(s => <option key={s} value={s} style={{ background: "#0F1829" }}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">License Expiry</label>
              <input type="date" name="license_expiry" value={form.license_expiry} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Medical Expiry</label>
              <input type="date" name="medical_expiry" value={form.medical_expiry} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
            <input type="checkbox" id="hazmat" name="hazmat_cert" checked={form.hazmat_cert} onChange={handleChange}
              className="w-4 h-4 rounded cursor-pointer" />
            <label htmlFor="hazmat" className="text-white text-sm font-medium cursor-pointer">HAZMAT Certified</label>
          </div>
        </div>

        {/* Pay & Hire */}
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Pay Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Pay Type</label>
              <select name="pay_type" value={form.pay_type} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors">
                {PAY_TYPES.map(t => <option key={t} value={t} style={{ background: "#0F1829" }}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Pay Rate</label>
              <input type="number" name="pay_rate" value={form.pay_rate} onChange={handleChange} step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>
        </div>

        {/* Home & Location */}
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Home Base</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">City</label>
              <input type="text" name="home_city" value={form.home_city} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">State</label>
              <select name="home_state" value={form.home_state} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors">
                {STATES.map(s => <option key={s} value={s} style={{ background: "#0F1829" }}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="glass-card rounded-xl border border-white/5 p-5 lg:col-span-2">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Name</label>
              <input type="text" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">Phone</label>
              <input type="tel" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card rounded-xl border border-white/5 p-5 lg:col-span-2">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Notes</h2>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows="3"
            placeholder="Internal notes about this driver…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors resize-none" />
        </div>

        {/* Contractor Profile */}
        {!id && (
          <div className="glass-card rounded-xl border border-white/5 p-5 lg:col-span-2">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Owner-Operator Setup</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={createContractor} 
                onChange={(e) => setCreateContractor(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer" 
              />
              <div>
                <p className="text-white text-sm font-medium">Create contractor profile</p>
                <p className="text-slate-500 text-xs mt-0.5">Automatically creates onboarding checklist, payment profile, and required documents</p>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}