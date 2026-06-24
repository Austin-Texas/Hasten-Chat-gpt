import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Download, FileText, Loader2, DollarSign, CheckCircle, AlertCircle, Zap, Settings } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import KpiCard from "@/components/hasten/KpiCard";
import StatusBadge from "@/components/hasten/StatusBadge";
import TaxProfileForm from "@/components/payroll/TaxProfileForm";

export default function Payroll() {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingDriver, setProcessingDriver] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [processingResult, setProcessingResult] = useState(null);
  const [editingTaxProfile, setEditingTaxProfile] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.PayrollRecord.list("-created_date", 500),
      base44.entities.Driver.list("-created_date", 200),
    ])
      .then(([records, drv]) => {
        setPayrollRecords(records);
        setDrivers(drv);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleEditTaxProfile = async (driver) => {
    setSelectedDriver(driver);
    try {
      const profiles = await base44.entities.TaxProfile.filter({ driver_id: driver.id }, "-created_date", 1);
      setEditingTaxProfile(profiles[0] || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessPayroll = async (driverId, driverName) => {
    setProcessingDriver(driverId);
    setProcessingResult(null);

    try {
      // Calculate pay period (last 7 days by default, or last week)
      const today = new Date();
      const lastMonday = new Date(today);
      lastMonday.setDate(today.getDate() - today.getDay() + 1 - 7);
      
      const payPeriodEnd = new Date(lastMonday);
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 6);

      const res = await base44.functions.invoke("calculatePayroll", {
        driver_id: driverId,
        pay_period_start: lastMonday.toISOString().split("T")[0],
        pay_period_end: payPeriodEnd.toISOString().split("T")[0],
      });

      if (res.data.success) {
        setProcessingResult({
          success: true,
          message: res.data.message,
          data: res.data.payroll_record,
        });
        // Refresh records
        setTimeout(() => {
          base44.entities.PayrollRecord.list("-created_date", 500)
            .then(records => setPayrollRecords(records))
            .catch(console.error);
        }, 500);
      } else {
        setProcessingResult({
          success: false,
          message: res.data.message || "No loads to process",
        });
      }
    } catch (err) {
      console.error("Payroll processing error:", err);
      setProcessingResult({
        success: false,
        message: err.message || "Error processing payroll",
      });
    } finally {
      setProcessingDriver(null);
    }
  };

  const filteredRecords = filterStatus === "all"
    ? payrollRecords
    : payrollRecords.filter(r => r.status === filterStatus);

  const totalPaid = filteredRecords
    .filter(r => r.status === "paid")
    .reduce((s, r) => s + (r.net_pay || 0), 0);

  const totalPending = filteredRecords
    .filter(r => r.status === "calculated" || r.status === "approved")
    .reduce((s, r) => s + (r.net_pay || 0), 0);

  // Chart data: drivers and their total earnings from payroll records
  const driverEarningsChart = drivers
    .filter(d => d.earnings_ytd > 0)
    .sort((a, b) => (b.earnings_ytd || 0) - (a.earnings_ytd || 0))
    .slice(0, 10)
    .map(d => ({
      name: `${d.first_name} ${d.last_name}`,
      earnings: Math.round(d.earnings_ytd),
      loads: d.loads_completed || 0,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Payroll Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Calculate and manage driver compensation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              // Process payroll for all available drivers
              const today = new Date();
              const lastMonday = new Date(today);
              lastMonday.setDate(today.getDate() - today.getDay() + 1 - 7);
              
              const payPeriodEnd = new Date(lastMonday);
              payPeriodEnd.setDate(payPeriodEnd.getDate() + 6);

              let processed = 0;
              for (const driver of drivers) {
                try {
                  await base44.functions.invoke("calculatePayroll", {
                    driver_id: driver.id,
                    pay_period_start: lastMonday.toISOString().split("T")[0],
                    pay_period_end: payPeriodEnd.toISOString().split("T")[0],
                  });
                  processed++;
                } catch (err) {
                  console.error(`Failed to process ${driver.first_name}:`, err);
                }
              }
              setProcessingResult({
                success: true,
                message: `Payroll processed for ${processed} drivers`,
              });
              setTimeout(() => {
                base44.entities.PayrollRecord.list("-created_date", 500)
                  .then(records => setPayrollRecords(records))
                  .catch(console.error);
              }, 500);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold text-sm transition-all"
          >
            <Zap className="w-4 h-4" />
            Process All
          </button>
          <button
            onClick={async () => {
              try {
                const response = await base44.functions.invoke("exportPayrollData", {
                  export_type: 'w2',
                  year: new Date().getFullYear(),
                });
              } catch (err) {
                console.error('Export error:', err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/60 text-blue-400 font-bold text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export W2
          </button>
          <button
            onClick={async () => {
              try {
                const response = await base44.functions.invoke("exportPayrollData", {
                  export_type: '1099',
                  year: new Date().getFullYear(),
                });
              } catch (err) {
                console.error('Export error:', err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 font-bold text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export 1099
          </button>
        </div>
      </div>

      {processingResult && (
        <div className={`glass-card rounded-xl p-4 border ${
          processingResult.success 
            ? "border-green-500/20 bg-green-500/5" 
            : "border-red-500/20 bg-red-500/5"
        }`}>
          <div className="flex items-start gap-3">
            {processingResult.success ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-bold text-sm">{processingResult.message}</p>
                  {processingResult.data && (
                    <p className="text-green-300/70 text-xs mt-1">
                      Net Pay: ${processingResult.data.net_pay.toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 font-bold text-sm">{processingResult.message}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Paid" value={`$${(totalPaid / 1000).toFixed(1)}k`} icon={DollarSign} color="green" />
        <KpiCard label="Pending" value={`$${(totalPending / 1000).toFixed(1)}k`} icon={FileText} color="amber" />
        <KpiCard label="Payroll Records" value={filteredRecords.length} icon={FileText} color="blue" />
        <KpiCard label="Active Drivers" value={drivers.filter(d => d.status !== "inactive").length} icon={FileText} color="cyan" />
      </div>

      {/* Tax Profile Editor */}
      {editingTaxProfile !== null && selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <TaxProfileForm 
            driverId={selectedDriver.id}
            taxProfile={editingTaxProfile}
            onSave={() => {
              setEditingTaxProfile(null);
              setSelectedDriver(null);
            }}
            onCancel={() => {
              setEditingTaxProfile(null);
              setSelectedDriver(null);
            }}
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/5 w-fit overflow-x-auto">
        {["all", "draft", "calculated", "approved", "paid"].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap ${
              filterStatus === status
                ? "bg-orange-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {status === "all" ? "All Records" : status}
          </button>
        ))}
      </div>

      {/* Driver Earnings Chart */}
      {driverEarningsChart.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-heading font-semibold mb-4">Top Earners (YTD)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverEarningsChart} margin={{ top: 0, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}
                formatter={v => [`$${v.toLocaleString()}`, "Earnings"]}
              />
              <Bar dataKey="earnings" fill="#EA580C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payroll Records Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-heading font-semibold">Payroll Records</h2>
          <span className="text-slate-500 text-xs">{filteredRecords.length} records</span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No payroll records found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 overflow-x-auto">
            <div className="grid grid-cols-8 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider font-semibold bg-white/2 sticky top-0">
              <span>Driver</span>
              <span className="text-right">Period</span>
              <span className="text-right">Loads</span>
              <span className="text-right">Miles</span>
              <span className="text-right">Base Pay</span>
              <span className="text-right">Net Pay</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            {filteredRecords.map(record => {
              const driver = drivers.find(d => d.id === record.driver_id);
              return (
              <div key={record.id} className="grid grid-cols-8 gap-4 px-5 py-3.5 items-center hover:bg-white/2 transition-colors group">
                <div className="truncate">
                  <p className="text-white font-medium text-sm truncate">{record.driver_name}</p>
                  <p className="text-slate-500 text-xs">{record.employment_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-mono text-xs">
                    {new Date(record.pay_period_start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} - {new Date(record.pay_period_end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">{record.loads_completed}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">{record.total_miles.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold text-sm">${record.base_pay.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold text-sm">${record.net_pay.toLocaleString()}</p>
                </div>
                <div>
                  <StatusBadge status={record.status} />
                </div>
                <div className="text-right flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {["calculated", "draft"].includes(record.status) && (
                    <button
                      onClick={() => {
                        base44.entities.PayrollRecord.update(record.id, { status: "approved", approved_by: "admin", approved_at: new Date().toISOString() })
                          .then(() => {
                            base44.entities.Manifest.create({
                              load_id: null,
                              event_type: "payroll_approved",
                              event_title: "Payroll Approved",
                              event_description: `${record.driver_name} payroll approved`,
                              event_timestamp: new Date().toISOString(),
                              is_system_event: false,
                            }).catch(() => {});
                            base44.entities.PayrollRecord.list("-created_date", 500).then(setPayrollRecords);
                          })
                          .catch(console.error);
                      }}
                      className="text-xs px-2 py-1 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:border-blue-500/60 transition-colors whitespace-nowrap"
                    >
                      Approve
                    </button>
                  )}
                  {record.status === "approved" && (
                    <button
                      onClick={() => {
                        base44.entities.PayrollRecord.update(record.id, { status: "paid", paid_date: new Date().toISOString().split("T")[0] })
                          .then(() => {
                            base44.entities.Manifest.create({
                              load_id: null,
                              event_type: "payroll_paid",
                              event_title: "Payroll Paid",
                              event_description: `${record.driver_name} payroll marked as paid`,
                              event_timestamp: new Date().toISOString(),
                              is_system_event: false,
                            }).catch(() => {});
                            base44.entities.PayrollRecord.list("-created_date", 500).then(setPayrollRecords);
                          })
                          .catch(console.error);
                      }}
                      className="text-xs px-2 py-1 rounded bg-green-500/20 border border-green-500/30 text-green-400 hover:border-green-500/60 transition-colors whitespace-nowrap"
                    >
                      Mark Paid
                    </button>
                  )}
                  {driver ? (
                    <button
                      onClick={() => handleEditTaxProfile(driver)}
                      className="text-xs px-2 py-1 rounded bg-slate-500/20 border border-slate-500/30 text-slate-400 hover:border-slate-500/60 transition-colors"
                      title="Edit tax profile"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-600">No driver</span>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Test Data Panel */}
      {payrollRecords.length === 0 && (
        <div className="glass-card rounded-xl p-5 border border-amber-500/20 bg-amber-500/5">
          <h2 className="text-amber-400 font-heading font-semibold mb-3">No Payroll Data</h2>
          <p className="text-slate-400 text-sm mb-4">Create sample payroll records for testing:</p>
          <button
            onClick={async () => {
              for (const driver of drivers.slice(0, 5)) {
                try {
                  const today = new Date();
                  const lastMonday = new Date(today);
                  lastMonday.setDate(today.getDate() - today.getDay() + 1 - 7);
                  const payPeriodEnd = new Date(lastMonday);
                  payPeriodEnd.setDate(payPeriodEnd.getDate() + 6);

                  await base44.entities.PayrollRecord.create({
                    driver_id: driver.id,
                    driver_name: `${driver.first_name} ${driver.last_name}`,
                    pay_type: driver.pay_type || "per_mile",
                    employment_type: driver.employment_type || "W2_employee",
                    pay_period_start: lastMonday.toISOString().split("T")[0],
                    pay_period_end: payPeriodEnd.toISOString().split("T")[0],
                    loads_completed: Math.floor(Math.random() * 10) + 3,
                    total_miles: Math.floor(Math.random() * 2000) + 500,
                    total_hours: Math.floor(Math.random() * 50) + 20,
                    base_pay: Math.floor(Math.random() * 4000) + 6000,
                    bonuses: Math.floor(Math.random() * 500),
                    reimbursements: Math.floor(Math.random() * 200),
                    gross_pay: 8500,
                    federal_withholding: 1200,
                    fica_social_security: 527,
                    fica_medicare: 123,
                    state_withholding: 400,
                    local_withholding: 0,
                    health_insurance: 500,
                    total_deductions: 2750,
                    net_pay: 5750,
                    status: "calculated",
                  });
                } catch (err) {
                  console.error(`Failed to create payroll for ${driver.first_name}:`, err);
                }
              }
              setTimeout(() => {
                base44.entities.PayrollRecord.list("-created_date", 500).then(setPayrollRecords);
              }, 500);
            }}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            Create Sample Payroll
          </button>
        </div>
      )}

      {/* Quick Process Panel */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white font-heading font-semibold mb-4">Quick Process</h2>
        <p className="text-slate-400 text-sm mb-4">Process payroll for individual drivers:</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {drivers.filter(d => d.status !== "inactive").map(driver => (
            <button
              key={driver.id}
              onClick={() => handleProcessPayroll(driver.id, `${driver.first_name} ${driver.last_name}`)}
              disabled={processingDriver === driver.id}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors text-sm"
            >
              <div className="text-left min-w-0">
                <p className="text-white font-medium">{driver.first_name} {driver.last_name}</p>
                <p className="text-slate-500 text-xs">{driver.pay_type} • ${driver.pay_rate?.toFixed(2) || "0.00"}</p>
              </div>
              {processingDriver === driver.id ? (
                <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin flex-shrink-0" />
              ) : (
                <span className="text-orange-400 text-xs font-semibold flex-shrink-0">→</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}