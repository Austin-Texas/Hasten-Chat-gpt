import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";

const FIELD_GROUPS = {
  company: {
    title: "Broker Information",
    color: "blue",
    fields: [
      { name: "company_name", label: "Broker Company Name", type: "text", required: true },
      { name: "type", label: "Type", type: "select", options: ["broker", "shipper"], required: true },
    ]
  },
  contact: {
    title: "Contact Information",
    color: "purple",
    fields: [
      { name: "contact_name", label: "Primary Contact", type: "text", required: true },
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
      { name: "mc_number", label: "MC Number", type: "text", hint: "Motor Carrier number for verification", required: true },
      { name: "dot_number", label: "DOT Number", type: "text", hint: "Department of Transportation number" },
    ]
  },
  billing: {
    title: "Billing & Credit Setup",
    color: "green",
    fields: [
      { name: "payment_terms", label: "Payment Terms", type: "select", options: ["net15", "net30", "net45", "net60", "quick_pay"], required: true },
      { name: "credit_limit", label: "Credit Limit ($)", type: "number", required: true },
    ]
  },
  lanes: {
    title: "Service Details",
    color: "amber",
    fields: [
      { name: "lanes", label: "Primary Lanes", type: "text", hint: "e.g., TX-CA, Regional, OTR" },
      { name: "preferred_equipment", label: "Equipment Types Offered", type: "text", hint: "e.g., Dry Van, Flatbed, Reefer" },
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

export default function BrokerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    company_name: "",
    type: "broker",
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
    credit_limit: "",
    lanes: "",
    preferred_equipment: "",
    notes: "",
  });

  useEffect(() => {
    if (id) {
      base44.entities.Client.get(id)
        .then(broker => {
          if (broker) {
            setData(broker);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (id) {
        await base44.entities.Client.update(id, data);
      } else {
        await base44.entities.Client.create(data);
      }
      navigate("/crm");
    } catch (err) {
      console.error(err);
      alert("Error saving broker: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
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
        <h1 className="text-white font-heading font-bold text-2xl">
          {id ? "Edit Broker" : "Add New Broker"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {Object.entries(FIELD_GROUPS).map(([groupKey, group]) => (
          <div key={groupKey} className={`glass-card rounded-xl p-6 border ${colorStyles[group.color]}`}>
            <h2 className={`text-lg font-heading font-semibold mb-4 ${headerColorText[group.color]}`}>
              {group.title}
            </h2>

            <div className="space-y-4">
              {group.fields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {field.label}
                    {field.required && <span className="text-orange-400">*</span>}
                  </label>

                  {field.type === "select" ? (
                    <select
                      value={data[field.name] || ""}
                      onChange={e => handleChange(field.name, e.target.value)}
                      required={field.required}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors text-sm"
                      style={{ background: "hsl(222 40% 7%)" }}
                    >
                      <option value="" style={{ background: "hsl(222 40% 7%)" }}>Select…</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt} style={{ background: "hsl(222 40% 7%)" }}>
                          {opt.replace(/_/g, " ").toUpperCase()}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={data[field.name] || ""}
                      onChange={e => handleChange(field.name, e.target.value)}
                      required={field.required}
                      rows="4"
                      placeholder={field.hint || ""}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors text-sm"
                      style={{ background: "hsl(222 40% 7%)" }}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={data[field.name] || ""}
                      onChange={e => handleChange(field.name, e.target.value)}
                      required={field.required}
                      placeholder={field.hint || ""}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors text-sm"
                      style={{ background: "hsl(222 40% 7%)" }}
                    />
                  )}

                  {field.hint && (
                    <p className="text-xs text-slate-500 mt-1">{field.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-sm disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving…" : id ? "Update Broker" : "Create Broker"}
          </button>
          <Link to="/crm" className="px-6 py-3 rounded-lg font-semibold text-slate-300 text-sm hover:text-white bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}