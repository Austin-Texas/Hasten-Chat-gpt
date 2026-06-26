import { readDriverEnterpriseStore, writeDriverEnterpriseStore } from "./driverEnterpriseDataLayer";

function nowIso() {
  return new Date().toISOString();
}

function makeId(type, driverId) {
  return `driver-request-${type}-${driverId || "driver"}-${Date.now()}`;
}

function writeRequest(record, actor = "driver_self_service") {
  const store = readDriverEnterpriseStore();
  const requests = [record, ...(store.driverServiceRequests || [])];
  const auditEvent = {
    id: `audit-driver-request-${Date.now()}`,
    actor,
    entity_key: "driverServiceRequests",
    record_id: record.id,
    action: `${record.request_type}_created`,
    driver_id: record.driver_id,
    timestamp: nowIso(),
  };
  return writeDriverEnterpriseStore({ ...store, driverServiceRequests: requests, auditEvents: [auditEvent, ...(store.auditEvents || [])] });
}

export function requestDriverHomeTime({ driverId, startDate, endDate, location = "", note = "" }) {
  return writeRequest({
    id: makeId("home_time", driverId),
    driver_id: driverId,
    request_type: "home_time",
    status: "submitted",
    priority: "normal",
    start_date: startDate || null,
    end_date: endDate || null,
    location,
    note,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}

export function disputeDriverSettlement({ driverId, settlementId, reason = "Settlement dispute submitted by driver.", amountDisputed = 0 }) {
  return writeRequest({
    id: makeId("settlement_dispute", driverId),
    driver_id: driverId,
    settlement_id: settlementId || null,
    request_type: "settlement_dispute",
    status: "submitted",
    priority: "high",
    reason,
    amount_disputed: Number(amountDisputed || 0),
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}

export function requestDocumentReview({ driverId, documentId, reason = "Document review requested by driver." }) {
  return writeRequest({
    id: makeId("document_review", driverId),
    driver_id: driverId,
    document_id: documentId || null,
    request_type: "document_review",
    status: "submitted",
    priority: "normal",
    reason,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}

export function messageDispatcherRequest({ driverId, loadId, subject = "Driver support request", message = "" }) {
  return writeRequest({
    id: makeId("dispatcher_message", driverId),
    driver_id: driverId,
    load_id: loadId || null,
    request_type: "dispatcher_message",
    status: "submitted",
    priority: "normal",
    subject,
    message,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}

export function getDriverSelfServiceActionSummary(driverId, store = readDriverEnterpriseStore()) {
  const requests = (store.driverServiceRequests || []).filter((row) => row.driver_id === driverId);
  return {
    driver_id: driverId,
    requests,
    open_count: requests.filter((row) => ["submitted", "in_review"].includes(row.status)).length,
    home_time_count: requests.filter((row) => row.request_type === "home_time").length,
    dispute_count: requests.filter((row) => row.request_type === "settlement_dispute").length,
    document_review_count: requests.filter((row) => row.request_type === "document_review").length,
  };
}
