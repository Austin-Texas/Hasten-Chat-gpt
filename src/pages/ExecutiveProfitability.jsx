import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  TrendingUp, TrendingDown, DollarSign, Truck, Users, MapPin,
  Download, Filter, ChevronDown, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import KpiCard from "@/components/hasten/KpiCard";

const MARGIN_COLORS = { good: "#22C55E", fair: "#F59E0B", poor: "#EF4444" };
const marginColor = (margin) => {
  if (margin >= 20) return MARGIN_COLORS.good;
  if (margin >= 10) return MARGIN_COLORS.fair;
  return MARGIN_COLORS.poor;
};

const marginLabel = (margin) => {
  if (margin >= 20) return "Excellent";
  if (margin >= 10) return "Fair";
  return "Low";
};

export default function ExecutiveProfitability() {
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [loadStatus, setLoadStatus] = useState("completed");
  const [tab, setTab] = useState("company");

  useEffect(() => {
    Promise.all([
      base44.entities.Load.filter({ status: "completed" }, "-created_date", 200),
      base44.entities.Driver.list("-created_date", 100),
      base44.entities.Truck.list("-created_date", 100),
      base44.entities.Expense.list("-created_date", 200),
      base44.entities.Client.list("-created_date", 100),
      base44.entities.Invoice.filter({ status: "paid" }, "-created_date", 200),
    ]).then(([l, d, t, e, c, i]) => {
      setLoads(l);
      setDrivers(d);
      setTrucks(t);
      setExpenses(e);
      setClients(c);
      setInvoices(i);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Filter loads by date range
  const filterByDateRange = (items) => {
    const now = new Date();
    const dateMs = {
      "all": 0,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      "ytd": now.getFullYear() * 365 * 24 * 60 * 60 * 1000,
    };
    if (dateRange === "all") return items;
    const cutoff = new Date(now.getTime() - dateMs[dateRange]);
    return items.filter(l => new Date(l.actual_delivery || l.created_date) >= cutoff);
  };

  const filteredLoads = filterByDateRange(loads)
    .filter(l => !selectedDriver || l.driver_id === selectedDriver)
    .filter(l => !selectedTruck || l.truck_id === selectedTruck)
    .filter(l => !selectedClient || l.client_id === selectedClient);

  const filteredExpenses = expenses.filter(e => !selectedDriver || e.driver_id === selectedDriver);

  // Calculate company-level metrics
  const totalRevenue = filteredLoads.reduce((s, l) => s + (l.rate || 0) + (l.fuel_surcharge || 0) + (l.accessorial_charges || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const grossProfit = totalRevenue - totalExpenses;
  const netMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalMiles = filteredLoads.reduce((s, l) => s + (l.miles || 0), 0);
  const revenuePerMile = totalMiles > 0 ? totalRevenue / totalMiles : 0;
  const costPerMile = totalMiles > 0 ? totalExpenses / totalMiles : 0;
  const profitPerMile = revenuePerMile - costPerMile;

  // Per-load profitability
  const loadProfitability = filteredLoads.map(l => {
    const loadExpenses = filteredExpenses
      .filter(e => e.load_id === l.id)
      .reduce((s, e) => s + (e.amount || 0), 0);
    const loadRevenue = (l.rate || 0) + (l.fuel_surcharge || 0) + (l.accessorial_charges || 0);
    return {
      ...l,
      expenses: loadExpenses,
      grossProfit: loadRevenue - loadExpenses,
      margin: loadRevenue > 0 ? ((loadRevenue - loadExpenses) / loadRevenue) * 100 : 0,
      rpm: (l.miles || 0) > 0 ? loadRevenue / l.miles : 0,
    };
  }).sort((a, b) => b.grossProfit - a.grossProfit);

  // Driver profitability (using driver_id)
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));
  const driverProfit = {};
  filteredLoads.forEach(l => {
    const did = l.driver_id || "__none__";
    if (!driverProfit[did]) {
      driverProfit[did] = {
        driver_id: did,
        driver: driverMap[did],
        loads: 0,
        miles: 0,
        revenue: 0,
        expenses: 0,
      };
    }
    driverProfit[did].loads += 1;
    driverProfit[did].miles += l.miles || 0;
    driverProfit[did].revenue += (l.rate || 0);
  });
  filteredExpenses.forEach(e => {
    const did = e.driver_id || "__none__";
    if (driverProfit[did]) {
      driverProfit[did].expenses += e.amount || 0;
    }
  });
  const driverStats = Object.values(driverProfit)
    .map(d => ({
      ...d,
      profit: d.revenue - d.expenses,
      margin: d.revenue > 0 ? ((d.revenue - d.expenses) / d.revenue) * 100 : 0,
      rpm: d.miles > 0 ? d.revenue / d.miles : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  // Truck profitability
  const truckMap = Object.fromEntries(trucks.map(t => [t.id, t]));
  const truckProfit = {};
  filteredLoads.forEach(l => {
    const tid = l.truck_id || "__none__";
    if (!truckProfit[tid]) {
      truckProfit[tid] = {
        truck_id: tid,
        truck: truckMap[tid],
        loads: 0,
        miles: 0,
        revenue: 0,
        expenses: 0,
      };
    }
    truckProfit[tid].loads += 1;
    truckProfit[tid].miles += l.miles || 0;
    truckProfit[tid].revenue += (l.rate || 0);
  });
  filteredExpenses.forEach(e => {
    const tid = e.truck_id || "__none__";
    if (truckProfit[tid]) {
      truckProfit[tid].expenses += e.amount || 0;
    }
  });
  const truckStats = Object.values(truckProfit)
    .map(t => ({
      ...t,
      profit: t.revenue - t.expenses,
      margin: t.revenue > 0 ? ((t.revenue - t.expenses) / t.revenue) * 100 : 0,
      cpm: t.miles > 0 ? t.expenses / t.miles : 0,
      rpm: t.miles > 0 ? t.revenue / t.miles : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  // Client/Broker profitability
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const clientProfit = {};
  filteredLoads.forEach(l => {
    const cid = l.client_id || "__none__";
    if (!clientProfit[cid]) {
      clientProfit[cid] = {
        client_id: cid,
        client: clientMap[cid],
        loads: 0,
        revenue: 0,
        expenses: 0,
      };
    }
    clientProfit[cid].loads += 1;
    clientProfit[cid].revenue += (l.rate || 0) + (l.fuel_surcharge || 0) + (l.accessorial_charges || 0);
  });
  const clientStats = Object.values(clientProfit)
    .map(c => ({
      ...c,
      profit: c.revenue - c.expenses,
      margin: c.revenue > 0 ? ((c.revenue - c.expenses) / c.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Lane profitability (origin → destination)
  const laneProfit = {};
  filteredLoads.forEach(l => {
    const lane = `${l.origin_city}, ${l.origin_state} → ${l.destination_city}, ${l.destination_state}`;
    if (!laneProfit[lane]) {
      laneProfit[lane] = { lane, loads: 0, miles: 0, revenue: 0 };
    }
    laneProfit[lane].loads += 1;
    laneProfit[lane].miles += l.miles || 0;
    laneProfit[lane].revenue += (l.rate || 0);
  });
  const laneStats = Object.values(laneProfit)
    .map(l => ({
      ...l,
      avgMiles: l.loads > 0 ? Math.round(l.miles / l.loads) : 0,
      avgRpm: l.miles > 0 ? (l.revenue / l.miles).toFixed(2) : 0,
      avgRevenue: l.loads > 0 ? Math.round(l.revenue / l.loads) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  if (loading) {
    return <div className="animate-pulse space-y-6">{[1,2,3,4].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Executive Profitability</h1>
          <p className="text-slate-400 text-sm mt-0.5">CFO-level analytics & margin optimization</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm bg-orange-500 hover:bg-orange-600 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40">
          <option value="all">All Time</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="ytd">Year to Date</option>
        </select>
        {drivers.length > 0 && (
          <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40">
            <option value="">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
          </select>
        )}
        {trucks.length > 0 && (
          <select value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40">
            <option value="">All Trucks</option>
            {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
          </select>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit overflow-x-auto">
        {["company", "loads", "drivers", "trucks", "clients", "lanes"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap ${
              tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}>
            {t === "company" ? "Company" : t === "loads" ? "Per-Load" : t === "drivers" ? "Drivers" : t === "trucks" ? "Trucks" : t === "clients" ? "Clients" : "Lanes"}
          </button>
        ))}
      </div>

      {/* COMPANY TAB */}
      {tab === "company" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="Total Revenue" value={`$${(totalRevenue/1000).toFixed(0)}k`} icon={TrendingUp} color="green" />
            <KpiCard label="Total Expenses" value={`$${(totalExpenses/1000).toFixed(0)}k`} icon={TrendingDown} color="red" />
            <KpiCard label="Gross Profit" value={`$${(grossProfit/1000).toFixed(0)}k`} icon={DollarSign} color={grossProfit >= 0 ? "green" : "red"} />
            <KpiCard label="Net Margin" value={`${netMargin.toFixed(1)}%`} icon={TrendingUp} color={netMargin >= 20 ? "green" : netMargin >= 10 ? "amber" : "red"} />
            <KpiCard label="Total Miles" value={totalMiles.toLocaleString()} icon={MapPin} color="cyan" />
            <KpiCard label="RPM" value={`$${revenuePerMile.toFixed(2)}`} icon={TrendingUp} color={revenuePerMile >= 2.0 ? "green" : "amber"} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-5 border border-white/5">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-3">Cost Metrics</div>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-300">Cost per Mile</span>
                  <span className="text-orange-400 font-bold text-lg">${costPerMile.toFixed(2)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-300">Profit per Mile</span>
                  <span className={`font-bold text-lg ${profitPerMile >= 1.0 ? "text-green-400" : "text-red-400"}`}>${profitPerMile.toFixed(2)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-300">Avg Load Rate</span>
                  <span className="text-white font-bold text-lg">${filteredLoads.length > 0 ? Math.round(totalRevenue / filteredLoads.length).toLocaleString() : "0"}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-300">Completed Loads</span>
                  <span className="text-white font-bold">{filteredLoads.length}</span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 border border-white/5">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-3">Expense Breakdown</div>
              {expenses.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(
                    filteredExpenses.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + (e.amount || 0) }), {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([cat, amt]) => (
                      <div key={cat} className="flex items-baseline justify-between">
                        <span className="text-slate-400 capitalize">{cat?.replace(/_/g, " ")}</span>
                        <span className="text-red-400 font-semibold">${(amt / 1000).toFixed(1)}k</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No expense data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LOADS TAB */}
      {tab === "loads" && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="px-6 py-3 border-b border-white/5 bg-white/2 grid grid-cols-8 gap-2 text-xs text-slate-500 uppercase tracking-wider">
            <span>Load #</span>
            <span>Route</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Expenses</span>
            <span className="text-right">Profit</span>
            <span className="text-right">Margin %</span>
            <span className="text-right">RPM</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-white/5">
            {loadProfitability.slice(0, 20).map(l => {
              const driver = driverMap[l.driver_id];
              const marginCol = marginColor(l.margin);
              return (
                <div key={l.id} className="px-6 py-3 hover:bg-white/2 transition-colors grid grid-cols-8 gap-2 items-center text-sm">
                  <span className="text-orange-400 font-mono font-bold">{l.load_number || `#${l.id.slice(-6)}`}</span>
                  <span className="text-slate-300 text-xs truncate">{l.origin_city} → {l.destination_city}</span>
                  <span className="text-right text-green-400 font-bold">${(l.rate || 0).toLocaleString()}</span>
                  <span className="text-right text-red-400">${(l.expenses || 0).toLocaleString()}</span>
                  <span className={`text-right font-bold ${l.grossProfit >= 0 ? "text-white" : "text-red-400"}`}>
                    ${(l.grossProfit || 0).toLocaleString()}
                  </span>
                  <span className="text-right font-semibold" style={{ color: marginCol }}>{l.margin.toFixed(1)}%</span>
                  <span className="text-right text-slate-400">${l.rpm.toFixed(2)}</span>
                  <span className="text-right text-xs">{driver ? `${driver.first_name}` : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DRIVERS TAB */}
      {tab === "drivers" && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="px-6 py-3 border-b border-white/5 bg-white/2 grid grid-cols-7 gap-2 text-xs text-slate-500 uppercase tracking-wider">
            <span>Driver</span>
            <span className="text-right">Loads</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Profit</span>
            <span className="text-right">Margin %</span>
            <span className="text-right">RPM</span>
            <span className="text-right">Miles</span>
          </div>
          <div className="divide-y divide-white/5">
            {driverStats.map(d => (
              <div key={d.driver_id} className="px-6 py-3 hover:bg-white/2 transition-colors grid grid-cols-7 gap-2 items-center text-sm">
                <span className="text-white font-medium">{d.driver?.first_name} {d.driver?.last_name || "Unassigned"}</span>
                <span className="text-right text-slate-300">{d.loads}</span>
                <span className="text-right text-green-400 font-bold">${d.revenue.toLocaleString()}</span>
                <span className={`text-right font-bold ${d.profit >= 0 ? "text-white" : "text-red-400"}`}>${d.profit.toLocaleString()}</span>
                <span className="text-right font-semibold" style={{ color: marginColor(d.margin) }}>{d.margin.toFixed(1)}%</span>
                <span className="text-right text-slate-400">${d.rpm.toFixed(2)}</span>
                <span className="text-right text-slate-300">{d.miles.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRUCKS TAB */}
      {tab === "trucks" && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="px-6 py-3 border-b border-white/5 bg-white/2 grid grid-cols-8 gap-2 text-xs text-slate-500 uppercase tracking-wider">
            <span>Unit</span>
            <span className="text-right">Loads</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Expenses</span>
            <span className="text-right">Profit</span>
            <span className="text-right">CPM</span>
            <span className="text-right">RPM</span>
            <span className="text-right">Miles</span>
          </div>
          <div className="divide-y divide-white/5">
            {truckStats.map(t => (
              <div key={t.truck_id} className="px-6 py-3 hover:bg-white/2 transition-colors grid grid-cols-8 gap-2 items-center text-sm">
                <span className="text-white font-mono font-bold">{t.truck?.unit_number || "Unknown"}</span>
                <span className="text-right text-slate-300">{t.loads}</span>
                <span className="text-right text-green-400 font-bold">${t.revenue.toLocaleString()}</span>
                <span className="text-right text-red-400">${t.expenses.toLocaleString()}</span>
                <span className={`text-right font-bold ${t.profit >= 0 ? "text-white" : "text-red-400"}`}>${t.profit.toLocaleString()}</span>
                <span className="text-right text-orange-400">${t.cpm.toFixed(2)}</span>
                <span className="text-right text-slate-400">${t.rpm.toFixed(2)}</span>
                <span className="text-right text-slate-300">{t.miles.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLIENTS TAB */}
      {tab === "clients" && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="px-6 py-3 border-b border-white/5 bg-white/2 grid grid-cols-6 gap-2 text-xs text-slate-500 uppercase tracking-wider">
            <span>Client/Broker</span>
            <span className="text-right">Loads</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Profit</span>
            <span className="text-right">Margin %</span>
            <span className="text-right">Avg/Load</span>
          </div>
          <div className="divide-y divide-white/5">
            {clientStats.map(c => (
              <div key={c.client_id} className="px-6 py-3 hover:bg-white/2 transition-colors grid grid-cols-6 gap-2 items-center text-sm">
                <span className="text-white font-medium">{c.client?.company_name || "Unassigned"}</span>
                <span className="text-right text-slate-300">{c.loads}</span>
                <span className="text-right text-green-400 font-bold">${c.revenue.toLocaleString()}</span>
                <span className={`text-right font-bold ${c.profit >= 0 ? "text-white" : "text-red-400"}`}>${c.profit.toLocaleString()}</span>
                <span className="text-right font-semibold" style={{ color: marginColor(c.margin) }}>{c.margin.toFixed(1)}%</span>
                <span className="text-right text-slate-400">${Math.round(c.revenue / c.loads).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LANES TAB */}
      {tab === "lanes" && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="px-6 py-3 border-b border-white/5 bg-white/2 grid grid-cols-6 gap-2 text-xs text-slate-500 uppercase tracking-wider">
            <span>Lane</span>
            <span className="text-right">Loads</span>
            <span className="text-right">Avg Miles</span>
            <span className="text-right">Total Revenue</span>
            <span className="text-right">Avg Revenue</span>
            <span className="text-right">RPM</span>
          </div>
          <div className="divide-y divide-white/5">
            {laneStats.slice(0, 30).map((l, i) => (
              <div key={i} className="px-6 py-3 hover:bg-white/2 transition-colors grid grid-cols-6 gap-2 items-center text-sm">
                <span className="text-white font-medium text-xs truncate">{l.lane}</span>
                <span className="text-right text-slate-300">{l.loads}</span>
                <span className="text-right text-slate-400">{l.avgMiles}</span>
                <span className="text-right text-green-400 font-bold">${l.revenue.toLocaleString()}</span>
                <span className="text-right text-slate-300">${l.avgRevenue.toLocaleString()}</span>
                <span className="text-right text-slate-400">${l.avgRpm}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}