import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Users, Plus, Search, Phone, Mail, MapPin, ChevronRight, Star, ShieldCheck, Database, RotateCcw, Calculator, FileText } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import {
  listLocalDrivers,
  importEnterpriseDriverDemoData,
  resetEnterpriseDriverDemoData,
  recalculateEnterpriseDriverDemoData,
  generateWeeklyEnterpriseDemoSettlements,
  getEnterpriseDriverDemoBundle,
  hasEnterpriseDriverDemoData,
} from "@/lib/localDriverStore";
import { getDriverReadinessStats } from "@/lib/driverReadiness";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [demoBundle, setDemoBundle] = useState(null);
  const [adminMessage, setAdminMessage] = useState("");

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
    setDemoBundle(getEnterpriseDriverDemoBundle());

    const refreshLocalDrivers = (event) => setDrivers(event?.detail || listLocalDrivers());
    const refreshEnterpriseDemo = (event) => setDemoBundle(event?.detail || getEnterpriseDriverDemoBundle());
    window.addEventListener("hasten_drivers_changed", refreshLocalDrivers);
    window.addEventListener("hasten_driver_enterprise_demo_changed", refreshEnterpriseDemo);
    return () => {
      mounted = false;
      window.removeEventListener("hasten_drivers_changed", refreshLocalDrivers);
      window.removeEventListener("hasten_driver_enterprise_demo_changed", refreshEnterpriseDemo);
    };
  }, []);

  const handleImportDemo = () => {
    const result = importEnterpriseDriverDemoData();
    setDrivers(result.drivers || listLocalDrivers());
    setDemoBundle(result.bundle || getEnterpriseDriverDemoBundle());
    setAdminMessage(result.duplicatePrevented
      ? "Enterprise driver demo data already imported. Duplicate import prevented."
      : "Imported enterprise driver demo data: 12 drivers, 15 CDL records, 15 medical cards, 20 DQF docs, 10 DVIRs, 15 settlements, 25 assignments."
    );
  };

  const handleResetDemo = () => {
    const result = resetEnterpriseDriverDemoData();
    setDrivers(result.drivers || listLocalDrivers());
    setDemoBundle(null);
    setAdminMessage("Enterprise driver demo data reset. Real/local non-demo drivers were preserved.");
  };

  const handleRecalculate = () => {
    const result = recalculateEnterpriseDriverDemoData();
    setDrivers(result.drivers || listLocalDrivers());
    setDemoBundle(result.bundle || getEnterpriseDriverDemoBundle());
    setAdminMessage("Recalculated compliance, safety, performance, availability holds, and 90-day trends for demo drivers.");
  };

  const handleGenerateSettlements = () => {
    const result = generateWeeklyEnterpriseDemoSettlements();
    setDemoBundle(result.bundle || getEnterpriseDriverDemoBundle());
    setAdminMessage(`Generated ${result.count || 0} weekly demo settlement PDF-ready records.`);
  };

  const STATUS_OPTS = ["all", "available", "under_load", "off_duty", "compliance_hold", "suspended", "maintenance_hold", "inactive"];
  const readinessStats = getDriverReadinessStats(drivers);
  const demoImported = hasEnterpriseDriverDemoData();
  const demoCounts = demoBundle?.meta?.counts;
  const filtered = drivers.filter(d => {
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      `${d.first_name || ""} ${d.last_name || ""} ${d.full_name || ""}`.toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q) ||
      (d.license_number || "").toLowerCase().includes(q) ||
      (d.vehicle_type || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Drivers</h1>
          <p className="text-slate-400 text-sm mt-0.5">{drivers.length} total drivers</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/drivers/readiness"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-green-300 text-sm border border-green-500/20 bg-green-500/10 hover:text-white">
            <ShieldCheck className="w-4 h-4" /> Readiness
          </Link>
          <Link to="/drivers/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
            <Plus className="w-4 h-4" /> Add Driver
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-white font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-400" /> Enterprise Driver Demo Controls
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Import/reset demo-only driver data and recalculate compliance, safety, performance, DVIR, load assignment, and settlement records without deleting real records.
            </p>
          </div>
          <div className={`text-xs px-2 py-1 rounded-lg border ${demoImported ? "bg-green-500/10 border-green-500/20 text-green-300" : "bg-slate-500/10 border-slate-500/20 text-slate-300"}`}>
            {demoImported ? "Demo imported" : "Demo not imported"}
          </div>
        </div>

        {demoCounts && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
            <DemoCount label="Drivers" value={demoCounts.drivers} />
            <DemoCount label="CDL" value={demoCounts.cdlRecords} />
            <DemoCount label="Medical" value={demoCounts.medicalCards} />
            <DemoCount label="DQF Docs" value={demoCounts.complianceDocuments} />
            <DemoCount label="Events" value={demoCounts.driverEvents} />
            <DemoCount label="DVIR" value={demoCounts.dvirReports} />
            <DemoCount label="Settlements" value={demoCounts.settlements} />
            <DemoCount label="Assignments" value={demoCounts.loadAssignments} />
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={handleImportDemo} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-300 text-xs font-medium hover:text-white">
            <Database className="w-3.5 h-3.5" /> Import Driver Demo Data
          </button>
          <button onClick={handleResetDemo} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium hover:text-white">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Driver Demo Data
          </button>
          <button onClick={handleRecalculate} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium hover:text-white">
            <Calculator className="w-3.5 h-3.5" /> Recalculate Driver Scores
          </button>
          <button onClick={handleGenerateSettlements} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-medium hover:text-white">
            <FileText className="w-3.5 h-3.5" /> Generate Weekly Demo Settlements
          </button>
        </div>

        {adminMessage && <div className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2">{adminMessage}</div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ReadinessMini label="Total" value={readinessStats.total} />
        <ReadinessMini label="Ready" value={readinessStats.ready} tone="green" />
        <ReadinessMini label="Review" value={readinessStats.warning} tone="amber" />
        <ReadinessMini label="Setup" value={readinessStats.blocked} tone="red" />
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
                      {(driver.first_name || driver.full_name || "?").charAt(0)}{(driver.last_name || "").charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium">{driver.full_name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver"}</div>
                    <div className="text-slate-500 text-xs">{driver.vehicle_type || `CDL-${driver.license_class || "A"}`}</div>
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

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center">
                <MetricMini label="Safety" value={driver.safety_score || 100} />
                <MetricMini label="Comp" value={driver.compliance_score || (driver.compliance_status === "compliant" ? 100 : 72)} />
                <MetricMini label="Perf" value={driver.performance_score || 90} />
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-xs font-medium">{driver.rolling_90_day_trend || "stable"}</span>
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

function ReadinessMini({ label, value, tone = "blue" }) {
  const tones = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    green: "border-green-500/20 bg-green-500/10 text-green-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

function DemoCount({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-2">
      <div className="text-white font-bold">{value}</div>
      <div className="text-slate-500 uppercase tracking-wide text-[10px]">{label}</div>
    </div>
  );
}

function MetricMini({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="text-white text-xs font-bold">{value}</div>
      <div className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</div>
    </div>
  );
}
