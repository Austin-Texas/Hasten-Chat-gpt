import { useState } from "react";
import { X, Loader2 } from "lucide-react";

export default function InviteUserModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    businessRole: "driver",
    is_active: true,
    create_profile: true,
    send_email: true
  });

  const BUSINESS_ROLES = [
    "admin",
    "system_manager",
    "dispatcher",
    "fleet_manager",
    "driver",
    "broker",
    "client",
    "finance",
    "safety_compliance"
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      alert("Full name and email are required");
      return;
    }
    await onSubmit(form);
    setForm({
      full_name: "",
      email: "",
      businessRole: "driver",
      is_active: true,
      create_profile: true,
      send_email: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950 border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-white font-heading font-bold">Invite User</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-white text-sm font-medium block mb-1.5">Full Name *</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="e.g., John Smith"
              disabled={isSubmitting}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-orange-500/40 disabled:opacity-50"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-white text-sm font-medium block mb-1.5">Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g., john@example.com"
              disabled={isSubmitting}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-orange-500/40 disabled:opacity-50"
            />
          </div>

          {/* Business Role */}
          <div>
            <label className="text-white text-sm font-medium block mb-1.5">Business Role *</label>
            <select
              name="businessRole"
              value={form.businessRole}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 disabled:opacity-50"
            >
              {BUSINESS_ROLES.map(r => (
                <option key={r} value={r} className="bg-slate-900">
                  {r}
                </option>
              ))}
            </select>
            <p className="text-slate-500 text-xs mt-1.5">Auth role assigned automatically based on selection</p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
            />
            <label className="text-white text-sm cursor-pointer">Active account</label>
          </div>

          {/* Create Profile */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
            <input
              type="checkbox"
              name="create_profile"
              checked={form.create_profile}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
            />
            <label className="text-white text-sm cursor-pointer">Auto-create business profile</label>
          </div>

          {/* Send Email */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
            <input
              type="checkbox"
              name="send_email"
              checked={form.send_email}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
            />
            <label className="text-white text-sm cursor-pointer">Send invite email</label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Invite User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}