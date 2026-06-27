import { buildPartnerNotification, buildPartnerTimeline, getPartnerPermissions } from "./partnerPortalCore";

function isPartnerLoad(load = {}, partnerId) {
  if (!partnerId) return true;
  return load.broker_id === partnerId || load.client_id === partnerId || load.partner_id === partnerId;
}

function isPartnerInvoice(invoice = {}, partnerId) {
  if (!partnerId) return true;
  return invoice.broker_id === partnerId || invoice.client_id === partnerId || invoice.partner_id === partnerId;
}

export function buildPartnerDocumentAccess(load = {}, documents = []) {
  const visibleTypes = ["rate_confirmation", "rc", "bol", "pod", "invoice", "detention", "lumper", "delivery_receipt"];
  return documents
    .filter((doc) => doc.load_id === load.id || doc.entity_id === load.id)
    .filter((doc) => visibleTypes.includes(String(doc.document_type || doc.doc_type || "").toLowerCase()))
    .map((doc) => ({
      id: doc.id,
      load_id: load.id,
      type: doc.document_type || doc.doc_type || "document",
      title: doc.title || doc.file_name || doc.filename || "Document",
      status: doc.status || doc.ocr_status || "available",
      url: doc.file_url || doc.storage_url || doc.document_url || null,
      uploaded_at: doc.created_date || doc.created_at || null,
    }));
}

export function buildPartnerPortalSnapshot({ partner = {}, loads = [], invoices = [], documents = [] } = {}) {
  const partnerId = partner.id || partner.broker_id || partner.client_id || partner.partner_id;
  const role = partner.portal_role || partner.role || "broker";
  const partnerLoads = loads.filter((load) => isPartnerLoad(load, partnerId));
  const partnerInvoices = invoices.filter((invoice) => isPartnerInvoice(invoice, partnerId));
  const activeLoads = partnerLoads.filter((load) => !["delivered", "completed", "cancelled"].includes(load.status));
  const deliveredLoads = partnerLoads.filter((load) => ["delivered", "completed"].includes(load.status));
  const invoiceAttention = partnerInvoices.filter((invoice) => ["overdue", "disputed"].includes(invoice.status));
  const notifications = [
    ...activeLoads.slice(0, 5).map((load) => buildPartnerNotification({ partnerId, loadId: load.id, eventType: "shipment_update", message: `${load.load_number || "Load"} is active and being monitored by HASTEN.` })),
    ...deliveredLoads.filter((load) => !load.pod_uploaded && !load.pod_document_id).slice(0, 5).map((load) => buildPartnerNotification({ partnerId, loadId: load.id, eventType: "shipment_exception", message: `${load.load_number || "Load"} is delivered and POD is pending.`, severity: "high" })),
    ...invoiceAttention.slice(0, 5).map((invoice) => buildPartnerNotification({ partnerId, loadId: invoice.load_id, eventType: "invoice_due", message: `${invoice.invoice_number || "Invoice"} needs attention.`, severity: "high" })),
  ];

  return {
    generated_at: new Date().toISOString(),
    partner_id: partnerId || null,
    role,
    permissions: getPartnerPermissions(role),
    counts: {
      active_loads: activeLoads.length,
      delivered_loads: deliveredLoads.length,
      delayed_loads: partnerLoads.filter((load) => load.is_delayed || load.exception_status === "open").length,
      open_invoices: partnerInvoices.filter((invoice) => ["sent", "partial", "overdue", "disputed"].includes(invoice.status)).length,
      invoice_attention: invoiceAttention.length,
      documents: partnerLoads.reduce((sum, load) => sum + buildPartnerDocumentAccess(load, documents).length, 0),
      notifications: notifications.length,
    },
    loads: partnerLoads.map((load) => ({
      ...load,
      partner_timeline: buildPartnerTimeline(load),
      partner_documents: buildPartnerDocumentAccess(load, documents),
    })),
    invoices: partnerInvoices,
    notifications,
  };
}

export function buildPartnerCopilotResponse(question = "", snapshot = {}) {
  const text = String(question).toLowerCase();
  if (text.includes("where") || text.includes("track") || text.includes("shipment") || text.includes("load")) {
    const active = snapshot.loads?.filter((load) => !["delivered", "completed", "cancelled"].includes(load.status)) || [];
    return { intent: "tracking", answer: active.length ? `${active.length} active shipment(s) are visible.` : "No active shipments are currently visible.", items: active.slice(0, 5) };
  }
  if (text.includes("pod") || text.includes("document") || text.includes("bol")) {
    const docs = snapshot.loads?.flatMap((load) => load.partner_documents || []) || [];
    return { intent: "documents", answer: `${docs.length} accessible document(s) are available.`, items: docs.slice(0, 8) };
  }
  if (text.includes("invoice") || text.includes("pay") || text.includes("billing")) {
    return { intent: "finance", answer: `${snapshot.counts?.open_invoices || 0} open invoice(s), ${snapshot.counts?.invoice_attention || 0} needing attention.`, items: snapshot.invoices?.slice(0, 8) || [] };
  }
  if (text.includes("delay") || text.includes("exception")) {
    const delayed = snapshot.loads?.filter((load) => load.is_delayed || load.exception_status === "open") || [];
    return { intent: "exceptions", answer: `${delayed.length} shipment exception(s) need attention.`, items: delayed.slice(0, 5) };
  }
  return { intent: "summary", answer: `${snapshot.counts?.active_loads || 0} active, ${snapshot.counts?.delivered_loads || 0} delivered, ${snapshot.counts?.open_invoices || 0} open invoices.`, items: snapshot.notifications?.slice(0, 5) || [] };
}
