import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Package, Search, ArrowRight, Truck, DollarSign, MapPin, CheckCircle, ChevronRight, Calendar } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import DriverCalendar from "@/components/driver/DriverCalendar";

const TABS = [
  { key: "active",    label: "Active",    color: "orange" },
  { key: "available", label: "Available", color: "blue" },
  { key: "calendar",  label: "📅 Calendar", color: "purple" },
  { key: "completed", label: "Done",      color: "green" },
];

export default function DriverLoads({ user }) {
  const [tab, setTab]       = useState("active");
  const [loads, setLoads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [accepting, setAccepting] = useState(null);

  useEffect(() => { fetchLoads(); }, [tab]);

  const fetchLoads = async () => {
    setLoading(true);
    try {
      let filter = {};
      if (tab === "active")    filter = { driver_id: user?.id };
      if (tab === "calendar")  filter = { driver_id: user?.id };
      if (tab === "available") filter = { status: "available" };
      if (tab === "completed") filter = { driver_id: user?.id, status: "completed" };

      const data = await base44.entities.Load.filter(filter, "-created_date", 50);
      const activeStatuses = ["assigned","accepted","en_route","arrived_pickup","loaded","in_transit","arrived_delivery"];
      if (tab === "active") setLoads(data.filter(l => activeStatuses.includes(l.status)));
      else if (tab === "calendar") setLoads(data);
      else setLoads(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAcceptLoad = async (load) => {
    setAccepting(load.id);
    try {
      await base44.entities.Load.update(load.id, { driver_id: user?.id, status: "assigned" });
      fetchLoads();
    } catch (err) { console.error(err); }
    finally { setAccepting(null); }
  };

  const filtered = loads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.load_number || "").toLowerCase().includes(q) ||
      (l.origin_city || "").toLowerCase().includes(q) ||
      (l.destination_city || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-white font-heading font-bold text-xl">My Loads</h1>
        <span className="text-slate-500 text-sm">{filtered.length} loads</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(""); }}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-150 ${
              tab === t.key
                ? "bg-orange-500 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search loads…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : tab === "calendar" ? (
        <DriverCalendar driverId={user?.id} loads={loads} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-300 font-semibold">No loads found</p>
          <p className="text-slate-600 text-sm mt-1">
            {tab === "available" ? "Check back soon for new opportunities" : "Your loads will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(load => (
            <div
              key={load.id}
              className="rounded-2xl p-4 transition-all duration-150 active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, rgba(15,24,42,0.8) 0%, rgba(20,30,55,0.7) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            >
              {/* Load number + status */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-orange-400 font-mono font-bold text-base">
                    {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                  </span>
                  {load.priority === "critical" && (
                    <span className="ml-2 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">URGENT</span>
                  )}
                </div>
                <StatusBadge status={load.status} />
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Origin</div>
                  <div className="text-white font-semibold text-sm truncate">{load.origin_city}, {load.origin_state}</div>
                </div>
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <ArrowRight className="w-4 h-4 text-orange-500/70" />
                  {load.miles && <span className="text-slate-600 text-[9px]">{load.miles}mi</span>}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Destination</div>
                  <div className="text-white font-semibold text-sm truncate">{load.destination_city}, {load.destination_state}</div>
                </div>
              </div>

              {/* Metadata row */}
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                {load.equipment_type && (
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />{load.equipment_type}
                  </span>
                )}
                {load.weight && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{(load.weight / 1000).toFixed(0)}k lbs
                  </span>
                )}
                {load.commodity && (
                  <span className="truncate">{load.commodity}</span>
                )}
                <span className="ml-auto text-green-400 font-bold text-sm">
                  ${(load.rate || 0).toLocaleString()}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Link
                  to={`/driver/loads/${load.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium text-center transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                {tab === "available" && (
                  <button
                    onClick={() => handleAcceptLoad(load)}
                    disabled={accepting === load.id}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
                  >
                    {accepting === load.id ? "Accepting…" : "Accept Load"}
                  </button>
                )}

                {tab === "active" && (
                  <Link
                    to="/driver/map"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold text-center transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)" }}
                  >
                    <MapPin className="w-3.5 h-3.5" /> Navigate
                  </Link>
                )}

                {tab === "completed" && (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/15 text-green-400 text-sm font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Done
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}