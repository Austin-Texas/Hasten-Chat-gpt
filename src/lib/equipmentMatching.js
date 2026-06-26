export const EQUIPMENT_CLASSES = [
  "Sprinter",
  "Cargo Van",
  "Box Truck",
  "Hot Shot",
  "Gooseneck / Fifth Wheel",
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
  gooseneck: "Gooseneck / Fifth Wheel",
  "fifth wheel": "Gooseneck / Fifth Wheel",
  "gooseneck fifth wheel": "Gooseneck / Fifth Wheel",
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
  "Hot Shot": ["Hot Shot", "Gooseneck / Fifth Wheel", "Flatbed"],
  "Gooseneck / Fifth Wheel": ["Gooseneck / Fifth Wheel", "Hot Shot", "Flatbed"],
  "Dry Van": ["Dry Van", "Power Only"],
  "Power Only": ["Power Only", "Dry Van", "Reefer"],
  Flatbed: ["Flatbed", "Hot Shot", "Gooseneck / Fifth Wheel"],
  "Car Hauler": ["Car Hauler"],
  Reefer: ["Reefer", "Power Only"],
};

export const DRIVER_PRIVATE_EXTERNAL_LOAD_FIELDS = [
  "rate_available",
  "broker_rate_hidden",
  "fuel_surcharge",
  "accessorials",
  "payment_terms",
  "broker_customer_id",
  "broker_name",
  "contact_name",
  "contact_phone",
  "contact_email",
  "raw_payload_json",
  "internal_notes",
  "customer_private_notes",
  "factoring_risk",
];

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
    rate_hidden_reason: "Broker/source rate, HASTEN margin, factoring details, and private notes are hidden from drivers.",
  };
}

export function getDispatcherExternalLoadView(load) {
  return {
    ...load,
    equipment_type: getLoadEquipment(load),
    rate_available: Number(load?.rate_available || 0),
    broker_rate_hidden: Boolean(load?.broker_rate_hidden),
  };
}

export function buildInternalLoadFromExternalLoad(externalLoad = {}, options = {}) {
  const finalRate = Number(options.finalRate ?? externalLoad.rate_available ?? 0);
  const driverId = options.driver_id || options.driverId || externalLoad.assigned_driver_id || null;
  const sourceLabel = externalLoad.source_provider || "external marketplace";
  const sourceId = externalLoad.external_load_id || externalLoad.id || "external";

  return {
    load_number: options.load_number || `EXT-${String(sourceId).slice(-6).toUpperCase()}`,
    status: options.status || (driverId ? "assigned" : "available"),
    driver_id: driverId,
    origin_city: externalLoad.pickup_city,
    origin_state: externalLoad.pickup_state,
    origin_zip: externalLoad.pickup_zip,
    destination_city: externalLoad.delivery_city,
    destination_state: externalLoad.delivery_state,
    destination_zip: externalLoad.delivery_zip,
    equipment_type: getLoadEquipment(externalLoad),
    commodity: externalLoad.commodity,
    weight: externalLoad.weight,
    miles: externalLoad.miles_total,
    rate: finalRate,
    total_revenue: finalRate,
    rate_per_mile: externalLoad.miles_total > 0 ? finalRate / externalLoad.miles_total : 0,
    broker_id: externalLoad.broker_customer_id,
    is_hazmat: externalLoad.hazmat,
    source_provider: externalLoad.source_provider,
    external_load_id: externalLoad.id,
    external_reference: externalLoad.external_load_id,
    notes: options.notes || `Created from ${sourceLabel} external load ${sourceId}.`,
  };
}

export function buildDriverLoadBidPayload(load, match, overrides = {}) {
  return {
    external_load_id: load?.id,
    driver_id: match?.driver_id,
    status: overrides.status || "pending",
    driver_notes: overrides.driver_notes || "Load offer sent by dispatcher from marketplace.",
    match_score: match?.match_score,
    submitted_at: overrides.submitted_at || new Date().toISOString(),
    ...overrides,
  };
}

export function assertDriverOfferIsRateSafe(offer = {}) {
  return DRIVER_PRIVATE_EXTERNAL_LOAD_FIELDS.every((field) => offer[field] === undefined);
}
