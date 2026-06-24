import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Package, Truck, Users, DollarSign, AlertTriangle, Clock,
  TrendingUp, MapPin, ChevronRight, Wrench, FileText, AlertCircle
} from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";
import StatusBadge from "@/components/hasten/StatusBadge";
import DailyShiftSummary from "@/components/dashboard/DailyShiftSummary";
import DispatcherDashboard from "@/components/dashboard/DispatcherDashboard";
import FleetManagerDashboard from "@/components/dashboard/FleetManagerDashboard";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import DriverLocationHeatmap from "@/components/dashboard/DriverLocationHeatmap";
import ComplianceAlertPanel from "@/components/dashboard/ComplianceAlertPanel";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard({ user }) {
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [complianceStatus, setComplianceStatus] = useState([]);
  const [revenueChartData, setRevenueChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();

    Promise.all([
      base44.entities.Load.list("-created_date", 100),
      base44.entities.Driver.list("-created_date", 100),
      base44.entities.Truck.list("-created_date", 100),
      base44.entities.Invoice.list("-created_date", 100).catch(() => []),
      base44.entities.Expense.list("-created_date", 100).catch(() => []),
      base44.entities.MaintenanceRecord.list("-created_date", 100).catch(() => []),
      base44.entities.SupportTicket.list("-created_date", 100).catch(() => []),
      base44.entities.ComplianceStatus.list("-created_date", 100).catch(() => []),
    ]).then(([l, d, t, inv, exp, maint, sup, comp]) => {
      setLoads(l);
      setDrivers(d);
      setTrucks(t);
      setInvoices(inv);
      setExpenses(exp);
      setMaintenance(maint);
      setSupportTickets(sup);
      setComplianceStatus(comp);

      // Build 7-day revenue chart from real data
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayRevenue = l
          .filter(load => {
            const loadDate = new Date(load.created_date);
            return loadDate >= dayStart && loadDate <= dayEnd && load.status === 'completed';
          })
          .reduce((s, load) => s + ((load.rate || 0) + (load.fuel_surcharge || 0) + (load.accessorial_charges || 0)), 0);

        const dayExpenses = exp
          .filter(e => {
            const expDate = new Date(e.date);
            return expDate >= dayStart && expDate <= dayEnd && e.status === 'approved';
          })
          .reduce((s, e) => s + (e.amount || 0), 0);

        chartData.push({ day: dayStr, revenue: dayRevenue, expenses: dayExpenses });
      }
      setRevenueChartData(chartData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Real-time calculations from live data
  const activeLoads = loads.filter(l => ["in_transit", "en_route", "arrived_pickup", "loaded", "arrived_delivery"].includes(l.status));
  const completedLoads = loads.filter(l => l.status === "completed").length;
  const cancelledLoads = loads.filter(l => l.status === "cancelled").length;
  const unpaidInvoices = invoices.filter(i => i.status === "sent" || i.status === "viewed" || i.status === "partial").length;
  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;
  const activeDrivers = drivers.filter(d => d.status === "on_load").length;
  const availableDrivers = drivers.filter(d => d.status === "available").length;
  const blockedDrivers = complianceStatus.filter(c => c.entity_type === 'driver' && c.status === 'blocked').length;
  const idleTrucks = trucks.filter(t => t.status === "idle").length;
  const maintenanceTrucks = trucks.filter(t => t.status === "maintenance").length;
  const blockedTrucks = complianceStatus.filter(c => c.entity_type === 'truck' && c.status === 'blocked').length;
  
  // Revenue calculations
  const totalRevenue = loads
    .filter(l => l.status === "completed")
    .reduce((s, l) => s + ((l.rate || 0) + (l.fuel_surcharge || 0) + (l.accessorial_charges || 0)), 0);
  
  const monthRevenue = loads
    .filter(l => {
      const today = new Date();
      const loadDate = new Date(l.created_date);
      return loadDate.getMonth() === today.getMonth() && 
             loadDate.getFullYear() === today.getFullYear() && 
             l.status === "completed";
    })
    .reduce((s, l) => s + ((l.rate || 0) + (l.fuel_surcharge || 0) + (l.accessorial_charges || 0)), 0);

  // Expense calculations
  const approvedExpenses = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0);
  
  // Maintenance alerts
  const maintenanceOverdue = maintenance.filter(m => m.status === 'scheduled' && new Date(m.scheduled_date) <= new Date()).length;
  
  // Compliance alerts
  const complianceAlerts = complianceStatus.filter(c => c.status === 'warning' || c.status === 'expired').length;
  
  // Support tickets
  const openTickets = supportTickets.filter(t => t.status === 'open').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  // Show role-specific dashboard layouts
  if (user?.role === 'dispatcher') {
    return <DispatcherDashboard loads={loads} drivers={drivers} supportTickets={supportTickets} />;
  }

  if (user?.role === 'fleet_manager') {
    return <FleetManagerDashboard trucks={trucks} maintenance={maintenance} complianceStatus={complianceStatus} />;
  }

  if (user?.role === 'client' || user?.role === 'broker') {
    return <ClientDashboard loads={loads} invoices={invoices} currentUser={user} />;
  }

  // Admin/default layout
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Operations Center</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Link
          to="/loads/new"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          + New Load
        </Link>
      </div>

      {/* KPI Grid - Primary Metrics (LIVE DATA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Loads" value={activeLoads.length} icon={Package} color="orange" />
        <KpiCard label="Completed Today" value={completedLoads} icon={Package} color="green" />
        <KpiCard label="Revenue MTD" value={`$${(monthRevenue / 1000).toFixed(1)}k`} icon={DollarSign} color="green" />
        <KpiCard label="Active Drivers" value={activeDrivers} icon={Users} color="blue" />
      </div>

      {/* Secondary KPIs - Fleet & Finance (LIVE DATA) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Available" value={availableDrivers} icon={Users} color="cyan" />
        <KpiCard label="Active Trucks" value={trucks.filter(t => t.status === 'active').length} icon={Truck} color="green" />
        <KpiCard label="Idle Trucks" value={idleTrucks} icon={Clock} color="amber" />
        <KpiCard label="Unpaid Invoices" value={unpaidInvoices} icon={FileText} color="orange" />
        <KpiCard label="Overdue" value={overdueInvoices} icon={AlertTriangle} color="red" />
      </div>

      {/* Revenue Chart + Alerts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-heading font-semibold">Revenue vs Expenses (7 Days - LIVE)</h2>
            <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">Last 7 Days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EA580C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <Tooltip
                contentStyle={{ background: "#0F1829", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}
                formatter={v => [`$${v.toLocaleString()}`, ""]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#EA580C" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="#3B82F6" strokeWidth={2} fill="url(#expGrad)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats & Critical Alerts */}
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-heading font-semibold mb-4">Fleet Snapshot</h2>
          <div className="space-y-3">
            {[
              { label: "On Load", value: activeDrivers, max: drivers.length, color: "#EA580C" },
              { label: "Available", value: availableDrivers, max: drivers.length, color: "#22C55E" },
              { label: "Off Duty", value: drivers.filter(d => d.status === "off_duty").length, max: drivers.length, color: "#64748b" },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-white font-medium">{item.value} / {item.max || "—"}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: item.max > 0 ? `${(item.value / item.max) * 100}%` : "0%",
                      background: item.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-3">Critical Alerts</div>
            {blockedTrucks > 0 && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{blockedTrucks} truck{blockedTrucks !== 1 ? "s" : ""} blocked</span>
              </div>
            )}
            {blockedDrivers > 0 && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{blockedDrivers} driver{blockedDrivers !== 1 ? "s" : ""} blocked</span>
              </div>
            )}
            {maintenanceOverdue > 0 && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                <Wrench className="w-4 h-4" />
                <span>{maintenanceOverdue} maintenance overdue</span>
              </div>
            )}
            {overdueInvoices > 0 && (
              <div className="flex items-center gap-2 text-orange-400 text-sm mb-2">
                <FileText className="w-4 h-4" />
                <span>{overdueInvoices} invoice{overdueInvoices !== 1 ? "s" : ""} overdue</span>
              </div>
            )}
            {openTickets > 0 && (
              <div className="flex items-center gap-2 text-amber-400 text-sm mb-2">
                <AlertCircle className="w-4 h-4" />
                <span>{openTickets} support ticket{openTickets !== 1 ? "s" : ""} open</span>
              </div>
            )}
            {blockedTrucks === 0 && blockedDrivers === 0 && maintenanceOverdue === 0 && overdueInvoices === 0 && openTickets === 0 && (
              <div className="text-green-400 text-sm font-medium">✓ All systems operational</div>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Alert Panel — at-risk drivers with expiring/expired credentials */}
      <ComplianceAlertPanel drivers={drivers} />

      {/* Driver Location Heatmap */}
      <DriverLocationHeatmap drivers={drivers} />

      {/* Daily Shift Summary */}
      <DailyShiftSummary />

      {/* Recent Loads */}
      <div className="glass-card rounded-xl border border-white/5">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold">Recent Loads</h2>
          <Link to="/loads" className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1 transition-colors">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {loads.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No loads yet</p>
            <Link to="/loads/new" className="text-orange-400 text-sm hover:text-orange-300 mt-1 inline-block">Create your first load →</Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {loads.slice(0, 8).map(load => (
              <Link key={load.id} to={`/loads/${load.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-orange-400 font-mono text-xs font-bold">
                      {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                    </span>
                    <StatusBadge status={load.status} />
                  </div>
                  <div className="text-slate-300 text-sm flex items-center gap-1">
                    <span>{load.origin_city}, {load.origin_state}</span>
                    <span className="text-slate-600">→</span>
                    <span>{load.destination_city}, {load.destination_state}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                  <span>{load.equipment_type || "—"}</span>
                  <span>{load.miles ? `${load.miles} mi` : ""}</span>
                </div>
                <div className="text-green-400 font-bold text-sm flex-shrink-0">
                  ${((load.rate || 0) + (load.fuel_surcharge || 0) + (load.accessorial_charges || 0)).toLocaleString()}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}