import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, GitBranch, ShieldCheck, Route, FileText, RefreshCw, Trash2, CheckCircle2, Zap } from "lucide-react";
import {
  DRIVER_COMPLIANCE_REQUIREMENTS,
  DRIVER_ENTERPRISE_ENTITIES,
  DRIVER_WORKFLOW_DEFINITIONS,
  buildDriverEnterpriseBase44Mapping,
  readDriverEnterpriseStore,
  resetDriverEnterpriseStore,
} from "@/lib/driverEnterpriseDataLayer";
import {
  DRIVER_AUTOMATION_RULES,
  getDriverAutomationDashboard,
  runDriverEnterpriseAutomations,
} from "@/lib/driverEnterpriseAutomationEngine";

export default function DriverEnterpriseDataCenter() {
  const [store, setStore] = useState(() => readDriverEnterpriseStore());
  const entityRows = useMemo(() => Object.entries(DRIVER_ENTERPRISE_ENTITIES), []);
  const base44Mapping = useMemo(() => buildDriverEnterpriseBase44Mapping(), []);
  const automationDashboard = getDriverAutomationDashboard(store);

  useEffect(() => {
    const refresh = (event) => setStore(event?.detail || readDriverEnterpriseStore());
    window.addEventListener("hasten_driver_enterprise_store_changed", refresh);
    return () => window.removeEventListener("hasten_driver_enterprise_store_changed", refresh);
  }, []);

  const refreshStore = () => setStore(readDriverEnterpriseStore());
  const resetStore = () => setStore(resetDriverEnterpriseStore());
  const runAutomations = () => setStore(runDriverEnterpriseAutomations());

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-green-400 font-bold">Driver Enterprise Module</div>
          <h1 className="text-white font-heading font-bold text-2xl mt-1">Enterprise Driver Data Center</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Local-first production data layer for HASTEN Cargo OS. These records run in localStorage now and are mapped for future Base44/native app migration.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={runAutomations} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-sm hover:text-white">
            <Zap className="w-4 h-4" /> Run Automations
          </button>
          <button onClick={refreshStore} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-sm hover:text-white">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={resetStore} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm hover:text-white">
            <Trash2 className="w-4 h-4" /> Reset Local Store
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Database} label="Enterprise Entities" value={entityRows.length} />
        <MetricCard icon={ShieldCheck} label="Compliance Requirements" value={DRIVER_COMPLIANCE_REQUIREMENTS.length} />
        <MetricCard icon={Route} label="Workflow Engines" value={Object.keys(DRIVER_WORKFLOW_DEFINITIONS).length} />
        <MetricCard icon={GitBranch} label="Audit Events" value={store.auditEvents?.length || 0} />
      </div>

      <section className="glass-card rounded-2xl border border-white/5 p-5">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-orange-400" /> Automation Engine</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <SmallStat label="Open Alerts" value={automationDashboard.open_alerts} />
          <SmallStat label="Critical" value={automationDashboard.critical_alerts} />
          <SmallStat label="Compliance" value={automationDashboard.compliance_alerts} />
          <SmallStat label="Safety" value={automationDashboard.safety_alerts} />
          <SmallStat label="Maintenance" value={automationDashboard.maintenance_alerts} />
        </div>
        <div className="grid lg:grid-cols-3 gap-3">
          {DRIVER_AUTOMATION_RULES.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-white text-sm font-semibold">{rule.name}</div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wide mt-1">{rule.category} • {rule.severity}</div>
              <p className="text-slate-400 text-xs mt-2">{rule.trigger}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-white/5 p-5">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><Database className="w-5 h-5 text-orange-400" /> Driver Data Models</h2>
        <div className="grid lg:grid-cols-3 gap-4">
          {entityRows.map(([name, spec]) => {
            const count = Array.isArray(store[spec.key]) ? store[spec.key].length : 0;
            return (
              <div key={name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{name}</h3>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{spec.description}</p>
                  </div>
                  <span className="rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 px-2 py-1 text-xs">{count}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {spec.fields.slice(0, 7).map((field) => (
                    <span key={field} className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[10px] text-slate-300">{field}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl border border-white/5 p-5">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><Route className="w-5 h-5 text-green-400" /> Driver Workflows</h2>
          <div className="space-y-3">
            {Object.entries(DRIVER_WORKFLOW_DEFINITIONS).map(([name, steps]) => (
              <div key={name} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-white font-semibold text-sm capitalize">{name} workflow</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {steps.map((step, index) => (
                    <span key={step} className="text-xs text-slate-300">
                      <span className="rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-1">{step.replaceAll("_", " ")}</span>
                      {index < steps.length - 1 && <span className="mx-1 text-slate-600">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/5 p-5">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><ShieldCheck className="w-5 h-5 text-blue-400" /> Compliance Requirements</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {DRIVER_COMPLIANCE_REQUIREMENTS.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-blue-400" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-white/5 p-5">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-purple-400" /> Future Base44 Mapping</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-white/10">
                <th className="py-2 pr-4">Local Entity</th>
                <th className="py-2 pr-4">Local Store Key</th>
                <th className="py-2 pr-4">Future Base44 Entity</th>
                <th className="py-2 pr-4">Fields</th>
              </tr>
            </thead>
            <tbody>
              {base44Mapping.map((row) => (
                <tr key={row.localEntity} className="border-b border-white/5 text-slate-300">
                  <td className="py-3 pr-4 text-white font-medium">{row.localEntity}</td>
                  <td className="py-3 pr-4">{row.localStoreKey}</td>
                  <td className="py-3 pr-4 text-green-300">{row.futureBase44Entity}</td>
                  <td className="py-3 pr-4 text-xs text-slate-400">{row.fields.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-card rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-500 text-xs uppercase tracking-wider">{label}</div>
          <div className="text-white text-2xl font-bold mt-1">{value}</div>
        </div>
        <Icon className="w-8 h-8 text-slate-600" />
      </div>
    </div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-white text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
