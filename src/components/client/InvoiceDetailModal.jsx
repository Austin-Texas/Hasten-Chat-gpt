import { useState } from "react";
import { X, Download, Send, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function InvoiceDetailModal({ invoice, load, onClose }) {
  const [paying, setPaying] = useState(false);

  const balanceDue = invoice.balance_due || invoice.total_amount || 0;
  const isPaid = invoice.status === "paid";
  const isPartial = invoice.status === "partial";
  const isOverdue = invoice.status === "overdue";

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await base44.functions.invoke("create-checkout", {
        invoiceId: invoice.id,
        successUrl: window.location.origin + "/client/payment-success",
        cancelUrl: window.location.origin + "/client/invoices",
      });
      if (res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      }
    } catch (e) {
      console.error(e);
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="glass-card rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-white font-heading font-bold text-lg">Invoice Details</h2>
            <p className="text-slate-400 text-xs mt-0.5">{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status Alert */}
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${
            isPaid ? "bg-green-500/8 border-green-500/20" :
            isOverdue ? "bg-red-500/8 border-red-500/20" :
            isPartial ? "bg-amber-500/8 border-amber-500/20" :
            "bg-blue-500/8 border-blue-500/20"
          }`}>
            <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              isPaid ? "text-green-400" :
              isOverdue ? "text-red-400" :
              isPartial ? "text-amber-400" :
              "text-blue-400"
            }`} />
            <div className="text-sm">
              <div className={`font-semibold capitalize ${
                isPaid ? "text-green-400" :
                isOverdue ? "text-red-400" :
                isPartial ? "text-amber-400" :
                "text-blue-400"
              }`}>
                {isPaid ? "Paid" : isOverdue ? "Overdue" : isPartial ? "Partially Paid" : "Awaiting Payment"}
              </div>
              {invoice.due_date && (
                <div className="text-slate-400 text-xs mt-0.5">
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Shipment Info */}
          {load && (
            <div className="grid sm:grid-cols-2 gap-4 p-3 rounded-lg bg-white/3 border border-white/5">
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Load Number</div>
                <div className="text-white font-mono font-bold">{load.load_number || "—"}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Route</div>
                <div className="text-white text-sm">{load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Equipment</div>
                <div className="text-white">{load.equipment_type || "—"}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Miles</div>
                <div className="text-white">{load.miles || "—"}</div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Charges</div>
            <div className="space-y-2 text-sm">
              {invoice.line_haul > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Line Haul</span>
                  <span className="text-white font-semibold">${(invoice.line_haul || 0).toLocaleString()}</span>
                </div>
              )}
              {invoice.fuel_surcharge > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Fuel Surcharge</span>
                  <span className="text-white">${(invoice.fuel_surcharge || 0).toLocaleString()}</span>
                </div>
              )}
              {invoice.accessorial_charges > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Accessorial</span>
                  <span className="text-white">${(invoice.accessorial_charges || 0).toLocaleString()}</span>
                </div>
              )}
              {invoice.detention > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Detention</span>
                  <span className="text-white">${(invoice.detention || 0).toLocaleString()}</span>
                </div>
              )}
              {invoice.lumper > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Lumper</span>
                  <span className="text-white">${(invoice.lumper || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 mt-2 flex items-center justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-green-400 font-bold text-lg">${(invoice.total_amount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {(invoice.amount_paid || invoice.paid_date) && (
            <div>
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Payment History</div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/3">
                <div>
                  <div className="text-white text-sm">Amount Paid</div>
                  <div className="text-slate-500 text-xs">{invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : "Pending"}</div>
                </div>
                <div className="text-green-400 font-bold">${(invoice.amount_paid || 0).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Balance Due */}
          {balanceDue > 0 && (
            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/8">
              <div className="flex items-baseline gap-2">
                <span className="text-slate-400 text-sm">Balance Due</span>
                <span className="text-orange-400 font-bold text-2xl">${balanceDue.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-white/5">
            {balanceDue > 0 && (
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg,#EA580C,#F97316)", boxShadow: "0 4px 20px rgba(234,88,12,0.25)" }}
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {paying ? "Redirecting..." : "Pay Now"}
              </button>
            )}
            {invoice.pdf_url && (
              <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl border border-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:border-white/20 transition-colors">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </a>
            )}
            <button onClick={onClose} className="px-4 py-3 rounded-xl border border-white/10 text-slate-400 font-semibold hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}