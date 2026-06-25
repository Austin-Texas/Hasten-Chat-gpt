import {
  enrichDriversWithReadiness,
  getDriverReadinessStats,
  driverReadinessSearchText,
} from "@/lib/driverReadiness";

export const READINESS_FILTERS = ["all", "ready", "warning", "blocked"];

export function buildDriverReadinessRows(drivers = [], search = "", filter = "all") {
  const q = String(search || "").toLowerCase().trim();
  return enrichDriversWithReadiness(drivers).filter((driver) => {
    const matchesFilter = filter === "all" || driver.readiness.level === filter;
    const matchesSearch = !q || driverReadinessSearchText(driver).includes(q);
    return matchesFilter && matchesSearch;
  });
}

export function buildDriverReadinessSummary(drivers = []) {
  const stats = getDriverReadinessStats(drivers);
  const readyPercent = stats.total ? Math.round((stats.ready / stats.total) * 100) : 0;
  return {
    ...stats,
    readyPercent,
    needsAttention: stats.warning + stats.blocked,
  };
}

export function getReadinessExportRows(drivers = []) {
  return enrichDriversWithReadiness(drivers).map((driver) => ({
    id: driver.id,
    name: driver.full_name || driver.name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim(),
    email: driver.email || "",
    vehicle_type: driver.vehicle_type || "",
    max_payload: driver.max_payload || "",
    availability: driver.availability || driver.status || "",
    readiness: driver.readiness.label,
    message: driver.readiness.message,
    missing: (driver.readiness.missing || []).join("; "),
  }));
}
