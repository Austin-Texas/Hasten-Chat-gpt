export const DISPATCH_EXCEPTION_TYPES = [
  "pickup_late_risk",
  "delivery_late_risk",
  "driver_unavailable",
  "compliance_hold",
  "maintenance_hold",
  "missing_pod",
  "rate_margin_risk",
  "unassigned_load",
  "route_gap",
];

function nowIso() {
  return new Date().toISOString();
}

function fullName(driver = {}) {
  return driver.full_name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver";
}

function scoreMatch(load = {}, driver = {}) {
  let score = 50;
  const reasons = [];
  const driverEquipment = String(driver.vehicle_type || driver.equipment_type || driver.truck_type || "").toLowerCase();
  const loadEquipment = String(load.equipment_type || load.required_equipment || "").toLowerCase();
  if (loadEquipment && driverEquipment && driverEquipment.includes(loadEquipment)) {
    score += 20;
    reasons.push("equipment match");
  }
  if (driver.status === "available") {
    score += 15;
    reasons.push("available now");
  }
  if (driver.compliance_status === "compliant" || driver.compliance_score >= 85) {
    score += 10;
    reasons.push("compliance ready");
  }
  if ((driver.safety_score || 100) >= 85) {
    score += 8;
    reasons.push("strong safety score");
  }
  const preferred = String(driver.preferred_lanes || "").toLowerCase();
  const routeText = `${load.origin_state || ""} ${load.destination_state || ""} ${load.origin_city || ""} ${load.destination_city || ""}`.toLowerCase();
  if (preferred && routeText && routeText.split(" ").some((token) => token && preferred.includes(token))) {
    score += 7;
    reasons.push("preferred lane overlap");
  }
  if (["compliance_hold", "suspended", "maintenance_hold"].includes(driver.status)) {
    score -= 80;
    reasons.push("driver hold status");
  }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export function rankDriversForLoad(load = {}, drivers = []) {
  return drivers
    .map((driver) => ({ driver, ...scoreMatch(load, driver) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => ({
      driver_id: item.driver.id,
      driver_name: fullName(item.driver),
      score: item.score,
      reasons: item.reasons,
      status: item.driver.status,
      equipment: item.driver.vehicle_type || item.driver.equipment_type || "—",
    }));
}

export function buildDispatchMatchingBoard(loads = [], drivers = []) {
  const unassigned = loads.filter((load) => !load.driver_id && ["available", "new", "posted"].includes(load.status || "available"));
  return unassigned.map((load) => ({
    load_id: load.id,
    load_number: load.load_number || `#${String(load.id || "").slice(-6)}`,
    origin: [load.origin_city, load.origin_state].filter(Boolean).join(", "),
    destination: [load.destination_city, load.destination_state].filter(Boolean).join(", "),
    equipment_type: load.equipment_type || load.required_equipment || "—",
    rate: load.rate || 0,
    matches: rankDriversForLoad(load, drivers),
  }));
}

export function detectDispatchExceptions(loads = [], drivers = [], trucks = []) {
  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
  const exceptions = [];
  loads.forEach((load) => {
    const driver = driverById.get(load.driver_id);
    if (!load.driver_id && !["delivered", "completed", "cancelled"].includes(load.status)) {
      exceptions.push({ type: "unassigned_load", severity: "medium", load_id: load.id, message: `${load.load_number || "Load"} is not assigned.` });
    }
    if (driver && ["compliance_hold", "suspended"].includes(driver.status)) {
      exceptions.push({ type: "compliance_hold", severity: "critical", load_id: load.id, driver_id: driver.id, message: `${fullName(driver)} is not dispatch-ready.` });
    }
    if (driver && driver.status === "maintenance_hold") {
      exceptions.push({ type: "maintenance_hold", severity: "high", load_id: load.id, driver_id: driver.id, message: `${fullName(driver)} is on maintenance hold.` });
    }
    if (["delivered", "completed"].includes(load.status) && !load.pod_uploaded && !load.pod_document_id) {
      exceptions.push({ type: "missing_pod", severity: "medium", load_id: load.id, message: `${load.load_number || "Delivered load"} is missing POD.` });
    }
    const margin = Number(load.rate || 0) - Number(load.carrier_pay || load.driver_pay || 0);
    if (Number(load.rate || 0) > 0 && margin < Number(load.rate || 0) * 0.08) {
      exceptions.push({ type: "rate_margin_risk", severity: "medium", load_id: load.id, message: `${load.load_number || "Load"} has low projected margin.` });
    }
  });
  return exceptions.map((item, index) => ({ id: `dispatch-exception-${index}-${item.load_id || item.driver_id || Date.now()}`, created_at: nowIso(), ...item }));
}

export function buildDispatcherSlaSummary(loads = []) {
  const active = loads.filter((load) => !["delivered", "completed", "cancelled"].includes(load.status));
  const atRisk = active.filter((load) => ["assigned", "accepted", "en_route"].includes(load.status) && !load.last_tracking_at).length;
  const deliveredMissingPod = loads.filter((load) => ["delivered", "completed"].includes(load.status) && !load.pod_uploaded && !load.pod_document_id).length;
  return {
    active_loads: active.length,
    at_risk_tracking: atRisk,
    delivered_missing_pod: deliveredMissingPod,
    unassigned: active.filter((load) => !load.driver_id).length,
    in_transit: active.filter((load) => ["accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery"].includes(load.status)).length,
  };
}

export function buildDriverAvailabilityBoard(drivers = []) {
  const groups = {
    available: [],
    under_load: [],
    off_duty: [],
    compliance_hold: [],
    maintenance_hold: [],
    suspended: [],
  };
  drivers.forEach((driver) => {
    const key = groups[driver.status] ? driver.status : "off_duty";
    groups[key].push(driver);
  });
  return Object.entries(groups).map(([status, rows]) => ({
    status,
    count: rows.length,
    drivers: rows.map((driver) => ({ id: driver.id, name: fullName(driver), equipment: driver.vehicle_type || driver.equipment_type || "—", city: driver.current_city || driver.home_city || "—" })),
  }));
}

export function buildDispatcherEnterpriseSnapshot({ loads = [], drivers = [], trucks = [] } = {}) {
  const exceptions = detectDispatchExceptions(loads, drivers, trucks);
  return {
    generated_at: nowIso(),
    sla: buildDispatcherSlaSummary(loads),
    exceptions,
    critical_exceptions: exceptions.filter((item) => item.severity === "critical").length,
    high_exceptions: exceptions.filter((item) => item.severity === "high").length,
    matching_board: buildDispatchMatchingBoard(loads, drivers),
    availability_board: buildDriverAvailabilityBoard(drivers),
  };
}
