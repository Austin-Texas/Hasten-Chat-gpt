import { readDriverEnterpriseStore, writeDriverEnterpriseStore, upsertDriverEnterpriseRecord } from "./driverEnterpriseDataLayer";

export const DRIVER_DOCUMENT_TYPES = ["CDL", "Medical", "DQF", "MVR", "Drug Test", "Clearinghouse", "TWIC", "Hazmat", "BOL", "POD", "Receipt", "Scale Ticket", "Lumper Receipt"];
export const DRIVER_DOCUMENT_OCR_STATES = ["queued", "uploaded", "ocr_processing", "needs_review", "approved", "rejected", "resubmit_required"];

function nowIso() {
  return new Date().toISOString();
}

function makeDocumentId(driverId, docType) {
  return `driver-doc-${driverId || "unknown"}-${String(docType || "document").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
}

function normalizeDocType(docType = "") {
  const text = String(docType).toLowerCase();
  if (text.includes("pod")) return "POD";
  if (text.includes("bol")) return "BOL";
  if (text.includes("medical")) return "Medical";
  if (text.includes("cdl")) return "CDL";
  if (text.includes("drug")) return "Drug Test";
  if (text.includes("clearing")) return "Clearinghouse";
  if (text.includes("twic")) return "TWIC";
  if (text.includes("hazmat")) return "Hazmat";
  if (text.includes("receipt")) return "Receipt";
  return docType || "DQF";
}

export function createDriverDocumentVaultRecord(input = {}, actor = "document_engine") {
  const docType = normalizeDocType(input.doc_type || input.document_type);
  const document = {
    id: input.id || makeDocumentId(input.driver_id, docType),
    driver_id: input.driver_id,
    load_id: input.load_id || null,
    doc_type: docType,
    ocr_status: input.ocr_status || "queued",
    ocr_data: input.ocr_data || {},
    storage_url: input.storage_url || input.document_url || input.vault_path || "",
    expiration_date: input.expiration_date || null,
    verified: Boolean(input.verified),
    version: input.version || 1,
    rejection_reason: input.rejection_reason || null,
    created_at: input.created_at || nowIso(),
    updated_at: nowIso(),
  };
  upsertDriverEnterpriseRecord("driverDocuments", document, actor);
  return document;
}

export function runDriverDocumentOcr(documentId, extracted = {}) {
  const store = readDriverEnterpriseStore();
  const documents = store.driverDocuments || [];
  const target = documents.find((doc) => doc.id === documentId);
  if (!target) throw new Error(`Driver document not found: ${documentId}`);

  const requiredByType = {
    CDL: ["cdl_number", "expiration_date", "state"],
    Medical: ["certificate_number", "expiration_date", "examiner_name"],
    BOL: ["bol_number", "load_number"],
    POD: ["delivery_date", "signature_detected"],
    Receipt: ["amount", "vendor", "date"],
  };
  const required = requiredByType[target.doc_type] || [];
  const missing = required.filter((field) => extracted[field] === undefined || extracted[field] === null || extracted[field] === "");
  const nextStatus = missing.length ? "needs_review" : "approved";

  const updated = {
    ...target,
    ocr_status: nextStatus,
    ocr_data: {
      ...target.ocr_data,
      ...extracted,
      confidence_score: extracted.confidence_score || (missing.length ? 0.72 : 0.94),
      missing_fields: missing,
      processed_at: nowIso(),
    },
    verified: nextStatus === "approved",
    updated_at: nowIso(),
  };

  const auditEvent = {
    id: `audit-doc-ocr-${Date.now()}`,
    actor: "document_ocr_engine",
    entity_key: "driverDocuments",
    record_id: documentId,
    action: "ocr_processed",
    status: nextStatus,
    timestamp: nowIso(),
  };

  writeDriverEnterpriseStore({
    ...store,
    driverDocuments: documents.map((doc) => (doc.id === documentId ? updated : doc)),
    auditEvents: [auditEvent, ...(store.auditEvents || [])],
  });
  return updated;
}

export function rejectDriverDocument(documentId, reason, actor = "dispatcher") {
  const store = readDriverEnterpriseStore();
  const documents = store.driverDocuments || [];
  const updated = documents.map((doc) => doc.id === documentId ? {
    ...doc,
    ocr_status: "resubmit_required",
    verified: false,
    rejection_reason: reason,
    updated_at: nowIso(),
  } : doc);
  const auditEvent = {
    id: `audit-doc-reject-${Date.now()}`,
    actor,
    entity_key: "driverDocuments",
    record_id: documentId,
    action: "document_rejected",
    reason,
    timestamp: nowIso(),
  };
  return writeDriverEnterpriseStore({ ...store, driverDocuments: updated, auditEvents: [auditEvent, ...(store.auditEvents || [])] });
}

export function getDriverDocumentVaultDashboard(store = readDriverEnterpriseStore()) {
  const documents = store.driverDocuments || [];
  const expiring = documents.filter((doc) => {
    if (!doc.expiration_date) return false;
    const days = Math.ceil((new Date(doc.expiration_date).getTime() - Date.now()) / 86400000);
    return days <= 30;
  });
  return {
    documents,
    total: documents.length,
    approved: documents.filter((doc) => doc.ocr_status === "approved" || doc.verified).length,
    needs_review: documents.filter((doc) => ["queued", "ocr_processing", "needs_review"].includes(doc.ocr_status)).length,
    rejected: documents.filter((doc) => ["rejected", "resubmit_required"].includes(doc.ocr_status)).length,
    expiring: expiring.length,
    by_type: DRIVER_DOCUMENT_TYPES.reduce((acc, type) => ({ ...acc, [type]: documents.filter((doc) => doc.doc_type === type).length }), {}),
  };
}

export function buildDriverDocumentPortalPayload(driverId, store = readDriverEnterpriseStore()) {
  const documents = (store.driverDocuments || []).filter((doc) => doc.driver_id === driverId);
  return {
    driver_id: driverId,
    documents,
    missing_core_documents: ["CDL", "Medical", "DQF"].filter((type) => !documents.some((doc) => doc.doc_type === type && doc.verified)),
    upload_queue: documents.filter((doc) => ["queued", "resubmit_required"].includes(doc.ocr_status)),
  };
}
