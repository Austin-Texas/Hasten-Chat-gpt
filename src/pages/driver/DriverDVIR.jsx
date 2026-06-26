import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ClipboardCheck, Save, CheckCircle2 } from "lucide-react";
import { DRIVER_EVENTS, logDriverEvent } from "@/lib/driverEnterpriseEvents";

const CHECKS = ["Brakes", "Lights", "Tires", "Mirrors", "Horn", "Steering", "Suspension", "Leaks", "Coupling", "Emergency Equipment"];

export default function DriverDVIR({ user }) {
  const [driver, setDriver] = useState(null);
  const [inspectionType, setInspectionType] = useState("pre_trip");
  const [checked, setChecked] = useState({});
  const [severity, setSeverity] = useState("none");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1).then((records) => setDriver(records?.[0] || null)).catch(() => {});
  }, [user?.id]);

  const toggle = (item) => setChecked((prev) => ({ ...prev, [item]: !prev[item] }));

  const save = async () => {
    setSaving(true);
    try {
      const defects = CHECKS.filter((item) => !checked[item]);
      const payload = {
        driver_id: driver?.id,
        truck_id: driver?.truck_id,
        inspection_type: inspectionType,
        defects,
        defect_severity: defects.length ? severity : "none",
        notes,
        status: defects.length ? "review_needed" : "passed",
        created_at: new Date().toISOString(),
      };
      await base44.entities.DVIR.create(payload).catch(() => null);
      await logDriverEvent(DRIVER_EVENTS.DRIVER_DVIR_SUBMITTED, { driver_id: driver?.id, truck_id: driver?.truck_id, entity_type: "DVIR", title: "DVIR submitted", description: payload.status });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      <div className="flex items-center gap-3"><Link to="/driver/profile" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"><ChevronLeft className="h-5 w-5" /></Link><div><p className="text-[10px] uppercase tracking-[0.3em] text-green-400 font-bold">Inspection</p><h1 className="text-2xl font-black text-white">DVIR</h1></div></div>
      {saved && <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300"><CheckCircle2 className="mr-2 inline h-4 w-4" />DVIR saved.</div>}
      <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-4">
        <div><label className="text-xs font-bold uppercase text-slate-500">Inspection Type</label><select value={inspectionType} onChange={(e) => setInspectionType(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"><option value="pre_trip">Pre-trip</option><option value="post_trip">Post-trip</option></select></div>
        <div className="grid gap-2">{CHECKS.map((item) => <button key={item} onClick={() => toggle(item)} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${checked[item] ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-amber-500/20 bg-amber-500/10 text-amber-100"}`}><span>{item}</span><ClipboardCheck className="h-4 w-4" /></button>)}</div>
        <div><label className="text-xs font-bold uppercase text-slate-500">Defect Severity</label><select value={severity} onChange={(e) => setSeverity(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"><option value="none">None</option><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option></select></div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes, defects, repair comments..." className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white" rows="4" />
        <button onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-3 font-black text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Submit DVIR"}</button>
      </div>
    </div>
  );
}
