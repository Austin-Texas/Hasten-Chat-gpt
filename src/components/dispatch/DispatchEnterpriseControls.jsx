import { CheckCircle2, MessageSquare, Route, ShieldCheck } from "lucide-react";
import { createDispatchAssignment, createDispatchException, logBrokerUpdate, resolveDispatchException, readDispatcherEnterpriseStore } from "@/lib/dispatcherEnterpriseActions";

function Button({ icon: Icon, label, onClick, tone = "green" }) {
  const tones = {
    green: "bg-green-500/10 border-green-500/20 text-green-300",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-300",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-300",
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black hover:text-white ${tones[tone] || tones.green}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export default function DispatchEnterpriseControls({ topMatch, topException, brokerItem, onAction }) {
  const match = topMatch?.matches?.[0];
  const openLocalException = (readDispatcherEnterpriseStore().exceptions || []).find((item) => item.status !== "resolved");

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-2 text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-green-400" /> Enterprise Actions</div>
      <div className="flex flex-wrap gap-2">
        {topMatch && match && (
          <Button icon={Route} label="Create Best Assignment" tone="green" onClick={() => { createDispatchAssignment({ loadId: topMatch.load_id, driverId: match.driver_id, score: match.score, reasons: match.reasons }); onAction?.(); }} />
        )}
        {brokerItem && (
          <Button icon={MessageSquare} label="Log Broker Update" tone="blue" onClick={() => { logBrokerUpdate({ loadId: brokerItem.load_id, brokerId: brokerItem.broker_id, message: brokerItem.suggested_message }); onAction?.(); }} />
        )}
        {topException && (
          <Button icon={ShieldCheck} label="Capture Exception" tone="amber" onClick={() => { createDispatchException({ loadId: topException.load_id, driverId: topException.driver_id, type: topException.type || topException.rule_id || "dispatch_exception", severity: topException.severity || "medium", message: topException.message }); onAction?.(); }} />
        )}
        {openLocalException && (
          <Button icon={CheckCircle2} label="Resolve Local Exception" tone="purple" onClick={() => { resolveDispatchException(openLocalException.id, "Resolved from enterprise dispatch controls."); onAction?.(); }} />
        )}
      </div>
    </div>
  );
}
