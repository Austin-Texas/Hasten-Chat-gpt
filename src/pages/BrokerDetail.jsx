import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Mail, Phone, MapPin, DollarSign, TrendingUp } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getCustomer } from "@/lib/dispatcherWorkflow";

export default function BrokerDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loads, setLoads] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      getCustomer(id),
      base44.entities.Load.list("-created_date", 200),
      base44.entities.Invoice.list("-created_date", 200).catch(() => []),
    ])
      .then(([c, allLoads, allInvoices]) => {
        setClient(c);
        setLoads((allLoads || []).filter((load) => [load.customer_id, load.client_id, load.broker_id].includes(id)));
        setInvoices((allInvoices || []).filter((invoice) => [invoice.customer_id, invoice.client_id, invoice.broker_id].includes(id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!client) return <div className="p-8 text-center text-red-400">Customer not found</div>;

  const completedLoads = loads.filter(l => ["completed", "delivered", "closed"].includes(l.status));
  const totalRevenue = loads.reduce((s, l) => s + (l.rate || l.total_revenue || 0), 0);
  const avgRevenue = completedLoads.length > 0 ? Math.round(totalRevenue / completedLoads.length) : 0;
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = paidInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const totalOutstanding = invoices.filter(i => ["sent", "partial"].includes(i.status)).reduce((s, i) => s + (i.balance_due || i.total_amount || 0), 0);

  const paymentHistory = paidInvoices.filter(i => i.issue_date && i.paid_date).map(i => {
    const daysToPay = Math.round((new Date(i.paid_date) - new Date(i.issue_date)) / (1000 * 60 * 60 * 24));
    return { invoice: i.invoice_number, daysToPay, amount: i.total_amount };
  });
  const avgDaysToPay = paymentHistory.length > 0 ? Math.round(paymentHistory.reduce((s, p) => s + p.daysToPay, 0) / paymentHistory.length) : 0;
  const completionRate = loads.length > 0 ? Math.round((completedLoads.length / loads.length) * 100) : 100;
  const paidRate = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 100;
  const overdueRate = invoices.length > 0 ? Math.round((overdueInvoices.length / invoices.length) * 100) : 0;
  let creditScore = 100;
  creditScore -= Math.max(0, (avgDaysToPay - 30) / 5);
  creditScore -= overdueRate;
  creditScore = Math.max(0, Math.min(100, creditScore));
  const creditRating = creditScore >= 80 ? "Excellent" : creditScore >= 60 ? "Good" : creditScore >= 40 ? "Fair" : "Poor";
  const creditColor = creditScore >= 80 ? "green" : creditScore >= 60 ? "amber" : creditScore >= 40 ? "orange" : "red";

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
      <div className="flex items-center gap-4">
        <Link to="/crm" className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-white font-heading font-bold text-2xl">{client.company_name}</h1>
          <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2"><span className="capitalize">{(client.customer_type || client.type || "customer").replace(/_/g, " ")}</span><span>•</span><StatusBadge status={client.status || "active"} /></p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-3">Contact</div>{client.contact_name && <div className="text-white font-semibold text-sm mb-2">{client.contact_name}</div>}{client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-green-400 text-sm hover:text-green-300 mb-2"><Mail className="w-4 h-4" /> {client.email}</a>}{client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-green-400 text-sm hover:text-green-300"><Phone className="w-4 h-4" /> {client.phone}</a>}</div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-3">Address</div>{client.address && <div className="text-white text-sm mb-1">{client.address}</div>}<div className="flex items-center gap-2 text-slate-300 text-sm"><MapPin className="w-4 h-4 flex-shrink-0" /><span>{client.city}, {client.state} {client.zip}</span></div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-3">Billing</div>{client.mc_number && <div className="text-slate-300 text-xs mb-1">MC: {client.mc_number}</div>}{client.dot_number && <div className="text-slate-300 text-xs">DOT: {client.dot_number}</div>}<div className="text-green-400 font-semibold text-sm mt-2">{client.payment_terms || "Net 30"}</div>{client.billing_status === "credit_hold" && <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-300">Credit Hold</div>}</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`glass-card rounded-xl p-5 border border-${creditColor}-500/25 bg-${creditColor}-500/5`}><div className="flex items-start justify-between mb-4"><div><div className="text-slate-400 text-xs font-semibold uppercase mb-1">Credit Score</div><div className={`text-4xl font-bold text-${creditColor}-400`}>{Math.round(creditScore)}</div><div className={`text-${creditColor}-300 text-sm font-semibold mt-1`}>{creditRating}</div></div><TrendingUp className={`w-8 h-8 text-${creditColor}-400 opacity-20`} /></div><div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate-500">Payment timeliness</span><span className="text-white font-semibold">{avgDaysToPay} days avg</span></div><div className="flex justify-between"><span className="text-slate-500">Invoice paid rate</span><span className="text-white font-semibold">{paidRate}%</span></div><div className="flex justify-between"><span className="text-slate-500">Overdue invoices</span><span className={`font-semibold ${overdueInvoices.length > 0 ? "text-red-400" : "text-green-400"}`}>{overdueInvoices.length}</span></div></div></div>
        <div className="glass-card rounded-xl p-5 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-4">Financial Summary</div><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-slate-400">Total Invoiced</span><span className="text-white font-bold">${totalInvoiced.toLocaleString()}</span></div><div className="flex justify-between items-center"><span className="text-slate-400">Amount Paid</span><span className="text-green-400 font-bold">${totalPaid.toLocaleString()}</span></div><div className="flex justify-between items-center"><span className="text-slate-400">Outstanding</span><span className={`font-bold ${totalOutstanding > 0 ? "text-orange-400" : "text-green-400"}`}>${totalOutstanding.toLocaleString()}</span></div><div className="h-px bg-white/5" /><div className="flex justify-between items-center"><span className="text-slate-400">Credit Limit</span><span className="text-white font-bold">${(client.credit_limit || 0).toLocaleString()}</span></div></div></div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">{["overview", "loads", "invoices", "payment"].map(t => <button key={t} onClick={() => setTab(t)} className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${tab === t ? "bg-green-500 text-slate-950" : "text-slate-400 hover:text-white"}`}>{t}</button>)}</div>

      {tab === "overview" && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Metric label="Total Loads" value={loads.length} /><Metric label="Completed" value={completedLoads.length} /><Metric label="Revenue" value={`$${totalRevenue.toLocaleString()}`} color="green" /><Metric label="Avg / Load" value={`$${avgRevenue.toLocaleString()}`} /></div>}
      {tab === "loads" && <RecordList items={loads} empty="No loads for this customer yet." render={(load) => <><span className="text-white font-semibold">{load.load_number || load.id}</span><span className="text-slate-500">{load.origin_city} → {load.destination_city}</span><StatusBadge status={load.status} /></>} />}
      {tab === "invoices" && <RecordList items={invoices} empty="No invoices for this customer yet." render={(invoice) => <><span className="text-white font-semibold">{invoice.invoice_number || invoice.id}</span><span className="text-green-400">${(invoice.total_amount || 0).toLocaleString()}</span><StatusBadge status={invoice.status || "draft"} /></>} />}
      {tab === "payment" && <div className="glass-card rounded-xl p-5 border border-white/5"><h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Payment History</h3><ResponsiveContainer width="100%" height={240}><LineChart data={monthlyData}><XAxis dataKey="month" stroke="hsl(215 20% 55%)" /><YAxis stroke="hsl(215 20% 55%)" /><Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} /><Line type="monotone" dataKey="loads" stroke="#22C55E" strokeWidth={2} /></LineChart></ResponsiveContainer></div>}
    </div>
  );
}

function Metric({ label, value, color = "white" }) {
  return <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">{label}</div><div className={`text-2xl font-bold ${color === "green" ? "text-green-400" : "text-white"}`}>{value}</div></div>;
}

function RecordList({ items, empty, render }) {
  if (!items.length) return <div className="glass-card rounded-xl p-8 text-center text-slate-400 border border-white/5">{empty}</div>;
  return <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">{render(item)}</div>)}</div>;
}
