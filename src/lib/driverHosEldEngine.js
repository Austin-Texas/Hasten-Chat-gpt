import { readDriverEnterpriseStore, writeDriverEnterpriseStore } from "./driverEnterpriseDataLayer";

export const HOS_PROVIDER_TARGETS = ["Motive", "Samsara", "Trimble", "Geotab", "Manual Demo"];
export const HOS_STATUS = ["off_duty", "sleeper_berth", "driving", "on_duty_not_driving"];

function nowIso() {
  return new Date().toISOString();
}

function hours(value) {
  return Number(Number(value || 0).toFixed(2));
}

function riskLevel(violations, driveRemaining, shiftRemaining, cycleRemaining) {
  if (violations.length > 0) return "violation";
  if (driveRemaining <= 1 || shiftRemaining <= 1 || cycleRemaining <= 5) return "critical";
  if (driveRemaining <= 2 || shiftRemaining <= 2 || cycleRemaining <= 10) return "warning";
  return "clear";
}

export function buildHosSnapshot(input = {}) {
  const driveLimit = 11;
  const shiftLimit = 14;
  const cycleLimit = input.cycle_rule === "60_7" ? 60 : 70;
  const breakLimit = 8;

  const drivingUsed = hours(input.driving_hours_used);
  const shiftUsed = hours(input.shift_hours_used);
  const cycleUsed = hours(input.cycle_hours_used);
  const sinceBreak = hours(input.hours_since_break);

  const violations = [];
  if (drivingUsed > driveLimit) violations.push("11-hour driving limit exceeded");
  if (shiftUsed > shiftLimit) violations.push("14-hour shift limit exceeded");
  if (cycleUsed > cycleLimit) violations.push(`${cycleLimit}-hour cycle limit exceeded`);
  if (sinceBreak > breakLimit) violations.push("30-minute break risk after 8 hours");

  const driveRemaining = hours(Math.max(0, driveLimit - drivingUsed));
  const shiftRemaining = hours(Math.max(0, shiftLimit - shiftUsed));
  const cycleRemaining = hours(Math.max(0, cycleLimit - cycleUsed));

  return {
    id: input.id || `hos-${input.driver_id || "driver"}-${Date.now()}`,
    driver_id: input.driver_id,
    provider: input.provider || "Manual Demo",
    duty_status: input.duty_status || "off_duty",
    cycle_rule: input.cycle_rule || "70_8",
    driving_hours_used: drivingUsed,
    shift_hours_used: shiftUsed,
    cycle_hours_used: cycleUsed,
    hours_since_break: sinceBreak,
    drive_remaining: driveRemaining,
    shift_remaining: shiftRemaining,
    cycle_remaining: cycleRemaining,
    violations,
    risk_level: riskLevel(violations, driveRemaining, shiftRemaining, cycleRemaining),
    last_sync_at: input.last_sync_at || nowIso(),
    source: input.source || "local_enterprise_hos_engine",
  };
}

export function upsertDriverHosSnapshot(input = {}) {
  const store = readDriverEnterpriseStore();
  const snapshot = buildHosSnapshot(input);
  const existing = store.hosSnapshots || [];
  const rows = existing.some((row) => row.driver_id === snapshot.driver_id)
    ? existing.map((row) => row.driver_id === snapshot.driver_id ? { ...row, ...snapshot } : row)
    : [snapshot, ...existing];
  const auditEvent = {
    id: `audit-hos-${Date.now()}`,
    actor: "driver_hos_eld_engine",
    entity_key: "hosSnapshots",
    record_id: snapshot.id,
    action: "hos_snapshot_upserted",
    driver_id: snapshot.driver_id,
    risk_level: snapshot.risk_level,
    timestamp: nowIso(),
  };
  return writeDriverEnterpriseStore({ ...store, hosSnapshots: rows, auditEvents: [auditEvent, ...(store.auditEvents || [])] });
}

export function seedDemoHosSnapshots(driverIds = []) {
  let store = readDriverEnterpriseStore();
  driverIds.forEach((driverId, index) => {
    store = upsertDriverHosSnapshot({
      driver_id: driverId,
      provider: index % 2 === 0 ? "Motive" : "Samsara",
      duty_status: index % 3 === 0 ? "driving" : "on_duty_not_driving",
      driving_hours_used: 3 + (index % 7),
      shift_hours_used: 5 + (index % 8),
      cycle_hours_used: 22 + index * 2,
      hours_since_break: 2 + (index % 5),
      source: "HASTEN_DRIVER_DEMO_IMPORT",
    });
  });
  return readDriverEnterpriseStore();
}

export function getDriverHosDashboard(store = readDriverEnterpriseStore()) {
  const snapshots = store.hosSnapshots || [];
  return {
    snapshots,
    total: snapshots.length,
    clear: snapshots.filter((row) => row.risk_level === "clear").length,
    warning: snapshots.filter((row) => row.risk_level === "warning").length,
    critical: snapshots.filter((row) => row.risk_level === "critical").length,
    violation: snapshots.filter((row) => row.risk_level === "violation").length,
    provider_targets: HOS_PROVIDER_TARGETS,
  };
}

export function getDriverHosPortalPayload(driverId, store = readDriverEnterpriseStore()) {
  const snapshot = (store.hosSnapshots || []).find((row) => row.driver_id === driverId) || null;
  return {
    driver_id: driverId,
    snapshot,
    has_violation: Boolean(snapshot?.violations?.length),
    alert_text: snapshot?.violations?.[0] || (snapshot?.risk_level === "critical" ? "Low HOS remaining. Dispatcher check recommended." : "HOS clear."),
  };
}
