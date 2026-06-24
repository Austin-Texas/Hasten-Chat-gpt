import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, AlertCircle, Calendar, DollarSign, Wrench, TrendingUp, ChevronRight, List } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";
import StatusBadge from "@/components/hasten/StatusBadge";
import MaintenanceForm from "@/components/maintenance/MaintenanceForm";
import MaintenanceCalendar from "@/components/maintenance/MaintenanceCalendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Maintenance() {
  const [trucks, setTrucks] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterTruck, setFilterTruck] = useState("");
  const [view, setView] = useState("list"); // "list" | "calendar"

  useEffect(() => {
    Promise.all([
      base44.entities.Truck.list("-created_date", 100),
      base44.entities.MaintenanceRecord.list("-scheduled_date", 200),
    ]).then(([t, r]) => {
      setTrucks(t);
      setRecords(r);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleOpen = (record = null) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingRecord(null);
    Promise.all([
      base44.entities.MaintenanceRecord.list("-scheduled_date", 200),
    ]).then(([r]) => setRecords(r));
  };

  // Calculations
  const upcoming = records.filter(r => r.status === "scheduled" && new Date(r.scheduled_date) > new Date());
  const overdue = records.filter(r => r.status === "scheduled" && new Date(r.scheduled_date) <= new Date());
  const completed = records.filter(r => r.status === "completed");
  const totalCost = completed.reduce((s, r) => s + (r.total_cost || 0), 0);

  // Service due alerts (based on next_service_odometer)
  const serviceDueAlerts = trucks.filter(t => {
    if (!t.next_service_miles || !t.odometer) return false;
    const milesRemaining = t.next_service_miles - t.odometer;
    return milesRemaining <= 500 && milesRemaining > 0;
  });

  const criticalAlerts = trucks.filter(t => {
    if (!t.next_service_miles || !t.odometer) return false;
    const milesRemaining = t.next_service_miles - t.odometer;
    return milesRemaining <= 0;
  });

  // Cost by type
  const costByType = records.reduce((acc, r) => {
    const type = r.type || "other";
    const item = acc.find(i => i.type === type);
    if (item) {
      item.cost += r.total_cost || 0;
      item.count += 1;
    } else {
      acc.push({ type: type.replace("_", " "), cost: r.total_cost || 0, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.cost - a.cost);

  const filtered = filterTruck ? records.filter(r => r.truck_id === filterTruck) : records;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Maintenance Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">{records.length} total service records</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            <button onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "list" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "calendar" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"}`}>
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
          <button onClick={() => handleOpen()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
            <Plus className="w-4 h-4" /> Schedule Service
          </button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="glass-card rounded-xl border border-red-500/25 bg-red-500/10 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-red-300 font-semibold text-sm">Critical: Service Overdue</div>
            <div className="text-red-200 text-xs mt-1">
              {criticalAlerts.map(t => (
                <div key={t.id}>• Unit #{t.unit_number} exceeded service mileage</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warning Alerts */}
      {serviceDueAlerts.length > 0 && criticalAlerts.length === 0 && (
        <div className="glass-card rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-300 font-semibold text-sm">Service Due Soon</div>
            <div className="text-amber-200 text-xs mt-1">
              {serviceDueAlerts.map(t => {
                const remaining = Math.max(0, (t.next_service_miles || 0) - (t.odometer || 0));
                return <div key={t.id}>• Unit #{t.unit_number}: {remaining} miles remaining</div>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Upcoming" value={upcoming.length} icon={Calendar} color="blue" />
        <KpiCard label="Overdue" value={overdue.length} icon={AlertCircle} color="red" />
        <KpiCard label="Completed" value={completed.length} icon={Wrench} color="green" />
        <KpiCard label="Total Cost" value={`$${(totalCost / 1000).toFixed(0)}k`} icon={DollarSign} color="amber" />
      </div>

      {/* Cost by Service Type Chart */}
      {costByType.length > 0 && (
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Maintenance Costs by Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByType}>
              <XAxis dataKey="type" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
              <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }} />
              <Bar dataKey="cost" fill="hsl(25 100% 55%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Calendar View */}
      {view === "calendar" && (
        <MaintenanceCalendar records={records} trucks={trucks} onEditRecord={handleOpen} />
      )}

      {/* List View */}
      {view === "list" && <>
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {["all", "scheduled", "in_progress", "completed", "cancelled"].map(tab => (
            <button key={tab} onClick={() => setFilterTruck("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                tab === "all"
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}>
              {tab === "all" ? "All Records" : tab.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Truck Filter */}
        {trucks.length > 0 && (
          <div>
            <label className="block text-white text-xs font-semibold mb-2">Filter by Truck</label>
            <select value={filterTruck} onChange={e => setFilterTruck(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors">
              <option value="">All trucks</option>
              {trucks.map(t => (
                <option key={t.id} value={t.id} style={{ background: "#0F1829" }}>
                  Unit #{t.unit_number} - {t.make} {t.model}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Records Table */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No maintenance records</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
            {filtered.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)).map(record => {
              const truck = trucks.find(t => t.id === record.truck_id);
              const isPast = new Date(record.scheduled_date) < new Date();
              return (
                <button key={record.id} onClick={() => handleOpen(record)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors text-left">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    record.status === "completed" ? "bg-green-500/10 border border-green-500/20" :
                    record.status === "in_progress" ? "bg-blue-500/10 border border-blue-500/20" :
                    isPast ? "bg-red-500/10 border border-red-500/20" :
                    "bg-white/5 border border-white/10"
                  }`}>
                    <Wrench className={`w-5 h-5 ${
                      record.status === "completed" ? "text-green-400" :
                      record.status === "in_progress" ? "text-blue-400" :
                      isPast ? "text-red-400" : "text-slate-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-semibold text-sm capitalize">{record.type.replace("_", " ")}</span>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className="text-slate-400 text-sm">
                      {truck ? `Unit #${truck.unit_number}` : "Unknown truck"}
                    </div>
                    <div className="text-slate-600 text-xs">
                      {new Date(record.scheduled_date).toLocaleDateString()}
                      {record.vendor && ` • ${record.vendor}`}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right text-sm">
                    {record.total_cost && (
                      <div className="text-orange-400 font-bold">${record.total_cost.toLocaleString()}</div>
                    )}
                    {record.odometer_at_service && (
                      <div className="text-slate-500 text-xs">{record.odometer_at_service.toLocaleString()} mi</div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </>}

      {/* Form Modal */}
      {showForm && (
        <MaintenanceForm trucks={trucks} editingRecord={editingRecord} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}