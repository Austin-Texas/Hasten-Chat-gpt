import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, TrendingDown, FileText, CreditCard, ChevronRight, Plus, Building2, Download, Zap, Loader2 } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";
import InvoiceActionsPanel from "@/components/invoice/InvoiceActionsPanel";
import { logInvoiceCreated, logInvoiceSent, logInvoicePaid, logInvoiceOverdue } from "@/lib/timelineLogger";
import StatusBadge from "@/components/hasten/StatusBadge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import ExportReportModal from "@/components/finance/ExportReportModal";
import PayrollSummary from "@/components/finance/PayrollSummary";
import InvoiceGeneratorModal from "@/components/finance/InvoiceGeneratorModal";
import BulkInvoiceModal from "@/components/finance/BulkInvoiceModal";
import FuelEfficiencyDashboard from "@/components/finance/FuelEfficiencyDashboard";
import MileageReportGenerator from "@/components/finance/MileageReportGenerator";
import RouteProfitabilityHeatmap from "@/components/finance/RouteProfitabilityHeatmap";
import DriverPayCalculator from "@/components/finance/DriverPayCalculator";
import DetentionTracker from "@/components/finance/DetentionTracker";
import LoadMetricsCalculator from "@/components/finance/LoadMetricsCalculator";
import ExpenseApprovals from "@/pages/ExpenseApprovals";
import DriverExpenseBreakdown from "@/components/finance/DriverExpenseBreakdown";
import FuelCardImport from "@/components/finance/FuelCardImport";
import SettlementGenerator from "@/components/finance/SettlementGenerator";

