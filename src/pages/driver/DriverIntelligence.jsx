import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Brain, ShieldCheck, TrendingUp, DollarSign, FileWarning, Sparkles } from "lucide-react";
import { buildDriverMasterRecord, buildCDLRecord, buildMedicalCardRecord } from "@/lib/driverEnterpriseEvents";
import { buildDriverReadinessScore, buildProfitabilityProfile, driverCopilotPrompts } from "@/lib/driverScorecardEngine";

export default function DriverIntelligence({ user }) {
  const [driver, setDriver] = useState(null);
  const [loads, setLoads] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [events, setEvents] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const drivers = await base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1).catch(() => []);
        const d = drivers?.[0] || null;
        const driverId = d?.id || user.id;
        const [ld, docs, ev, st] = await Promise.all([
          base44.entities.Load.filter({ driver_id: driverId }, "-created_date", 100).catch(() => []),
          base44.entities.DriverDocument?.filter?.({ driver_id: driverId }, "-created_date", 100).catch(() => []) || Promise.resolve([]),
          base44.entities.DriverEvent?.list?.("-created_date", 100).catch(() => []) || Promise.resolve([]),
          base44.entities.Settlement?.filter?.({ driver_id: driverId }, "-created_date", 100).catch(() => []) || Promise.resolve([]),
        ]);
        if (mounted) {
          setDriver(d);
          setLoads(ld || []);
          setDocuments(docs || []);
          setEvents((ev || []).filter((event) => event.driver_id === driverId || event.entity_id === driverId));
          setSettlements(st || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [user?.id]);

  const readiness = buildDriverReadinessScore({ driver: driver || {}, loads, documents, events, settlements });
  const profitability = buildProfitabilityProfile(loads, settlements);
  const master = buildDriverMasterRecord(driver || {}, user || {});
  const cdl = buildCDLRecord(driver || {});
  const medical = buildMedicalCardRecord(driver || {});
  const prompts = driverCopilotPrompts();

  if (loading) return <div className="p-8 text-center text-slate-400">Loading driver intelligence…</div>;

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link to="/driver/profile" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"><ChevronLeft className="h-5 w-5" /></Link>
        <div><p className="text-[10px] uppercase tracking-[0.3em] text-green-400 font-bold">Driver Intelligence</p><h1 className="text-2xl font-black text-white">Readiness Center</h1></div>
      </div>

      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
        <div className="flex items-center justify-between"><div><div className="text-xs text-green-300 uppercase font-bold">Overall readiness</div><div className="text-4xl font-black text-white mt-1">{readiness.overall_score}</div></div><Brain className="h-10 w-10 text-green-400" /></div>
        <p className="mt-3 text-sm text-green-100">{readiness.recommended_action}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric icon={ShieldCheck} label="Compliance" value={readiness.compliance_score} />
        <Metric icon={TrendingUp} label="Performance" value={readiness.performance_score} />
        <Metric icon={DollarSign} label="Finance" value={readiness.finance_score} />
      </div>

      <Section title="Enterprise Driver Master Record">
        <Row label="Type" value={`${master.employee_type} / ${master.contractor_type}`} />
        <Row label="Availability" value={master.availability_status} />
        <Row label="Duty Status" value={master.duty_status} />
        <Row label="Active Load" value={master.active_load_id || "None"} />
      </Section>

      <Section title="CDL + Medical Card">
        <Row label="CDL" value={`${cdl.class || "—"} ${cdl.issuing_state || ""} · ${cdl.verification_status}`} />
        <Row label="CDL Expiration" value={cdl.expiration || "Missing"} />
        <Row label="Medical Expiration" value={medical.expiration_date || "Missing"} />
        <Row label="Medical Status" value={medical.verification_status} />
      </Section>

      <Section title="Compliance Alerts">
        {readiness.compliance.alerts.length === 0 ? <div className="text-sm text-green-300">No compliance blockers found.</div> : readiness.compliance.alerts.map((item) => <div key={item.type} className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100"><FileWarning className="h-4 w-4" /> {item.type.replace(/_/g, " ")} · {item.status}</div>)}
      </Section>

      <Section title="Profitability / Settlement View">
        <Row label="Gross Revenue" value={`$${profitability.gross_revenue.toLocaleString()}`} />
        <Row label="Settlement Cost" value={`$${profitability.settlement_cost.toLocaleString()}`} />
        <Row label="Net Margin" value={`$${profitability.net_margin.toLocaleString()}`} />
        <Row label="Revenue / Mile" value={`$${profitability.revenue_per_mile}`} />
      </Section>

      <Section title="AI Driver Copilot Prompts">
        <div className="grid gap-2">{prompts.map((prompt) => <div key={prompt} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-green-400" />{prompt}</div>)}</div>
      </Section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3 text-center"><Icon className="mx-auto mb-1 h-4 w-4 text-green-400" /><div className="text-lg font-black text-white">{value}</div><div className="text-[10px] uppercase text-slate-500">{label}</div></div>;
}

function Section({ title, children }) {
  return <div className="glass-card rounded-2xl border border-white/5 p-4"><h2 className="mb-3 text-sm font-bold text-white">{title}</h2><div className="space-y-2">{children}</div></div>;
}

function Row({ label, value }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-200">{value}</span></div>;
}
