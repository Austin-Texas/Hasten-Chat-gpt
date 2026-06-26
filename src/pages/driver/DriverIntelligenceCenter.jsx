import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  AlertTriangle,
  Award,
  Bot,
  ChevronLeft,
  DollarSign,
  FileWarning,
  Gauge,
  Loader2,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Signal,
  TrendingUp,
  Truck,
  WifiOff,
} from "lucide-react";
import DriverEnterprisePortalPanels from "@/components/driver/DriverEnterprisePortalPanels";
import DriverWorkflowControls from "@/components/driver/DriverWorkflowControls";
import {
  buildDriverMasterRecord,
  buildDriverProfitability,
  buildDriverRewardProfile,
  calculateDriverRiskScore,
  detectDriverFraudSignals,
  DRIVER_COMPLIANCE_REQUIREMENTS,
  DRIVER_COPILOT_PROMPTS,
  DRIVER_REQUIRED_MODULES,
  DRIVER_SAFETY_SIGNALS,
  DRIVER_SCORECARD_METRICS,
  DRIVER_WORKFLOWS,
} from "@/lib/driverEnterprise";

const cardBase = "glass-card rounded-2xl border border-white/5 p-4";

function Stat({ label, value, tone = "white" }) {
  const tones = {
    white: "text-white",
    green: "text-green-400",
    amber: "text-amber-400",
    red: "text-red-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
  };
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className={`text-xl font-black ${tones[tone] || tones.white}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children, tone = "green" }) {
  const tones = {
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  };
  return (
    <div className={cardBase}>
      <div className="mb-3 flex items-start gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tones[tone] || tones.green}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function List({ items }) {
  return <div className="grid gap-2">{items.map((item) => <div key={item} className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2 text-xs text-slate-300">{item}</div>)}</div>;
}

export default function DriverIntelligenceCenter({ user }) {
  const [driver, setDriver] = useState(null);
  const [loads, setLoads] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const driverRecords = await base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1).catch(() => []);
        const currentDriver = driverRecords?.[0] || null;
        const [allLoads, allSettlements, allDocs, allTracking, allClaims] = await Promise.all([
          base44.entities.Load.list("-created_date", 200).catch(() => []),
          base44.entities.Settlement.list("-created_date", 200).catch(() => []),
          base44.entities.LoadDocument.list("-created_date", 200).catch(() => []),
          base44.entities.TrackingEvent.list("-created_date", 200).catch(() => []),
          base44.entities.DriverIncident.list("-created_date", 200).catch(() => []),
        ]);
        if (!mounted) return;
        setDriver(currentDriver);
        setLoads((allLoads || []).filter((load) => !currentDriver?.id || load.driver_id === currentDriver.id));
        setSettlements((allSettlements || []).filter((settlement) => !currentDriver?.id || settlement.driver_id === currentDriver.id));
        setDocuments((allDocs || []).filter((doc) => !currentDriver?.id || doc.driver_id === currentDriver.id));
        setTrackingEvents((allTracking || []).filter((event) => !currentDriver?.id || event.driver_id === currentDriver.id));
        setClaims((allClaims || []).filter((claim) => !currentDriver?.id || claim.driver_id === currentDriver.id));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  const intelligence = useMemo(() => {
    if (!driver) return null;
    const risk = calculateDriverRiskScore({
      driver,
      compliance: {
        cdl_expiration: driver.cdl_expiration,
        medical_card_expiration: driver.medical_card_expiration,
        insurance_expiration: driver.insurance_expiration,
      },
      safety: {
        violations: driver.violations_count,
        incidents: driver.incidents_count,
        harsh_events: driver.harsh_events,
        speeding_events: driver.speeding_events,
      },
      performance: {
        on_time_delivery_pct: driver.on_time_delivery_pct,
        late_deliveries_90d: driver.late_deliveries_90d,
        late_pod_uploads: driver.late_pod_uploads,
      },
      settlement: {
        disputed_settlements: driver.disputed_settlements,
        unapproved_deductions: driver.unapproved_deductions,
      },
      tracking: {
        hours_remaining: driver.hos_hours_remaining,
        gps_mismatch_count: driver.gps_mismatch_count,
      },
    });
    const profitability = buildDriverProfitability({ driver, loads, settlements, claims });
    const fraudAlerts = detectDriverFraudSignals({ driver, documents, trackingEvents, receipts: documents.filter((doc) => String(doc.document_type || "").includes("receipt")) });
    const reward = buildDriverRewardProfile({ driver, scorecard: { safe_miles: driver.safe_miles || driver.miles_ytd, on_time_delivery_pct: driver.on_time_delivery_pct, clean_inspections: driver.clean_inspections } });
    return { master: buildDriverMasterRecord(driver), risk, profitability, fraudAlerts, reward };
  }, [driver, loads, settlements, documents, trackingEvents, claims]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-green-400" /></div>;

  if (!driver || !intelligence) {
    return (
      <div className="space-y-4 pb-24">
        <Link to="/driver/profile" className="inline-flex items-center gap-2 text-sm text-slate-400"><ChevronLeft className="h-4 w-4" /> Profile</Link>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center text-red-300">No driver profile found.</div>
      </div>
    );
  }

  const activeLoad = loads.find((load) => ["assigned", "accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery"].includes(load.status)) || loads[0];
  const riskTone = intelligence.risk.severity === "critical" || intelligence.risk.severity === "high" ? "red" : intelligence.risk.severity === "medium" ? "amber" : "green";

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link to="/driver/profile" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"><ChevronLeft className="h-5 w-5" /></Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-green-400">Enterprise Driver</p>
          <h1 className="mt-1 text-xl font-black text-white">Intelligence Center</h1>
          <p className="mt-0.5 text-xs text-slate-500">Risk, compliance, safety, profitability, rewards, offline mode, and AI copilot foundation.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Risk" value={intelligence.risk.overall_score} tone={riskTone} />
        <Stat label="Tier" value={intelligence.reward.tier} tone="green" />
        <Stat label="Margin" value={`$${Math.round(intelligence.profitability.net_margin).toLocaleString()}`} tone={intelligence.profitability.net_margin >= 0 ? "green" : "red"} />
        <Stat label="Fraud Alerts" value={intelligence.fraudAlerts.length} tone={intelligence.fraudAlerts.length ? "red" : "green"} />
      </div>

      <DriverEnterprisePortalPanels key={workflowRefreshKey} driverId={driver.id} />
      <DriverWorkflowControls driverId={driver.id} loadId={activeLoad?.id} onAction={() => setWorkflowRefreshKey((value) => value + 1)} />

      <Section icon={Gauge} title="Driver Risk Score Engine" subtitle={intelligence.risk.recommended_action} tone={riskTone}>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Fatigue" value={intelligence.risk.fatigue_score} tone="amber" />
          <Stat label="Compliance" value={intelligence.risk.compliance_score} tone="blue" />
          <Stat label="Safety" value={intelligence.risk.safety_score} tone="red" />
        </div>
      </Section>

      <Section icon={ShieldAlert} title="Fraud & Security Engine" subtitle="GPS mismatch, duplicate receipts, duplicate BOL, POD signature anomalies." tone={intelligence.fraudAlerts.length ? "red" : "green"}>
        {intelligence.fraudAlerts.length ? <List items={intelligence.fraudAlerts.map((a) => `${a.alert_type} · ${a.severity}`)} /> : <p className="text-xs text-slate-400">No active fraud indicators detected from available records.</p>}
      </Section>

      <Section icon={DollarSign} title="Driver Profitability Engine" subtitle="Gross revenue, settlement cost, claim cost, RPM, margin, deadhead percent." tone="green">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Gross" value={`$${Math.round(intelligence.profitability.gross_revenue).toLocaleString()}`} tone="green" />
          <Stat label="Settlement" value={`$${Math.round(intelligence.profitability.settlement_cost).toLocaleString()}`} tone="amber" />
          <Stat label="RPM" value={`$${intelligence.profitability.revenue_per_mile}`} tone="blue" />
          <Stat label="Deadhead" value={`${intelligence.profitability.deadhead_percent}%`} tone="purple" />
        </div>
      </Section>

      <Section icon={Award} title="Driver Retention / Rewards" subtitle="Safe miles, on-time performance, clean inspections, bonus eligibility." tone="purple">
        <div className="grid grid-cols-2 gap-2"><Stat label="Points" value={intelligence.reward.points} tone="purple" /><Stat label="Bonus" value={intelligence.reward.bonus_eligible ? "Eligible" : "No"} tone={intelligence.reward.bonus_eligible ? "green" : "white"} /></div>
        {intelligence.reward.badges.length > 0 && <div className="mt-3"><List items={intelligence.reward.badges} /></div>}
      </Section>

      <Section icon={ShieldCheck} title="Compliance Requirements" subtitle="DQF, CDL, medical, hazmat, TWIC, drug tests, Clearinghouse, annual review." tone="blue">
        <List items={DRIVER_COMPLIANCE_REQUIREMENTS} />
      </Section>

      <Section icon={Truck} title="Driver Workflows" subtitle="Enterprise workflow foundation, not duplicate screens." tone="cyan">
        <List items={Object.entries(DRIVER_WORKFLOWS).map(([name, steps]) => `${name.replace(/_/g, " ")}: ${steps.join(" → ")}`)} />
      </Section>

      <Section icon={FileWarning} title="Safety + Scorecard Requirements" subtitle="Safety, performance, compliance, behavior, 30/90-day trends." tone="amber">
        <List items={[...DRIVER_SAFETY_SIGNALS, ...Object.entries(DRIVER_SCORECARD_METRICS).map(([k, v]) => `${k}: ${v.join(", ")}`)]} />
      </Section>

      <Section icon={WifiOff} title="Offline / Poor Signal Mode" subtitle="Queue scans, statuses, messages, and events while offline; sync when signal returns." tone="cyan">
        <List items={["active load cache", "document scan cache", "message queue", "status update queue", "GPS/status sync replay", "conflict-safe resubmission"]} />
      </Section>

      <Section icon={Bot} title="AI Driver Copilot" subtitle="Driver-facing assistant prompts for operations, compliance, documents, and settlement." tone="green">
        <List items={DRIVER_COPILOT_PROMPTS} />
        <Link to="/agent/driver_assistant" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-slate-950"><MessageSquare className="h-3.5 w-3.5" /> Open Driver Copilot</Link>
      </Section>

      <Section icon={Signal} title="Enterprise Modules Implemented as Foundation" subtitle="Config-driven foundation for future native app and backend automations." tone="blue">
        <List items={DRIVER_REQUIRED_MODULES} />
      </Section>
    </div>
  );
}
