const DISPATCH_STORE_KEY = "hasten_dispatcher_enterprise_store_v1";

function nowIso() {
  return new Date().toISOString();
}

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(DISPATCH_STORE_KEY)) || { assignments: [], exceptions: [], timelineEvents: [], brokerUpdates: [], auditEvents: [] };
  } catch {
    return { assignments: [], exceptions: [], timelineEvents: [], brokerUpdates: [], auditEvents: [] };
  }
}

function writeStore(store) {
  localStorage.setItem(DISPATCH_STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("hasten_dispatcher_enterprise_changed", { detail: store }));
  return store;
}

function audit(action, payload = {}) {
  return {
    id: `dispatch-audit-${action}-${Date.now()}`,
    action,
    actor: payload.actor || "dispatcher_enterprise_actions",
    load_id: payload.load_id || null,
    driver_id: payload.driver_id || null,
    created_at: nowIso(),
    metadata: payload.metadata || {},
  };
}

export function createDispatchAssignment({ loadId, driverId, dispatcherId = "dispatcher", score = null, reasons = [] }) {
  const store = readStore();
  const assignment = {
    id: `dispatch-assignment-${loadId}-${driverId}`,
    load_id: loadId,
    driver_id: driverId,
    dispatcher_id: dispatcherId,
    status: "assigned",
    match_score: score,
    match_reasons: reasons,
    assigned_at: nowIso(),
    accepted_at: null,
    rejected_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const timeline = {
    id: `dispatch-timeline-assigned-${loadId}-${Date.now()}`,
    load_id: loadId,
    event_type: "driver_assigned",
    actor: dispatcherId,
    message: `Load assigned to driver ${driverId}.`,
    timestamp: nowIso(),
  };
  return writeStore({
    ...store,
    assignments: [assignment, ...(store.assignments || []).filter((item) => item.id !== assignment.id)],
    timelineEvents: [timeline, ...(store.timelineEvents || [])],
    auditEvents: [audit("assignment_created", { load_id: loadId, driver_id: driverId }), ...(store.auditEvents || [])],
  });
}

export function resolveDispatchException(exceptionId, note = "Resolved", actor = "dispatcher") {
  const store = readStore();
  return writeStore({
    ...store,
    exceptions: (store.exceptions || []).map((item) => item.id === exceptionId ? { ...item, status: "resolved", resolved_at: nowIso(), resolution_note: note } : item),
    auditEvents: [audit("exception_resolved", { actor, metadata: { exceptionId, note } }), ...(store.auditEvents || [])],
  });
}

export function logBrokerUpdate({ loadId, message, brokerId = null, actor = "dispatcher" }) {
  const store = readStore();
  const update = {
    id: `broker-update-log-${loadId}-${Date.now()}`,
    load_id: loadId,
    broker_id: brokerId,
    message,
    actor,
    created_at: nowIso(),
  };
  const timeline = {
    id: `dispatch-timeline-broker-${loadId}-${Date.now()}`,
    load_id: loadId,
    event_type: "broker_update_sent",
    actor,
    message,
    timestamp: nowIso(),
  };
  return writeStore({
    ...store,
    brokerUpdates: [update, ...(store.brokerUpdates || [])],
    timelineEvents: [timeline, ...(store.timelineEvents || [])],
    auditEvents: [audit("broker_update_logged", { actor, load_id: loadId, metadata: { brokerId } }), ...(store.auditEvents || [])],
  });
}

export function createDispatchException({ loadId, driverId = null, type, severity = "medium", message }) {
  const store = readStore();
  const exception = {
    id: `dispatch-exception-${type}-${loadId || driverId}-${Date.now()}`,
    load_id: loadId,
    driver_id: driverId,
    type,
    severity,
    message,
    status: "open",
    created_at: nowIso(),
    resolved_at: null,
  };
  return writeStore({
    ...store,
    exceptions: [exception, ...(store.exceptions || [])],
    auditEvents: [audit("exception_created", { load_id: loadId, driver_id: driverId, metadata: { type, severity } }), ...(store.auditEvents || [])],
  });
}

export function readDispatcherEnterpriseStore() {
  return readStore();
}

export function getDispatcherActionSummary() {
  const store = readStore();
  return {
    assignments: (store.assignments || []).length,
    open_exceptions: (store.exceptions || []).filter((item) => item.status !== "resolved").length,
    broker_updates: (store.brokerUpdates || []).length,
    timeline_events: (store.timelineEvents || []).length,
    audit_events: (store.auditEvents || []).length,
  };
}
