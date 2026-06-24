import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Save, AlertCircle } from "lucide-react";

export default function TaxProfileForm({ driverId, taxProfile, onSave, onCancel }) {
  const [form, setForm] = useState(taxProfile || {
    employment_type: "W2_employee",
    filing_status: "single",
    state: "TX",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (taxProfile?.id) {
        await base44.entities.TaxProfile.update(taxProfile.id, form);
      } else {
        await base44.entities.TaxProfile.create({
          driver_id: driverId,
          ...form,
        });
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isW2 = form.employment_type === "W2_employee";

  return (
    <div className="glass-card rounded-xl p-6 border border-white/5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Tax Profile</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
          isW2 
            ? "bg-blue-500/15 border-blue-500/25 text-blue-300" 
            : "bg-orange-500/15 border-orange-500/25 text-orange-300"
        }`}>
          {isW2 ? "W-2 Employee" : "1099 Contractor"}
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      )}

      {/* Employment Type */}
      <div>
        <label className="text-slate-400 text-xs block mb-1 font-medium">Employment Type</label>
        <select 
          value={form.employment_type} 
          onChange={e => setForm({...form, employment_type: e.target.value})}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
          style={{ background: "#0F1829" }}
        >
          <option value="W2_employee">W-2 Employee</option>
          <option value="1099_contractor">1099 Contractor</option>
          <option value="owner_operator">Owner-Operator</option>
        </select>
      </div>

      {isW2 ? (
        <>
          {/* W-2 Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1 font-medium">SSN (Last 4)</label>
              <input 
                type="text" 
                maxLength="4"
                value={form.ssn_last_four || ""}
                onChange={e => setForm({...form, ssn_last_four: e.target.value})}
                placeholder="####"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1 font-medium">Filing Status</label>
              <select 
                value={form.filing_status || "single"}
                onChange={e => setForm({...form, filing_status: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
                style={{ background: "#0F1829" }}
              >
                <option value="single">Single</option>
                <option value="married_filing_jointly">Married Filing Jointly</option>
                <option value="married_filing_separately">Married Filing Separately</option>
                <option value="head_of_household">Head of Household</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1 font-medium">W-4 Allowances</label>
              <input 
                type="number" 
                value={form.withholding_allowances || 0}
                onChange={e => setForm({...form, withholding_allowances: parseFloat(e.target.value) || 0})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1 font-medium">Extra Withholding (per check)</label>
              <input 
                type="number" 
                step="0.01"
                value={form.extra_withholding_per_paycheck || 0}
                onChange={e => setForm({...form, extra_withholding_per_paycheck: parseFloat(e.target.value) || 0})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1 font-medium">State</label>
              <input 
                type="text" 
                maxLength="2"
                value={form.state || "TX"}
                onChange={e => setForm({...form, state: e.target.value.toUpperCase()})}
                placeholder="TX"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1 font-medium">Health Insurance (monthly)</label>
              <input 
                type="number" 
                step="0.01"
                value={form.health_insurance_deduction || 0}
                onChange={e => setForm({...form, health_insurance_deduction: parseFloat(e.target.value) || 0})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 1099 Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1 font-medium">EIN or SSN</label>
              <input 
                type="text"
                value={form.ein || form.ssn_last_four || ""}
                onChange={e => setForm({...form, ein: e.target.value})}
                placeholder="XX-XXXXXXX"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1 font-medium">Business Name</label>
              <input 
                type="text"
                value={form.business_name || ""}
                onChange={e => setForm({...form, business_name: e.target.value})}
                placeholder="Optional"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>
          </div>
        </>
      )}

      <div className="pt-3 border-t border-white/5 flex gap-2">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Tax Profile"}
        </button>
        <button 
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}