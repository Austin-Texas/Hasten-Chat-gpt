import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Package, MapPin, DollarSign, ChevronRight,
  ArrowRight, Truck, CheckCircle, Radio, Zap, Settings
} from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import ShiftTracker from "@/components/driver/ShiftTracker";

// Truck SVG icon
function TruckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.22-3c-.55-.61-1.33-1-2.22-1s-1.67.39-2.22 1H3V6h12v9H8.22zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  );
}

function StatPill({ label, value, color = "orange" }) {
  const colors = {
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-300",
    green:  "bg-green-500/10 border-green-500/20 text-green-300",
    blue:   "bg-blue-500/10 border-blue-500/20 text-blue-300",
    amber:  "bg-amber-500/10 border-amber-500/20 text-amber-300",
  };
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border px-3 py-3 ${colors[color]}`}>
      <span className="font-bold text-lg font-mono leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wider mt-1 opacity-70">{label}</span>
    </div>
  );
}

const WORKFLOW = [
  "assigned","accepted","en_route","arrived_pickup",
  "loaded","in_transit","arrived_delivery","delivered","pod_uploaded","completed"
];

export default function DriverDashboard({ user }) {
  const [loads, setLoads]               = useState([]);
  const [driverRecord, setDriverRecord] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [currentLoad, setCurrentLoad]   = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [driverLoads, drivers] = await Promise.all([
        base44.entities.Load.filter({ driver_id: user?.id }, "-created_date", 20),
        user?.id ? base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1) : Promise.resolve([]),
      ]);
      setLoads(driverLoads);
      setDriverRecord(drivers[0] || null);
      const active = driverLoads.find(l =>
        ["assigned","accepted","en_route","arrived_pickup","loaded","in_transit","arrived_delivery"].includes(l.status)
      );
      setCurrentLoad(active || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleAvailability = async () => {
    if (!driverRecord) return;
    setStatusUpdating(true);
    const next = driverRecord.status === "available" ? "off_duty" : "available";
    try {
      await base44.entities.Driver.update(driverRecord.id, { status: next });
      setDriverRecord(prev => ({ ...prev, status: next }));
    } catch (err) { console.error(err); }
    finally { setStatusUpdating(false); }
  };

  const currentIdx = currentLoad ? WORKFLOW.indexOf(currentLoad.status) : -1;
  const progress   = currentIdx >= 0 ? ((currentIdx + 1) / WORKFLOW.length) * 100 : 0;

  const completedLoads  = loads.filter(l => l.status === "completed").length;
  const totalEarnings   = loads.filter(l => l.status === "completed").reduce((s, l) => s + (l.rate || 0), 0);
  const activeLoadsCount = loads.filter(l => !["completed","cancelled"].includes(l.status)).length;
  const totalMiles       = loads.filter(l => l.status === "completed").reduce((s, l) => s + (l.miles || 0), 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 rounded-2xl skeleton" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}
        </div>
        <div className="h-48 rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">

      {/* ── Hero Greeting Card ── */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all hover:border-orange-500/30"
        style={{
          background: "linear-gradient(135deg, rgba(234,88,12,0.12) 0%, rgba(30,41,73,0.8) 60%, rgba(14,22,46,0.9) 100%)",
          border: "1px solid rgba(234,88,12,0.15)",
        }}
        onClick={() => window.location.href = '/driver/profile'}
      >
        {/* Decorative truck watermark */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5">
          <TruckIcon className="w-28 h-28 text-orange-400" />
        </div>

        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-slate-400 text-sm">{greeting()} 👋</p>
            <h1 className="text-white font-heading font-bold text-2xl mt-0.5">
              {user?.full_name || "Driver"}
            </h1>
          </div>
          <Link 
            to="/driver/settings"
            onClick={e => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-orange-400 transition-colors flex-shrink-0"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        {/* Status toggle */}
        {driverRecord && (
          <button
            onClick={toggleAvailability}
            disabled={statusUpdating || !!currentLoad}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 disabled:opacity-50 ${
              driverRecord.status === "available"
                ? "bg-green-500/15 border-green-500/25 text-green-300"
                : driverRecord.status === "on_load"
                ? "bg-orange-500/15 border-orange-500/25 text-orange-300"
                : "bg-slate-500/10 border-slate-500/20 text-slate-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              driverRecord.status === "available" ? "bg-green-400 animate-pulse" :
              driverRecord.status === "on_load"   ? "bg-orange-400 animate-pulse" :
              "bg-slate-500"
            }`} />
            <Radio className="w-3.5 h-3.5" />
            {driverRecord.status === "available" ? "Available for Loads"
              : driverRecord.status === "on_load" ? "On Active Load"
              : "Off Duty"}
          </button>
        )}
      </div>

      {/* ── Shift Tracker ── */}
      <ShiftTracker user={user} />

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-4 gap-2">
        <StatPill label="Active"    value={activeLoadsCount}                    color="orange" />
        <StatPill label="Done"      value={completedLoads}                      color="green" />
        <StatPill label="Miles"     value={`${(totalMiles/1000).toFixed(0)}k`} color="blue" />
        <StatPill label="Earned"    value={`$${(totalEarnings/1000).toFixed(1)}k`} color="amber" />
      </div>

      {/* ── Current Load Card ── */}
      {currentLoad ? (
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(14,22,46,0.95) 0%, rgba(20,30,60,0.9) 100%)",
            border: "1px solid rgba(234,88,12,0.2)",
            boxShadow: "0 0 32px rgba(234,88,12,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Live pulse header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
              </span>
              <span className="text-slate-300 text-sm font-semibold">Active Load</span>
            </div>
            <StatusBadge status={currentLoad.status} />
          </div>

          {/* Load number */}
          <div className="text-orange-400 font-mono font-bold text-2xl mb-3 tracking-wide">
            {currentLoad.load_number || `#LD${currentLoad.id?.slice(-6).toUpperCase()}`}
          </div>

          {/* Route */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 min-w-0">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">From</div>
              <div className="text-white font-semibold text-sm truncate">{currentLoad.origin_city}, {currentLoad.origin_state}</div>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0 px-1">
              <ArrowRight className="w-4 h-4 text-orange-500" />
              <span className="text-slate-600 text-[9px]">
                {currentLoad.miles ? `${currentLoad.miles}mi` : ""}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">To</div>
              <div className="text-white font-semibold text-sm truncate">{currentLoad.destination_city}, {currentLoad.destination_state}</div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="bg-white/3 rounded-xl p-2.5">
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">Pickup</span>
              <span className="text-white text-xs font-medium">
                {currentLoad.pickup_date
                  ? new Date(currentLoad.pickup_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </span>
            </div>
            <div className="bg-white/3 rounded-xl p-2.5">
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">Delivery</span>
              <span className="text-white text-xs font-medium">
                {currentLoad.delivery_date
                  ? new Date(currentLoad.delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-1">
            <div className="flex justify-between text-[10px] text-slate-600 mb-1.5">
              <span>Pickup</span>
              <span>{Math.round(progress)}% complete</span>
              <span>Delivered</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #EA580C, #F97316, #FBBF24)",
                }}
              />
            </div>
          </div>

          {/* CTA */}
          <Link
            to={`/driver/loads/${currentLoad.id}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white text-sm mt-4 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #EA580C, #F97316)",
              boxShadow: "0 4px 20px rgba(234,88,12,0.3)",
            }}
          >
            <Zap className="w-4 h-4" />
            View Load Details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(15,24,42,0.6)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
            <TruckIcon className="w-9 h-9 text-slate-600" />
          </div>
          <p className="text-slate-300 font-semibold">No Active Load</p>
          <p className="text-slate-600 text-sm mt-1 mb-4">Browse available loads to get moving</p>
          <Link
            to="/driver/loads"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            Browse Loads <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── Recent Loads ── */}
      {loads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-heading font-semibold text-sm uppercase tracking-wider">Recent Loads</h2>
            <Link to="/driver/loads" className="text-orange-400 text-xs font-medium flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {loads.slice(0, 5).map(load => (
              <Link key={load.id} to={`/driver/loads/${load.id}`}>
                <div
                  className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-150 active:scale-[0.98]"
                  style={{
                    background: "rgba(15,24,42,0.6)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Status dot */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    load.status === "completed"
                      ? "bg-green-500/10 border border-green-500/15"
                      : "bg-orange-500/10 border border-orange-500/15"
                  }`}>
                    {load.status === "completed"
                      ? <CheckCircle className="w-4 h-4 text-green-400" />
                      : <Package className="w-4 h-4 text-orange-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-orange-400 font-mono text-xs font-bold">
                        {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                      </span>
                      <StatusBadge status={load.status} />
                    </div>
                    <div className="text-slate-400 text-xs truncate">
                      {load.origin_city} → {load.destination_city}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-green-400 text-sm font-bold">${(load.rate || 0).toLocaleString()}</div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 ml-auto mt-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}