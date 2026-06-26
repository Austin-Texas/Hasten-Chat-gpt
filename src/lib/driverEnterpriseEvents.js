import { base44 } from "@/api/base44Client";

export const DRIVER_EVENTS = {
  DRIVER_ASSIGNED_LOAD: "DRIVER_ASSIGNED_LOAD",
  DRIVER_ACCEPTED_LOAD: "DRIVER_ACCEPTED_LOAD",
  DRIVER_REJECTED_LOAD: "DRIVER_REJECTED_LOAD",
  DRIVER_ARRIVED_PICKUP: "DRIVER_ARRIVED_PICKUP",
  DRIVER_LOADED: "DRIVER_LOADED",
  DRIVER_IN_TRANSIT: "DRIVER_IN_TRANSIT",
  DRIVER_ARRIVED_DELIVERY: "DRIVER_ARRIVED_DELIVERY",
  DRIVER_DELIVERED: "DRIVER_DELIVERED",
  DRIVER_POD_UPLOADED: "DRIVER_POD_UPLOADED",
  DRIVER_DELAY_ALERT: "DRIVER_DELAY_ALERT",
  DRIVER_HOS_VIOLATION: "DRIVER_HOS_VIOLATION",
  DRIVER_DOCUMENT_EXPIRING: "DRIVER_DOCUMENT_EXPIRING",
  DRIVER_SETTLEMENT_READY: "DRIVER_SETTLEMENT_READY",
  DRIVER_DVIR_SUBMITTED: "DRIVER_DVIR_SUBMITTED",
  DRIVER_INCIDENT_REPORTED: "DRIVER_INCIDENT_REPORTED",
  DRIVER_COACHING_ASSIGNED: "DRIVER_COACHING_ASSIGNED",
  DRIVER_SECURITY_REVIEW: "DRIVER_SECURITY_REVIEW",
};

export const DRIVER_COMPLIANCE_DOCS = [
  "cdl",
  "medical_card",
  "hazmat",
  "twic",
  "drug_test",
  "clearinghouse",
  "mvr",
  "psp",
  "driver_agreement",
  "w9",
  "insurance",
];

export const DRIVER_WORKFLOWS = {
  pickup: ["assigned", "accepted", "en_route", "arrived_pickup", "loaded"],
  delivery: ["in_transit", "arrived_delivery", "delivered", "pod_uploaded", "completed"],
  dvir: ["pre_trip", "defect_found", "repair_required", "post_trip", "closed"],
  document: ["uploaded", "ocr_processed", "pending_review", "approved", "rejected", "resubmitted"],
  messaging: ["sent", "delivered", "read", "escalated"],
  navigation: ["route_started", "geofence_arrival", "route_deviation", "eta_updated", "route_completed"],
};

function now() { return new Date().toISOString(); }

async function safeCreate(entityName, payload) {
  try { return await base44.entities[entityName].create(payload); }
  catch (error) { console.warn(`[driverEnterpriseEvents] ${entityName}.create skipped`, error?.message || error); return null; }
}

export async function logDriverEvent(eventType, payload = {}) {
  const event = {
    event_type: eventType,
    type: eventType,
    entity_type: payload.entity_type || "Driver",
    entity_id: payload.entity_id || payload.driver_id || payload.load_id,
    driver_id: payload.driver_id,
    load_id: payload.load_id,
    truck_id: payload.truck_id,
    title: payload.title || eventType,
    description: payload.description || payload.title || eventType,
    metadata: JSON.stringify({ ...payload, driver_event: true }),
    created_at: now(),
    created_by: payload.created_by || payload.driver_id || "driver_app",
  };
  await safeCreate("DriverEvent", event);
  await safeCreate("TimelineEvent", event);
  return event;
}

export function buildDriverMasterRecord(driver = {}, user = {}) {
  return {
    driver_id: driver.id,
    user_id: driver.user_id || user.id,
    employee_type: driver.employee_type || (driver.driver_type === "owner_driver" ? "contractor_1099" : "company_driver"),
    contractor_type: driver.contractor_type || (driver.driver_type === "owner_driver" ? "owner_operator" : "company"),
    status: driver.status || "off_duty",
    active_load_id: driver.current_load_id || driver.active_load_id || null,
    home_terminal: driver.home_terminal || "",
    dispatch_group: driver.dispatch_group || "default",
    preferred_routes: driver.preferred_routes || driver.lanes || "",
    current_location: driver.current_location || null,
    duty_status: driver.duty_status || "unknown",
    availability_status: driver.availability || driver.status || "off_duty",
    truck_id: driver.truck_id || null,
    trailer_id: driver.trailer_id || null,
  };
}

export function buildCDLRecord(driver = {}) {
  return {
    driver_id: driver.id,
    license_number: driver.cdl_number || driver.license_number || "",
    issuing_state: driver.cdl_state || driver.license_state || "",
    class: driver.cdl_class || "A",
    endorsements: driver.endorsements || [],
    restrictions: driver.restrictions || "",
    expiration: driver.cdl_expiration || driver.license_expiration || null,
    verification_status: driver.cdl_verification_status || "pending_review",
    mvr_status: driver.mvr_status || "missing",
  };
}

export function buildMedicalCardRecord(driver = {}) {
  return {
    driver_id: driver.id,
    examiner: driver.medical_examiner || "",
    issue_date: driver.medical_card_issue_date || null,
    expiration_date: driver.medical_card_expiration || null,
    restrictions: driver.medical_restrictions || "",
    uploaded_document: driver.medical_card_document_id || driver.medical_card_url || null,
    verification_status: driver.medical_card_status || "pending_review",
  };
}
