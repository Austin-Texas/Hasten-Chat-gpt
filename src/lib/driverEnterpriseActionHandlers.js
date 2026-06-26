import { createDriverDocumentVaultRecord } from "./driverEnterpriseDocumentEngine";
import { createDriverTelemetryEvent } from "./driverEnterpriseSafetyEngine";
import { readDriverEnterpriseStore, upsertDriverEnterpriseRecord, writeDriverEnterpriseStore } from "./driverEnterpriseDataLayer";

function nowIso() {
  return new Date().toISOString();
}

function audit(action, payload = {}) {
  const store = readDriverEnterpriseStore();
  const event = {
    id: `audit-driver-action-${Date.now()}`,
    actor: payload.actor || "driver_action_handler",
    entity_key: payload.entity_key || "driverWorkflowAction",
    record_id: payload.record_id || payload.load_id || payload.driver_id || "unknown",
    action,
    timestamp: nowIso(),
    payload,
  };
  return writeDriverEnterpriseStore({ ...store, auditEvents: [event, ...(store.auditEvents || [])] });
}

function setNavigationStatus(driverId, loadId, status, progress) {
  const store = readDriverEnterpriseStore();
  const id = `nav-${loadId || driverId}`;
  const existing = (store.navigationSessions || []).find((row) => row.id === id || row.load_id === loadId);
  upsertDriverEnterpriseRecord("navigationSessions", {
    ...(existing || {}),
    id: existing?.id || id,
    driver_id: driverId,
    load_id: loadId,
    status,
    route_progress_pct: progress,
    updated_at: nowIso(),
  }, "driver_action_handler");
}

export function acceptDriverLoad({ driverId, loadId, actor = "driver" }) {
  setNavigationStatus(driverId, loadId, "route_created", 5);
  return audit("load_accepted", { driver_id: driverId, load_id: loadId, actor });
}

export function rejectDriverLoad({ driverId, loadId, reason = "driver_rejected", actor = "driver" }) {
  return audit("load_rejected", { driver_id: driverId, load_id: loadId, reason, actor });
}

export function markArrivedPickup({ driverId, loadId, gpsLocation, actor = "driver" }) {
  setNavigationStatus(driverId, loadId, "arrived_pickup", 25);
  if (gpsLocation) createDriverTelemetryEvent({ driver_id: driverId, load_id: loadId, event_type: "pickup_geofence", gps_location: gpsLocation, severity: "low" }, actor);
  return audit("arrived_pickup", { driver_id: driverId, load_id: loadId, gps_location: gpsLocation, actor });
}

export function completePickup({ driverId, loadId, bolDocument, actor = "driver" }) {
  setNavigationStatus(driverId, loadId, "active", 45);
  if (bolDocument) createDriverDocumentVaultRecord({ ...bolDocument, driver_id: driverId, load_id: loadId, doc_type: "BOL", ocr_status: "uploaded" }, actor);
  return audit("pickup_completed", { driver_id: driverId, load_id: loadId, bol_uploaded: Boolean(bolDocument), actor });
}

export function markArrivedDelivery({ driverId, loadId, gpsLocation, actor = "driver" }) {
  setNavigationStatus(driverId, loadId, "arrived_delivery", 85);
  if (gpsLocation) createDriverTelemetryEvent({ driver_id: driverId, load_id: loadId, event_type: "delivery_geofence", gps_location: gpsLocation, severity: "low" }, actor);
  return audit("arrived_delivery", { driver_id: driverId, load_id: loadId, gps_location: gpsLocation, actor });
}

export function completeDelivery({ driverId, loadId, actor = "driver" }) {
  setNavigationStatus(driverId, loadId, "completed", 100);
  return audit("delivery_completed", { driver_id: driverId, load_id: loadId, actor });
}

export function uploadDriverPOD({ driverId, loadId, document = {}, actor = "driver" }) {
  const pod = createDriverDocumentVaultRecord({ ...document, driver_id: driverId, load_id: loadId, doc_type: "POD", ocr_status: "uploaded" }, actor);
  setNavigationStatus(driverId, loadId, "completed", 100);
  return audit("pod_uploaded", { driver_id: driverId, load_id: loadId, document_id: pod.id, actor });
}

export function submitDriverDVIR({ driverId, truckId, trailerId, inspectionType = "pre_trip", defects = [], actor = "driver" }) {
  const hasDefects = defects.length > 0;
  const report = {
    id: `dvir-${driverId}-${Date.now()}`,
    driver_id: driverId,
    truck_id: truckId,
    trailer_id: trailerId,
    inspection_type: inspectionType,
    status: hasDefects ? "defect_found" : "pass",
    defects,
    photos: [],
    signed: true,
    maintenance_hold_required: hasDefects,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  upsertDriverEnterpriseRecord("dvirReports", report, actor);
  return audit("dvir_submitted", { driver_id: driverId, truck_id: truckId, trailer_id: trailerId, defects: defects.length, actor });
}

export function acknowledgeDriverMessage({ driverId, messageId, actor = "driver" }) {
  const store = readDriverEnterpriseStore();
  const messages = (store.driverMessages || []).map((message) => message.id === messageId ? { ...message, read_at: nowIso() } : message);
  writeDriverEnterpriseStore({ ...store, driverMessages: messages });
  return audit("driver_message_acknowledged", { driver_id: driverId, message_id: messageId, actor });
}

export const DRIVER_ACTION_HANDLER_MAP = {
  acceptDriverLoad,
  rejectDriverLoad,
  markArrivedPickup,
  completePickup,
  markArrivedDelivery,
  completeDelivery,
  uploadDriverPOD,
  submitDriverDVIR,
  acknowledgeDriverMessage,
};
