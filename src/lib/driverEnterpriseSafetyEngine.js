import { readDriverEnterpriseStore, writeDriverEnterpriseStore, upsertDriverEnterpriseRecord } from "./driverEnterpriseDataLayer";

export const DRIVER_TELEMETRY_EVENT_TYPES = [
  "speeding",
  "harsh_braking",
  "rapid_acceleration",
  "hard_cornering",
  "fatigue_risk",
  "hos_violation",
  "accident",
  "unsafe_parking",
  "device_disconnected",
];

export const DRIVER_HOS_PROVIDER_MAP = [
  { provider: "Motive", supported: "future_api", records: ["HOS", "DVIR", "GPS", "Safety Events"] },
  { provider: "Samsara", supported: "future_api", records: ["HOS", "DVIR", "GPS", "Camera Events"] },
  { provider: "Trimble", supported: "future_api", records: ["ELD", "Navigation", "Driver Logs"] },
];

function nowIso() {
  return new Date().toISOString();
}

function severityForTelemetry(type, value = 0) {
  if (["accident", "hos_violation", "fatigue_risk"].includes(type)) return "critical";
  if (type === "speeding" && Number(value) >= 15) return "high";
  if (["harsh_braking", "rapid_acceleration", "hard_cornering"].includes(type)) return "medium";
  return "low";
}

export function createDriverTelemetryEvent(input = {}, actor = "telemetry_engine") {
  const eventType = input.event_type || input.type || "speeding";
  const severity = input.severity || severityForTelemetry(eventType, input.value);
  const event = {
    id: input.id || `safety-event-${input.driver_id || "driver"}-${Date.now()}`,
    driver_id: input.driver_id,
    load_id: input.load_id || null,
    event_type: eventType,
    severity,
    gps_location: input.gps_location || null,
    timestamp: input.timestamp || nowIso(),
    resolved: false,
    resolution_notes: null,
    source_provider: input.source_provider || "local_demo",
    telemetry_value: input.value || null,
    metadata: input.metadata || {},
  };
  upsertDriverEnterpriseRecord("safetyEvents", event, actor);
  return event;
}

export function calculateDriverFatigueRisk(driverId, store = readDriverEnterpriseStore()) {
  const events = (store.safetyEvents || []).filter((event) => event.driver_id === driverId);
  const nav = (store.navigationSessions || []).filter((session) => session.driver_id === driverId && ["active", "arrived_geofence"].includes(session.status));
  const fatigueEvents = events.filter((event) => event.event_type === "fatigue_risk" || event.event_type === "hos_violation").length;
  const unsafeEvents = events.filter((event) => ["speeding", "harsh_braking", "rapid_acceleration"].includes(event.event_type)).length;
  const activeRouteLoad = nav.length;
  const score = Math.min(100, fatigueEvents * 35 + unsafeEvents * 8 + activeRouteLoad * 5);
  return {
    driver_id: driverId,
    fatigue_score: score,
    risk_level: score >= 70 ? "critical" : score >= 40 ? "high" : score >= 20 ? "medium" : "low",
    fatigue_events: fatigueEvents,
    unsafe_events: unsafeEvents,
    active_navigation_sessions: activeRouteLoad,
    calculated_at: nowIso(),
  };
}

export function recalculateDriverSafetyProfiles() {
  const store = readDriverEnterpriseStore();
  const driverIds = [...new Set((store.safetyEvents || []).map((event) => event.driver_id).filter(Boolean))];
  const profiles = driverIds.map((driverId) => {
    const events = (store.safetyEvents || []).filter((event) => event.driver_id === driverId);
    const dvirs = (store.dvirReports || []).filter((report) => report.driver_id === driverId);
    const fatigue = calculateDriverFatigueRisk(driverId, store);
    const critical = events.filter((event) => event.severity === "critical").length;
    const high = events.filter((event) => event.severity === "high").length;
    const medium = events.filter((event) => event.severity === "medium").length;
    const defects = dvirs.filter((report) => report.status === "defect_found" || report.maintenance_hold_required).length;
    const safetyScore = Math.max(0, 100 - critical * 20 - high * 12 - medium * 5 - defects * 7 - Math.round(fatigue.fatigue_score / 5));
    return {
      id: `safety-profile-${driverId}`,
      driver_id: driverId,
      safety_score: safetyScore,
      risk_level: safetyScore >= 85 ? "low" : safetyScore >= 70 ? "medium" : safetyScore >= 55 ? "high" : "critical",
      critical_events: critical,
      high_events: high,
      medium_events: medium,
      dvir_defects: defects,
      fatigue,
      updated_at: nowIso(),
    };
  });
  const auditEvent = {
    id: `audit-safety-profile-${Date.now()}`,
    actor: "driver_safety_engine",
    entity_key: "driverSafetyProfiles",
    record_id: "safety_profile_recalculation",
    action: "driver_safety_profiles_recalculated",
    profile_count: profiles.length,
    timestamp: nowIso(),
  };
  return writeDriverEnterpriseStore({
    ...store,
    driverSafetyProfiles: profiles,
    auditEvents: [auditEvent, ...(store.auditEvents || [])],
  });
}

export function getDriverSafetyDashboard(store = readDriverEnterpriseStore()) {
  const events = store.safetyEvents || [];
  const profiles = store.driverSafetyProfiles || [];
  return {
    events,
    profiles,
    total_events: events.length,
    critical_events: events.filter((event) => event.severity === "critical").length,
    high_events: events.filter((event) => event.severity === "high").length,
    fatigue_events: events.filter((event) => ["fatigue_risk", "hos_violation"].includes(event.event_type)).length,
    low_risk_drivers: profiles.filter((profile) => profile.risk_level === "low").length,
    high_risk_drivers: profiles.filter((profile) => ["high", "critical"].includes(profile.risk_level)).length,
    provider_mapping: DRIVER_HOS_PROVIDER_MAP,
  };
}
