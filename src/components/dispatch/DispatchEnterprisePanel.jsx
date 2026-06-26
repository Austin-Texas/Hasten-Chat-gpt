import { AlertTriangle, Brain, Clock, Route, ShieldCheck, Truck } from "lucide-react";
import { buildDispatcherEnterpriseSnapshot } from "@/lib/dispatcherEnterpriseEngine";

function Stat({ label, value, tone = "text-white" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className={`text-xl font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default function DispatchEnterprisePanel({ loads = [], drivers = [], trucks = [] }) {
  const snapshot = buildDispatcherEnterpriseSnapshot({ loads, drivers, trucks });
  const topMatches = snapshot.matching_board.slice(0, 3);
  const topExceptions = snapshot.exceptions.slice(0, 4);

  return (
    <div className="glass-card rounded-xl border border-green-500/20 bg-green-500/[0.04] p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-white font-bold text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-green-400" /> Enterprise Dispatch Intelligence
          </div>
          <p className="text-slate-400 text-xs mt-1">Matching, exceptions, SLA risk, and live driver availability intelligence layered onto the existing board.</p>
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">Generated {new Date(snapshot.generated_at).toLocaleTimeString()}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Active" value={snapshot.sla.active_loads} tone="text-green-400" />
        <Stat label="Unassigned" value={snapshot.sla.unassigned} tone={snapshot.sla.unassigned ? "text-amber-400" : "text-green-400"} />
        <Stat label="In Transit" value={snapshot.sla.in_transit} tone="text-blue-400" />
        <Stat label="Missing POD" value={snapshot.sla.delivered_missing_pod} tone={snapshot.sla.delivered_missing_pod ? "text-amber-400" : "text-green-400"} />
        <Stat label="Exceptions" value={snapshot.exceptions.length} tone={snapshot.exceptions.length ? "text-red-400" : "text-green-400"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><Route className="w-3.5 h-3.5 text-green-400" /> Best Driver Matches</div>
          <div className="space-y-2">
            {topMatches.length ? topMatches.map((load) => (
              <div key={load.load_id} className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
                <div className="text-xs font-bold text-white">{load.load_number}</div>
                <div className="text-[11px] text-slate-500">{load.origin} → {load.destination}</div>
                <div className="mt-1 text-[11px] text-green-300">{load.matches[0]?.driver_name || "No match"} · {load.matches[0]?.score || 0}%</div>
              </div>
            )) : <div className="text-xs text-slate-500">No unassigned loads needing matching.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Exceptions</div>
          <div className="space-y-2">
            {topExceptions.length ? topExceptions.map((item) => (
              <div key={item.id} className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
                <div className="text-xs font-bold text-white capitalize">{item.type.replaceAll("_", " ")}</div>
                <div className="text-[11px] text-slate-400">{item.message}</div>
              </div>
            )) : <div className="text-xs text-slate-500">No active dispatch exceptions.</div>}
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
    </div>
  );
}
