const STORE_KEY = "hasten_partner_portal_store_v1";

function nowIso() {
  return new Date().toISOString();
}

function emptyStore() {
  return { loadRequests: [], documentRequests: [], invoiceDisputes: [], notifications: [], auditEvents: [] };
}

export function readPartnerPortalStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || emptyStore();
  } catch {
    return emptyStore();
  }
}

function writePartnerPortalStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("hasten_partner_portal_changed", { detail: store }));
  return store;
}

function audit(action, payload = {}) {
  return {
    id: `partner-audit-${action}-${Date.now()}`,
    action,
    partner_id: payload.partner_id || null,
    load_id: payload.load_id || null,
    record_id: payload.record_id || null,
    created_at: nowIso(),
    metadata: payload.metadata || {},
  };
}

export function submitPartnerLoadRequest(input = {}) {
  const store = readPartnerPortalStore();
  const request = {
    id: `partner-load-request-${Date.now()}`,
    partner_id: input.partner_id || null,
    origin: input.origin || "",
    destination: input.destination || "",
    equipment_type: input.equipment_type || "dry_van",
    commodity: input.commodity || "",
    weight: input.weight || null,
    rate: input.rate || null,
    pickup_window: input.pickup_window || null,
    delivery_window: input.delivery_window || null,
    notes: input.notes || "",
    status: "submitted",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  return writePartnerPortalStore({
    ...store,
    loadRequests: [request, ...(store.loadRequests || [])],
    auditEvents: [audit("load_request_submitted", { partner_id: request.partner_id, record_id: request.id }), ...(store.auditEvents || [])],
  });
}

export function requestPartnerDocument(input = {}) {
  const store = readPartnerPortalStore();
  const request = {
    id: `partner-document-request-${Date.now()}`,
    partner_id: input.partner_id || null,
    load_id: input.load_id || null,
    document_type: input.document_type || "POD",
    status: "requested",
    created_at: nowIso(),
  };
  return writePartnerPortalStore({
    ...store,
    documentRequests: [request, ...(store.documentRequests || [])],
    auditEvents: [audit("document_requested", { partner_id: request.partner_id, load_id: request.load_id, record_id: request.id }), ...(store.auditEvents || [])],
  });
}

export function openPartnerInvoiceDispute(input = {}) {
  const store = readPartnerPortalStore();
  const dispute = {
    id: `partner-invoice-dispute-${Date.now()}`,
    partner_id: input.partner_id || null,
    invoice_id: input.invoice_id || null,
    load_id: input.load_id || null,
    reason: input.reason || "Invoice review requested.",
    status: "open",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  return writePartnerPortalStore({
    ...store,
    invoiceDisputes: [dispute, ...(store.invoiceDisputes || [])],
    auditEvents: [audit("invoice_dispute_opened", { partner_id: dispute.partner_id, load_id: dispute.load_id, record_id: dispute.id }), ...(store.auditEvents || [])],
  });
}

export function queuePartnerNotification(input = {}) {
  const store = readPartnerPortalStore();
  const notification = {
    id: `partner-queued-note-${Date.now()}`,
    partner_id: input.partner_id || null,
    load_id: input.load_id || null,
    title: input.title || "Portal update",
    message: input.message || "New update available.",
    severity: input.severity || "info",
    channel: input.channel || "portal",
    read_at: null,
    created_at: nowIso(),
  };
  return writePartnerPortalStore({
    ...store,
    notifications: [notification, ...(store.notifications || [])],
    auditEvents: [audit("notification_queued", { partner_id: notification.partner_id, load_id: notification.load_id, record_id: notification.id }), ...(store.auditEvents || [])],
  });
}

export function getPartnerPortalActionSummary() {
  const store = readPartnerPortalStore();
  return {
    load_requests: (store.loadRequests || []).length,
    document_requests: (store.documentRequests || []).length,
    open_disputes: (store.invoiceDisputes || []).filter((item) => item.status !== "closed").length,
    notifications: (store.notifications || []).length,
    audit_events: (store.auditEvents || []).length,
  };
}
