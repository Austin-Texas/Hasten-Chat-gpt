import { readDriverEnterpriseStore, writeDriverEnterpriseStore } from "./driverEnterpriseDataLayer";

export const DRIVER_HOS_PROVIDERS = ["Motive", "Samsara", "Trimble", "Geotab", "Manual Demo"];
export const DRIVER_HOS_STATUSES = ["off_duty", "sleeper_berth", "driving", "on_duty_not_driving"];

function nowIso() {
  return new Date().toISOString();
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function riskLevel(hoursRemaining, cycleRemaining, violations = 0, shiftRemaining = 11) {
  if (violations > 0) return "violation";
  if (hoursRemaining <= 1 || shiftRemaining <= 1 || cycleRemaining <= 4) return "critical";
  if (hoursRemaining <= 2 || shiftRemaining <= 2 || cycleRemaining <= 8) return "warning";
  return "normal";
}

export function buildDriverHosRecord(driver = {}, source = "Manual Demo") {
  const driveRemaining = num(driver.hos_drive_hours_remaining ?? driver.hos_hours_remaining, 8);
  const shiftRemaining = num(driver.hos_shift_hours_remaining, 11);
  const cycleRemaining = num(driver.hos_cycle_hours_remaining, 48);
  const violations = num(driver.hos_violation_count, 0);

  return {
    id: `hos-${driver.id || "driver"}`,
    driver_id: driver.id,
    source_provider: source,
    duty_status: driver.hos_duty_status || driver.duty_status || "off_duty",
    drive_hours_remaining: driveRemaining,
    shift_hours_remaining: shiftRemaining,
    cycle_hours_remaining: cycleRemaining,
    break_required_in_minutes: num(driver.hos_break_required_in_minutes, driveRemaining <= 2 ? 30 : 0),
    violation_count: violations,
    violations: violations > 0 ? ["HOS violation detected"] : [],
    risk_level: riskLevel(driveRemaining, cycleRemaining, violations, shiftRemaining),
    last_synced_at: nowIso(),
    provider_mapping: {
      motive: "future_api.hos.clocks",
      samsara: "future_api.driverSafety.hosClocks",
      trimble: "future_api.eld.driverLogs",
      geotab: "future_api.hosAvailability",
    },
  };
}

export function buildDriverHosAlerts(hos = {}) {
  const alerts = [];
  if (hos.violation_count > 0 || hos.risk_level === "violation") {
    alerts.push({ severity: "critical", message: "HOS violation detected. Dispatch review required." });
  }
  if (hos.drive_hours_remaining <= 1) {
    alerts.push({ severity: "critical", message: "Driver has 1 hour or less of drive time remaining." });
  } else if (hos.drive_hours_remaining <= 2) {
    alerts.push({ severity: "warning", message: "Driver drive clock is below 2 hours." });
  }
  if (hos.shift_hours_remaining <= 1) {
    alerts.push({ severity: "critical", message: "Driver shift clock is critically low." });
  } else if (hos.shift_hours_remaining <= 2) {
    alerts.push({ severity: "warning", message: "Driver shift clock is below 2 hours." });
  }
  if (hos.cycle_hours_remaining <= 4) {
    alerts.push({ severity: "critical", message: "Driver cycle clock is critically low." });
  } else if (hos.cycle_hours_remaining <= 8) {
    alerts.push({ severity: "warning", message: "Driver cycle clock is below 8 hours." });
  }
  if (hos.break_required_in_minutes > 0) {
    alerts.push({ severity: "info", message: `Break required in ${hos.break_required_in_minutes} minutes.` });
  }
  return alerts;
}

export function upsertDriverHosSnapshot(driver = {}, source = "Manual Demo") {
  const store = readDriverEnterpriseStore();
  const record = buildDriverHosRecord(driver, source);
  const existing = store.hosSnapshots || [];
  const rows = existing.some((row) => row.driver_id === record.driver_id)
    ? existing.map((row) => row.driver_id === record.driver_id ? { ...row, ...record } : row)
    : [record, ...existing];
  const auditEvent = {
    id: `audit-hos-${Date.now()}`,
    actor: "driver_hos_engine",
    entity_key: "hosSnapshots",
    record_id: record.id,
    action: "hos_snapshot_upserted",
    driver_id: record.driver_id,
    risk_level: record.risk_level,
    timestamp: nowIso(),
  };
  return writeDriverEnterpriseStore({ ...store, hosSnapshots: rows, auditEvents: [auditEvent, ...(store.auditEvents || [])] });
}

export function buildDriverHosPortalPayload(driver = {}) {
  const store = readDriverEnterpriseStore();
  const storedHos = (store.hosSnapshots || []).find((row) => row.driver_id === driver.id);
  const hos = storedHos || buildDriverHosRecord(driver);
  return {
    hos,
    alerts: buildDriverHosAlerts(hos),
    requirements: [
      "track drive clock",
      "track shift clock",
      "track cycle clock",
      "surface violation alerts",
      "sync future ELD provider records",
      "notify dispatcher before dispatching low-hour drivers",
    ],
  };
}

export function getDriverHosDashboard(store = readDriverEnterpriseStore()) {
  const snapshots = store.hosSnapshots || [];
  return {
    snapshots,
    total: snapshots.length,
    normal: snapshots.filter((row) => row.risk_level === "normal").length,
    warning: snapshots.filter((row) => row.risk_level === "warning").length,
    critical: snapshots.filter((row) => row.risk_level === "critical").length,
    violation: snapshots.filter((row) => row.risk_level === "violation").length,
    provider_targets: DRIVER_HOS_PROVIDERS,
  };
}
