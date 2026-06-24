import { useState } from "react";
import DetentionApprovalQueue from "@/components/detention/DetentionApprovalQueue";
import { ClipboardCheck } from "lucide-react";

export default function DetentionApprovals() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
          </div>
          <h1 className="text-white font-heading font-bold text-2xl">Detention Approvals</h1>
        </div>
        <p className="text-slate-400 text-sm">Review, edit, and approve detention charges before they move to final billing.</p>
      </div>

      {/* Info Box */}
      <div className="glass-card rounded-xl p-4 border border-blue-500/20 bg-blue-500/5">
        <div className="flex gap-3">
          <div className="text-blue-400 font-semibold text-sm">Manager Approval Workflow</div>
        </div>
        <div className="text-blue-300/80 text-xs mt-2 space-y-1">
          <p>• Dispatchers submit resolved detention records for manager review</p>
          <p>• Managers can edit billable minutes (if calculation error occurred)</p>
          <p>• Add review notes explaining any adjustments</p>
          <p>• Approve for billing → moves to invoicing pipeline</p>
          <p>• Reject if detention appears invalid → back to dispatcher with notes</p>
        </div>
      </div>

      {/* Approval Queue */}
      <DetentionApprovalQueue key={refreshKey} />
    </div>
  );
}