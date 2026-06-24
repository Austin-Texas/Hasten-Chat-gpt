import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Loader2, DollarSign, Calendar, TrendingUp, AlertCircle } from "lucide-react";

export default function DriverPayrollView({ user }) {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    // Fetch only current driver's payroll records
    base44.entities.PayrollRecord.filter({ driver_id: user?.id }, "-pay_period_end", 100)
      .then(records => {
        // Filter to only paid/approved records (don't show drafts to driver)
        setPayrollRecords(records.filter(r => ['approved', 'paid'].includes(r.status)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleDownloadStatement = async (recordId) => {
    try {
      const response = await base44.functions.invoke("generateSettlementStatement", {
        payroll_record_id: recordId,
        driver_id: user?.id,
      });
      
      if (response.data) {
        // Response is CSV data
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settlement-${recordId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  const totalEarned = payrollRecords
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + (r.net_pay || 0), 0);

  const pendingEarned = payrollRecords
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (r.net_pay || 0), 0);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Payroll & Settlements</h1>
        <p className="text-slate-400 text-sm mt-0.5">View your pay stubs and settlement statements</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-start gap-2 mb-1.5">
            <DollarSign className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-400 text-xs uppercase font-medium">Total Paid</span>
          </div>
          <p className="text-green-400 font-heading font-bold text-xl">${totalEarned.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <p className="text-slate-600 text-xs mt-1">{payrollRecords.filter(r => r.status === 'paid').length} settlements</p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-start gap-2 mb-1.5">
            <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-400 text-xs uppercase font-medium">Pending</span>
          </div>
          <p className="text-amber-400 font-heading font-bold text-xl">${pendingEarned.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <p className="text-slate-600 text-xs mt-1">{payrollRecords.filter(r => r.status === 'approved').length} approved</p>
        </div>
      </div>

      {payrollRecords.length === 0 ? (
        <div className="glass-card rounded-xl p-8 border border-white/5 text-center">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 font-medium">No payroll records yet</p>
          <p className="text-slate-600 text-sm mt-1">Your pay stubs will appear here once payroll is processed</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-white font-heading font-semibold">Settlement Statements</h2>
            <span className="text-slate-500 text-xs">{payrollRecords.length} records</span>
          </div>

          <div className="divide-y divide-white/5 overflow-x-auto">
            <div className="grid grid-cols-7 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider font-semibold bg-white/2 sticky top-0">
              <span>Period</span>
              <span className="text-right">Loads</span>
              <span className="text-right">Miles</span>
              <span className="text-right">Gross Pay</span>
              <span className="text-right">Deductions</span>
              <span className="text-right">Net Pay</span>
              <span className="text-right">Action</span>
            </div>

            {payrollRecords.map(record => (
              <div key={record.id} className="grid grid-cols-7 gap-4 px-5 py-3.5 items-center hover:bg-white/2 transition-colors">
                <div>
                  <p className="text-white text-sm font-mono">{new Date(record.pay_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(record.pay_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{new Date(record.pay_period_end).getFullYear()}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{record.loads_completed}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{record.total_miles.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">${record.gross_pay.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 text-sm">-${record.total_deductions.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${record.status === 'paid' ? 'text-green-400' : 'text-amber-400'}`}>
                    ${record.net_pay.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => handleDownloadStatement(record.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:border-blue-500/60 transition-colors text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Summary (if W-2) */}
      {payrollRecords.length > 0 && payrollRecords.some(r => r.federal_withholding > 0) && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-semibold mb-3">Year-to-Date Tax Withholding</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Federal', key: 'federal_withholding', color: 'text-blue-400' },
              { label: 'Social Security', key: 'fica_social_security', color: 'text-cyan-400' },
              { label: 'Medicare', key: 'fica_medicare', color: 'text-purple-400' },
              { label: 'State', key: 'state_withholding', color: 'text-amber-400' },
            ].map(({ label, key, color }) => {
              const total = payrollRecords.reduce((sum, r) => sum + (r[key] || 0), 0);
              return total > 0 ? (
                <div key={key} className="p-3 rounded-lg bg-white/3">
                  <p className="text-slate-400 text-xs mb-1">{label}</p>
                  <p className={`${color} font-bold text-sm`}>${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}