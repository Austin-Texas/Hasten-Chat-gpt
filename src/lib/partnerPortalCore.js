export const PARTNER_PORTAL_ROLES = ["broker", "customer", "finance_contact", "operations_contact", "read_only"];

export const PARTNER_EVENTS = [
  "load_submitted",
  "load_accepted",
  "load_assigned",
  "driver_en_route",
  "arrived_pickup",
  "loaded",
  "arrived_delivery",
  "delivered",
  "pod_uploaded",
  "invoice_ready",
  "invoice_due",
  "detention_added",
  "shipment_exception",
];

function nowIso() {
  return new Date().toISOString();
}

export function getPartnerPermissions(role = "broker") {
  const base = {
    can_view_dashboard: true,
    can_track_loads: true,
    can_view_documents: true,
    can_view_invoices: false,
    can_submit_loads: false,
    can_dispute_invoice: false,
    can_upload_rate_confirmation: false,
    can_view_payment_status: false,
  };
  const matrix = {
    broker: {
      can_submit_loads: true,
      can_view_invoices: true,
      can_dispute_invoice: true,
      can_upload_rate_confirmation: true,
      can_view_payment_status: true,
    },
    customer: {
      can_submit_loads: true,
      can_view_invoices: true,
      can_dispute_invoice: true,
      can_view_payment_status: true,
    },
    finance_contact: {
      can_view_invoices: true,
      can_dispute_invoice: true,
      can_view_payment_status: true,
    },
    operations_contact: {
      can_submit_loads: true,
      can_upload_rate_confirmation: true,
    },
    read_only: {},
  };
  return { ...base, ...(matrix[role] || {}) };
}

export function buildPartnerNotification({ partnerId = null, loadId = null, eventType = "shipment_update", message = "Shipment update available.", severity = "info" } = {}) {
  return {
    id: `partner-note-${eventType}-${loadId || "general"}-${Date.now()}`,
    partner_id: partnerId,
    load_id: loadId,
    event_type: eventType,
    title: eventType.replaceAll("_", " "),
    message,
    severity,
    channel: "portal",
    read_at: null,
    created_at: nowIso(),
  };
}

export function buildPartnerTimeline(load = {}) {
  const status = load.status || "available";
  return [
    { key: "load_submitted", label: "Submitted", complete: true },
    { key: "load_accepted", label: "Accepted", complete: Boolean(load.id) },
    { key: "load_assigned", label: "Assigned", complete: Boolean(load.driver_id) },
    { key: "driver_en_route", label: "En Route", complete: ["accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery", "delivered", "completed"].includes(status) },
    { key: "arrived_pickup", label: "Pickup", complete: ["arrived_pickup", "loaded", "in_transit", "arrived_delivery", "delivered", "completed"].includes(status) },
    { key: "loaded", label: "Loaded", complete: ["loaded", "in_transit", "arrived_delivery", "delivered", "completed"].includes(status) },
    { key: "delivered", label: "Delivered", complete: ["delivered", "completed"].includes(status) },
    { key: "pod_uploaded", label: "POD", complete: Boolean(load.pod_uploaded || load.pod_document_id) },
    { key: "invoice_ready", label: "Invoice", complete: Boolean(load.invoice_id || load.invoice_status) },
  ];
}
