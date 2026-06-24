import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Save, Loader2, MapPin, Truck, DollarSign,
  Package, User, Calendar, FileText, AlertTriangle, TrendingUp, TrendingDown, Minus,
  BookTemplate, ArrowRight, Search, X, Zap
} from "lucide-react";
import GeocodingStatus from "@/components/loads/GeocodingStatus";
import { logLoadCreated, logLoadAssigned } from "@/lib/timelineLogger";

const EQUIPMENT_TYPES = ["Dry Van","Flatbed","Reefer","Step Deck","Lowboy","Box Truck","Tanker","Hotshot"];
const PRIORITIES = ["standard","express","critical"];

const FIELD_GROUPS = [
  {
    title: "Route",
    icon: MapPin,
    color: "blue",
    fields: [
      [
        { key: "origin_city",    label: "Origin City *",    type: "text",   required: true },
        { key: "origin_state",   label: "Origin State *",   type: "text",   required: true, maxLength: 2 },
      ],
      [
        { key: "origin_address", label: "Origin Address",   type: "text" },
        { key: "origin_zip",     label: "Origin ZIP",       type: "text" },
      ],
      [
        { key: "destination_city",  label: "Destination City *",  type: "text", required: true },
        { key: "destination_state", label: "Destination State *",  type: "text", required: true, maxLength: 2 },
      ],
      [
        { key: "destination_address", label: "Destination Address", type: "text" },
        { key: "destination_zip",     label: "Destination ZIP",     type: "text" },
      ],
    ],
  },
  {
    title: "Schedule",
    icon: Calendar,
    color: "cyan",
    fields: [
      [
        { key: "pickup_date",   label: "Pickup Date/Time",   type: "datetime-local" },
        { key: "delivery_date", label: "Delivery Date/Time", type: "datetime-local" },
      ],
    ],
  },
  {
    title: "Load Info",
    icon: Package,
    color: "orange",
    fields: [
      [
        { key: "load_number",    label: "Load Number",       type: "text" },
        { key: "bol_number",     label: "BOL Number",        type: "text" },
      ],
      [
        { key: "equipment_type", label: "Equipment Type *",  type: "select", required: true, options: EQUIPMENT_TYPES },
        { key: "priority",       label: "Priority",          type: "select", options: PRIORITIES },
      ],
      [
        { key: "commodity",      label: "Commodity",         type: "text" },
        { key: "weight",         label: "Weight (lbs)",      type: "number" },
      ],
      [
        { key: "miles",          label: "Miles",             type: "number" },
        { key: "pieces",         label: "Pieces",            type: "number" },
      ],
    ],
  },
  {
    title: "Financials",
    icon: DollarSign,
    color: "green",
    fields: [
      [
        { key: "rate",              label: "Rate ($)",            type: "number" },
        { key: "rate_per_mile",     label: "Rate Per Mile ($)",   type: "number" },
      ],
      [
        { key: "fuel_surcharge",    label: "Fuel Surcharge ($)",  type: "number" },
        { key: "accessorial_charges", label: "Accessorial ($)",   type: "number" },
      ],
    ],
  },
  {
    title: "Assignment",
    icon: User,
    color: "purple",
    fields: [],
    custom: true,
  },
  {
    title: "Notes",
    icon: FileText,
    color: "amber",
    fields: [
      [{ key: "special_instructions", label: "Special Instructions", type: "textarea", fullWidth: true }],
      [{ key: "notes",                label: "Internal Notes",        type: "textarea", fullWidth: true }],
    ],
  },
];

