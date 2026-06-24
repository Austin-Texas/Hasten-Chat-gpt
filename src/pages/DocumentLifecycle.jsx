import { useState } from "react";
import DocumentReviewQueue from "@/components/documents/DocumentReviewQueue";
import { FileText } from "lucide-react";

export default function DocumentLifecycle() {
  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-white font-heading font-bold text-2xl">Document Lifecycle</h1>
        </div>
        <p className="text-slate-400 text-sm">Review, approve, and manage operational documents for loads and stops.</p>
      </div>

      {/* Info Box */}
      <div className="glass-card rounded-xl p-4 border border-blue-500/20 bg-blue-500/5">
        <div className="flex gap-3">
          <div className="text-blue-400 font-semibold text-sm">Document Review Workflow</div>
        </div>
        <div className="text-blue-300/80 text-xs mt-2 space-y-1">
          <p>• Drivers upload operational documents (BOL, POD, scale tickets, receipts, etc.)</p>
          <p>• Documents enter "uploaded" status awaiting dispatcher review</p>
          <p>• Dispatcher can approve, reject, or request reupload</p>
          <p>• Approved documents are required before invoicing (when enabled)</p>
          <p>• Version history tracks all uploads and approvals</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-lg border border-white/5 p-4">
          <div className="text-amber-400 font-bold text-lg">Pending</div>
          <div className="text-slate-500 text-xs mt-1">Awaiting Review</div>
        </div>
        <div className="glass-card rounded-lg border border-white/5 p-4">
          <div className="text-green-400 font-bold text-lg">Approved</div>
          <div className="text-slate-500 text-xs mt-1">Ready for Billing</div>
        </div>
        <div className="glass-card rounded-lg border border-white/5 p-4">
          <div className="text-red-400 font-bold text-lg">Rejected</div>
          <div className="text-slate-500 text-xs mt-1">Awaiting Reupload</div>
        </div>
      </div>

      {/* Review Queue */}
      <DocumentReviewQueue />
    </div>
  );
}