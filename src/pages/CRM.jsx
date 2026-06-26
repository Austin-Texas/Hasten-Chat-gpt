import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Plus, Search, Mail, MapPin, DollarSign, ChevronRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/hasten/StatusBadge";
import KpiCard from "@/components/hasten/KpiCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { listCustomers } from "@/lib/dispatcherWorkflow";

export default function CRM() {
  const [clients, setClients] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tab, setTab] = useState("list");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customers, ld] = await Promise.all([
        listCustomers("-created_date", 200),
        base44.entities.Load.list("-created_date", 200),
      ]);
      setClients(customers);
      setLoads(ld || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribers = [
      base44.entities.Customer.subscribe?.(() => fetchData()),
      base44.entities.Client.subscribe?.(() => fetchData()),
    ].filter(Boolean);
    return () => unsubscribers.forEach((unsub) => typeof unsub === "function" && unsub());
  }, []);

  const TYPE_OPTS = ["all", "broker", "direct_client", "shipper", "receiver"];
  const filtered = clients.filter(c => {
    const customerType = c.customer_type || c.type;
    const matchType = typeFilter === "all" || customerType === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (c.company_name || "").toLowerCase().includes(q) ||
      (c.contact_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const activeClients = clients.filter(c => (c.status || "active") === "active");
  const brokers = clients.filter(c => (c.customer_type || c.type) === "broker");
  const totalRevenue = clients.reduce((s, c) => s + (c.total_revenue || 0), 0);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Customers</h1>
          <p className="text-slate-400 text-sm mt-0.5">Unified brokers, direct clients, shippers, and receivers</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/crm/new/broker" className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <Plus className="w-4 h-4" /> Add Broker
          </Link>
          <Link to="/crm/new/client" className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-950 text-sm bg-green-500 hover:bg-green-400">
            <Plus className="w-4 h-4" /> Add Customer
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Customers" value={activeClients.length} icon={Building2} color="orange" />
        <KpiCard label="Brokers" value={brokers.length} icon={Building2} color="blue" />
        <KpiCard label="Total Revenue" value={`$${(totalRevenue/1000).toFixed(0)}k`} icon={DollarSign} color="green" />
        <KpiCard label="Total Contacts" value={clients.length} icon={Building2} color="cyan" />
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
        {["list", "trends"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${tab === t ? "bg-green-500 text-slate-950" : "text-slate-400 hover:text-white"}`}>
            {t === "list" ? "Customers" : "Q Performance"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTS.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all duration-150 ${typeFilter === t ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}>
                {t === "all" ? "All" : t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/40 transition-colors" />
          </div>
        </>
      )}

      {tab === "list" && (
        <>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400 font-medium">No customers found</p></div>
          ) : (
            <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
              {filtered.map(client => (
                <Link key={client.id} to={`/crm/${client.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0"><span className="text-green-400 font-bold text-sm">{(client.company_name || "?").charAt(0)}</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5"><span className="text-white font-medium">{client.company_name}</span><StatusBadge status={client.status || "active"} /><span className="text-slate-600 text-xs capitalize">({(client.customer_type || client.type || "customer").replace(/_/g, " ")})</span></div>
                    <div className="flex items-center gap-3 text-slate-500 text-xs">
                      {client.contact_name && <span>{client.contact_name}</span>}
                      {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
                      {client.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.city}, {client.state}</span>}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    {client.total_revenue > 0 && <div className="text-green-400 text-sm font-bold">${client.total_revenue.toLocaleString()}</div>}
                    {client.total_loads > 0 && <div className="text-slate-500 text-xs">{client.total_loads} loads</div>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "trends" && <PerformanceTrends clients={clients} loads={loads} />}
    </div>
  );
}

function PerformanceTrends({ clients, loads }) {
  const now = new Date();
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
    return { label: d.toLocaleString("default", { month: "short", year: "2-digit" }), date: d };
  });

  const monthlyData = months.map(m => {
    const loadsInMonth = loads.filter(l => {
      const d = new Date(l.actual_delivery || l.delivery_date || l.created_date);
      return d.getFullYear() === m.date.getFullYear() && d.getMonth() === m.date.getMonth();
    });
    const revenue = loadsInMonth.reduce((s, l) => s + (l.rate || 0), 0);
    return { month: m.label, revenue, loads: loadsInMonth.length };
  });

  const brokers = clients.filter(c => (c.customer_type || c.type) === "broker");
  const brokerStats = brokers.map(b => {
    const brokerLoads = loads.filter(l => l.customer_id === b.id || l.client_id === b.id || l.broker_id === b.id)
      .filter(l => new Date(l.actual_delivery || l.delivery_date || l.created_date) >= months[0].date);
    const completedLoads = brokerLoads.filter(l => ["completed", "delivered", "closed"].includes(l.status)).length;
    const totalRevenue = brokerLoads.reduce((s, l) => s + (l.rate || 0), 0);
    return { name: b.company_name, loads: brokerLoads.length, completed: completedLoads, revenue: totalRevenue, completionRate: brokerLoads.length > 0 ? Math.round((completedLoads / brokerLoads.length) * 100) : 0 };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const topBroker = brokerStats[0];
  const totalQ = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalLoadsQ = monthlyData.reduce((s, m) => s + m.loads, 0);
  const avgMonthly = totalQ / 3;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">Q Revenue</div><div className="text-2xl font-bold text-green-400">${(totalQ / 1000).toFixed(0)}k</div><div className="text-slate-500 text-xs mt-1">${(avgMonthly / 1000).toFixed(0)}k avg/mo</div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">Q Loads</div><div className="text-2xl font-bold text-white">{totalLoadsQ}</div><div className="text-slate-500 text-xs mt-1">{Math.round(totalLoadsQ / 3)} avg/mo</div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">Active Brokers</div><div className="text-2xl font-bold text-blue-400">{brokerStats.length}</div><div className="text-slate-500 text-xs mt-1">{brokers.length} total</div></div>
        {topBroker && <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">Top Broker</div><div className="text-white font-semibold text-sm truncate">{topBroker.name}</div><div className="text-green-400 text-xs font-bold mt-1">${topBroker.revenue.toLocaleString()}</div></div>}
      </div>

      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" />Monthly Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <XAxis dataKey="month" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <YAxis yAxisId="left" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} formatter={(v, name) => name === "revenue" ? [`$${v.toLocaleString()}`, "Revenue"] : [v, "Loads"]} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2} dot={{ r: 3, fill: "#22C55E" }} name="Revenue ($)" />
            <Line yAxisId="right" type="monotone" dataKey="loads" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: "#3B82F6" }} name="Load Count" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Top Broker Performance</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={brokerStats} layout="vertical" margin={{ top: 4, right: 8, left: 80, bottom: 0 }}>
            <XAxis type="number" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
            <YAxis type="category" dataKey="name" width={100} stroke="hsl(215 20% 55%)" style={{ fontSize: "11px" }} />
            <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} />
            <Bar dataKey="loads" fill="#22C55E" radius={[0, 4, 4, 0]} name="Loads" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
