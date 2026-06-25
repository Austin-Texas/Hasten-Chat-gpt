import { Check, AlertTriangle } from "lucide-react";
import { getSettlementPolicyWarnings } from "@/lib/settlementPolicy";

export default function SettlementApprovalAction({ settlement = {}, driver = {}, onApprove, disabled = false }) {
  const warnings = getSettlementPolicyWarnings(settlement, driver);

  const handleClick = (event) => {
    event.stopPropagation();
    if (disabled) return;
    if (warnings.length > 0) {
      const ok = window.confirm(`This settlement has ${warnings.length} review warning(s). Continue with approval?`);
      if (!ok) return;
    }
    onApprove?.(settlement.id);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg border transition-colors disabled:opacity-40 ${
        warnings.length > 0
          ? "bg-amber-500/15 border-amber-500/25 text-amber-300 hover:bg-amber-500/25"
          : "bg-blue-500/15 border-blue-500/25 text-blue-400 hover:bg-blue-500/25"
      }`}
      title={warnings.length > 0 ? "Review warnings before approval" : "Approve settlement"}
    >
      {warnings.length > 0 ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
      Approve
    </button>
  );
}
