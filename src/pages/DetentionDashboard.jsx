import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, DollarSign, AlertCircle, CheckCircle2, Loader2, RefreshCw, FileText } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import KpiCard from "@/components/hasten/KpiCard";

export default function DetentionDashboard() {
  const [records, setRecords] = useState([]);
  const [loads, setLoads] = useState({});
  const [drivers, setDrivers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all detention records
      const detentionRecords = await base44.entities.DetentionRecord.list("-created_date", 200);
      setRecords(detentionRecords);

      // Fetch related loads and drivers
      const loadIds = [...new Set(detentionRecords.map(r => r.load_id))];
      const driverIds = [...new Set(detentionRecords.map(r => r.driver_id))];

      const loadsData = await Promise.all(
        loadIds.map(id => base44.entities.Load.filter({ id }, "-created_date", 1).then(l => [id, l[0]]))
      );
      const driversData = await Promise.all(
        driverIds.map(id => base44.entities.Driver.filter({ id }, "-created_date", 1).then(d => [id, d[0]]))
      );

      setLoads(Object.fromEntries(loadsData));
      setDrivers(Object.fromEntries(driversData));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Metrics
  const pendingApproval = records.filter(r => r.status === "pending_approval");
  const approved = records.filter(r => r.status === "approved");
  const unbilled = approved.filter(r => !r.invoice_id && !r.settlement_id);
  const totalBillableMinutes = approved.reduce((sum, r) => sum + (r.billable_minutes || 0), 0);
  const totalBillableAmount = approved.reduce((sum, r) => sum + (r.billable_amount || 0), 0);

  // Group billable hours by client
  const billableByClient = {};
  approved.forEach(record => {
    const load = loads[record.load_id];
    if (!load) return;
    const client = load.client_id || load.shipper_name || "Unknown Client";
    if (!billableByClient[client]) {
      billableByClient[client] = { minutes: 0, amount: 0, records: 0 };
    }
    billableByClient[client].minutes += record.billable_minutes || 0;
    billableByClient[client].amount += record.billable_amount || 0;
    billableByClient[client].records += 1;
  });

  const clientSummary = Object.entries(billableByClient)
    .map(([client, data]) => ({
      client,
      hours: (data.minutes / 60).toFixed(1),
      amount: data.amount.toFixed(2),
      records: data.records,
    }))
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

  if (loading) {
    return <div className="skeleton h-96 rounded-lg" />;
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-white font-heading font-bold text-2xl">Detention Workflow Dashboard</h1>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
        <p className="text-slate-400 text-sm">Monitor pending approvals, billable hours, and unbilled detention charges.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Pending Approval"
          value={pendingApproval.length}
          subtitle={`${pendingApproval.reduce((sum, r) => sum + (r.billable_minutes || 0), 0)} minutes`}
          color="amber"
        />
        <KpiCard
          label="Approved (Unbilled)"
          value={unbilled.length}
          subtitle={`$${unbilled.reduce((sum, r) => sum + (r.billable_amount || 0), 0).toFixed(0)} pending`}
          color="blue"
        />
        <KpiCard
          label="Total Billable Hours"
          value={(totalBillableMinutes / 60).toFixed(1)}
          subtitle={`${approved.length} records`}
          color="green"
        />
        <KpiCard
          label="Total Billable Amount"
          value={`$${totalBillableAmount.toFixed(0)}`}
          subtitle="All approved detention"
          color="orange"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Approval Queue */}
        <div className="glass-card rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">Pending Manager Approval</h2>
            <span className="ml-auto text-amber-400 font-bold">{pendingApproval.length}</span>
          </div>

          {pendingApproval.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">All pending detentions approved ✓</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingApproval.map(record => (
                <div key={record.id} className="border border-white/5 rounded-lg p-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        Stop {record.stop_number} — {record.facility_name}
                      </p>
                      <p className="text-slate-500 text-xs">Load: {record.load_id?.slice(-6).toUpperCase()}</p>
                    </div>
                    <span className="text-amber-400 font-bold text-sm flex-shrink-0">{record.billable_minutes} min</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      ${record.billable_amount?.toFixed(2) || "0.00"}
                    </span>
                    <span className="text-slate-600">
                      Arrived: {new Date(record.arrived_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billable Hours by Client */}
        <div className="glass-card rounded-xl border border-green-500/20 bg-green-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold">Billable by Client</h2>
          </div>

          {clientSummary.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No approved detention charges yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clientSummary.map((item, idx) => (
                <div key={idx} className="border border-white/5 rounded-lg p-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-white font-medium text-sm truncate flex-1">{item.client}</p>
                    <span className="text-green-400 font-bold text-sm flex-shrink-0">${item.amount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{item.hours}h detention</span>
                    <span>{item.records} records</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approved but Unbilled */}
      <div className="glass-card rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-white font-semibold">Approved, Awaiting Billing</h2>
          <span className="ml-auto text-blue-400 font-bold">{unbilled.length}</span>
        </div>

        {unbilled.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">All approved detention has been billed ✓</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Stop</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Driver</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Minutes</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Amount</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {unbilled.map(record => {
                  const driver = drivers[record.driver_id];
                  return (
                    <tr key={record.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-3 text-white">{record.stop_number}</td>
                      <td className="py-2 px-3 text-slate-400 text-xs">
                        {driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"}
                      </td>
                      <td className="py-2 px-3 text-right text-white font-medium">{record.billable_minutes}</td>
                      <td className="py-2 px-3 text-right text-green-400 font-bold">${record.billable_amount?.toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <StatusBadge status="approved" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Alert */}
      {pendingApproval.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium text-sm">Action Required</p>
            <p className="text-amber-300/80 text-xs mt-1">
              {pendingApproval.length} detention record{pendingApproval.length !== 1 ? "s" : ""} awaiting manager approval. Review in the Detention Approvals queue.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}