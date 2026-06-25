import { useEffect, useState } from "react";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DriverReadinessPanel from "@/components/compliance/DriverReadinessPanel";
import { READINESS_FILTERS } from "@/lib/complianceReadiness";

export default function DriverReadinessCenter() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");

  const fetchDrivers = async () => {
    setLoading(true);
    setNotice("");
    try {
      const records = await base44.entities.Driver.list("-created_date", 300);
      setDrivers(records || []);
    } catch (error) {
      console.warn("[DriverReadinessCenter] fetch failed", error?.message || error);
      setDrivers([]);
      setNotice("Could not load drivers. Check Driver entity setup.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-heading">
            <ShieldCheck className="h-6 w-6 text-green-400" /> Driver Readiness Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">Owner-operator equipment and compliance readiness before dispatch.</p>
        </div>
        <button onClick={fetchDrivers} className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {notice && <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{notice}</div>}

      <div className="glass-card rounded-xl border border-white/5 p-3 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search driver, email, equipment, city…" className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:border-green-500/40 focus:outline-none" />
        </div>
        {READINESS_FILTERS.map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-xs font-bold uppercase ${filter === item ? "bg-green-500 text-black" : "bg-white/5 text-slate-400 hover:text-white"}`}>
            {item === "all" ? "All" : item === "warning" ? "Review" : item === "blocked" ? "Setup" : "Ready"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-24 rounded-xl" />)}</div>
      ) : (
        <DriverReadinessPanel drivers={drivers} search={search} filter={filter} />
      )}
    </div>
  );
}
