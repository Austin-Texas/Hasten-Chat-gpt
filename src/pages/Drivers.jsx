import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Users, Plus, Search, Phone, Mail, MapPin, ChevronRight, Star } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { listLocalDrivers } from "@/lib/localDriverStore";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    const loadDrivers = async () => {
      try {
        const remoteDrivers = await base44.entities.Driver.list("-created_date", 100);
        if (mounted) setDrivers(remoteDrivers || []);
      } catch (error) {
        console.warn("Base44 drivers unavailable locally. Using local demo driver store.", error?.message || error);
        if (mounted) setDrivers(listLocalDrivers());
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDrivers();

    const refreshLocalDrivers = (event) => setDrivers(event?.detail || listLocalDrivers());
    window.addEventListener("hasten_drivers_changed", refreshLocalDrivers);
    return () => {
      mounted = false;
      window.removeEventListener("hasten_drivers_changed", refreshLocalDrivers);
    };
  }, []);

  const STATUS_OPTS = ["all", "available", "on_load", "off_duty", "inactive"];
  const filtered = drivers.filter(d => {
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q) ||
      (d.license_number || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Drivers</h1>
          <p className="text-slate-400 text-sm mt-0.5">{drivers.length} total drivers</p>
        </div>
        <Link to="/drivers/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
          <Plus className="w-4 h-4" /> Add Driver
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all duration-150 ${
              statusFilter === s ? "bg-orange-500/15 border-orange-500/30 text-orange-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}>
            {s === "all" ? "All Drivers" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search drivers…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No drivers found</p>
          <Link to="/drivers/new" className="text-orange-400 text-sm mt-2 inline-block">Add a driver →</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(driver => (
            <Link key={driver.id} to={`/drivers/${driver.id}`}
              className="glass-card rounded-xl p-4 border border-white/5 hover:border-orange-500/15 transition-all duration-150 cursor-pointer block">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-400 font-bold text-sm">
                      {(driver.first_name || "?").charAt(0)}{(driver.last_name || "").charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium">{driver.first_name} {driver.last_name}</div>
                    <div className="text-slate-500 text-xs">CDL-{driver.license_class || "A"}</div>
                  </div>
                </div>
                <StatusBadge status={driver.status || "available"} />
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                {driver.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span className="truncate">{driver.email}</span></div>}
                {driver.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /><span>{driver.phone}</span></div>}
                {(driver.current_city || driver.home_city) && (
                  <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />
                    <span>{driver.current_city || driver.home_city}, {driver.current_state || driver.home_state}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-xs font-medium">{driver.safety_score || 100}</span>
                </div>
                <div className="text-slate-500 text-xs">{driver.loads_completed || 0} loads</div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
