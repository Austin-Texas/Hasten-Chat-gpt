import { AlertTriangle, Brain, DollarSign, MessageSquare, Route, Sparkles, Truck } from "lucide-react";
import { buildDispatcherEnterpriseSnapshot } from "@/lib/dispatcherEnterpriseEngine";
import { buildDispatcherExtendedSnapshot } from "@/lib/dispatcherEnterpriseExtendedEngine";

function Stat({ label, value, tone = "text-white" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className={`text-xl font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Item({ title, subtitle }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
      <div className="text-xs font-bold text-white">{title}</div>
      {subtitle && <div className="text-[11px] text-slate-400">{subtitle}</div>}
    </div>
  );
}

export default function DispatchEnterprisePanel({ loads = [], drivers = [], trucks = [] }) {
  const snapshot = buildDispatcherEnterpriseSnapshot({ loads, drivers, trucks });
  const extended = buildDispatcherExtendedSnapshot({ loads, drivers, snapshot });
  const topMatches = snapshot.matching_board.slice(0, 3);
  const topExceptions = snapshot.exceptions.slice(0, 4);
  const topAlerts = extended.sla_alerts.slice(0, 3);
  const topBrokerItems = extended.broker_communications.filter((item) => item.status === "update_due").slice(0, 3);

  return (
    <div className="glass-card rounded-xl border border-green-500/20 bg-green-500/[0.04] p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-white font-bold text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-green-400" /> Enterprise Dispatch Intelligence
          </div>
          <p className="text-slate-400 text-xs mt-1">Matching, exceptions, SLA alerts, profitability, broker updates, AI recommendations, and live availability layered onto the existing board.</p>
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">Generated {new Date(snapshot.generated_at).toLocaleTimeString()}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="Active" value={snapshot.sla.active_loads} tone="text-green-400" />
        <Stat label="Unassigned" value={snapshot.sla.unassigned} tone={snapshot.sla.unassigned ? "text-amber-400" : "text-green-400"} />
        <Stat label="In Transit" value={snapshot.sla.in_transit} tone="text-blue-400" />
        <Stat label="SLA Alerts" value={extended.sla_alerts.length} tone={extended.sla_alerts.length ? "text-amber-400" : "text-green-400"} />
        <Stat label="Exceptions" value={snapshot.exceptions.length} tone={snapshot.exceptions.length ? "text-red-400" : "text-green-400"} />
        <Stat label="Margin" value={`$${Math.round(extended.profitability.total_margin).toLocaleString()}`} tone={extended.profitability.total_margin >= 0 ? "text-green-400" : "text-red-400"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><Route className="w-3.5 h-3.5 text-green-400" /> Best Driver Matches</div>
          <div className="space-y-2">
            {topMatches.length ? topMatches.map((load) => (
              <Item key={load.load_id} title={load.load_number} subtitle={`${load.origin} → ${load.destination} · ${load.matches[0]?.driver_name || "No match"} · ${load.matches[0]?.score || 0}%`} />
            )) : <div className="text-xs text-slate-500">No unassigned loads needing matching.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Exceptions + SLA</div>
          <div className="space-y-2">
            {[...topExceptions, ...topAlerts].length ? [...topExceptions, ...topAlerts].slice(0, 5).map((item) => (
              <Item key={item.id} title={(item.type || item.rule_id || "alert").replaceAll("_", " ")} subtitle={item.message} />
            )) : <div className="text-xs text-slate-500">No active dispatch exceptions or SLA alerts.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><Truck className="w-3.5 h-3.5 text-blue-400" /> Driver Availability</div>
          <div className="grid grid-cols-2 gap-2">
            {snapshot.availability_board.map((group) => (
              <div key={group.status} className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
                <div className="text-white text-sm font-black">{group.count}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">{group.status.replaceAll("_", " ")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><DollarSign className="w-3.5 h-3.5 text-green-400" /> Profitability Watch</div>
          <div className="space-y-2">
            {extended.profitability.rows.slice(0, 3).map((row) => (
              <Item key={row.load_id} title={`${row.margin_pct}% margin`} subtitle={`Margin $${Math.round(row.margin).toLocaleString()} · ${row.risk.replaceAll("_", " ")}`} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Broker Updates</div>
          <div className="space-y-2">
            {topBrokerItems.length ? topBrokerItems.map((item) => (
              <Item key={item.id} title={item.load_number} subtitle={item.suggested_message} />
            )) : <div className="text-xs text-slate-500">No broker updates due.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Dispatch Copilot</div>
          <div className="space-y-2">
            {extended.ai_recommendations.slice(0, 3).map((item) => <Item key={item} title={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
