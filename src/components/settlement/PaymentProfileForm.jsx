import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Check } from 'lucide-react';

const PAYOUT_METHODS = [
  { value: 'manual_ach', label: 'Manual ACH' },
  { value: 'check', label: 'Check' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'direct_deposit', label: 'Direct Deposit' },
  { value: 'factoring_company', label: 'Factoring Company' }
];

export default function PaymentProfileForm({ profile, onSave, onCancel }) {
  const [drivers, setDrivers] = useState([]);
  const [factoring, setFactoring] = useState([]);
  const [formData, setFormData] = useState({
    driver_id: profile?.driver_id || '',
    legal_business_name: profile?.legal_business_name || '',
    driver_name: profile?.driver_name || '',
    bank_name: profile?.bank_name || '',
    routing_number_last4: profile?.routing_number_last4 || '',
    account_number_last4: profile?.account_number_last4 || '',
    payout_method: profile?.payout_method || 'manual_ach',
    factoring_company_id: profile?.factoring_company_id || '',
    w9_uploaded: profile?.w9_uploaded || false,
    ach_authorization_uploaded: profile?.ach_authorization_uploaded || false,
    is_active: profile?.is_active !== false,
    notes: profile?.notes || ''
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [driverData, contractorData, factoringData] = await Promise.all([
        base44.asServiceRole.entities.Driver.list('-created_date', 500),
        base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500).catch(() => []),
        base44.asServiceRole.entities.FactoringCompany.filter({ status: 'active' }, '-created_date', 100).catch(() => [])
      ]);

      // Merge and enrich driver list
      // Priority: 1) ContractorProfile with driver_id, 2) Driver entity, 3) Fallback to ContractorProfile
      const mergedDrivers = [];
      const seenIds = new Set();

      // Add drivers with contractor profiles
      contractorData.forEach(contractor => {
        if (contractor.driver_id && !seenIds.has(contractor.driver_id)) {
          seenIds.add(contractor.driver_id);
          const driver = driverData.find(d => d.id === contractor.driver_id);
          if (driver) {
            mergedDrivers.push({
              ...driver,
              legal_business_name: contractor.legal_business_name,
              contractor_id: contractor.id
            });
          }
        }
      });

      // Add remaining drivers
      driverData.forEach(driver => {
        if (!seenIds.has(driver.id)) {
          seenIds.add(driver.id);
          mergedDrivers.push(driver);
        }
      });

      // Add contractors without driver_id (fallback)
      contractorData.forEach(contractor => {
        if (!contractor.driver_id && !seenIds.has(contractor.id)) {
          seenIds.add(contractor.id);
          mergedDrivers.push({
            id: contractor.id,
            first_name: contractor.first_name,
            last_name: contractor.last_name,
            legal_business_name: contractor.legal_business_name,
            status: contractor.status || 'prospect',
            contractor_id: contractor.id
          });
        }
      });

      console.log('PaymentProfileForm: merged', mergedDrivers.length, 'drivers');
      mergedDrivers.slice(0, 3).forEach(d => {
        console.log(`  - ${d.first_name} ${d.last_name} (${d.legal_business_name || 'no business'})`);
      });
      setDrivers(mergedDrivers);
      setFactoring(factoringData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setDrivers([]);
      setFactoring([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.driver_id) newErrors.driver_id = 'Driver is required';
    if (!formData.legal_business_name) newErrors.legal_business_name = 'Business name is required';
    if (!formData.driver_name) newErrors.driver_name = 'Driver name is required';
    if (!formData.bank_name && formData.payout_method !== 'check') newErrors.bank_name = 'Bank name is required';
    if (!formData.routing_number_last4 && ['manual_ach', 'wire'].includes(formData.payout_method)) {
      newErrors.routing_number_last4 = 'Routing number is required';
    }
    if (!formData.account_number_last4 && ['manual_ach', 'wire'].includes(formData.payout_method)) {
      newErrors.account_number_last4 = 'Account number is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const selectedDriver = drivers.find(d => d.id === formData.driver_id);
  if (selectedDriver && !formData.driver_name) {
    setFormData(prev => ({
      ...prev,
      driver_name: `${selectedDriver.first_name} ${selectedDriver.last_name}`
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Driver Selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2">
          Contractor Driver <span className="text-red-400">*</span>
        </label>
        <select
          name="driver_id"
          value={formData.driver_id}
          onChange={handleChange}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
        >
          <option value="">Select a contractor/driver...</option>
          {drivers.map(driver => {
            const displayName = `${driver.first_name} ${driver.last_name}`;
            const businessName = driver.legal_business_name ? ` — ${driver.legal_business_name}` : '';
            const status = driver.status ? ` (${driver.status})` : '';
            return (
              <option key={driver.id} value={driver.id}>
                {displayName}{businessName}{status}
              </option>
            );
          })}
        </select>
        {errors.driver_id && <p className="text-red-400 text-xs mt-1">{errors.driver_id}</p>}
      </div>

      {/* Business Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2">
          Legal Business Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="legal_business_name"
          value={formData.legal_business_name}
          onChange={handleChange}
          placeholder="e.g., ABC Freight LLC"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
        />
        {errors.legal_business_name && <p className="text-red-400 text-xs mt-1">{errors.legal_business_name}</p>}
      </div>

      {/* Payout Method */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2">
          Payout Method <span className="text-red-400">*</span>
        </label>
        <select
          name="payout_method"
          value={formData.payout_method}
          onChange={handleChange}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
        >
          {PAYOUT_METHODS.map(method => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bank Information */}
      {['manual_ach', 'wire', 'direct_deposit'].includes(formData.payout_method) && (
        <>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Bank Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="bank_name"
              value={formData.bank_name}
              onChange={handleChange}
              placeholder="e.g., Chase Bank"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
            />
            {errors.bank_name && <p className="text-red-400 text-xs mt-1">{errors.bank_name}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Routing Number (last 4) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="routing_number_last4"
                value={formData.routing_number_last4}
                onChange={handleChange}
                placeholder="XXXX"
                maxLength="4"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
              {errors.routing_number_last4 && <p className="text-red-400 text-xs mt-1">{errors.routing_number_last4}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Account Number (last 4) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="account_number_last4"
                value={formData.account_number_last4}
                onChange={handleChange}
                placeholder="XXXX"
                maxLength="4"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
              />
              {errors.account_number_last4 && <p className="text-red-400 text-xs mt-1">{errors.account_number_last4}</p>}
            </div>
          </div>
        </>
      )}

      {/* Factoring Company */}
      {formData.payout_method === 'factoring_company' && (
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">
            Factoring Company <span className="text-red-400">*</span>
          </label>
          <select
            name="factoring_company_id"
            value={formData.factoring_company_id}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
          >
            <option value="">Select company...</option>
            {factoring.map(f => (
              <option key={f.id} value={f.id}>
                {f.company_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Documentation Checkboxes */}
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="w9_uploaded"
            checked={formData.w9_uploaded}
            onChange={handleChange}
            className="rounded"
          />
          <div className="flex items-center gap-1">
            {formData.w9_uploaded ? <Check className="w-3 h-3 text-green-400" /> : null}
            <span className="text-slate-300 text-sm">W-9 Form Uploaded</span>
          </div>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="ach_authorization_uploaded"
            checked={formData.ach_authorization_uploaded}
            onChange={handleChange}
            className="rounded"
          />
          <div className="flex items-center gap-1">
            {formData.ach_authorization_uploaded ? <Check className="w-3 h-3 text-green-400" /> : null}
            <span className="text-slate-300 text-sm">ACH Authorization Uploaded</span>
          </div>
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any additional notes..."
          rows="3"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 resize-none"
        />
      </div>

      {/* Active Status */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          className="rounded"
        />
        <span className="text-slate-300 text-sm">Active</span>
      </label>

      {/* Buttons */}
      <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Save Payment Profile
        </button>
      </div>
    </form>
  );
}