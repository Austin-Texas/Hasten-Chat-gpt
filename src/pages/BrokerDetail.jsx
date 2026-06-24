import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Mail, Phone, MapPin, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function BrokerDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loads, setLoads] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      base44.entities.Client.filter({ id }, "-created_date", 1).then(r => r[0]),
      base44.entities.Load.filter({ client_id: id }, "-created_date", 100),
      base44.entities.Invoice.filter({ client_id: id }, "-created_date", 100),
    ])
      .then(([c, l, i]) => {
        setClient(c);
        setLoads(l);
        setInvoices(i);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!client) return <div className="p-8 text-center text-red-400">Broker not found</div>;

  // Calculate metrics
  const completedLoads = loads.filter(l => l.status === "completed");
  const totalRevenue = loads.reduce((s, l) => s + (l.rate || 0), 0);
  const avgRevenue = completedLoads.length > 0 ? Math.round(totalRevenue / completedLoads.length) : 0;

  const paidInvoices = invoices.filter(i => i.status === "paid");
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = paidInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const totalOutstanding = invoices
    .filter(i => ["sent", "partial"].includes(i.status))
    .reduce((s, i) => s + (i.balance_due || i.total_amount || 0), 0);

  // Payment behavior: calculate days to pay
  const paymentHistory = paidInvoices
    .filter(i => i.issue_date && i.paid_date)
    .map(i => {
      const issueDate = new Date(i.issue_date);
      const paidDate = new Date(i.paid_date);
      const daysToPay = Math.round((paidDate - issueDate) / (1000 * 60 * 60 * 24));
      return { invoice: i.invoice_number, daysToPay, amount: i.total_amount };
    })
    .sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date));

  const avgDaysToPay = paymentHistory.length > 0
    ? Math.round(paymentHistory.reduce((s, p) => s + p.daysToPay, 0) / paymentHistory.length)
    : 0;

  // Credit score calculation (0-100)
  // Based on: payment timeliness, invoice completion rate, overdue ratio
  const completionRate = loads.length > 0 ? Math.round((completedLoads.length / loads.length) * 100) : 100;
  const paidRate = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 100;
  const overdueRate = invoices.length > 0 ? Math.round((overdueInvoices.length / invoices.length) * 100) : 0;
  
  let creditScore = 100;
  creditScore -= Math.max(0, (avgDaysToPay - 30) / 5); // Deduct for late payments
  creditScore -= overdueRate; // Deduct for overdue invoices
  creditScore = Math.max(0, Math.min(100, creditScore));

  const creditRating = creditScore >= 80 ? "Excellent" : creditScore >= 60 ? "Good" : creditScore >= 40 ? "Fair" : "Poor";
  const creditColor = creditScore >= 80 ? "green" : creditScore >= 60 ? "amber" : creditScore >= 40 ? "orange" : "red";

  // Monthly load volume trend
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - 5 + i);
    const month = date.toLocaleString("default", { month: "short" });
    const count = completedLoads.filter(l => {
      const d = new Date(l.actual_delivery || l.delivery_date || l.created_date);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
    }).length;
    return { month, loads: count };
  });

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/crm" className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-heading font-bold text-2xl">{client.company_name}</h1>
          <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2">
            <span className="capitalize">{client.type}</span>
            <span>•</span>
            <StatusBadge status={client.status} />
          </p>
        </div>
      </div>

      {/* Contact & Location */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-3">Contact</div>
          {client.contact_name && (
            <div className="text-white font-semibold text-sm mb-2">{client.contact_name}</div>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-orange-400 text-sm hover:text-orange-300 mb-2">
              <Mail className="w-4 h-4" /> {client.email}
            </a>
          )}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-orange-400 text-sm hover:text-orange-300">
              <Phone className="w-4 h-4" /> {client.phone}
            </a>
          )}
        </div>

        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-3">Address</div>
          {client.address && <div className="text-white text-sm mb-1">{client.address}</div>}
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>
              {client.city}, {client.state} {client.zip}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-3">Details</div>
          {client.mc_number && <div className="text-slate-300 text-xs mb-1">MC: {client.mc_number}</div>}
          {client.dot_number && <div className="text-slate-300 text-xs">DOT: {client.dot_number}</div>}
          <div className="text-orange-400 font-semibold text-sm mt-2">
            {client.payment_terms || "Net 30"}
          </div>
        </div>
      </div>

      {/* Credit & Payment Score */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`glass-card rounded-xl p-5 border border-${creditColor}-500/25 bg-${creditColor}-500/5`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Credit Score</div>
              <div className={`text-4xl font-bold text-${creditColor}-400`}>{Math.round(creditScore)}</div>
              <div className={`text-${creditColor}-300 text-sm font-semibold mt-1`}>{creditRating}</div>
            </div>
            <TrendingUp className={`w-8 h-8 text-${creditColor}-400 opacity-20`} />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment timeliness</span>
              <span className="text-white font-semibold">{avgDaysToPay} days avg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice paid rate</span>
              <span className="text-white font-semibold">{paidRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Overdue invoices</span>
              <span className={`font-semibold ${overdueInvoices.length > 0 ? "text-red-400" : "text-green-400"}`}>
                {overdueInvoices.length}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-4">Financial Summary</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Invoiced</span>
              <span className="text-white font-bold">${totalInvoiced.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Amount Paid</span>
              <span className="text-green-400 font-bold">${totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Outstanding</span>
              <span className={`font-bold ${totalOutstanding > 0 ? "text-orange-400" : "text-green-400"}`}>
                ${totalOutstanding.toLocaleString()}
              </span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Credit Limit</span>
              <span className="text-white font-bold">${(client.credit_limit || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
        {["overview", "loads", "invoices", "payment"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${
              tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Loads</div>
              <div className="text-2xl font-bold text-white">{loads.length}</div>
              <div className="text-green-400 text-xs mt-1">{completedLoads.length} completed</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Completion Rate</div>
              <div className="text-2xl font-bold text-white">{completionRate}%</div>
              <div className="text-slate-500 text-xs mt-1">{loads.length - completedLoads.length} pending</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Load Value</div>
              <div className="text-2xl font-bold text-green-400">${avgRevenue.toLocaleString()}</div>
              <div className="text-slate-500 text-xs mt-1">Based on completed</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Revenue</div>
              <div className="text-2xl font-bold text-green-400">${totalRevenue.toLocaleString()}</div>
              <div className="text-slate-500 text-xs mt-1">All time</div>
            </div>
          </div>

          {/* Monthly Volume Chart */}
          <div className="glass-card rounded-xl p-5 border border-white/5">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Monthly Load Volume</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
                <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} />
                <Bar dataKey="loads" fill="hsl(25 100% 55%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab === "loads" && (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
          {loads.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No loads</div>
          ) : (
            loads.slice(0, 20).map(load => (
              <Link key={load.id} to={`/loads/${load.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-400 font-mono text-xs font-bold">
                      {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                    </span>
                    <StatusBadge status={load.status} />
                  </div>
                  <div className="text-slate-400 text-sm">
                    {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold text-sm">${(load.rate || 0).toLocaleString()}</div>
                  <div className="text-slate-500 text-xs">{load.equipment_type || "—"}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "invoices" && (
        <div className="space-y-4">
          {/* Outstanding Alert */}
          {totalOutstanding > 0 && (
            <div className="glass-card rounded-xl border border-orange-500/25 bg-orange-500/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-orange-300 font-semibold text-sm">Outstanding Balance</div>
                <div className="text-orange-200 text-sm font-bold mt-1">${totalOutstanding.toLocaleString()}</div>
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No invoices</div>
            ) : (
              invoices.slice(0, 20).map(inv => (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-mono text-sm font-bold">{inv.invoice_number}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="text-slate-500 text-xs">
                      Issued: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : "—"}
                      {inv.due_date && ` • Due: ${new Date(inv.due_date).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">${(inv.total_amount || 0).toLocaleString()}</div>
                    {inv.balance_due ? (
                      <div className="text-orange-400 text-xs font-semibold">
                        ${(inv.balance_due || 0).toLocaleString()} due
                      </div>
                    ) : inv.status === "paid" ? (
                      <div className="text-green-400 text-xs font-semibold">Paid</div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "payment" && (
        <div className="space-y-5">
          {/* Payment Days Trend */}
          {paymentHistory.length > 0 && (
            <div className="glass-card rounded-xl p-5 border border-white/5">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Days to Pay Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={paymentHistory.slice(0, 12)}>
                  <XAxis dataKey="invoice" stroke="hsl(215 20% 55%)" style={{ fontSize: "11px" }} />
                  <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
                  <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} />
                  <Line type="monotone" dataKey="daysToPay" stroke="hsl(25 100% 55%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment History Table */}
          <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
            <div className="p-5 border-b border-white/5">
              <h3 className="text-white font-semibold text-sm">Payment History</h3>
            </div>
            {paymentHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No payment history</div>
            ) : (
              paymentHistory.slice(0, 15).map((p, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-mono text-sm font-bold">{p.invoice}</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded text-xs font-bold ${
                    p.daysToPay <= 30 ? "bg-green-500/15 text-green-400" : p.daysToPay <= 60 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"
                  }`}>
                    {p.daysToPay} days
                  </div>
                  <div className="text-green-400 font-bold text-sm min-w-fit">${p.amount.toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}