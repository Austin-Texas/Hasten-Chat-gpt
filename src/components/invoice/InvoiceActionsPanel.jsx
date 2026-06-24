import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Check, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { logInvoiceSent, logInvoicePaid, logInvoiceOverdue } from "@/lib/timelineLogger";

export default function InvoiceActionsPanel({ invoice, onUpdate }) {
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [amount, setAmount] = useState(invoice?.amount_paid?.toString() || "");

  const handleSendInvoice = async () => {
    if (!invoice) return;
    setSending(true);
    try {
      let currentUser = { id: 'system', role: 'admin', full_name: 'System' };
      try {
        const user = await base44.auth.me();
        Object.assign(currentUser, user);
      } catch {}

      const updated = await base44.entities.Invoice.update(invoice.id, {
        status: "sent",
      });

      await logInvoiceSent(invoice.id, invoice.invoice_number, currentUser);

      if (onUpdate) onUpdate(updated);
      alert("Invoice sent successfully!");
    } catch (err) {
      console.error("Failed to send invoice:", err);
      alert("Failed to send invoice");
    } finally {
      setSending(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice || !amount.trim()) {
      alert("Please enter amount paid");
      return;
    }
    setMarking(true);
    try {
      let currentUser = { id: 'system', role: 'admin', full_name: 'System' };
      try {
        const user = await base44.auth.me();
        Object.assign(currentUser, user);
      } catch {}

      const paidAmount = parseFloat(amount);
      const updated = await base44.entities.Invoice.update(invoice.id, {
        status: paidAmount >= (invoice.total_amount || 0) ? "paid" : "partial",
        amount_paid: paidAmount,
        paid_date: new Date().toISOString().split('T')[0],
      });

      await logInvoicePaid(invoice.id, invoice.invoice_number, paidAmount, currentUser);

      if (onUpdate) onUpdate(updated);
      setAmount("");
      alert("Invoice marked as paid!");
    } catch (err) {
      console.error("Failed to mark paid:", err);
      alert("Failed to mark invoice as paid");
    } finally {
      setMarking(false);
    }
  };

  const handleMarkOverdue = async () => {
    if (!invoice) return;
    setMarking(true);
    try {
      let currentUser = { id: 'system', role: 'admin', full_name: 'System' };
      try {
        const user = await base44.auth.me();
        Object.assign(currentUser, user);
      } catch {}

      // Calculate days overdue
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      const updated = await base44.entities.Invoice.update(invoice.id, {
        status: "overdue",
      });

      await logInvoiceOverdue(invoice.id, invoice.invoice_number, daysOverdue, currentUser);

      if (onUpdate) onUpdate(updated);
      alert("Invoice marked as overdue!");
    } catch (err) {
      console.error("Failed to mark overdue:", err);
      alert("Failed to mark invoice as overdue");
    } finally {
      setMarking(false);
    }
  };

  const handleVoid = async () => {
    if (!invoice) return;
    if (!confirm("Are you sure you want to void this invoice?")) return;
    setDeleting(true);
    try {
      const updated = await base44.entities.Invoice.update(invoice.id, {
        status: "void",
      });

      if (onUpdate) onUpdate(updated);
      alert("Invoice voided!");
    } catch (err) {
      console.error("Failed to void invoice:", err);
      alert("Failed to void invoice");
    } finally {
      setDeleting(false);
    }
  };

  if (!invoice || invoice.status === "paid" || invoice.status === "void") return null;

  return (
    <div className="glass-card rounded-xl border border-white/5 p-5 space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        Invoice Actions
      </h3>

      {invoice.status === "draft" && (
        <button
          onClick={handleSendInvoice}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending…" : "Send Invoice"}
        </button>
      )}

      {(invoice.status === "sent" || invoice.status === "viewed") && (
        <>
          <div className="space-y-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount paid"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/40"
            />
            <button
              onClick={handleMarkPaid}
              disabled={marking || !amount.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {marking ? "Processing…" : "Mark as Paid"}
            </button>
          </div>

          <button
            onClick={handleMarkOverdue}
            disabled={marking}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/25 disabled:opacity-50 transition-colors"
          >
            {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {marking ? "Marking…" : "Mark as Overdue"}
          </button>
        </>
      )}

      <button
        onClick={handleVoid}
        disabled={deleting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-500/15 border border-slate-500/30 text-slate-400 text-sm font-medium hover:bg-slate-500/25 disabled:opacity-50 transition-colors"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        {deleting ? "Voiding…" : "Void Invoice"}
      </button>
    </div>
  );
}