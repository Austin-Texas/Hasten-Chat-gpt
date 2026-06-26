import { useMemo } from "react";
import { AlertTriangle, FileText, ShieldCheck, WalletCards, Gauge, MessageSquare } from "lucide-react";
import { readDriverEnterpriseStore } from "@/lib/driverEnterpriseDataLayer";
import { buildDriverSelfServicePortal } from "@/lib/driverSelfServicePortalEngine";

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-white text-lg font-black">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Block({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10 text-green-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function DriverEnterpriseSelfServicePanel({ driverId }) {
  const portal = useMemo(() => {
    if (!driverId) return null;
    return buildDriverSelfServicePortal(driverId, readDriverEnterpriseStore());
  }, [driverId]);

  if (!driverId || !portal) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-xs text-slate-400">
        Enterprise self-service data appears after driver profile sync.
      </div>
    );
  }

  const missingDocs = portal.documents?.missing_core_documents || [];
  const settlements = portal.settlements || { statements: [], totals: { gross: 0, net: 0 } };

  return (
    <div className="space-y-4">
      <Block icon={ShieldCheck} title="Self-Service Compliance" subtitle="DQF, CDL, medical, Hazmat, TWIC, drug test, Clearinghouse.">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Status" value={portal.compliance?.overall_status || "pending"} />
          <Stat label="Score" value={portal.compliance?.compliance_score ?? "N/A"} />
        </div>
      </Block>

      <Block icon={FileText} title="Document Vault" subtitle="OCR-ready upload queue, rejection/resubmit, expiration tracking.">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Documents" value={portal.documents?.documents?.length || 0} />
          <Stat label="Missing Core" value={missingDocs.length} />
        </div>
      </Block>

      <Block icon={WalletCards} title="Settlement Viewer" subtitle="Weekly statements, deductions, net pay, PDF-ready output.">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Statements" value={settlements.statements.length} />
          <Stat label="Gross" value={`$${Math.round(settlements.totals.gross || 0).toLocaleString()}`} />
          <Stat label="Net" value={`$${Math.round(settlements.totals.net || 0).toLocaleString()}`} />
        </div>
      </Block>

      <Block icon={AlertTriangle} title="Alerts + Safety" subtitle="Safety alerts, fatigue risk, compliance holds, DVIR defects.">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Open Alerts" value={portal.alerts?.length || 0} />
          <Stat label="DVIR" value={portal.active_workflows?.dvir?.length || 0} />
          <Stat label="Messages" value={portal.active_workflows?.messages?.length || 0} />
        </div>
      </Block>

      <Block icon={Gauge} title="Scorecard" subtitle="Safety, performance, compliance, behavior, 90-day trend.">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Overall" value={portal.scorecard?.overall_score ?? "N/A"} />
          <Stat label="Risk" value={portal.scorecard?.risk_level || "pending"} />
        </div>
      </Block>

      <Block icon={MessageSquare} title="Driver Actions" subtitle="Self-service actions exposed for mobile and future native app.">
        <div className="grid gap-2">
          {(portal.actions || []).map((action) => (
            <div key={action} className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2 text-xs text-slate-300">
              {action.replaceAll("_", " ")}
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}
