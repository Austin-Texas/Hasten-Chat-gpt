import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, TrendingUp, MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function ClientDashboard({ client, user }) {
  const [loads, setLoads] = useState([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;

    const fetchLoads = async () => {
      try {
        const clientLoads = await base44.entities.Load.filter(
          { client_id: client.id },
          "-created_date",
          100
        );
        setLoads(clientLoads);

        setStats({
          active: clientLoads.filter(l => ["en_route", "in_transit", "arrived_delivery"].includes(l.status)).length,
          completed: clientLoads.filter(l => l.status === "completed").length,
          total: clientLoads.length,
        });
      } catch (err) {
        console.error("Error fetching loads:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoads();
    const unsub = base44.entities.Load.subscribe(() => fetchLoads());
    return () => unsub();
  }, [client?.id]);

  const activeLoads = loads.filter(l => ["en_route", "in_transit", "arrived_delivery"].includes(l.status));

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">Welcome back, {client?.company_name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Active Shipments</div>
              <div className="text-3xl font-bold text-orange-400">{stats.active}</div>
            </div>
            <MapPin className="w-10 h-10 text-orange-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Completed</div>
              <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
            </div>
            <CheckCircle className="w-10 h-10 text-green-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Shipments</div>
              <div className="text-3xl font-bold text-cyan-400">{stats.total}</div>
            </div>
            <Package className="w-10 h-10 text-cyan-400 opacity-20" />
          </div>
        </div>
      </div>

      {/* Active Loads */}
      <div className="glass-card rounded-xl border border-white/5">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-400" />
            In Transit Shipments
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : activeLoads.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-400">No active shipments</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activeLoads.map(load => (
              <div key={load.id} className="p-5 hover:bg-white/2 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-mono font-bold">{load.load_number}</span>
                      <StatusBadge status={load.status} />
                    </div>
                    <div className="text-slate-400 text-sm">
                      {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">${(load.rate || 0).toLocaleString()}</div>
                    <div className="text-slate-500 text-xs">{load.miles} miles</div>
                  </div>
                </div>
                {load.eta && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    ETA: {new Date(load.eta).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Completed */}
      {loads.filter(l => l.status === "completed").length > 0 && (
        <div className="glass-card rounded-xl border border-white/5">
          <div className="p-5 border-b border-white/5">
            <h2 className="text-white font-heading font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Recently Completed
            </h2>
          </div>
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {loads
              .filter(l => l.status === "completed")
              .slice(0, 5)
              .map(load => (
                <div key={load.id} className="p-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-300 font-mono text-sm">{load.load_number}</span>
                      <div className="text-slate-500 text-xs">{load.origin_city} → {load.destination_city}</div>
                    </div>
                    {load.actual_delivery && (
                      <div className="text-slate-400 text-xs">{new Date(load.actual_delivery).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}