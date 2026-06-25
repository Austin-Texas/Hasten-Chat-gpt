import { AlertTriangle } from "lucide-react";
import { getSettlementPolicyWarnings } from "@/lib/settlementPolicy";

export default function SettlementPolicyWarnings({ settlement = {}, driver = {} }) {
  const warnings = getSettlementPolicyWarnings(settlement, driver);
  if (!warnings.length) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
      <div className="mb-2 flex items-center gap-2 font-semibold text-amber-100">
        <AlertTriangle className="h-4 w-4" />
        Settlement review needed
      </div>
      <ul className="space-y-1 pl-1">
        {warnings.map((warning) => (
          <li key={warning}>• {warning}</li>
        ))}
      </ul>
    </div>
  );
}
