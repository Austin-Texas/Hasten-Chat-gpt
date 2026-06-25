export const EQUIPMENT_CLASSES = [
  "Sprinter",
  "Cargo Van",
  "Box Truck",
  "Hot Shot",
  "Gooseneck",
  "Fifth Wheel",
  "Dry Van",
  "Power Only",
  "Flatbed",
  "Car Hauler",
  "Reefer",
];

const NORMALIZED_EQUIPMENT = {
  sprinter: "Sprinter",
  "sprinter van": "Sprinter",
  "cargo van": "Cargo Van",
  van: "Cargo Van",
  "box truck": "Box Truck",
  hotshot: "Hot Shot",
  "hot shot": "Hot Shot",
  gooseneck: "Gooseneck",
  "fifth wheel": "Fifth Wheel",
  dryvan: "Dry Van",
  "dry van": "Dry Van",
  "power only": "Power Only",
  flatbed: "Flatbed",
  "car hauler": "Car Hauler",
  reefer: "Reefer",
};

const COMPATIBLE_EQUIPMENT = {
  Sprinter: ["Sprinter", "Cargo Van"],
  "Cargo Van": ["Cargo Van", "Sprinter"],
  "Box Truck": ["Box Truck"],
  "Hot Shot": ["Hot Shot", "Gooseneck", "Fifth Wheel", "Flatbed"],
  Gooseneck: ["Gooseneck", "Fifth Wheel", "Hot Shot", "Flatbed"],
  "Fifth Wheel": ["Fifth Wheel", "Gooseneck", "Hot Shot"],
  "Dry Van": ["Dry Van", "Power Only"],
  "Power Only": ["Power Only", "Dry Van", "Reefer"],
  Flatbed: ["Flatbed", "Hot Shot", "Gooseneck"],
  "Car Hauler": ["Car Hauler"],
  Reefer: ["Reefer", "Power Only"],
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeEquipment(value) {
  const key = normalizeText(value).replace(/[\s_-]+/g, " ");
  if (!key) return "";
  return NORMALIZED_EQUIPMENT[key] || NORMALIZED_EQUIPMENT[key.replace(/\s+/g, "")] || value;
}

export function getLoadEquipment(load) {
  return normalizeEquipment(load?.required_equipment || load?.equipment_type || load?.trailer_type || load?.vehicle_type);
}

export function getDriverEquipment(driver) {
  return normalizeEquipment(driver?.vehicle_type || driver?.equipment_type || driver?.trailer_type || driver?.truck_type);
}

export function equipmentIsCompatible(driverEquipment, loadEquipment) {
  const driverType = normalizeEquipment(driverEquipment);
  const loadType = normalizeEquipment(loadEquipment);
  if (!driverType || !loadType) return false;
  if (driverType === loadType) return true;
  return (COMPATIBLE_EQUIPMENT[driverType] || []).includes(loadType);
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeDriverLoadMatch(driver, load) {
  const driverEquipment = getDriverEquipment(driver);
  const loadEquipment = getLoadEquipment(load);

  if (!equipmentIsCompatible(driverEquipment, loadEquipment)) return null;

  const loadWeight = numberOrZero(load?.weight);
  const maxPayload = numberOrZero(driver?.max_payload || driver?.payload_capacity);
  if (maxPayload > 0 && loadWeight > maxPayload) return null;

  const status = normalizeText(driver?.availability || driver?.status || "available");
  const compliance = normalizeText(driver?.compliance_status || "valid");

  let score = 55;
  const reasons = [];

  if (driverEquipment === loadEquipment) {
    score += 25;
    reasons.push("Exact equipment match");
  } else {
    score += 14;
    reasons.push(`Compatible ${driverEquipment || "equipment"}`);
  }

  if (status.includes("available") || status.includes("ready")) {
    score += 10;
    reasons.push("Driver available");
  }

  if (["valid", "active", "approved", "compliant"].includes(compliance)) {
    score += 10;
    reasons.push("Compliance valid");
  }

  if (maxPayload > 0 && loadWeight > 0 && loadWeight / maxPayload <= 0.9) {
    score += 5;
    reasons.push("Payload OK");
  }

  return {
    driver_id: driver?.id,
    driver_name: driver?.full_name || driver?.name || driver?.driver_name || "Driver",
    equipment: driverEquipment || driver?.vehicle_type || "Equipment",
    home_city: driver?.home_city || driver?.city || "—",
    home_state: driver?.home_state || driver?.state || "—",
    compliance_status: driver?.compliance_status || "unknown",
    availability: driver?.availability || driver?.status || "unknown",
    match_score: Math.max(1, Math.min(100, Math.round(score))),
    reasons,
  };
}

export function matchExternalLoadsToDrivers(load, drivers = []) {
  return drivers
    .map((driver) => computeDriverLoadMatch(driver, load))
    .filter(Boolean)
    .sort((a, b) => b.match_score - a.match_score);
}

export function filterExternalLoadsForDriver(loads = [], driver) {
  return loads.filter((load) => Boolean(computeDriverLoadMatch(driver, load)));
}

export function getDriverSafeOffer(load) {
  return {
    id: load?.id,
    external_load_id: load?.id,
    load_number: load?.external_load_id || load?.load_number || `EXT-${String(load?.id || "").slice(-6)}`,
    status: load?.normalized_status || "available",
    origin_city: load?.pickup_city || load?.origin_city,
    origin_state: load?.pickup_state || load?.origin_state,
    destination_city: load?.delivery_city || load?.destination_city,
    destination_state: load?.delivery_state || load?.destination_state,
    equipment_type: getLoadEquipment(load),
    weight: load?.weight,
    miles: load?.miles_total || load?.miles,
    commodity: load?.commodity,
    pickup_time: load?.pickup_datetime_start,
    delivery_time: load?.delivery_datetime_start,
    broker_rate_hidden: true,
  };
}
