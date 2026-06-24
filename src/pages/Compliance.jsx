import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, Clock, FileText, BarChart3, Filter, Download, TrendingDown } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";
import StatusBadge from "@/components/hasten/StatusBadge";
import DocExpiryTracker from "@/components/compliance/DocExpiryTracker";

const COMPLIANCE_STATUS = {
  compliant: { label: "Compliant", color: "bg-green-500/15 text-green-400 border-green-500/25", icon: CheckCircle2 },
  expiring: { label: "Expiring Soon", color: "bg-amber-500/15 text-amber-400 border-amber-500/25", icon: Clock },
  expired: { label: "Expired", color: "bg-red-500/15 text-red-400 border-red-500/25", icon: AlertTriangle },
  pending: { label: "Pending", color: "bg-blue-500/15 text-blue-400 border-blue-500/25", icon: FileText },
};

export default function Compliance() {
  const [drivers, setDrivers] = useState([]);
  const [violations, setViolations] = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list("-created_date", 200),
      base44.entities.SafetyViolation?.list?.("-created_date", 500).catch(() => []),
      base44.entities.Accident?.list?.("-created_date", 300).catch(() => []),
    ])
      .then(([d, v = [], a = []]) => {
        setDrivers(d);
        setViolations(v);
        setAccidents(a);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getComplianceStatus = (driver) => {
    const today = new Date();
    const expiringIn = 30; // days

    const checks = {
      cdl_expired: driver.license_expiry && new Date(driver.license_expiry) < today,
      cdl_expiring: driver.license_expiry && new Date(driver.license_expiry) < new Date(today.getTime() + expiringIn * 24 * 60 * 60 * 1000),
      medical_expired: driver.medical_expiry && new Date(driver.medical_expiry) < today,
      medical_expiring: driver.medical_expiry && new Date(driver.medical_expiry) < new Date(today.getTime() + expiringIn * 24 * 60 * 60 * 1000),
      twic_expired: driver.twic_expiry && new Date(driver.twic_expiry) < today,
      twic_expiring: driver.twic_expiry && new Date(driver.twic_expiry) < new Date(today.getTime() + expiringIn * 24 * 60 * 60 * 1000),
    };

    const hasExpired = checks.cdl_expired || checks.medical_expired || checks.twic_expired;
    const hasExpiring = checks.cdl_expiring || checks.medical_expiring || checks.twic_expiring;

    if (hasExpired) return "expired";
    if (hasExpiring) return "expiring";
    return "compliant";
  };

  const getComplianceSummary = (driver) => {
    const issues = [];
    const today = new Date();

    if (driver.license_expiry) {
      const expDate = new Date(driver.license_expiry);
      if (expDate < today) issues.push("CDL Expired");
      else if (expDate < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) issues.push("CDL Expires Soon");
    }

    if (driver.medical_expiry) {
      const expDate = new Date(driver.medical_expiry);
      if (expDate < today) issues.push("Medical Expired");
      else if (expDate < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) issues.push("Medical Expires Soon");
    }

    if (driver.twic_expiry) {
      const expDate = new Date(driver.twic_expiry);
      if (expDate < today) issues.push("TWIC Expired");
      else if (expDate < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) issues.push("TWIC Expires Soon");
    }

    return issues.length > 0 ? issues : ["All Clear"];
  };

  const filteredDrivers = drivers.filter(d => {
    const status = getComplianceStatus(d);
    const matchesFilter = filterStatus === "all" || status === filterStatus;
    const matchesSearch =
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.license_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const complianceStats = {
    total: drivers.length,
    compliant: drivers.filter(d => getComplianceStatus(d) === "compliant").length,
    expiring: drivers.filter(d => getComplianceStatus(d) === "expiring").length,
    expired: drivers.filter(d => getComplianceStatus(d) === "expired").length,
    violations: violations.length,
    accidents: accidents.length,
  };

  const handleExport = () => {
    const csv = [
      ["Driver", "License Expiry", "Medical Expiry", "TWIC Expiry", "Status", "Issues"].join(","),
      ...filteredDrivers.map(d => [
        `${d.first_name} ${d.last_name}`,
        d.license_expiry || "N/A",
        d.medical_expiry || "N/A",
        d.twic_expiry || "N/A",
        getComplianceStatus(d),
        getComplianceSummary(d).join("; "),
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Compliance Center</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track driver certifications, violations & accidents</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total Drivers" value={complianceStats.total} icon={BarChart3} color="blue" />
        <KpiCard label="Compliant" value={complianceStats.compliant} icon={CheckCircle2} color="green" />
        <KpiCard label="Expiring Soon" value={complianceStats.expiring} icon={Clock} color="amber" />
        <KpiCard label="Expired" value={complianceStats.expired} icon={AlertTriangle} color="red" />
        <KpiCard label="Violations" value={complianceStats.violations} icon={FileText} color="orange" />
        <KpiCard label="Accidents" value={complianceStats.accidents} icon={TrendingDown} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
        {["overview", "doc-expiry", "drivers", "violations", "accidents"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${
              tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "overview" ? "Overview" : t === "doc-expiry" ? "Doc Expiry" : t === "drivers" ? "Drivers" : t === "violations" ? "Violations" : "Accidents"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Expiration Timeline */}
          <div className="glass-card rounded-xl p-5 border border-white/5">
            <h2 className="text-white font-heading font-semibold mb-4">Expiring Soon (Next 30 Days)</h2>
            <div className="space-y-2">
              {drivers
                .flatMap(d => {
                  const items = [];
                  const today = new Date();
                  const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

                  if (d.license_expiry) {
                    const expDate = new Date(d.license_expiry);
                    if (expDate >= today && expDate <= thirtyDays) {
                      items.push({
                        type: "CDL License",
                        driver: `${d.first_name} ${d.last_name}`,
                        expDate,
                        daysLeft: Math.round((expDate - today) / (1000 * 60 * 60 * 24)),
                      });
                    }
                  }

                  if (d.medical_expiry) {
                    const expDate = new Date(d.medical_expiry);
                    if (expDate >= today && expDate <= thirtyDays) {
                      items.push({
                        type: "Medical Card",
                        driver: `${d.first_name} ${d.last_name}`,
                        expDate,
                        daysLeft: Math.round((expDate - today) / (1000 * 60 * 60 * 24)),
                      });
                    }
                  }

                  if (d.twic_expiry) {
                    const expDate = new Date(d.twic_expiry);
                    if (expDate >= today && expDate <= thirtyDays) {
                      items.push({
                        type: "TWIC Card",
                        driver: `${d.first_name} ${d.last_name}`,
                        expDate,
                        daysLeft: Math.round((expDate - today) / (1000 * 60 * 60 * 24)),
                      });
                    }
                  }

                  return items;
                })
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .slice(0, 10)
                .map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 border border-amber-500/20">
                    <div>
                      <div className="text-white font-medium text-sm">{item.type}</div>
                      <div className="text-slate-400 text-xs">{item.driver}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold text-sm ${item.daysLeft <= 7 ? "text-red-400" : "text-amber-400"}`}>
                        {item.daysLeft} days
                      </div>
                      <div className="text-slate-500 text-xs">{item.expDate.toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              {drivers.flatMap(d => {
                const today = new Date();
                const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                const items = [];
                if (d.license_expiry) {
                  const expDate = new Date(d.license_expiry);
                  if (expDate >= today && expDate <= thirtyDays) items.push(true);
                }
                if (d.medical_expiry) {
                  const expDate = new Date(d.medical_expiry);
                  if (expDate >= today && expDate <= thirtyDays) items.push(true);
                }
                if (d.twic_expiry) {
                  const expDate = new Date(d.twic_expiry);
                  if (expDate >= today && expDate <= thirtyDays) items.push(true);
                }
                return items;
              }).length === 0 && (
                <div className="text-center py-8 text-slate-500">No expirations in the next 30 days</div>
              )}
            </div>
          </div>

          {/* Safety Record Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-5 border border-white/5">
              <h3 className="text-white font-semibold mb-3">Recent Violations</h3>
              {violations.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">No violations recorded</div>
              ) : (
                <div className="space-y-2">
                  {violations.slice(0, 5).map(v => (
                    <div key={v.id} className="text-sm">
                      <div className="text-white">{v.violation_type || "Safety Violation"}</div>
                      <div className="text-slate-400 text-xs">{new Date(v.created_date).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-xl p-5 border border-white/5">
              <h3 className="text-white font-semibold mb-3">Recent Accidents</h3>
              {accidents.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">No accidents recorded</div>
              ) : (
                <div className="space-y-2">
                  {accidents.slice(0, 5).map(a => (
                    <div key={a.id} className="text-sm">
                      <div className="text-white">{a.accident_type || "Accident"}</div>
                      <div className="text-slate-400 text-xs">{new Date(a.created_date).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "doc-expiry" && (
        <DocExpiryTracker drivers={drivers} />
      )}

      {tab === "drivers" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search driver name or license number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
              style={{ background: "#0F1829" }}
            >
              <option value="all" style={{ background: "#0F1829" }}>
                All Statuses
              </option>
              <option value="compliant" style={{ background: "#0F1829" }}>
                Compliant
              </option>
              <option value="expiring" style={{ background: "#0F1829" }}>
                Expiring Soon
              </option>
              <option value="expired" style={{ background: "#0F1829" }}>
                Expired
              </option>
            </select>
          </div>

          {/* Drivers Table */}
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
            {filteredDrivers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No drivers matching filters</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/2">
                        <th className="px-5 py-3 text-left font-semibold text-slate-400 uppercase text-xs">Driver</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-400 uppercase text-xs">License</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-400 uppercase text-xs">Medical</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-400 uppercase text-xs">TWIC</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-400 uppercase text-xs">Status</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-400 uppercase text-xs">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrivers.map(d => {
                        const status = getComplianceStatus(d);
                        const issues = getComplianceSummary(d);
                        const formatDate = date => (date ? new Date(date).toLocaleDateString() : "—");

                        return (
                          <tr key={d.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                            <td className="px-5 py-3">
                              <div className="text-white font-medium">{d.first_name} {d.last_name}</div>
                              <div className="text-slate-500 text-xs">{d.license_number}</div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="text-slate-300 text-sm">{formatDate(d.license_expiry)}</div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="text-slate-300 text-sm">{formatDate(d.medical_expiry)}</div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="text-slate-300 text-sm">{formatDate(d.twic_expiry)}</div>
                            </td>
                            <td className="px-5 py-3">
                              <StatusBadge status={status} />
                            </td>
                            <td className="px-5 py-3">
                              <div className="text-slate-400 text-xs max-w-xs">
                                {issues.map((issue, i) => (
                                  <div key={i} className={i === 0 ? "" : "mt-1"}>{issue}</div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "violations" && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          {violations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No violations recorded</div>
          ) : (
            <div className="divide-y divide-white/5">
              {violations.map(v => (
                <div key={v.id} className="px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-white font-medium">{v.violation_type || "Safety Violation"}</div>
                      <div className="text-slate-400 text-sm mt-1">{v.description || "—"}</div>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>Driver: {v.driver_id || "—"}</span>
                        <span>Date: {new Date(v.created_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "accidents" && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          {accidents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No accidents recorded</div>
          ) : (
            <div className="divide-y divide-white/5">
              {accidents.map(a => (
                <div key={a.id} className="px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-white font-medium">{a.accident_type || "Accident"}</div>
                      <div className="text-slate-400 text-sm mt-1">{a.description || "—"}</div>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>Driver: {a.driver_id || "—"}</span>
                        <span>Location: {a.location || "—"}</span>
                        <span>Date: {new Date(a.created_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}