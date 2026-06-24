import { Link } from "react-router-dom";
import { Package, Users, MapPin, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function DispatcherDashboard({ loads, drivers, supportTickets }) {
  const activeLoads = loads.filter(l => ["in_transit", "en_route", "arrived_pickup", "loaded", "arrived_delivery"].includes(l.status));
  const availableDrivers = drivers.filter(d => d.status === "available").length;
  const onLoadDrivers = drivers.filter(d => d.status === "on_load").length;
  const openTickets = supportTickets.filter(t => t.status === 'open').length;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Dispatch Board</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time load and driver management</p>
        </div>
        <Link
          to="/dispatch"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          Open Dispatch Board
        </Link>
      </div>

      {/* Dispatcher KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Loads" value={activeLoads.length} icon={Package} color="orange" />
        <KpiCard label="On Load" value={onLoadDrivers} icon={Users} color="blue" />
        <KpiCard label="Available" value={availableDrivers} icon={Users} color="green" />
        <KpiCard label="Open Tickets" value={openTickets} icon={AlertTriangle} color="amber" />
      </div>

      {/* Driver Status Overview */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <h2 className="text-white font-heading font-semibold mb-4">Driver Status</h2>
        <div className="space-y-3">
          {[
            { label: "On Load", value: onLoadDrivers, max: drivers.length, color: "#EA580C" },
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
      </div>

      {/* Active Loads List */}
      <div className="glass-card rounded-xl border border-white/5">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold">Active Loads</h2>
          <Link to="/dispatch" className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1 transition-colors">
            Manage <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {activeLoads.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No active loads</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activeLoads.slice(0, 5).map(load => (
              <Link key={load.id} to={`/loads/${load.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-orange-400 font-mono text-xs font-bold">
                      {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                    </span>
                    <StatusBadge status={load.status} />
                  </div>
                  <div className="text-slate-300 text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{load.origin_city}</span>
                    <span className="text-slate-600">→</span>
                    <span>{load.destination_city}</span>
                  </div>
                </div>
                <div className="text-slate-400 text-xs">{load.equipment_type || "—"}</div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}