import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { AlertCircle, CheckCircle, ChevronLeft, Loader2, Save, ShieldCheck, Truck } from "lucide-react";
import { EQUIPMENT_CLASSES } from "@/lib/equipmentMatching";
import DriverReadinessCard from "@/components/driver/DriverReadinessCard";

const TRAILER_TYPES = ["None", "Dry Van", "Reefer", "Flatbed", "Step Deck", "Hot Shot", "Gooseneck", "Fifth Wheel", "Car Hauler", "Power Only"];
const STATUS_OPTIONS = ["available", "off_duty", "will_available", "maintenance", "out_of_service"];
const COMPLIANCE_OPTIONS = ["valid", "approved", "needs_review", "expired", "missing"];

export default function DriverAboutVehicle({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [truck, setTruck] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const drivers = await base44.entities.Driver.filter({ user_id: user?.id }, "-created_date", 1);
      const d = drivers?.[0] || null;
      let t = null;
      if (d?.truck_id) {
        const trucks = await base44.entities.Truck.filter({ id: d.truck_id }, "", 1);
        t = trucks?.[0] || null;
      }
      setDriver(d);
      setTruck(t);
      setForm(buildForm(d, t));
    } catch (error) {
      console.error("Error fetching vehicle profile:", error);
      setNotice("Could not load vehicle profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!driver?.id) {
      setNotice("Driver profile is missing. Contact dispatcher to create your driver profile first.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const driverPayload = {
        vehicle_type: form.vehicle_type,
        trailer_type: form.trailer_type === "None" ? "" : form.trailer_type,
        max_payload: Number(form.max_payload || 0),
        availability: form.availability,
        status: form.availability,
        compliance_status: form.compliance_status,
        license_status: form.license_status,
        insurance_status: form.insurance_status,
        insurance_expiry: form.insurance_expiry,
        annual_inspection_expiry: form.annual_inspection_expiry,
        home_city: form.home_city,
        home_state: form.home_state,
        home_zip: form.home_zip,
        updated_at: new Date().toISOString(),
      };
      await base44.entities.Driver.update(driver.id, driverPayload);

      if (truck?.id) {
        await base44.entities.Truck.update(truck.id, {
          status: form.truck_status,
          equipment_type: form.vehicle_type,
          trailer_type: form.trailer_type === "None" ? "" : form.trailer_type,
          max_payload: Number(form.max_payload || 0),
          insurance_expiry: form.insurance_expiry,
          annual_inspection_expiry: form.annual_inspection_expiry,
          odometer: form.odometer ? Number(form.odometer) : truck.odometer,
          updated_at: new Date().toISOString(),
        });
      }

      setNotice("Vehicle and readiness profile saved.");
      await fetchData();
    } catch (error) {
      console.error(error);
      setNotice("Save failed. Check Driver/Truck fields in Base44.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 pb-24"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 pb-24 animate-slide-up">
      <div className="flex items-center justify-between px-4 pt-2 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-white font-bold text-lg">Vehicle & Readiness</h1>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-60">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
        </button>
      </div>

      <div className="px-4"><DriverReadinessCard user={user} driver={{ ...driver, ...form }} truck={truck} /></div>

      {notice && <div className="mx-4 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">{notice}</div>}

      {!driver && (
        <div className="mx-4 glass-card rounded-xl p-5 border border-amber-500/20 bg-amber-500/5 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-amber-400 font-semibold">No driver profile found</p>
          <p className="text-amber-300/70 text-xs mt-1">Ask admin/dispatcher to create your driver profile first.</p>
        </div>
      )}

      <div className="mx-4 glass-card rounded-2xl border border-white/5 overflow-hidden">
        <SectionTitle icon={<Truck className="w-4 h-4 text-orange-400" />} title="Equipment Setup" />
        <div className="p-4 space-y-3">
          <Field label="Equipment Type"><Select value={form.vehicle_type} onChange={(value) => handleChange("vehicle_type", value)} options={EQUIPMENT_CLASSES} /></Field>
          <Field label="Trailer Type"><Select value={form.trailer_type} onChange={(value) => handleChange("trailer_type", value)} options={TRAILER_TYPES} /></Field>
          <Field label="Max Payload (lbs)"><Input type="number" value={form.max_payload} onChange={(value) => handleChange("max_payload", value)} placeholder="Example: 3000" /></Field>
          <Field label="Availability"><Select value={form.availability} onChange={(value) => handleChange("availability", value)} options={STATUS_OPTIONS} /></Field>
          {truck && <Field label="Truck Status"><Select value={form.truck_status} onChange={(value) => handleChange("truck_status", value)} options={["active", "idle", "maintenance", "out_of_service"]} /></Field>}
        </div>
      </div>

      <div className="mx-4 glass-card rounded-2xl border border-white/5 overflow-hidden">
        <SectionTitle icon={<ShieldCheck className="w-4 h-4 text-green-400" />} title="Compliance" />
        <div className="p-4 space-y-3">
          <Field label="Compliance Status"><Select value={form.compliance_status} onChange={(value) => handleChange("compliance_status", value)} options={COMPLIANCE_OPTIONS} /></Field>
          <Field label="License Status"><Select value={form.license_status} onChange={(value) => handleChange("license_status", value)} options={COMPLIANCE_OPTIONS} /></Field>
          <Field label="Insurance Status"><Select value={form.insurance_status} onChange={(value) => handleChange("insurance_status", value)} options={COMPLIANCE_OPTIONS} /></Field>
          <Field label="Insurance Expiry"><Input type="date" value={form.insurance_expiry} onChange={(value) => handleChange("insurance_expiry", value)} /></Field>
          <Field label="Annual Inspection Expiry"><Input type="date" value={form.annual_inspection_expiry} onChange={(value) => handleChange("annual_inspection_expiry", value)} /></Field>
        </div>
      </div>

      <div className="mx-4 glass-card rounded-2xl border border-white/5 overflow-hidden">
        <SectionTitle icon={<CheckCircle className="w-4 h-4 text-blue-400" />} title="Home Base" />
        <div className="p-4 space-y-3">
          <Field label="Home City"><Input value={form.home_city} onChange={(value) => handleChange("home_city", value)} placeholder="Fayetteville" /></Field>
          <Field label="Home State"><Input value={form.home_state} onChange={(value) => handleChange("home_state", value)} placeholder="NC" /></Field>
          <Field label="Home ZIP"><Input value={form.home_zip} onChange={(value) => handleChange("home_zip", value)} placeholder="28301" /></Field>
          {truck && <Field label="Odometer"><Input type="number" value={form.odometer} onChange={(value) => handleChange("odometer", value)} placeholder="Miles" /></Field>}
        </div>
      </div>

      {truck ? <TruckSummary truck={truck} /> : <OwnerOperatorNote />}
    </div>
  );
}

function buildForm(driver, truck) {
  return {
    vehicle_type: driver?.vehicle_type || truck?.equipment_type || truck?.type || "Sprinter",
    trailer_type: driver?.trailer_type || truck?.trailer_type || "None",
    max_payload: driver?.max_payload || truck?.max_payload || 3000,
    availability: driver?.availability || driver?.status || "available",
    truck_status: truck?.status || "active",
    compliance_status: driver?.compliance_status || "needs_review",
    license_status: driver?.license_status || "unknown",
    insurance_status: driver?.insurance_status || (truck?.insurance_expiry ? "valid" : "unknown"),
    insurance_expiry: formatDate(driver?.insurance_expiry || truck?.insurance_expiry),
    annual_inspection_expiry: formatDate(driver?.annual_inspection_expiry || truck?.annual_inspection_expiry),
    home_city: driver?.home_city || "",
    home_state: driver?.home_state || "",
    home_zip: driver?.home_zip || "",
    odometer: truck?.odometer || "",
  };
}

function formatDate(value) {
  if (!value) return "";
  try { return new Date(value).toISOString().slice(0, 10); } catch { return ""; }
}

function SectionTitle({ icon, title }) {
  return <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">{icon}<h2 className="text-white font-semibold text-sm">{title}</h2></div>;
}

function Field({ label, children }) {
  return <label className="block"><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>{children}</label>;
}

function Input({ value = "", onChange, type = "text", placeholder = "" }) {
  return <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-green-500/40 focus:outline-none" />;
}

function Select({ value = "", onChange, options = [] }) {
  return <select value={value || ""} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-green-500/40 focus:outline-none">{options.map((option) => <option key={option} value={option} style={{ background: "#0F1829" }}>{option.replaceAll("_", " ")}</option>)}</select>;
}

function TruckSummary({ truck }) {
  return (
    <div className="mx-4 glass-card rounded-2xl border border-white/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Unit</div>
      <div className="mt-2 text-lg font-bold text-orange-400 font-mono">{truck.unit_number || "Unit"}</div>
      <div className="text-sm text-white">{truck.year} {truck.make} {truck.model}</div>
      {truck.vin && <div className="mt-2 text-xs text-slate-500">VIN: {truck.vin}</div>}
      {truck.license_plate && <div className="text-xs text-slate-500">Plate: {truck.license_plate} {truck.license_plate_state}</div>}
    </div>
  );
}

function OwnerOperatorNote() {
  return (
    <div className="mx-4 glass-card rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4">
      <div className="text-sm font-bold text-blue-300">Owner-Operator Equipment</div>
      <p className="mt-1 text-xs text-blue-100/70">No company truck is assigned. These details still help dispatch match your own vehicle to compatible loads.</p>
    </div>
  );
}
