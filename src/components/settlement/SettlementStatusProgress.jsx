import { getSettlementProgress, settlementStatusLabel, SETTLEMENT_STATUS_FLOW } from "@/lib/settlementStatusFlow";

export default function SettlementStatusProgress({ status = "draft" }) {
  const progress = getSettlementProgress(status);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300">{settlementStatusLabel(status)}</span>
        <span className="text-slate-500">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between gap-1 text-[10px] text-slate-600">
        {SETTLEMENT_STATUS_FLOW.map((item) => (
          <span key={item} className={item === status ? "text-green-300" : ""}>{settlementStatusLabel(item)}</span>
        ))}
      </div>
    </div>
  );
}
