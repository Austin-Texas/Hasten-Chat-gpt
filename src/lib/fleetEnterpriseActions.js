const FLEET_STORE_KEY = "hasten_fleet_enterprise_store_v1";

function nowIso() {
  return new Date().toISOString();
}

function emptyStore() {
  return { workOrders: [], breakdowns: [], documents: [], partsUsage: [], vendorJobs: [], auditEvents: [] };
}

export function readFleetEnterpriseStore() {
  try {
    return JSON.parse(localStorage.getItem(FLEET_STORE_KEY)) || emptyStore();
  } catch {
    return emptyStore();
  }
}

function writeFleetEnterpriseStore(store) {
  localStorage.setItem(FLEET_STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("hasten_fleet_enterprise_changed", { detail: store }));
  return store;
}

function audit(action, payload = {}) {
  return {
    id: `fleet-audit-${action}-${Date.now()}`,
    action,
    actor: payload.actor || "fleet_enterprise_actions",
    asset_id: payload.asset_id || null,
    record_id: payload.record_id || null,
    created_at: nowIso(),
    metadata: payload.metadata || {},
  };
}

export function createFleetWorkOrder({ assetId, issueType = "preventive_maintenance", priority = "medium", description = "Fleet work order", vendorId = null, mechanicId = null }) {
  const store = readFleetEnterpriseStore();
  const workOrder = {
    id: `fleet-wo-${assetId}-${Date.now()}`,
    work_order_number: `WO-${Date.now()}`,
    asset_id: assetId,
    issue_type: issueType,
    priority,
    description,
    status: "open",
    vendor_id: vendorId,
    mechanic_id: mechanicId,
    labor_cost: 0,
    parts_cost: 0,
    total_cost: 0,
    opened_at: nowIso(),
    closed_at: null,
    updated_at: nowIso(),
  };
  return writeFleetEnterpriseStore({
    ...store,
    workOrders: [workOrder, ...(store.workOrders || [])],
    auditEvents: [audit("work_order_created", { asset_id: assetId, record_id: workOrder.id, metadata: { issueType, priority } }), ...(store.auditEvents || [])],
  });
}

export function reportFleetBreakdown({ assetId, severity = "major", location = "unknown", description = "Breakdown reported" }) {
  const store = readFleetEnterpriseStore();
  const breakdown = {
    id: `fleet-breakdown-${assetId}-${Date.now()}`,
    asset_id: assetId,
    severity,
    location,
    description,
    status: "open",
    tow_required: ["major", "critical"].includes(severity),
    created_at: nowIso(),
    resolved_at: null,
  };
  const workOrder = {
    id: `fleet-wo-breakdown-${assetId}-${Date.now()}`,
    work_order_number: `WO-BD-${Date.now()}`,
    asset_id: assetId,
    issue_type: "breakdown",
    priority: severity === "critical" ? "critical" : "high",
    description,
    status: "open",
    vendor_id: null,
    mechanic_id: null,
    labor_cost: 0,
    parts_cost: 0,
    total_cost: 0,
    opened_at: nowIso(),
    closed_at: null,
    updated_at: nowIso(),
  };
  return writeFleetEnterpriseStore({
    ...store,
    breakdowns: [breakdown, ...(store.breakdowns || [])],
    workOrders: [workOrder, ...(store.workOrders || [])],
    auditEvents: [audit("breakdown_reported", { asset_id: assetId, record_id: breakdown.id, metadata: { severity, location } }), ...(store.auditEvents || [])],
  });
}

export function closeFleetWorkOrder(workOrderId, costs = {}) {
  const store = readFleetEnterpriseStore();
  const workOrders = (store.workOrders || []).map((wo) => wo.id === workOrderId ? {
    ...wo,
    status: "closed",
    labor_cost: Number(costs.labor_cost || wo.labor_cost || 0),
    parts_cost: Number(costs.parts_cost || wo.parts_cost || 0),
    total_cost: Number(costs.total_cost || costs.labor_cost || 0) + Number(costs.parts_cost || 0),
    closed_at: nowIso(),
    updated_at: nowIso(),
  } : wo);
  return writeFleetEnterpriseStore({
    ...store,
    workOrders,
    auditEvents: [audit("work_order_closed", { record_id: workOrderId }), ...(store.auditEvents || [])],
  });
}

export function addFleetDocument({ assetId, docType = "registration", storageUrl = "", expirationDate = null, ocrData = {} }) {
  const store = readFleetEnterpriseStore();
  const document = {
    id: `fleet-doc-${assetId}-${docType}-${Date.now()}`,
    asset_id: assetId,
    doc_type: docType,
    storage_url: storageUrl,
    expiration_date: expirationDate,
    ocr_data: ocrData,
    status: expirationDate && new Date(expirationDate) < new Date() ? "expired" : "active",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  return writeFleetEnterpriseStore({
    ...store,
    documents: [document, ...(store.documents || [])],
    auditEvents: [audit("document_added", { asset_id: assetId, record_id: document.id, metadata: { docType } }), ...(store.auditEvents || [])],
  });
}

export function getFleetEnterpriseActionSummary() {
  const store = readFleetEnterpriseStore();
  return {
    open_work_orders: (store.workOrders || []).filter((item) => item.status !== "closed").length,
    closed_work_orders: (store.workOrders || []).filter((item) => item.status === "closed").length,
    open_breakdowns: (store.breakdowns || []).filter((item) => item.status !== "resolved").length,
    documents: (store.documents || []).length,
    audit_events: (store.auditEvents || []).length,
  };
}