export default function Finance() {
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loads, setLoads] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [showExport, setShowExport] = useState(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showBulkInvoice, setShowBulkInvoice] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenResult, setAutoGenResult] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list("-created_date", 100),
      base44.entities.Expense.list("-created_date", 100),
      base44.entities.Load.filter({ status: "completed" }, "-created_date", 200),
      base44.entities.Client.list("-created_date", 100),
    ]).then(([inv, exp, ld, cl]) => {
      setInvoices(inv);
      setExpenses(exp);
      setLoads(ld);
      setClients(cl);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalRevenue = loads.reduce((s, l) => s + (l.rate || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const pendingInvoices = invoices.filter(i => ["sent", "draft"].includes(i.status));
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const totalPaid = paidInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);

  const expByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
    return acc;
  }, {});
  const expChart = Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, amount]) => ({ cat, amount }));

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Finance</h1>
          <p className="text-slate-400 text-sm mt-0.5">Financial overview & accounting</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setAutoGenerating(true);
              try {
                // Get current user for timeline
                let currentUser = null;
                try {
                  currentUser = await base44.auth.me();
                } catch {
                  currentUser = { id: 'system', role: 'system', full_name: 'System' };
                }

                const res = await base44.functions.invoke('autoGenerateInvoices', {});
                setAutoGenResult(res.data);
                
                // Log timeline events for each created invoice
                if (res.data?.invoices && Array.isArray(res.data.invoices)) {
                  for (const inv of res.data.invoices) {
                    await logInvoiceCreated(inv.id, inv.invoice_number, inv.total_amount || 0, currentUser);
                  }
                }
                
                setTimeout(() => {
                  base44.entities.Invoice.list("-created_date", 100).then(setInvoices);
                  setAutoGenResult(null);
                }, 1000);
              } catch (err) {
                console.error(err);
              } finally {
                setAutoGenerating(false);
              }
            }}
            disabled={autoGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 transition-colors"
          >
            {autoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {autoGenerating ? "Generating…" : "Auto-Generate"}
          </button>
          <button
            onClick={() => setShowBulkInvoice(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Bulk Invoice
          </button>
          <button
            onClick={() => setShowInvoiceGenerator(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <FileText className="w-4 h-4" /> Manual Invoice
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {autoGenResult && (
        <div className="glass-card rounded-xl p-4 border border-green-500/20 bg-green-500/5 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-green-400 font-semibold text-sm">{autoGenResult.message}</div>
              <p className="text-slate-400 text-xs mt-1">
                {autoGenResult.invoicesCreated} invoice{autoGenResult.invoicesCreated !== 1 ? 's' : ''} created and ready for review
              </p>
            </div>
          </div>
        </div>
      )}

      {showBulkInvoice && (
        <BulkInvoiceModal
          loads={loads}
          clients={clients}
          onClose={() => setShowBulkInvoice(false)}
          onInvoiceGenerated={() => {
            setTimeout(() => {
              base44.entities.Invoice.list("-created_date", 100).then(setInvoices);
            }, 500);
          }}
        />
      )}

      {showExport && (
        <ExportReportModal
          loads={loads}
          invoices={invoices}
          expenses={expenses}
          clients={clients}
          onClose={() => setShowExport(false)}
        />
      )}

      {showInvoiceGenerator && (
        <InvoiceGeneratorModal
          loads={loads}
          clients={clients}
          onClose={() => setShowInvoiceGenerator(false)}
          onInvoiceGenerated={() => {
            setTimeout(() => {
              Promise.all([
                base44.entities.Invoice.list("-created_date", 100),
              ]).then(([inv]) => {
                setInvoices(inv);
              });
            }, 500);
          }}
        />
      )}

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit overflow-x-auto">
          {["overview", "settlements", "metrics", "brokers", "analytics", "payroll", "driver-pay", "fuel", "fuel-import", "mileage", "detention", "routes", "invoices", "expenses", "expense-breakdown", "expense-approvals"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 whitespace-nowrap ${tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"}`}>
              {t === "settlements" ? "💰 Settlements" : t === "analytics" ? "Load Analytics" : t === "metrics" ? "Load Metrics" : t === "fuel" ? "Fuel Efficiency" : t === "fuel-import" ? "⛽ Fuel Card Import" : t === "mileage" ? "IFTA Mileage" : t === "detention" ? "Detention Tracking" : t === "routes" ? "Route Profitability" : t === "driver-pay" ? "Driver Pay" : t === "expense-approvals" ? "Expense Review" : t === "expense-breakdown" ? "Expense Breakdown" : t}
            </button>
          ))}
        </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={`$${(totalRevenue/1000).toFixed(0)}k`} icon={TrendingUp} color="green" />
            <KpiCard label="Total Expenses" value={`$${(totalExpenses/1000).toFixed(0)}k`} icon={TrendingDown} color="red" />
            <KpiCard label="Net Profit" value={`$${(netProfit/1000).toFixed(0)}k`} icon={DollarSign} color={netProfit >= 0 ? "green" : "red"} />
            <KpiCard label="Invoices Paid" value={`$${(totalPaid/1000).toFixed(0)}k`} icon={CreditCard} color="cyan" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Pending Invoices" value={pendingInvoices.length} icon={FileText} color="amber" />
            <KpiCard label="Overdue" value={overdueInvoices.length} icon={FileText} color="red" />
            <KpiCard label="Paid Invoices" value={paidInvoices.length} icon={CheckCircle2} color="green" />
            <KpiCard label="Total Invoices" value={invoices.length} icon={FileText} color="blue" />
          </div>

          {expChart.length > 0 && (
            <div className="glass-card rounded-xl p-5 border border-white/5">
              <h2 className="text-white font-heading font-semibold mb-4">Expenses by Category</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={expChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="cat" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}
                    formatter={v => [`$${v.toLocaleString()}`, "Amount"]} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {expChart.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#EA580C" : i === 1 ? "#F97316" : "#3B82F6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {tab === "settlements" && (
        <SettlementGenerator />
      )}

      {tab === "brokers" && (
         <BrokerRevenueTab loads={loads} clients={clients} />
       )}

      {tab === "analytics" && (
         <BrokerLoadAnalytics loads={loads} clients={clients} invoices={invoices} />
       )}

       {tab === "payroll" && (
        <PayrollSummary />
      )}

      {tab === "metrics" && (
        <LoadMetricsCalculator />
      )}

      {tab === "driver-pay" && (
        <DriverPayCalculator />
      )}

      {tab === "detention" && (
        <DetentionTracker />
      )}

      {tab === "fuel" && (
        <FuelEfficiencyDashboard />
      )}

      {tab === "mileage" && (
        <MileageReportGenerator />
      )}

      {tab === "routes" && (
        <RouteProfitabilityHeatmap />
      )}

      {tab === "invoices" && (
        <div className="space-y-5">
          <div className="glass-card rounded-xl border border-white/5">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-white font-medium">Invoices</h2>
            </div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No invoices yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 cursor-pointer transition-colors"
                    onClick={() => setSelectedInvoice(selectedInvoice?.id === inv.id ? null : inv)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-mono text-sm font-bold">{inv.invoice_number}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="text-slate-500 text-xs">
                        Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${inv.status === "paid" ? "text-green-400" : inv.status === "overdue" ? "text-red-400" : "text-white"}`}>
                        ${(inv.total_amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedInvoice && (
            <InvoiceActionsPanel 
              invoice={selectedInvoice} 
              onUpdate={(updated) => {
                setSelectedInvoice(updated);
                base44.entities.Invoice.list("-created_date", 100).then(setInvoices);
              }}
            />
          )}
        </div>
      )}

      {tab === "expenses" && (
        <div className="glass-card rounded-xl border border-white/5">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h2 className="text-white font-medium">Expenses</h2>
          </div>
          {expenses.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No expenses recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm capitalize">{exp.category?.replace("_", " ")}</div>
                    <div className="text-slate-500 text-xs">{exp.vendor || exp.description || "—"} · {exp.date ? new Date(exp.date).toLocaleDateString() : "—"}</div>
                  </div>
                  <StatusBadge status={exp.status || "pending"} />
                  <div className="text-red-400 font-bold text-sm">-${(exp.amount || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "fuel-import" && (
        <FuelCardImport />
      )}

      {tab === "expense-breakdown" && (
        <DriverExpenseBreakdown />
      )}

      {tab === "expense-approvals" && (
        <ExpenseApprovals user={{ id: "admin" }} />
      )}
    </div>
  );
}

const BROKER_COLORS = ["#EA580C","#F97316","#3B82F6","#22C55E","#A855F7","#06B6D4","#EAB308","#F43F5E"];

function BrokerRevenueTab({ loads, clients }) {
  const [selectedBroker, setSelectedBroker] = useState(null);
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  // Aggregate revenue per broker
  const brokerMap = {};
  loads.forEach(l => {
    const bid = l.broker_id || l.client_id || "__unknown__";
    if (!brokerMap[bid]) brokerMap[bid] = { id: bid, revenue: 0, loads: 0, loadList: [] };
    brokerMap[bid].revenue += l.rate || 0;
    brokerMap[bid].loads += 1;
    brokerMap[bid].loadList.push(l);
  });

  const brokers = Object.values(brokerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((b, i) => ({
      ...b,
      name: clientMap[b.id]?.company_name || (b.id === "__unknown__" ? "Unassigned" : `Broker ${b.id.slice(-4)}`),
      color: BROKER_COLORS[i % BROKER_COLORS.length],
    }));

  const totalRevenue = brokers.reduce((s, b) => s + b.revenue, 0);
  const topBroker = brokers[0];

  // Monthly performance for selected or all brokers (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
  });

  const monthlyData = months.map(m => {
    const row = { month: m.label };
    const targetBrokers = selectedBroker ? brokers.filter(b => b.id === selectedBroker) : brokers.slice(0, 4);
    targetBrokers.forEach(b => {
      row[b.name] = b.loadList
        .filter(l => {
          const d = new Date(l.actual_delivery || l.delivery_date || l.created_date);
          return d.getFullYear() === m.year && d.getMonth() === m.month;
        })
        .reduce((s, l) => s + (l.rate || 0), 0);
    });
    return row;
  });

  const chartBrokers = selectedBroker ? brokers.filter(b => b.id === selectedBroker) : brokers.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Active Brokers" value={brokers.length} icon={Building2} color="blue" />
        <KpiCard label="Broker Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}k`} icon={TrendingUp} color="green" />
        {topBroker && <KpiCard label="Top Broker" value={topBroker.name} sub={`$${topBroker.revenue.toLocaleString()}`} icon={TrendingUp} color="orange" />}
      </div>

      {/* Monthly chart */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-white font-heading font-semibold">Monthly Revenue by Broker</h2>
          <select
            value={selectedBroker || ""}
            onChange={e => setSelectedBroker(e.target.value || null)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-orange-500/40"
            style={{ background: "#0F1829" }}
          >
            <option value="" style={{ background: "#0F1829" }}>All Brokers (Top 4)</option>
            {brokers.map(b => (
              <option key={b.id} value={b.id} style={{ background: "#0F1829" }}>{b.name}</option>
            ))}
          </select>
        </div>
        {loads.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No completed loads to chart</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: 12 }}
                  formatter={v => [`$${v.toLocaleString()}`, ""]}
                />
                {chartBrokers.map(b => (
                  <Line key={b.id} type="monotone" dataKey={b.name} stroke={b.color} strokeWidth={2} dot={{ r: 3, fill: b.color }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {chartBrokers.map(b => (
                <div key={b.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: b.color }} />
                  <span className="text-slate-400 text-xs">{b.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Broker table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold">Broker Performance</h2>
        </div>
        {brokers.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No broker data from completed loads</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
              <span>Broker</span><span className="text-right">Loads</span><span className="text-right">Revenue</span><span className="text-right">Avg / Load</span>
            </div>
            <div className="divide-y divide-white/5">
              {brokers.map((b, i) => {
                const pct = totalRevenue > 0 ? (b.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={b.id} className="px-5 py-3.5 hover:bg-white/2 transition-colors">
                    <div className="grid grid-cols-4 gap-4 items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: b.color }} />
                        <span className="text-white text-sm font-medium truncate">{b.name}</span>
                      </div>
                      <span className="text-right text-slate-300 text-sm">{b.loads}</span>
                      <span className="text-right text-green-400 font-bold text-sm font-mono">${b.revenue.toLocaleString()}</span>
                      <span className="text-right text-slate-400 text-sm font-mono">${Math.round(b.revenue / b.loads).toLocaleString()}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: b.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CheckCircle2({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function BrokerLoadAnalytics({ loads, clients, invoices }) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  // Build broker load performance data
  const brokerMap = {};
  loads.forEach(l => {
    const bid = l.broker_id || l.client_id || "__unknown__";
    if (!brokerMap[bid]) {
      brokerMap[bid] = {
        id: bid,
        name: clientMap[bid]?.company_name || (bid === "__unknown__" ? "Unassigned" : `Broker ${bid.slice(-4)}`),
        loads: 0,
        completed: 0,
        revenue: 0,
        avgValue: 0,
        loadList: [],
      };
    }
    brokerMap[bid].loads += 1;
    if (l.status === "completed") brokerMap[bid].completed += 1;
    brokerMap[bid].revenue += l.rate || 0;
    brokerMap[bid].loadList.push(l);
  });

  const brokers = Object.values(brokerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map(b => ({
      ...b,
      avgValue: b.loads > 0 ? Math.round(b.revenue / b.loads) : 0,
      completionRate: b.loads > 0 ? Math.round((b.completed / b.loads) * 100) : 0,
    }));

  // Payment speed analysis: days from load completion to payment
  const paymentSpeedData = [];
  brokers.slice(0, 8).forEach(broker => {
    const brokerInvoices = invoices.filter(inv => inv.client_id === broker.id || inv.broker_id === broker.id);
    const paidInvoices = brokerInvoices.filter(inv => inv.status === "paid" && inv.issue_date && inv.paid_date);

    if (paidInvoices.length > 0) {
      const daysToPay = paidInvoices.map(inv => {
        const issuDate = new Date(inv.issue_date);
        const paidDate = new Date(inv.paid_date);
        return Math.round((paidDate - issuDate) / (1000 * 60 * 60 * 24));
      });
      const avgDays = Math.round(daysToPay.reduce((s, d) => s + d, 0) / daysToPay.length);

      paymentSpeedData.push({
        name: broker.name,
        avgDaysToPay: avgDays,
        invoicesPaid: paidInvoices.length,
      });
    }
  });

  // Monthly load trend per top broker
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleString("default", { month: "short" }), date: d };
  });

  const topBrokers = brokers.slice(0, 3);
  const monthlyLoadTrend = months.map(m => {
    const row = { month: m.label };
    topBrokers.forEach(b => {
      row[b.name] = b.loadList.filter(l => {
        const d = new Date(l.actual_delivery || l.delivery_date || l.created_date);
        return d.getFullYear() === m.date.getFullYear() && d.getMonth() === m.date.getMonth();
      }).length;
    });
    return row;
  });

  const COLORS = ["#EA580C", "#F97316", "#3B82F6", "#22C55E", "#A855F7", "#06B6D4", "#EAB308", "#F43F5E"];

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Load Volume</div>
          <div className="text-2xl font-bold text-white">{loads.length}</div>
          <div className="text-slate-500 text-xs mt-1">{brokers.length} active brokers</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Load Value</div>
          <div className="text-2xl font-bold text-green-400">${loads.length > 0 ? Math.round(loads.reduce((s, l) => s + (l.rate || 0), 0) / loads.length).toLocaleString() : 0}</div>
          <div className="text-slate-500 text-xs mt-1">Per load</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Completion Rate</div>
          <div className="text-2xl font-bold text-blue-400">{loads.length > 0 ? Math.round((loads.filter(l => l.status === "completed").length / loads.length) * 100) : 0}%</div>
          <div className="text-slate-500 text-xs mt-1">All loads</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Payment Speed</div>
          <div className="text-2xl font-bold text-amber-400">
            {paymentSpeedData.length > 0 ? Math.round(paymentSpeedData.reduce((s, p) => s + p.avgDaysToPay, 0) / paymentSpeedData.length) : 0} days
          </div>
          <div className="text-slate-500 text-xs mt-1">From invoice to paid</div>
        </div>
      </div>

      {/* Load Volume Trend */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Load Volume by Top Brokers</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyLoadTrend} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <XAxis dataKey="month" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} />
            <Legend />
            {topBrokers.map((b, i) => (
              <Line key={b.id} type="monotone" dataKey={b.name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3, fill: COLORS[i] }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Payment Speed Analysis */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Payment Speed Benchmark</h3>
        {paymentSpeedData.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No payment data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={paymentSpeedData} margin={{ top: 0, right: 8, left: 8, bottom: 40 }}>
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" style={{ fontSize: "11px" }} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} label={{ value: "Days to Payment", angle: -90, position: "insideLeft" }} />
              <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }}
                formatter={v => [`${v} days`, "Avg Days"]} />
              <Bar dataKey="avgDaysToPay" radius={[8, 8, 0, 0]} fill="#EA580C" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Broker Performance Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm">Broker Load Performance</h3>
        </div>
        {brokers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No broker data</div>
        ) : (
          <>
            <div className="grid grid-cols-6 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
              <span>Broker</span><span className="text-right">Loads</span><span className="text-right">Completed</span><span className="text-right">Completion %</span><span className="text-right">Avg Value</span><span className="text-right">Total Revenue</span>
            </div>
            {brokers.map((b, i) => (
              <div key={b.id} className="grid grid-cols-6 gap-4 px-5 py-3.5 border-b border-white/5 hover:bg-white/2 transition-colors">
                <span className="text-white text-sm font-medium truncate">{b.name}</span>
                <span className="text-right text-slate-300 text-sm">{b.loads}</span>
                <span className="text-right text-green-400 text-sm font-semibold">{b.completed}</span>
                <span className={`text-right text-sm font-semibold ${b.completionRate >= 80 ? "text-green-400" : b.completionRate >= 60 ? "text-amber-400" : "text-red-400"}`}>
                  {b.completionRate}%
                </span>
                <span className="text-right text-slate-300 text-sm">${b.avgValue.toLocaleString()}</span>
                <span className="text-right text-green-400 text-sm font-bold">${b.revenue.toLocaleString()}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}