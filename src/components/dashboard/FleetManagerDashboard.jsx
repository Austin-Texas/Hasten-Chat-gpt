import { Link } from "react-router-dom";
import { Truck, Wrench, AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function FleetManagerDashboard({ trucks, maintenance, complianceStatus }) {
  const activeTrucks = trucks.filter(t => t.status === "active").length;
  const idleTrucks = trucks.filter(t => t.status === "idle").length;
  const maintenanceTrucks = trucks.filter(t => t.status === "maintenance").length;
  const blockedTrucks = complianceStatus.filter(c => c.entity_type === 'truck' && c.status === 'blocked').length;
  const maintenanceOverdue = maintenance.filter(m => m.status === 'scheduled' && new Date(m.scheduled_date) <= new Date()).length;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Fleet Manager</h1>
          <p className="text-slate-400 text-sm mt-0.5">Fleet health, maintenance, and compliance</p>
        </div>
        <Link
          to="/fleet"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          View Fleet
        </Link>
      </div>

      {/* Fleet Manager KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Trucks" value={activeTrucks} icon={Truck} color="green" />
        <KpiCard label="Idle" value={idleTrucks} icon={Truck} color="amber" />
        <KpiCard label="In Maintenance" value={maintenanceTrucks} icon={Wrench} color="orange" />
        <KpiCard label="Compliance Issues" value={blockedTrucks} icon={AlertTriangle} color="red" />
      </div>

      {/* Fleet Status Overview */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <h2 className="text-white font-heading font-semibold mb-4">Fleet Health</h2>
        <div className="space-y-3">
          {[
            { label: "Active", value: activeTrucks, max: trucks.length, color: "#22C55E" },
            { label: "Idle", value: idleTrucks, max: trucks.length, color: "#F59E0B" },
            { label: "Maintenance", value: maintenanceTrucks, max: trucks.length, color: "#EA580C" },
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

        {(maintenanceOverdue > 0 || blockedTrucks > 0) && (
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-3">⚠️ Alerts</div>
            {maintenanceOverdue > 0 && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                <Wrench className="w-4 h-4" />
                <span>{maintenanceOverdue} maintenance overdue</span>
              </div>
            )}
            {blockedTrucks > 0 && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{blockedTrucks} truck{blockedTrucks !== 1 ? "s" : ""} compliance blocked</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Maintenance */}
      <div className="glass-card rounded-xl border border-white/5">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold">Upcoming Maintenance</h2>
          <Link to="/maintenance" className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1 transition-colors">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {maintenance.length === 0 ? (
          <div className="p-8 text-center">
            <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No maintenance scheduled</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {maintenance.filter(m => m.status === 'scheduled').slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-slate-300 text-sm font-medium">{m.truck_id || "Unknown Truck"}</div>
                  <div className="text-slate-500 text-xs">{m.service_type || "Maintenance"}</div>
                </div>
                <div className="text-slate-400 text-xs">
                  {new Date(m.scheduled_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}