const colorMap = {
  blue:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  cyan:   "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  green:  "text-green-400 bg-green-500/10 border-green-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  amber:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors";
const selectClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors";

function TemplatePicker({ templates, onApply, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    return !q || (t.name || "").toLowerCase().includes(q) ||
      (t.origin_city || "").toLowerCase().includes(q) ||
      (t.destination_city || "").toLowerCase().includes(q);
  });

  return (
    <div className="glass-card rounded-2xl border border-orange-500/20 p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookTemplate className="w-4 h-4 text-orange-400" />
          <span className="text-white font-semibold text-sm">Choose a Template</span>
          <span className="text-slate-500 text-xs">— pre-fills route & load details</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, origin, or destination…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No templates match your search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => onApply(t)}
              className="text-left p-3 rounded-xl bg-white/3 border border-white/5 hover:border-orange-500/25 hover:bg-orange-500/5 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-white text-sm font-medium truncate">{t.name}</span>
                <Zap className="w-3.5 h-3.5 text-orange-400 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{t.origin_city}, {t.origin_state}</span>
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{t.destination_city}, {t.destination_state}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{t.equipment_type}</span>
                {t.miles && <span>{t.miles} mi</span>}
                {t.rate && <span className="text-green-400">${t.rate.toLocaleString()}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Fuel cost defaults: ~$3.80/gal diesel, ~7 MPG average Class 8
const DEFAULT_FUEL_PRICE = 3.80;
const DEFAULT_MPG = 7;

function MarginCalculator({ form, set, drivers }) {
  const miles        = parseFloat(form.miles) || 0;
  const rate         = parseFloat(form.rate) || 0;
  const fuelSurcharge = parseFloat(form.fuel_surcharge) || 0;
  const accessorial  = parseFloat(form.accessorial_charges) || 0;
  const totalRevenue = rate + fuelSurcharge + accessorial;

  // Editable estimates
  const [fuelPrice, setFuelPrice] = useState(DEFAULT_FUEL_PRICE);
  const [mpg, setMpg]             = useState(DEFAULT_MPG);
  const [driverPayPct, setDriverPayPct] = useState(25); // % of rate

  // Find assigned driver's pay details
  const assignedDriver = drivers.find(d => d.id === form.driver_id);
  const driverPayType = assignedDriver?.pay_type || "percentage";
  const driverPayRate = parseFloat(assignedDriver?.pay_rate) || 0;

  let estimatedDriverPay = 0;
  if (assignedDriver) {
    if (driverPayType === "percentage")  estimatedDriverPay = (rate * (driverPayRate || driverPayPct)) / 100;
    else if (driverPayType === "per_mile") estimatedDriverPay = miles * driverPayRate;
    else if (driverPayType === "flat_rate") estimatedDriverPay = driverPayRate;
    else estimatedDriverPay = (rate * driverPayPct) / 100; // fallback
  } else {
    estimatedDriverPay = (rate * driverPayPct) / 100;
  }

  const estimatedFuelCost = miles > 0 ? (miles / mpg) * fuelPrice : 0;
  const totalExpenses = estimatedFuelCost + estimatedDriverPay;
  const netProfit = totalRevenue - totalExpenses;
  const marginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const isGood = marginPct >= 20;
  const isTight = marginPct >= 5 && marginPct < 20;

  const fmt = n => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-green-400 bg-green-500/10 border-green-500/20">
          <TrendingUp className="w-4 h-4" />
        </div>
        <h2 className="text-white font-semibold">Margin Calculator</h2>
        <span className="text-slate-500 text-xs ml-1">estimate only</span>
      </div>

      {/* Assumptions row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-slate-400 text-xs block mb-1">Fuel Price ($/gal)</label>
          <input type="number" step="0.01" value={fuelPrice}
            onChange={e => setFuelPrice(parseFloat(e.target.value) || 0)}
            className={inputClass} />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Avg MPG</label>
          <input type="number" step="0.5" value={mpg}
            onChange={e => setMpg(parseFloat(e.target.value) || 1)}
            className={inputClass} />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">
            {assignedDriver && driverPayType !== "percentage" ? "Driver Pay Override (%)" : "Driver Pay (%)"}
          </label>
          <input type="number" step="1" value={driverPayPct}
            onChange={e => setDriverPayPct(parseFloat(e.target.value) || 0)}
            className={inputClass}
            disabled={!!assignedDriver && driverPayType !== "percentage"}
            title={assignedDriver ? `Driver pay type: ${driverPayType}` : ""}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-white/5 bg-white/2 divide-y divide-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-slate-400 text-sm">Total Revenue</span>
          <span className="text-green-400 font-semibold">${fmt(totalRevenue)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-slate-400 text-sm">Est. Fuel Cost {miles > 0 ? `(${fmt(miles)} mi)` : ""}</span>
          <span className="text-red-400 font-medium">− ${fmt(estimatedFuelCost)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-slate-400 text-sm">
            Est. Driver Pay {assignedDriver ? `(${assignedDriver.first_name} · ${driverPayType.replace("_", " ")})` : "(% of rate)"}
          </span>
          <span className="text-red-400 font-medium">− ${fmt(estimatedDriverPay)}</span>
        </div>
        <div className={`flex items-center justify-between px-4 py-3 ${
          isGood ? "bg-green-500/8" : isTight ? "bg-amber-500/8" : netProfit < 0 ? "bg-red-500/8" : "bg-white/2"
        }`}>
          <div className="flex items-center gap-2">
            {netProfit > 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> :
             netProfit < 0 ? <TrendingDown className="w-4 h-4 text-red-400" /> :
             <Minus className="w-4 h-4 text-slate-400" />}
            <span className="text-white font-semibold">Net Profit</span>
          </div>
          <div className="text-right">
            <span className={`font-bold text-lg ${isGood ? "text-green-400" : isTight ? "text-amber-400" : netProfit < 0 ? "text-red-400" : "text-slate-300"}`}>
              ${fmt(netProfit)}
            </span>
            {totalRevenue > 0 && (
              <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-md border ${
                isGood  ? "bg-green-500/15 border-green-500/25 text-green-300" :
                isTight ? "bg-amber-500/15 border-amber-500/25 text-amber-300" :
                          "bg-red-500/15 border-red-500/25 text-red-300"
              }`}>
                {marginPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hint messages */}
      {totalRevenue === 0 && (
        <p className="text-slate-500 text-xs">Enter a rate and miles above to see the profit estimate.</p>
      )}
      {totalRevenue > 0 && netProfit < 0 && (
        <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> This load is estimated to run at a loss. Consider adjusting the rate.</p>
      )}
      {totalRevenue > 0 && isTight && (
        <p className="text-amber-400 text-xs flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Tight margin — under 20%. Review rate or expenses before confirming.</p>
      )}
    </div>
  );
}

export default function LoadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const [form, setForm] = useState({
    status: "available", priority: "standard", equipment_type: "Dry Van",
    is_hazmat: false,
  });
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  useEffect(() => {
    const fetchDrivers = base44.entities.Driver.list("-created_date", 100);
    const fetchTrucks  = base44.entities.Truck.filter({ status: "idle" }, "-created_date", 100).catch(() => base44.entities.Truck.list("-created_date", 100));
    const fetchTemplates = base44.entities.LoadTemplate.list("-times_used", 100);
    Promise.all([fetchDrivers, fetchTrucks, fetchTemplates]).then(([d, t, tmpl]) => {
      setDrivers(d);
      setTrucks(t);
      setTemplates(tmpl);
    }).catch(console.error);

    if (isEdit) {
      base44.entities.Load.filter({ id }, "-created_date", 1)
        .then(res => { if (res[0]) setForm(res[0]); })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
  };

  // Trigger auto-geocode whenever origin or destination address/city/state changes
  const triggerGeocode = async (updatedForm) => {
    const originAddr = [updatedForm.origin_address, updatedForm.origin_city, updatedForm.origin_state, updatedForm.origin_zip].filter(Boolean).join(", ");
    const destAddr = [updatedForm.destination_address, updatedForm.destination_city, updatedForm.destination_state, updatedForm.destination_zip].filter(Boolean).join(", ");
    const needsOrigin = !updatedForm.origin_lat && originAddr;
    const needsDest = !updatedForm.destination_lat && destAddr;
    if (!needsOrigin && !needsDest) return;
    // small debounce already handled by blur in fields; just attempt
    const results = {};
    if (needsOrigin) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(originAddr)}`;
        const r = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "HASTEN-TMS/1.0" } });
        const d = await r.json();
        if (d[0]) { results.origin_lat = parseFloat(d[0].lat); results.origin_lng = parseFloat(d[0].lon); }
      } catch {}
    }
    if (needsDest) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destAddr)}`;
        const r = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "HASTEN-TMS/1.0" } });
        const d = await r.json();
        if (d[0]) { results.destination_lat = parseFloat(d[0].lat); results.destination_lng = parseFloat(d[0].lon); }
      } catch {}
    }
    if (Object.keys(results).length) setForm(f => ({ ...f, ...results }));
  };

  const setAndGeocode = (key, val) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      if (key.startsWith("origin")) { delete updated.origin_lat; delete updated.origin_lng; }
      if (key.startsWith("destination")) { delete updated.destination_lat; delete updated.destination_lng; }
      return updated;
    });
    if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
    // triggerGeocode is called on blur with latest form via onBlur
  };

  const applyTemplate = (template) => {
    setForm(f => ({
      ...f,
      origin_city: template.origin_city || f.origin_city,
      origin_state: template.origin_state || f.origin_state,
      origin_address: template.origin_address || f.origin_address,
      origin_zip: template.origin_zip || f.origin_zip,
      destination_city: template.destination_city || f.destination_city,
      destination_state: template.destination_state || f.destination_state,
      destination_address: template.destination_address || f.destination_address,
      destination_zip: template.destination_zip || f.destination_zip,
      equipment_type: template.equipment_type || f.equipment_type,
      commodity: template.commodity || f.commodity,
      weight: template.weight || f.weight,
      miles: template.miles || f.miles,
      rate: template.rate || f.rate,
      rate_per_mile: template.rate_per_mile || f.rate_per_mile,
      fuel_surcharge: template.fuel_surcharge || f.fuel_surcharge,
      priority: template.priority || f.priority,
      special_instructions: template.special_instructions || f.special_instructions,
    }));
    // Increment usage count silently
    base44.entities.LoadTemplate.update(template.id, { times_used: (template.times_used || 0) + 1 }).catch(() => {});
    setShowTemplatePicker(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.origin_city?.trim()) errs.origin_city = "Required";
    if (!form.origin_state?.trim()) errs.origin_state = "Required";
    if (!form.destination_city?.trim()) errs.destination_city = "Required";
    if (!form.destination_state?.trim()) errs.destination_state = "Required";
    if (!form.equipment_type) errs.equipment_type = "Required";
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      // Get current user for timeline logging
      let currentUser = null;
      try {
        currentUser = await base44.auth.me();
      } catch {
        currentUser = { id: 'system', role: 'system', full_name: 'System' };
      }

      // Validate compliance before assignment
      if (form.driver_id || form.truck_id) {
        const validation = await base44.functions.invoke('validateAssignmentCompliance', {
          driver_id: form.driver_id,
          truck_id: form.truck_id
        });

        if (!validation.allowed) {
          // Show compliance error
          const errorMsg = [];
          if (validation.driver_blocked) errorMsg.push(`Driver blocked: ${validation.driver_block_reason}`);
          if (validation.truck_blocked) errorMsg.push(`Truck blocked: ${validation.truck_block_reason}`);
          setErrors({ _compliance: errorMsg.join(' | ') });
          setSaving(false);
          return;
        }

        // Show warnings if any
        if (validation.warnings?.length > 0) {
          console.warn('Assignment warnings:', validation.warnings);
        }
      }

      const payload = { ...form };
      // Remove empty strings
      Object.keys(payload).forEach(k => { if (payload[k] === "") delete payload[k]; });
      // Auto-calculate total_revenue
      payload.total_revenue = (parseFloat(payload.rate) || 0) + (parseFloat(payload.fuel_surcharge) || 0) + (parseFloat(payload.accessorial_charges) || 0);

      if (isEdit) {
        if (payload.driver_id || payload.status === "assigned") {
          await base44.functions.invoke('updateLoadStatus', { load_id: id, new_status: payload.status || "assigned", driver_id: payload.driver_id });
        } else {
          await base44.entities.Load.update(id, payload);
        }
        navigate(`/loads/${id}`);
      } else {
        const created = await base44.entities.Load.create(payload);
        // Timeline event for load creation
        await logLoadCreated(created.id, created.load_number || created.id, currentUser);

        if (payload.driver_id) {
          await base44.functions.invoke('updateLoadStatus', { load_id: created.id, new_status: "assigned", driver_id: payload.driver_id });
        }
        navigate(`/loads/${created.id}`);
      }
    } catch (err) {
      console.error(err);
      setErrors({ _save: err.message });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const error = errors[field.key];
    const base = error ? "border-red-500/40 bg-red-500/5" : "";
    if (field.type === "select") return (
      <div key={field.key}>
        <label className="text-slate-400 text-xs block mb-1">{field.label}</label>
        <select value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)}
          className={`${selectClass} ${base}`} style={{ background: "#0F1829" }}>
          <option value="" style={{ background: "#0F1829" }}>— Select —</option>
          {field.options.map(o => <option key={o} value={o} style={{ background: "#0F1829" }}>{o}</option>)}
        </select>
        {error && <p className="text-red-400 text-xs mt-0.5">{error}</p>}
      </div>
    );
    // Route address fields get blur-geocode and clear-on-change
    const isRouteAddr = ["origin_address","origin_city","origin_state","origin_zip","destination_address","destination_city","destination_state","destination_zip"].includes(field.key);
    if (field.type === "textarea") return (
      <div key={field.key} className={field.fullWidth ? "col-span-2" : ""}>
        <label className="text-slate-400 text-xs block mb-1">{field.label}</label>
        <textarea value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)} rows={3}
          className={`${inputClass} resize-none`} />
      </div>
    );
    return (
      <div key={field.key}>
        <label className="text-slate-400 text-xs block mb-1">{field.label}</label>
        <input type={field.type} value={form[field.key] || ""}
          maxLength={field.maxLength}
          onChange={e => {
            const val = field.type === "number" ? e.target.value : (field.maxLength ? e.target.value.toUpperCase() : e.target.value);
            isRouteAddr ? setAndGeocode(field.key, val) : set(field.key, val);
          }}
          onBlur={() => {
            if (isRouteAddr) triggerGeocode(form);
          }}
          className={`${inputClass} ${base}`} />
        {error && <p className="text-red-400 text-xs mt-0.5">{error}</p>}
      </div>
    );
  };

  if (loading) return <div className="skeleton h-96 rounded-xl" />;

  return (
    <div className="max-w-3xl space-y-5 animate-slide-up">
      {/* Compliance Error */}
      {errors._compliance && (
        <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-bold text-sm">Cannot Assign — Compliance Issue</p>
              <p className="text-red-300/70 text-xs mt-1">{errors._compliance}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={isEdit ? `/loads/${id}` : "/loads"}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-heading font-bold text-2xl">{isEdit ? "Edit Load" : "New Load"}</h1>
          <p className="text-slate-400 text-sm">{isEdit ? "Update load details and assignment" : "Create a new load and assign a driver"}</p>
        </div>
        {!isEdit && templates.length > 0 && (
          <button
            onClick={() => setShowTemplatePicker(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={showTemplatePicker
              ? { background: "rgba(234,88,12,0.12)", borderColor: "rgba(234,88,12,0.3)", color: "#F97316" }
              : { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#94a3b8" }}
          >
            <BookTemplate className="w-4 h-4" />
            Use Template
          </button>
        )}
      </div>

      {/* Template Picker Panel */}
      {showTemplatePicker && (
        <TemplatePicker templates={templates} onApply={applyTemplate} onClose={() => setShowTemplatePicker(false)} />
      )}

      {FIELD_GROUPS.map(group => {
        const c = colorMap[group.color] || colorMap.orange;
        const [textColor] = c.split(" ");
        return (
          <div key={group.title} className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${c}`}>
                <group.icon className={`w-4 h-4 ${textColor}`} />
              </div>
              <h2 className="text-white font-semibold">{group.title}</h2>
            </div>

            {/* Route group — inject geocoding status + manual coord fields */}
            {group.title === "Route" && (
              <div className="space-y-3">
                <GeocodingStatus
                  originAddress={[form.origin_address, form.origin_city, form.origin_state, form.origin_zip].filter(Boolean).join(", ")}
                  destinationAddress={[form.destination_address, form.destination_city, form.destination_state, form.destination_zip].filter(Boolean).join(", ")}
                  coords={{ origin_lat: form.origin_lat, origin_lng: form.origin_lng, destination_lat: form.destination_lat, destination_lng: form.destination_lng }}
                  onCoordsResolved={results => setForm(f => ({ ...f, ...results }))}
                />
                {/* Manual coordinate override — collapsed by default */}
                {(!form.origin_lat || !form.destination_lat) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">Origin Lat (manual)</label>
                      <input type="number" step="any" value={form.origin_lat || ""} onChange={e => set("origin_lat", e.target.value ? parseFloat(e.target.value) : "")} className={inputClass} placeholder="e.g. 41.8781" />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">Origin Lng (manual)</label>
                      <input type="number" step="any" value={form.origin_lng || ""} onChange={e => set("origin_lng", e.target.value ? parseFloat(e.target.value) : "")} className={inputClass} placeholder="e.g. -87.6298" />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">Dest Lat (manual)</label>
                      <input type="number" step="any" value={form.destination_lat || ""} onChange={e => set("destination_lat", e.target.value ? parseFloat(e.target.value) : "")} className={inputClass} placeholder="e.g. 34.0522" />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">Dest Lng (manual)</label>
                      <input type="number" step="any" value={form.destination_lng || ""} onChange={e => set("destination_lng", e.target.value ? parseFloat(e.target.value) : "")} className={inputClass} placeholder="e.g. -118.2437" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom assignment section */}
            {group.custom ? (
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Assign Driver</label>
                  <select value={form.driver_id || ""} onChange={e => set("driver_id", e.target.value)}
                    className={selectClass} style={{ background: "#0F1829" }}>
                    <option value="" style={{ background: "#0F1829" }}>— Unassigned —</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id} style={{ background: "#0F1829" }}>
                        {d.first_name} {d.last_name} — {d.status} {d.license_class ? `· CDL-${d.license_class}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Assign Truck</label>
                    <select value={form.truck_id || ""} onChange={e => set("truck_id", e.target.value)}
                      className={selectClass} style={{ background: "#0F1829" }}>
                      <option value="" style={{ background: "#0F1829" }}>— No Truck —</option>
                      {trucks.map(t => (
                        <option key={t.id} value={t.id} style={{ background: "#0F1829" }}>
                          #{t.unit_number} — {t.year} {t.make} {t.model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Status</label>
                    <select value={form.status || "available"} onChange={e => set("status", e.target.value)}
                      className={selectClass} style={{ background: "#0F1829" }}>
                      {["available","assigned","accepted","en_route","arrived_pickup","loaded","in_transit","arrived_delivery","delivered","pod_uploaded","completed","cancelled"]
                        .map(s => <option key={s} value={s} style={{ background: "#0F1829" }}>{s.replace(/_/g," ")}</option>)}
                    </select>
                  </div>
                </div>
                {/* Hazmat toggle */}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set("is_hazmat", !form.is_hazmat)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${form.is_hazmat ? "bg-orange-500" : "bg-white/10"}`}
                    style={{ width: "40px", height: "22px" }}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_hazmat ? "translate-x-5" : "translate-x-0.5"}`} style={{ transitionDuration: "150ms" }} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className={`w-4 h-4 ${form.is_hazmat ? "text-orange-400" : "text-slate-600"}`} />
                    <span className={`text-sm ${form.is_hazmat ? "text-orange-400 font-medium" : "text-slate-500"}`}>Hazmat Load</span>
                  </div>
                </div>
              </div>
            ) : (
              group.fields.map((row, ri) => (
                <div key={ri} className={`grid gap-3 ${row.length === 1 && row[0].fullWidth ? "grid-cols-1" : "grid-cols-2"}`}>
                  {row.map(field => renderField(field))}
                </div>
              ))
            )}
          </div>
        );
      })}

      {/* Margin Calculator */}
      <MarginCalculator form={form} set={set} drivers={drivers} />

      {/* Save */}
      <div className="flex gap-3 pb-6">
        <Link to={isEdit ? `/loads/${id}` : "/loads"}
          className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-medium text-center hover:text-white transition-colors">
          Cancel
        </Link>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", boxShadow: "0 4px 20px rgba(234,88,12,0.25)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Load"}
        </button>
      </div>
    </div>
  );
}