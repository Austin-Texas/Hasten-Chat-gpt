import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Package, Plus, Search, MapPin, ArrowRight, Truck, DollarSign, ChevronRight, BookTemplate } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
];

export default function Loads() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchLoads();
  }, []);

  const fetchLoads = async () => {
    try {
      const data = await base44.entities.Load.list("-created_date", 100);
      setLoads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = loads.filter(l => {
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (l.load_number || "").toLowerCase().includes(q) ||
      (l.origin_city || "").toLowerCase().includes(q) ||
      (l.destination_city || "").toLowerCase().includes(q) ||
      (l.equipment_type || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Loads</h1>
          <p className="text-slate-400 text-sm mt-0.5">{loads.length} total loads</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/load-templates"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-150"
          >
            <BookTemplate className="w-4 h-4" /> Templates
          </Link>
          <Link
            to="/loads/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            <Plus className="w-4 h-4" /> New Load
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
              statusFilter === f.key
                ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by load number, city, equipment…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No loads found</p>
          <Link to="/loads/new" className="text-orange-400 text-sm hover:text-orange-300 mt-2 inline-block">Create a new load →</Link>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
          {filtered.map(load => (
            <Link key={load.id} to={`/loads/${load.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-orange-400 font-mono text-sm font-bold">
                    {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                  </span>
                  <StatusBadge status={load.status} />
                  {load.priority === "critical" && <StatusBadge status="critical" />}
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <span>{load.origin_city}, {load.origin_state}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span>{load.destination_city}, {load.destination_state}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{load.equipment_type || "—"}</span>
                  {load.miles && <span>{load.miles} mi</span>}
                  {load.pickup_date && <span>{new Date(load.pickup_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-green-400 font-bold">${(load.rate || 0).toLocaleString()}</div>
                {load.weight && <div className="text-slate-600 text-xs">{load.weight.toLocaleString()} lbs</div>}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}