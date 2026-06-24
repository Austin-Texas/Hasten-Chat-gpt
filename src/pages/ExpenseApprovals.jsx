import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, X, AlertCircle, FileText, DollarSign, MessageSquare, ChevronRight, Filter } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

// ── Receipt Modal ──────────────────────────────────────────────────────────
function ReceiptModal({ url, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/5 bg-card">
          <span className="text-white font-semibold">Receipt Preview</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          {url.endsWith(".pdf") ? (
            <iframe src={url} className="w-full h-[600px] rounded-lg border border-white/10" />
          ) : (
            <img src={url} alt="Receipt" className="w-full rounded-lg border border-white/10" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Expense Row ──────────────────────────────────────────────────────────────
function ExpenseRow({ expense, driver, onApprove, onReject, onRequestCorrection, loading }) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);

  const handleReject = () => {
    if (!rejectionReason.trim()) return;
    onReject(expense.id, rejectionReason);
    setRejectionReason("");
    setShowRejectForm(false);
  };

  const handleCorrection = () => {
    if (!correctionNotes.trim()) return;
    onRequestCorrection(expense.id, correctionNotes);
    setCorrectionNotes("");
    setShowCorrectionForm(false);
  };

  return (
    <div className="glass-card border border-white/5 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-white font-semibold capitalize">{expense.category.replace("_", " ")}</div>
              <div className="text-slate-500 text-xs">{driver?.first_name} {driver?.last_name} · {new Date(expense.date).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-green-400 font-bold text-xl">${(expense.amount || 0).toLocaleString()}</div>
          <StatusBadge status={expense.status} />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-3">
        {expense.vendor && (
          <div className="bg-white/3 rounded-lg p-2.5">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Vendor</div>
            <div className="text-white text-sm font-medium">{expense.vendor}</div>
          </div>
        )}
        {expense.location_city && (
          <div className="bg-white/3 rounded-lg p-2.5">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Location</div>
            <div className="text-white text-sm font-medium">{expense.location_city}, {expense.location_state}</div>
          </div>
        )}
        {expense.gallons && (
          <div className="bg-white/3 rounded-lg p-2.5">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Fuel</div>
            <div className="text-white text-sm font-medium">{expense.gallons} gal @ ${expense.price_per_gallon}/gal</div>
          </div>
        )}
      </div>

      {/* Description / Notes */}
      {expense.description && (
        <div className="bg-white/3 rounded-lg p-3">
          <div className="text-slate-400 text-xs">{expense.description}</div>
        </div>
      )}

      {/* Correction notes (if driver requested correction) */}
      {expense.correction_notes && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-300 text-xs font-semibold mb-0.5">Correction Requested:</div>
            <div className="text-amber-200 text-xs">{expense.correction_notes}</div>
          </div>
        </div>
      )}

      {/* Rejection reason (if rejected) */}
      {expense.rejection_reason && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-red-300 text-xs font-semibold mb-0.5">Rejection Reason:</div>
            <div className="text-red-200 text-xs">{expense.rejection_reason}</div>
          </div>
        </div>
      )}

      {/* Receipt & Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          {expense.receipt_url && (
            <button
              onClick={() => setShowReceipt(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all text-xs font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              View Receipt
            </button>
          )}
        </div>

        {expense.status === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowCorrectionForm(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:text-amber-200 transition-all text-xs font-semibold disabled:opacity-50"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Correction
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/25 text-red-300 hover:text-red-200 transition-all text-xs font-semibold disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
            <button
              onClick={() => onApprove(expense.id)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/25 text-green-300 hover:text-green-200 transition-all text-xs font-semibold disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-green-500/20 border-t-green-300 rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Approve
            </button>
          </div>
        )}
      </div>

      {/* Rejection form */}
      {showRejectForm && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <textarea
            placeholder="Reason for rejection…"
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-red-500/40 transition-colors resize-none"
            rows="2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || loading}
              className="flex-1 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Correction form */}
      {showCorrectionForm && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <textarea
            placeholder="What needs to be corrected? (e.g., receipt is blurry, amount mismatch, missing vendor info)"
            value={correctionNotes}
            onChange={e => setCorrectionNotes(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500/40 transition-colors resize-none"
            rows="2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCorrection}
              disabled={!correctionNotes.trim() || loading}
              className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              Send Correction Request
            </button>
            <button
              onClick={() => { setShowCorrectionForm(false); setCorrectionNotes(""); }}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && expense.receipt_url && (
        <ReceiptModal url={expense.receipt_url} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ExpenseApprovals({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expList, drvList] = await Promise.all([
        base44.entities.Expense.list("-created_date", 200),
        base44.entities.Driver.list("-created_date", 100),
      ]);
      setExpenses(expList);
      setDrivers(Object.fromEntries(drvList.map(d => [d.id, d])));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (expenseId) => {
    setActionLoading(expenseId);
    try {
      await base44.entities.Expense.update(expenseId, {
        status: "approved",
        approved_by: user?.id,
        approved_date: new Date().toISOString(),
      });
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (expenseId, reason) => {
    setActionLoading(expenseId);
    try {
      await base44.entities.Expense.update(expenseId, {
        status: "rejected",
        rejection_reason: reason,
        approved_by: user?.id,
        approved_date: new Date().toISOString(),
      });
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestCorrection = async (expenseId, notes) => {
    setActionLoading(expenseId);
    try {
      await base44.entities.Expense.update(expenseId, {
        status: "pending",
        correction_notes: notes,
        approved_by: user?.id,
      });
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = expenses.filter(e => {
    if (tab === "pending") return e.status === "pending";
    if (tab === "approved") return e.status === "approved";
    if (tab === "rejected") return e.status === "rejected";
    return true;
  });

  const stats = {
    pending: expenses.filter(e => e.status === "pending").length,
    approved: expenses.filter(e => e.status === "approved").length,
    rejected: expenses.filter(e => e.status === "rejected").length,
    pendingAmount: expenses.filter(e => e.status === "pending").reduce((s, e) => s + (e.amount || 0), 0),
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Expense Approvals</h1>
        <p className="text-slate-400 text-sm mt-0.5">Review and approve driver expense receipts</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Pending</div>
              <div className="text-white font-bold text-2xl mt-1">{stats.pending}</div>
            </div>
            <div className="text-amber-400 text-3xl opacity-20">!</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Amount</div>
              <div className="text-green-400 font-bold text-2xl mt-1">${(stats.pendingAmount / 1000).toFixed(1)}k</div>
            </div>
            <DollarSign className="w-8 h-8 text-green-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Approved</div>
              <div className="text-green-400 font-bold text-2xl mt-1">{stats.approved}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Rejected</div>
              <div className="text-red-400 font-bold text-2xl mt-1">{stats.rejected}</div>
            </div>
            <X className="w-8 h-8 text-red-400 opacity-20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
        {["pending", "approved", "rejected"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${
              tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}>
            {t}
            {(t === "pending" && stats.pending > 0) && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-white text-orange-500 text-[10px] font-bold">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No {tab} expenses</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(exp => (
            <ExpenseRow
              key={exp.id}
              expense={exp}
              driver={drivers[exp.driver_id]}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestCorrection={handleRequestCorrection}
              loading={actionLoading === exp.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}