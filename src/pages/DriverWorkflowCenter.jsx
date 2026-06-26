import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, FileText, MessageSquare, Navigation, RefreshCw, Route, ShieldCheck, WalletCards, Wrench } from "lucide-react";
import { readDriverEnterpriseStore } from "@/lib/driverEnterpriseDataLayer";
import { DRIVER_WORKFLOW_AUTOMATIONS, getDriverWorkflowDashboard, getDriverWorkflowState } from "@/lib/driverEnterpriseWorkflowEngine";

const workflowIcons = {
  pickup: Route,
  delivery: Navigation,
  dvir: Wrench,
  document: FileText,
  messaging: MessageSquare,
  navigation: Navigation,
  settlement: WalletCards,
};

export default function DriverWorkflowCenter() {
  const [store, setStore] = useState(() => readDriverEnterpriseStore());
  const dashboard = getDriverWorkflowDashboard(store);

  useEffect(() => {
    const refresh = (event) => setStore(event?.detail || readDriverEnterpriseStore());
    window.addEventListener("hasten_driver_enterprise_store_changed", refresh);
    return () => window.removeEventListener("hasten_driver_enterprise_store_changed", refresh);
  }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-green-400 font-bold">Driver Enterprise Module</div>
          <h1 className="text-white font-heading font-bold text-2xl mt-1">Driver Workflow Center</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Operational state machines for driver pickup, delivery, DVIR, document, messaging, navigation, and settlement flows.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStore(readDriverEnterpriseStore())} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-sm hover:text-white">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link to="/drivers/enterprise" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-sm hover:text-white">
            <ShieldCheck className="w-4 h-4" /> Enterprise Data
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard icon={AlertTriangle} label="DVIR Defects" value={dashboard.counts.dvir_defects} tone="red" />
        <MetricCard icon={FileText} label="Docs Review" value={dashboard.counts.documents_needing_review} tone="amber" />
        <MetricCard icon={WalletCards} label="Settlement Ready" value={dashboard.counts.settlement_ready} tone="green" />
        <MetricCard icon={Navigation} label="Active Nav" value={dashboard.counts.active_navigation} tone="blue" />
        <MetricCard icon={MessageSquare} label="Unread Msg" value={dashboard.counts.unread_messages} tone="purple" />
      </div>

      <section className="grid lg:grid-cols-2 gap-5">
        {dashboard.workflows.map(({ workflow, steps, automations }) => {
          const Icon = workflowIcons[workflow] || Activity;
          return (
            <div key={workflow} className="glass-card rounded-2xl border border-white/5 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-white font-semibold flex items-center gap-2 capitalize"><Icon className="w-5 h-5 text-green-400" /> {workflow} workflow</h2>
                  <p className="text-slate-500 text-xs mt-1">{steps.length} controlled status steps</p>
                </div>
                <span className="rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-1 text-xs">enabled</span>
              </div>

              <div className="space-y-2">
                {steps.map((step, index) => {
                  const state = getDriverWorkflowState(workflow, step);
                  return (
                    <div key={step} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 flex items-center justify-center text-xs font-bold">{index + 1}</div>
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium capitalize">{step.replaceAll("_", " ")}</div>
                        <div className="text-slate-500 text-xs">Progress marker: {state.progress_pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {automations.length > 0 && (
                <div className="mt-4 rounded-xl bg-orange-500/10 border border-orange-500/20 p-3">
                  <div className="text-orange-300 font-semibold text-xs uppercase tracking-wide mb-2">Automations</div>
                  <div className="space-y-2">
                    {automations.map((automation) => (
                      <div key={automation.id} className="text-xs text-slate-300">
                        <span className="text-white font-medium">{automation.trigger}</span> → {automation.action}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="glass-card rounded-2xl border border-white/5 p-5">
        <h2 className="text-white font-semibold mb-4">Automation Rules</h2>
        <div className="grid lg:grid-cols-2 gap-3">
          {DRIVER_WORKFLOW_AUTOMATIONS.map((automation) => (
            <div key={automation.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-white font-semibold text-sm">{automation.id}</div>
              <div className="text-slate-400 text-xs mt-1 capitalize">Workflow: {automation.workflow}</div>
              <div className="text-slate-300 text-sm mt-3"><span className="text-green-300">Trigger:</span> {automation.trigger}</div>
              <div className="text-slate-300 text-sm mt-1"><span className="text-orange-300">Action:</span> {automation.action}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "blue" }) {
  const tones = {
    red: "border-red-500/20 bg-red-500/10 text-red-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    green: "border-green-500/20 bg-green-500/10 text-green-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
          <div className="text-white text-2xl font-bold mt-1">{value}</div>
        </div>
        <Icon className="w-7 h-7 opacity-70" />
      </div>
    </div>
  );
}
