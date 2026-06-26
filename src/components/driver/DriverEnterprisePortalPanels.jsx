import { AlertTriangle, FileText, ShieldCheck, TrendingUp, WalletCards } from "lucide-react";
import { readDriverEnterpriseStore } from "@/lib/driverEnterpriseDataLayer";
import { buildDriverSelfServicePortal } from "@/lib/driverSelfServicePortalEngine";

function PanelStat({ label, value, tone = "text-white" }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className={`text-lg font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function MiniPanel({ icon: Icon, title, subtitle, children, tone = "text-green-400 bg-green-500/10 border-green-500/20" }) {
  return (
    <div className="glass-card rounded-2xl border border-white/5 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tone}`}>
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

function List({ items, empty }) {
  if (!items?.length) return <p className="text-xs text-slate-400">{empty}</p>;
  return (
    <div className="grid gap-2">
      {items.slice(0, 6).map((item, index) => (
        <div key={`${item}-${index}`} className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2 text-xs text-slate-300">{item}</div>
      ))}
    </div>
  );
}

export default function DriverEnterprisePortalPanels({ driverId }) {
  const store = readDriverEnterpriseStore();
  const portal = driverId ? buildDriverSelfServicePortal(driverId, store) : null;

  if (!driverId || !portal) {
    return null;
  }

  const scorecard = portal.scorecard;
  const compliance = portal.compliance;
  const safety = portal.safetyProfile;
  const alerts = portal.alerts || [];
  const docs = portal.documents || {};
  const settlements = portal.settlements || {};

  return (
    <>
      <MiniPanel icon={TrendingUp} title="Enterprise Scorecard" subtitle="Safety, performance, compliance, behavior, and 90-day trend." tone="text-purple-400 bg-purple-500/10 border-purple-500/20">
        <div className="grid grid-cols-2 gap-2">
          <PanelStat label="Overall" value={scorecard?.overall_score ?? "—"} tone="text-purple-400" />
          <PanelStat label="Trend" value={scorecard?.rolling_90_day_trend || "—"} />
          <PanelStat label="Safety" value={scorecard?.safety_score ?? "—"} tone="text-red-400" />
          <PanelStat label="Performance" value={scorecard?.performance_score ?? "—"} tone="text-green-400" />
        </div>
      </MiniPanel>

      <MiniPanel icon={ShieldCheck} title="Compliance Alert Center" subtitle="CDL, medical, DQF, Clearinghouse, Hazmat/TWIC readiness." tone="text-blue-400 bg-blue-500/10 border-blue-500/20">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <PanelStat label="Status" value={compliance?.overall_status || "pending"} tone={compliance?.overall_status === "compliant" ? "text-green-400" : "text-amber-400"} />
          <PanelStat label="Score" value={compliance?.compliance_score ?? "—"} tone="text-blue-400" />
        </div>
        <List items={[...(compliance?.blocking_issues || []), ...(compliance?.warning_issues || [])]} empty="No open compliance issues from enterprise store." />
      </MiniPanel>

      <MiniPanel icon={FileText} title="Document Vault / OCR" subtitle="OCR status, missing docs, resubmit queue, and expiring records." tone="text-cyan-400 bg-cyan-500/10 border-cyan-500/20">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <PanelStat label="Documents" value={docs.documents?.length || 0} tone="text-cyan-400" />
          <PanelStat label="Missing Core" value={docs.missing_core_documents?.length || 0} tone={docs.missing_core_documents?.length ? "text-amber-400" : "text-green-400"} />
        </div>
        <List items={docs.missing_core_documents?.map((item) => `Missing or unverified: ${item}`)} empty="Core driver documents are present or no local enterprise docs loaded." />
      </MiniPanel>

      <MiniPanel icon={WalletCards} title="Settlement Viewer" subtitle="Weekly statement totals, deductions, and settlement readiness." tone="text-green-400 bg-green-500/10 border-green-500/20">
        <div className="grid grid-cols-3 gap-2">
          <PanelStat label="Gross" value={`$${Math.round(settlements.totals?.gross || 0).toLocaleString()}`} tone="text-green-400" />
          <PanelStat label="Deduct" value={`$${Math.round(settlements.totals?.deductions || 0).toLocaleString()}`} tone="text-amber-400" />
          <PanelStat label="Net" value={`$${Math.round(settlements.totals?.net || 0).toLocaleString()}`} tone="text-blue-400" />
        </div>
      </MiniPanel>

      <MiniPanel icon={AlertTriangle} title="Safety / Fatigue Alerts" subtitle="Telemetry, violations, fatigue risk, and open safety alerts." tone="text-red-400 bg-red-500/10 border-red-500/20">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <PanelStat label="Risk" value={safety?.risk_level || "—"} tone={safety?.risk_level === "low" ? "text-green-400" : "text-red-400"} />
          <PanelStat label="Open Alerts" value={alerts.length} tone={alerts.length ? "text-red-400" : "text-green-400"} />
        </div>
        <List items={alerts.map((alert) => `${alert.rule_name}: ${alert.message}`)} empty="No open driver safety alerts from enterprise store." />
      </MiniPanel>
    </>
  );
}
