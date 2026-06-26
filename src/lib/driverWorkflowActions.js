import { readDriverEnterpriseStore, writeDriverEnterpriseStore, upsertDriverEnterpriseRecord } from "./driverEnterpriseDataLayer";
import { createDriverDocumentVaultRecord } from "./driverEnterpriseDocumentEngine";

function nowIso() {
  return new Date().toISOString();
}

function audit(action, payload = {}) {
  return {
    id: `audit-driver-action-${action}-${Date.now()}`,
    actor: payload.actor || "driver_workflow_action_engine",
    entity_key: payload.entity_key || "driverWorkflowActions",
    record_id: payload.record_id || payload.load_id || payload.driver_id || "unknown",
    action,
    driver_id: payload.driver_id || null,
    load_id: payload.load_id || null,
    timestamp: nowIso(),
    metadata: payload.metadata || {},
  };
}

function updateNavigationSession(loadId, driverId, patch = {}) {
  const store = readDriverEnterpriseStore();
  const sessions = store.navigationSessions || [];
  const existing = sessions.find((session) => session.load_id === loadId && session.driver_id === driverId);
  const record = {
    ...(existing || {}),
    id: existing?.id || `nav-${driverId}-${loadId}`,
    driver_id: driverId,
    load_id: loadId,
    current_lat: patch.current_lat ?? existing?.current_lat ?? null,
    current_lng: patch.current_lng ?? existing?.current_lng ?? null,
    eta: patch.eta ?? existing?.eta ?? null,
    route_progress_pct: patch.route_progress_pct ?? existing?.route_progress_pct ?? 0,
    status: patch.status || existing?.status || "not_started",
    geofence_events: patch.geofence_event ? [patch.geofence_event, ...(existing?.geofence_events || [])] : (existing?.geofence_events || []),
    updated_at: nowIso(),
  };
  const nextSessions = existing ? sessions.map((session) => session.id === existing.id ? record : session) : [record, ...sessions];
  return writeDriverEnterpriseStore({ ...store, navigationSessions: nextSessions, auditEvents: [audit("navigation_updated", { driver_id: driverId, load_id: loadId }), ...(store.auditEvents || [])] });
}

export function acceptDriverLoad({ driverId, loadId, actor = "driver" }) {
  updateNavigationSession(loadId, driverId, { status: "route_created", route_progress_pct: 5 });
  const store = readDriverEnterpriseStore();
  const message = {
    id: `message-accept-${driverId}-${loadId}-${Date.now()}`,
    thread_id: `thread-${driverId}-${loadId}`,
    load_id: loadId,
    driver_id: driverId,
    sender_role: "driver",
    message_type: "status",
    content: "Driver accepted load.",
    attachments: [],
    read_at: null,
    created_at: nowIso(),
  };
  return writeDriverEnterpriseStore({ ...store, driverMessages: [message, ...(store.driverMessages || [])], auditEvents: [audit("load_accepted", { actor, driver_id: driverId, load_id: loadId }), ...(store.auditEvents || [])] });
}

export function rejectDriverLoad({ driverId, loadId, reason = "Driver rejected load.", actor = "driver" }) {
  const store = readDriverEnterpriseStore();
  const message = {
    id: `message-reject-${driverId}-${loadId}-${Date.now()}`,
    thread_id: `thread-${driverId}-${loadId}`,
    load_id: loadId,
    driver_id: driverId,
    sender_role: "driver",
    message_type: "status",
    content: reason,
    attachments: [],
    read_at: null,
    created_at: nowIso(),
  };
  return writeDriverEnterpriseStore({ ...store, driverMessages: [message, ...(store.driverMessages || [])], auditEvents: [audit("load_rejected", { actor, driver_id: driverId, load_id: loadId, metadata: { reason } }), ...(store.auditEvents || [])] });
}

export function markDriverArrivedPickup({ driverId, loadId, gps = {}, actor = "driver" }) {
  return updateNavigationSession(loadId, driverId, {
    status: "arrived_pickup",
    route_progress_pct: 25,
    current_lat: gps.lat,
    current_lng: gps.lng,
    geofence_event: { type: "arrived_pickup", timestamp: nowIso(), gps },
  });
}

export function completeDriverPickup({ driverId, loadId, actor = "driver" }) {
  return updateNavigationSession(loadId, driverId, { status: "loaded", route_progress_pct: 45 });
}

export function markDriverArrivedDelivery({ driverId, loadId, gps = {}, actor = "driver" }) {
  return updateNavigationSession(loadId, driverId, {
    status: "arrived_delivery",
    route_progress_pct: 85,
    current_lat: gps.lat,
    current_lng: gps.lng,
    geofence_event: { type: "arrived_delivery", timestamp: nowIso(), gps },
  });
}

export function completeDriverDelivery({ driverId, loadId, actor = "driver" }) {
  return updateNavigationSession(loadId, driverId, { status: "completed", route_progress_pct: 100 });
}

export function uploadDriverPod({ driverId, loadId, document = {}, actor = "driver" }) {
  const doc = createDriverDocumentVaultRecord({
    ...document,
    driver_id: driverId,
    load_id: loadId,
    doc_type: "POD",
    ocr_status: document.ocr_status || "needs_review",
    verified: Boolean(document.verified),
  }, actor);
  const store = readDriverEnterpriseStore();
  return writeDriverEnterpriseStore({ ...store, auditEvents: [audit("pod_uploaded", { actor, driver_id: driverId, load_id: loadId, record_id: doc.id }), ...(store.auditEvents || [])] });
}

export function submitDriverDvir({ driverId, truckId, trailerId, inspectionType = "pre_trip", defects = [], photos = [], actor = "driver" }) {
  const hasDefects = defects.length > 0;
  const dvir = {
    id: `dvir-${driverId}-${inspectionType}-${Date.now()}`,
    driver_id: driverId,
    truck_id: truckId || null,
    trailer_id: trailerId || null,
    inspection_type: inspectionType,
    status: hasDefects ? "defect_found" : "pass",
    defects,
    photos,
    signed: true,
    maintenance_hold_required: hasDefects,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  upsertDriverEnterpriseRecord("dvirReports", dvir, actor);
  const store = readDriverEnterpriseStore();
  return writeDriverEnterpriseStore({ ...store, auditEvents: [audit("dvir_submitted", { actor, driver_id: driverId, record_id: dvir.id, metadata: { hasDefects } }), ...(store.auditEvents || [])] });
}

export function acknowledgeDriverMessage({ messageId, actor = "driver" }) {
  const store = readDriverEnterpriseStore();
  const messages = (store.driverMessages || []).map((message) => message.id === messageId ? { ...message, read_at: nowIso(), updated_at: nowIso() } : message);
  return writeDriverEnterpriseStore({ ...store, driverMessages: messages, auditEvents: [audit("message_acknowledged", { actor, record_id: messageId }), ...(store.auditEvents || [])] });
}

export const DRIVER_WORKFLOW_ACTIONS = {
  acceptDriverLoad,
  rejectDriverLoad,
  markDriverArrivedPickup,
  completeDriverPickup,
  markDriverArrivedDelivery,
  completeDriverDelivery,
  uploadDriverPod,
  submitDriverDvir,
  acknowledgeDriverMessage,
};
