import {
  assertDriverOfferIsRateSafe,
  buildInternalLoadFromExternalLoad,
  computeDriverLoadMatch,
  getDriverSafeOffer,
  matchExternalLoadsToDrivers,
} from "../src/lib/equipmentMatching.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sprinterDriver = {
  id: "driver-sprinter",
  full_name: "Sprinter Driver",
  vehicle_type: "Sprinter",
  max_payload: 3000,
  availability: "available",
  compliance_status: "valid",
};

const hotShotDriver = {
  id: "driver-hotshot",
  full_name: "Hot Shot Driver",
  vehicle_type: "Hot Shot",
  max_payload: 12000,
  availability: "available",
  compliance_status: "valid",
};

const externalLoad = {
  id: "external-001",
  source_provider: "DAT Sandbox",
  external_load_id: "DAT-SPR-001",
  broker_customer_id: "broker-001",
  broker_name: "Private Broker Name",
  pickup_city: "Fayetteville",
  pickup_state: "NC",
  pickup_zip: "28301",
  delivery_city: "Raleigh",
  delivery_state: "NC",
  delivery_zip: "27601",
  required_equipment: "Sprinter",
  weight: 1800,
  miles_total: 68,
  rate_available: 650,
  payment_terms: "Net 30",
  contact_phone: "555-555-5555",
  raw_payload_json: { brokerRate: 650 },
};

const sprinterMatch = computeDriverLoadMatch(sprinterDriver, externalLoad);
const hotShotMatch = computeDriverLoadMatch(hotShotDriver, externalLoad);
const matches = matchExternalLoadsToDrivers(externalLoad, [sprinterDriver, hotShotDriver]);
const safeOffer = getDriverSafeOffer(externalLoad);
const internalLoad = buildInternalLoadFromExternalLoad(externalLoad, {
  driver_id: sprinterDriver.id,
  status: "assigned",
  finalRate: externalLoad.rate_available,
});

assert(sprinterMatch, "Sprinter driver should match Sprinter load.");
assert(!hotShotMatch, "Hot Shot driver must not match Sprinter-only load.");
assert(matches.length === 1 && matches[0].driver_id === sprinterDriver.id, "Only matching driver should be returned.");
assert(assertDriverOfferIsRateSafe(safeOffer), "Driver-safe offer leaked private broker/source fields.");
assert(safeOffer.broker_rate_hidden === true, "Driver-safe offer must explicitly mark broker rate hidden.");
assert(internalLoad.status === "assigned", "Internal load conversion should preserve assigned status.");
assert(internalLoad.driver_id === sprinterDriver.id, "Internal load conversion should assign selected driver.");
assert(internalLoad.total_revenue === 650, "Dispatcher/internal conversion should preserve full source rate internally.");
assert(internalLoad.origin_city === "Fayetteville" && internalLoad.destination_city === "Raleigh", "Route fields should normalize correctly.");

console.log("PASS external load workflow verification");
console.log(JSON.stringify({
  matches: matches.length,
  safeOfferKeys: Object.keys(safeOffer).sort(),
  internalLoad: {
    load_number: internalLoad.load_number,
    status: internalLoad.status,
    driver_id: internalLoad.driver_id,
    total_revenue: internalLoad.total_revenue,
  },
}, null, 2));
