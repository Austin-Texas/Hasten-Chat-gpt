import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { getCustomer, saveCustomer, CUSTOMER_TYPES } from "@/lib/dispatcherWorkflow";

const FIELD_GROUPS = {
  company: {
    title: "Company Information",
    color: "blue",
    fields: [
      { name: "company_name", label: "Company Name", type: "text", required: true },
      { name: "customer_type", label: "Customer Type", type: "select", options: CUSTOMER_TYPES, required: true },
    ]
  },
  contact: {
    title: "Contact Information",
    color: "purple",
    fields: [
      { name: "contact_name", label: "Contact Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "text", required: true },
    ]
  },
  address: {
    title: "Address",
    color: "cyan",
    fields: [
      { name: "address", label: "Street Address", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "zip", label: "ZIP Code", type: "text" },
    ]
  },
  verification: {
    title: "MC/DOT Verification",
    color: "orange",
    fields: [
      { name: "mc_number", label: "MC Number", type: "text", hint: "Motor Carrier number" },
      { name: "dot_number", label: "DOT Number", type: "text", hint: "Department of Transportation number" },
    ]
  },
  billing: {
    title: "Billing & Credit Setup",
    color: "green",
    fields: [
      { name: "payment_terms", label: "Payment Terms", type: "select", options: ["net15", "net30", "net45", "net60", "quick_pay"], required: true },
      { name: "credit_limit", label: "Credit Limit ($)", type: "number" },
      { name: "billing_status", label: "Billing Status", type: "select", options: ["active", "credit_hold", "review"], required: true },
    ]
  },
  details: {
    title: "Additional Details",
    color: "amber",
    fields: [
      { name: "preferred_equipment", label: "Preferred Equipment Type", type: "text", hint: "e.g., Dry Van, Flatbed" },
      { name: "lanes", label: "Preferred Lanes", type: "text", hint: "e.g., TX-CA, Regional" },
      { name: "notes", label: "Notes", type: "textarea" },
    ]
  },
};

const colorStyles = {
  blue: "border-blue-500/20 bg-blue-500/5",
  purple: "border-purple-500/20 bg-purple-500/5",
  cyan: "border-cyan-500/20 bg-cyan-500/5",
  orange: "border-orange-500/20 bg-orange-500/5",
  green: "border-green-500/20 bg-green-500/5",
  amber: "border-amber-500/20 bg-amber-500/5",
};

const headerColorText = {
  blue: "text-blue-400",
  purple: "text-purple-400",
  cyan: "text-cyan-400",
  orange: "text-orange-400",
  green: "text-green-400",
  amber: "text-amber-400",
};

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    company_name: "",
    customer_type: "direct_client",
    type: "direct_client",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    mc_number: "",
    dot_number: "",
    payment_terms: "net30",
    billing_status: "active",
    credit_limit: "",
    preferred_equipment: "",
    lanes: "",
    notes: "",
    status: "active",
  });

  useEffect(() => {
    if (!id) return;
    getCustomer(id)
      .then(customer => {
        if (customer) setData({ ...customer, customer_type: customer.customer_type || customer.type || "direct_client", type: customer.customer_type || customer.type || "direct_client" });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field, value) => {
    setData(prev => {
      const next = { ...prev, [field]: value };
      if (field === "customer_type") next.type = value;
      return next;
    });
  };

  const validate = () => {
    const errors = [];
    if (!data.company_name?.trim()) errors.push("Company name is required.");
    if (!data.customer_type) errors.push("Customer type is required.");
    if (!data.contact_name?.trim()) errors.push("Contact name is required.");
    if (!data.email?.trim()) errors.push("Email is required.");
    if (!data.phone?.trim()) errors.push("Phone is required.");
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const record = await saveCustomer(data, id || null);
      setSaved(true);
      setTimeout(() => navigate(`/crm/${record.id}`), 700);
    } catch (err) {
      console.error(err);
      setError(`Error saving customer: ${err.message || "Customer API failed"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-2" />
          <p className="text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to="/crm" className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">{id ? "Edit Customer" : "Add New Customer"}</h1>
          <p className="text-xs text-slate-500 mt-1">Customer entity is used across Quotes, Loads, Shipments, and Billing.</p>
        </div>
      </div>

      {saved && <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Customer saved successfully.</div>}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {Object.entries(FIELD_GROUPS).map(([groupKey, group]) => (
          <div key={groupKey} className={`glass-card rounded-xl p-6 border ${colorStyles[group.color]}`}>
            <h2 className={`text-lg font-heading font-semibold mb-4 ${headerColorText[group.color]}`}>{group.title}</h2>
            <div className="space-y-4">
              {group.fields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{field.label}{field.required && <span className="text-orange-400">*</span>}</label>
                  {field.type === "select" ? (
                    <select value={data[field.name] || ""} onChange={e => handleChange(field.name, e.target.value)} required={field.required} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20 transition-colors text-sm" style={{ background: "hsl(222 40% 7%)" }}>
                      <option value="" style={{ background: "hsl(222 40% 7%)" }}>Select…</option>
                      {field.options?.map(opt => <option key={opt} value={opt} style={{ background: "hsl(222 40% 7%)" }}>{opt.replace(/_/g, " ").toUpperCase()}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea value={data[field.name] || ""} onChange={e => handleChange(field.name, e.target.value)} required={field.required} rows="4" placeholder={field.hint || ""} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20 transition-colors text-sm" style={{ background: "hsl(222 40% 7%)" }} />
                  ) : (
                    <input type={field.type} value={data[field.name] || ""} onChange={e => handleChange(field.name, e.target.value)} required={field.required} placeholder={field.hint || ""} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20 transition-colors text-sm" style={{ background: "hsl(222 40% 7%)" }} />
                  )}
                  {field.hint && <p className="text-xs text-slate-500 mt-1">{field.hint}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-4">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-slate-950 text-sm disabled:opacity-50 transition-all bg-green-500 hover:bg-green-400">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving…" : id ? "Update Customer" : "Create Customer"}
          </button>
          <Link to="/crm" className="px-6 py-3 rounded-lg font-semibold text-slate-300 text-sm hover:text-white bg-white/5 border border-white/10 hover:border-white/20 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
