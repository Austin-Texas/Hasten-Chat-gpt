import {
  DRIVER_WORKFLOW_DEFINITIONS,
  readDriverEnterpriseStore,
  writeDriverEnterpriseStore,
  upsertDriverEnterpriseRecord,
} from "./driverEnterpriseDataLayer";

export const DRIVER_WORKFLOW_EVENT_TYPES = {
  LOAD_ACCEPTED: "load_accepted",
  ARRIVED_PICKUP: "arrived_pickup",
  LOADED: "loaded",
  ARRIVED_DELIVERY: "arrived_delivery",
  DELIVERED: "delivered",
  POD_UPLOADED: "pod_uploaded",
  DVIR_DEFECT_FOUND: "dvir_defect_found",
  DVIR_CLEARED: "dvir_cleared",
  DOCUMENT_APPROVED: "document_approved",
  DOCUMENT_REJECTED: "document_rejected",
  MESSAGE_ESCALATED: "message_escalated",
  GEOFENCE_ARRIVAL: "geofence_arrival",
  SETTLEMENT_APPROVED: "settlement_approved",
};

export const DRIVER_WORKFLOW_AUTOMATIONS = [
  {
    id: "pickup-arrival-geofence",
    workflow: "pickup",
    trigger: "driver enters pickup geofence",
    action: "set load workflow state to arrived_pickup and create timeline event",
    event_type: DRIVER_WORKFLOW_EVENT_TYPES.ARRIVED_PICKUP,
  },
  {
    id: "delivery-arrival-geofence",
    workflow: "delivery",
    trigger: "driver enters delivery geofence",
    action: "set load workflow state to arrived_delivery and notify dispatcher",
    event_type: DRIVER_WORKFLOW_EVENT_TYPES.ARRIVED_DELIVERY,
  },
  {
    id: "pod-required-after-delivery",
    workflow: "document",
    trigger: "load state delivered without POD",
    action: "create POD missing alert and keep settlement blocked",
    event_type: DRIVER_WORKFLOW_EVENT_TYPES.DELIVERED,
  },
  {
    id: "dvir-defect-maintenance-hold",
    workflow: "dvir",
    trigger: "driver submits DVIR with defect_found",
    action: "place asset and driver on maintenance hold until cleared",
    event_type: DRIVER_WORKFLOW_EVENT_TYPES.DVIR_DEFECT_FOUND,
  },
  {
    id: "settlement-ready-after-pod",
    workflow: "settlement",
    trigger: "POD approved and load delivered",
    action: "create settlement draft / ready_for_review",
    event_type: DRIVER_WORKFLOW_EVENT_TYPES.POD_UPLOADED,
  },
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeState(value = "") {
  return String(value || "").toLowerCase().trim().replaceAll(" ", "_").replaceAll("-", "_");
}

function getWorkflowSteps(workflowName) {
  return DRIVER_WORKFLOW_DEFINITIONS[workflowName] || [];
}

export function getDriverWorkflowState(workflowName, currentState) {
  const steps = getWorkflowSteps(workflowName);
  const normalized = normalizeState(currentState || steps[0]);
  const index = Math.max(0, steps.indexOf(normalized));
  return {
    workflow: workflowName,
    current_state: steps[index] || normalized,
    current_index: index,
    steps,
    progress_pct: steps.length <= 1 ? 0 : Math.round((index / (steps.length - 1)) * 100),
    is_complete: index === steps.length - 1,
    next_state: steps[index + 1] || null,
    previous_state: steps[index - 1] || null,
  };
}

export function isValidDriverWorkflowTransition(workflowName, fromState, toState) {
  const steps = getWorkflowSteps(workflowName);
  const from = normalizeState(fromState || steps[0]);
  const to = normalizeState(toState);
  const fromIndex = steps.indexOf(from);
  const toIndex = steps.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex || toIndex === fromIndex + 1;
}

export function getNextDriverWorkflowState(workflowName, currentState) {
  return getDriverWorkflowState(workflowName, currentState).next_state;
}

export function advanceDriverWorkflowState(workflowName, currentState) {
  const state = getDriverWorkflowState(workflowName, currentState);
  return state.next_state || state.current_state;
}

export function buildDriverWorkflowTimelineEvent({ workflowName, entityId, driverId, loadId, fromState, toState, actor = "system", note = "" }) {
  return {
    id: `workflow-event-${workflowName}-${entityId}-${Date.now()}`,
    workflow: workflowName,
    entity_id: entityId,
    driver_id: driverId || null,
    load_id: loadId || null,
    from_state: normalizeState(fromState),
    to_state: normalizeState(toState),
    actor,
    note,
    timestamp: nowIso(),
  };
}

export function transitionDriverWorkflow({ workflowName, entityKey, entityId, toState, actor = "system", note = "" }) {
  const store = readDriverEnterpriseStore();
  const rows = Array.isArray(store[entityKey]) ? store[entityKey] : [];
  const index = rows.findIndex((row) => row.id === entityId);
  if (index === -1) throw new Error(`Workflow entity not found: ${entityKey}/${entityId}`);

  const entity = rows[index];
  const fromState = normalizeState(entity.workflow_state || entity.status || DRIVER_WORKFLOW_DEFINITIONS[workflowName]?.[0]);
  const normalizedTo = normalizeState(toState);
  if (!isValidDriverWorkflowTransition(workflowName, fromState, normalizedTo)) {
    throw new Error(`Invalid ${workflowName} transition: ${fromState} → ${normalizedTo}`);
  }

  const timelineEvent = buildDriverWorkflowTimelineEvent({
    workflowName,
    entityId,
    driverId: entity.driver_id,
    loadId: entity.load_id,
    fromState,
    toState: normalizedTo,
    actor,
    note,
  });

  const updated = {
    ...entity,
    status: normalizedTo,
    workflow_state: normalizedTo,
    workflow_progress_pct: getDriverWorkflowState(workflowName, normalizedTo).progress_pct,
    workflow_completed: getDriverWorkflowState(workflowName, normalizedTo).is_complete,
    workflow_timeline: [timelineEvent, ...(entity.workflow_timeline || [])],
    updated_at: nowIso(),
  };

  const nextRows = rows.map((row, rowIndex) => (rowIndex === index ? updated : row));
  const auditEvent = {
    id: `audit-workflow-${Date.now()}`,
    actor,
    entity_key: entityKey,
    record_id: entityId,
    action: `${workflowName}_transition`,
    from_state: fromState,
    to_state: normalizedTo,
    timestamp: nowIso(),
  };

  return writeDriverEnterpriseStore({
    ...store,
    [entityKey]: nextRows,
    auditEvents: [auditEvent, ...(store.auditEvents || [])],
  });
}

export function createDriverWorkflowRecord(entityKey, payload = {}, actor = "workflow_engine") {
  const workflowName = payload.workflow_name || payload.workflow || "document";
  const firstState = DRIVER_WORKFLOW_DEFINITIONS[workflowName]?.[0] || payload.status || "draft";
  const record = {
    ...payload,
    workflow_name: workflowName,
    workflow_state: payload.workflow_state || payload.status || firstState,
    workflow_progress_pct: getDriverWorkflowState(workflowName, payload.workflow_state || payload.status || firstState).progress_pct,
    workflow_completed: false,
  };
  return upsertDriverEnterpriseRecord(entityKey, record, actor);
}

export function getDriverWorkflowDashboard(store = readDriverEnterpriseStore()) {
  const rows = [
    ...Object.entries(DRIVER_WORKFLOW_DEFINITIONS).map(([workflow, steps]) => ({
      workflow,
      steps,
      automations: DRIVER_WORKFLOW_AUTOMATIONS.filter((automation) => automation.workflow === workflow),
    })),
  ];

  const counts = {
    dvir_defects: (store.dvirReports || []).filter((row) => row.status === "defect_found" || row.maintenance_hold_required).length,
    documents_needing_review: (store.driverDocuments || []).filter((row) => ["queued", "ocr_processing", "needs_review", "rejected"].includes(row.ocr_status)).length,
    settlement_ready: (store.settlementStatements || []).filter((row) => ["ready_for_review", "approved"].includes(row.status)).length,
    active_navigation: (store.navigationSessions || []).filter((row) => ["active", "arrived_geofence"].includes(row.status)).length,
    unread_messages: (store.driverMessages || []).filter((row) => !row.read_at).length,
  };

  return { workflows: rows, counts, automations: DRIVER_WORKFLOW_AUTOMATIONS };
}
