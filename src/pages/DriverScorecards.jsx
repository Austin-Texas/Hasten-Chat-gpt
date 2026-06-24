import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Users, Search, ChevronRight } from "lucide-react";
import DriverScorecard from "@/components/driver/DriverScorecard";

export default function DriverScorecards() {
  const [drivers, setDrivers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list("-created_date", 100),
      base44.entities.Load.list("-created_date", 300),
    ])
      .then(([d, l]) => {
        setDrivers(d);
        setLoads(l);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase();
    return (
      !search ||
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Driver Scorecards</h1>
          <p className="text-slate-400 text-sm mt-0.5">90-day performance metrics & compliance</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search drivers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No drivers found</p>
        </div>
      ) : selectedDriver ? (
        <div>
          <button
            onClick={() => setSelectedDriver(null)}
            className="text-orange-400 text-sm font-medium mb-4 flex items-center gap-1"
          >
            ← Back to drivers
          </button>
          <div className="glass-card rounded-xl p-6 border border-white/5 mb-5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 font-bold text-lg">
                  {(selectedDriver.first_name || "?").charAt(0)}{(selectedDriver.last_name || "").charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">
                  {selectedDriver.first_name} {selectedDriver.last_name}
                </h2>
                <p className="text-slate-400 text-sm">CDL-{selectedDriver.license_class || "A"}</p>
              </div>
            </div>
            <DriverScorecard driver={selectedDriver} loads={loads.filter(l => l.driver_id === selectedDriver.id)} />
          </div>
          <Link
            to={`/drivers/${selectedDriver.id}`}
            className="flex items-center gap-2 text-orange-400 text-sm font-medium hover:text-orange-300 transition-colors"
          >
            View full driver profile <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(driver => {
            const driverLoads = loads.filter(l => l.driver_id === driver.id);
            const now = new Date();
            const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            const recentLoads = driverLoads.filter(l => new Date(l.created_date) >= ninetyDaysAgo);
            const completed = recentLoads.filter(l => l.status === "completed").length;
            const total = recentLoads.length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

            return (
              <button
                key={driver.id}
                onClick={() => setSelectedDriver(driver)}
                className="w-full glass-card rounded-xl p-5 border border-white/5 hover:border-orange-500/15 transition-all text-left block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-400 font-bold text-sm">
                      {(driver.first_name || "?").charAt(0)}{(driver.last_name || "").charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">
                      {driver.first_name} {driver.last_name}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {total} loads (90d) • {completionRate}% completion
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-white font-bold text-sm">{driver.safety_score || 100}</div>
                      <div className="text-slate-500 text-xs">Safety Score</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-sm">{completionRate}%</div>
                      <div className="text-slate-500 text-xs">Completion</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}