const DRIVER_ENTERPRISE_STORAGE_KEY = "hasten_driver_enterprise_records_v1";

export const DRIVER_ENTERPRISE_SCHEMA_VERSION = "driver-enterprise-local-v1";

export const DRIVER_ENTERPRISE_ENTITIES = {
  DriverCompliance: {
    key: "driverCompliance",
    description: "Master compliance snapshot for each driver, built from CDL, medical, DQF, drug, TWIC, Hazmat, and Clearinghouse records.",
    base44Entity: "DriverCompliance",
    fields: ["id", "driver_id", "overall_status", "compliance_score", "blocking_issues", "warning_issues", "last_evaluated_at", "audit_trail"],
  },
  CDLRecord: {
    key: "cdlRecords",
    description: "CDL license identity, class, endorsements, restrictions, verification, and expiration record.",
    base44Entity: "CDLRecord",
    fields: ["id", "driver_id", "cdl_number", "state", "class", "endorsements", "restrictions", "issue_date", "expiration_date", "verification_status", "document_id"],
  },
  MedicalCard: {
    key: "medicalCards",
    description: "DOT medical certificate model with examiner, restrictions, dates, verification, and expiration status.",
    base44Entity: "MedicalCard",
    fields: ["id", "driver_id", "certificate_number", "examiner_name", "issue_date", "expiration_date", "restrictions", "verification_status", "document_id"],
  },
  DriverSafetyEvent: {
    key: "safetyEvents",
    description: "Telemetry, violation, accident, alert, fatigue, and unsafe behavior event record.",
    base44Entity: "DriverSafetyEvent",
    fields: ["id", "driver_id", "load_id", "event_type", "severity", "gps_location", "timestamp", "resolved", "resolution_notes"],
  },
  DVIRReport: {
    key: "dvirReports",
    description: "Pre-trip and post-trip inspection report with defects, photos, signature, and maintenance-hold automation.",
    base44Entity: "DVIRReport",
    fields: ["id", "driver_id", "truck_id", "trailer_id", "inspection_type", "status", "defects", "photos", "signed", "maintenance_hold_required"],
  },
  DriverMessage: {
    key: "driverMessages",
    description: "Driver-dispatcher message thread record with load context, attachments, receipts, and unread tracking.",
    base44Entity: "DriverMessage",
    fields: ["id", "thread_id", "load_id", "driver_id", "sender_role", "message_type", "content", "attachments", "read_at"],
  },
  DriverNavigationSession: {
    key: "navigationSessions",
    description: "Navigation, GPS, ETA, geofence, and route-progress session for each assigned load.",
    base44Entity: "DriverNavigationSession",
    fields: ["id", "driver_id", "load_id", "current_lat", "current_lng", "eta", "route_progress_pct", "status", "geofence_events"],
  },
  SettlementStatement: {
    key: "settlementStatements",
    description: "Weekly driver settlement statement supporting percentage, flat, per-mile, deductions, and PDF-ready output.",
    base44Entity: "SettlementStatement",
    fields: ["id", "driver_id", "week_start", "week_end", "pay_model", "gross_revenue", "deductions", "net_pay", "status", "pdf_ready"],
  },
  DriverDocument: {
    key: "driverDocuments",
    description: "Unified document vault item for CDL, medical, DQF, BOL, POD, receipts, OCR data, verification, and expirations.",
    base44Entity: "DriverDocument",
    fields: ["id", "driver_id", "load_id", "doc_type", "ocr_status", "ocr_data", "storage_url", "expiration_date", "verified", "version"],
  },
};

export const DRIVER_WORKFLOW_DEFINITIONS = {
  pickup: ["assigned", "accepted", "en_route_pickup", "arrived_pickup", "loaded"],
  delivery: ["loaded", "in_transit", "arrived_delivery", "delivered", "pod_uploaded"],
  dvir: ["not_started", "pre_trip_started", "defect_found", "maintenance_hold", "cleared", "post_trip_complete"],
  document: ["queued", "uploaded", "ocr_processing", "needs_review", "approved", "rejected", "resubmit_required"],
  messaging: ["thread_open", "sent", "delivered", "read", "escalated"],
  navigation: ["not_started", "route_created", "active", "arrived_geofence", "completed"],
  settlement: ["draft", "ready_for_review", "approved", "statement_generated", "paid"],
};

export const DRIVER_COMPLIANCE_REQUIREMENTS = ["DQF", "CDL", "Medical", "Hazmat", "TWIC", "Drug Test", "Clearinghouse", "MVR", "Road Test", "Employment Verification", "Training Records"];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyStore() {
  return {
    schema_version: DRIVER_ENTERPRISE_SCHEMA_VERSION,
    updated_at: nowIso(),
    driverCompliance: [],
    cdlRecords: [],
    medicalCards: [],
    safetyEvents: [],
    dvirReports: [],
    driverMessages: [],
    navigationSessions: [],
    settlementStatements: [],
    driverDocuments: [],
    auditEvents: [],
  };
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readDriverEnterpriseStore() {
  if (typeof localStorage === "undefined") return emptyStore();
  const stored = safeParse(localStorage.getItem(DRIVER_ENTERPRISE_STORAGE_KEY));
  return { ...emptyStore(), ...(stored || {}) };
}

export function writeDriverEnterpriseStore(nextStore) {
  const normalized = { ...emptyStore(), ...nextStore, schema_version: DRIVER_ENTERPRISE_SCHEMA_VERSION, updated_at: nowIso() };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(DRIVER_ENTERPRISE_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("hasten_driver_enterprise_store_changed", { detail: normalized }));
  }
  return normalized;
}

export function resetDriverEnterpriseStore() {
  const reset = emptyStore();
  writeDriverEnterpriseStore(reset);
  return reset;
}

export function listDriverEnterpriseRecords(entityKey, filter = {}) {
  const store = readDriverEnterpriseStore();
  const rows = Array.isArray(store[entityKey]) ? store[entityKey] : [];
  return rows.filter((row) => Object.entries(filter).every(([key, value]) => row?.[key] === value));
}

export function upsertDriverEnterpriseRecord(entityKey, record, actor = "system") {
  const store = readDriverEnterpriseStore();
  const existingRows = Array.isArray(store[entityKey]) ? store[entityKey] : [];
  const id = record?.id || makeId(entityKey);
  const existingIndex = existingRows.findIndex((row) => row.id === id);
  const nextRecord = { ...record, id, updated_at: nowIso(), created_at: existingIndex >= 0 ? existingRows[existingIndex].created_at : nowIso() };
  const rows = existingIndex >= 0 ? existingRows.map((row, index) => (index === existingIndex ? { ...row, ...nextRecord } : row)) : [nextRecord, ...existingRows];
  const auditEvent = { id: makeId("audit"), actor, entity_key: entityKey, record_id: id, action: existingIndex >= 0 ? "updated" : "created", timestamp: nowIso() };
  return writeDriverEnterpriseStore({ ...store, [entityKey]: rows, auditEvents: [auditEvent, ...(store.auditEvents || [])] });
}

export function bulkImportDriverEnterpriseRecords(recordsByEntity = {}, actor = "system_import") {
  let store = readDriverEnterpriseStore();
  for (const [entityKey, rows] of Object.entries(recordsByEntity)) {
    if (!Array.isArray(rows)) continue;
    const existingRows = Array.isArray(store[entityKey]) ? store[entityKey] : [];
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    rows.forEach((row) => {
      const id = row.id || makeId(entityKey);
      existingById.set(id, { ...existingById.get(id), ...row, id, updated_at: nowIso(), created_at: existingById.get(id)?.created_at || row.created_at || nowIso() });
    });
    store = { ...store, [entityKey]: Array.from(existingById.values()) };
  }
  const auditEvent = { id: makeId("audit"), actor, entity_key: "bulk", record_id: "bulk_import", action: "bulk_imported", timestamp: nowIso() };
  return writeDriverEnterpriseStore({ ...store, auditEvents: [auditEvent, ...(store.auditEvents || [])] });
}

function normalizeDocType(type = "") {
  const text = String(type).toLowerCase();
  if (text.includes("medical")) return "Medical";
  if (text.includes("cdl")) return "CDL";
  if (text.includes("drug")) return "Drug Test";
  if (text.includes("clearing")) return "Clearinghouse";
  if (text.includes("twic")) return "TWIC";
  if (text.includes("hazmat")) return "Hazmat";
  if (text.includes("bol")) return "BOL";
  if (text.includes("pod")) return "POD";
  return type || "DQF";
}

export function buildEnterpriseRecordsFromDemoBundle(bundle = {}) {
  const cdlRecords = (bundle.cdlRecords || []).map((record) => ({ ...record, document_id: record.document_id || `doc-${record.id}` }));
  const medicalCards = (bundle.medicalCards || []).map((record) => ({ ...record, document_id: record.document_id || `doc-${record.id}` }));
  const dvirReports = (bundle.dvirReports || []).map((report) => ({
    ...report,
    photos: report.photos || [],
    signed: report.signed ?? true,
    maintenance_hold_required: Boolean(report.mechanic_required || report.status === "defect_found"),
  }));
  const safetyEvents = (bundle.driverEvents || []).filter((event) => ["safety_alert", "compliance_alert"].includes(event.event_type) || event.severity === "high").map((event) => ({
    id: `safety-${event.id}`,
    driver_id: event.driver_id,
    load_id: event.load_id,
    event_type: event.event_type === "compliance_alert" ? "compliance" : "safety_alert",
    severity: event.severity,
    gps_location: event.gps_location || null,
    timestamp: event.created_date || event.demo_imported_at || nowIso(),
    resolved: false,
    resolution_notes: "Demo safety event imported from driver event stream.",
    source_event_id: event.id,
  }));
  const driverMessages = (bundle.driverEvents || []).filter((event) => event.event_type === "message_sent").map((event) => ({
    id: `message-${event.id}`,
    thread_id: `thread-${event.driver_id}`,
    load_id: event.load_id,
    driver_id: event.driver_id,
    sender_role: "driver",
    message_type: "text",
    content: event.message,
    attachments: [],
    read_at: null,
  }));
  const navigationSessions = (bundle.loadAssignments || []).map((assignment) => ({
    id: `nav-${assignment.id}`,
    driver_id: assignment.driver_id,
    load_id: assignment.load_id,
    current_lat: 35.0527,
    current_lng: -78.8784,
    eta: null,
    route_progress_pct: ["delivered", "pod_uploaded"].includes(assignment.status) ? 100 : assignment.status === "assigned" ? 0 : 45,
    status: assignment.navigation_status || "not_started",
    geofence_events: ["arrived_pickup", "arrived_delivery"].includes(assignment.status) ? [{ type: assignment.status, timestamp: nowIso() }] : [],
  }));
  const settlementStatements = (bundle.settlements || []).map((settlement) => ({
    id: settlement.id,
    driver_id: settlement.driver_id,
    week_start: settlement.week_start,
    week_end: settlement.week_end,
    pay_model: settlement.pay_model,
    gross_revenue: settlement.gross_revenue,
    deductions: {
      company_fee: settlement.company_fee,
      advances: settlement.advances,
      insurance: settlement.insurance_deduction,
      escrow: settlement.escrow_deduction,
      factoring: settlement.factoring_deduction,
    },
    net_pay: settlement.net_pay,
    status: settlement.status,
    pdf_ready: Boolean(settlement.pdf_preview_ready),
    source: settlement.source,
    isDemo: settlement.isDemo,
  }));
  const driverDocuments = (bundle.complianceDocuments || []).map((document) => ({
    id: `doc-${document.id}`,
    driver_id: document.driver_id,
    load_id: document.load_id || null,
    doc_type: normalizeDocType(document.document_type),
    ocr_status: document.ocr_status || "queued",
    ocr_data: document.ocr_data || {},
    storage_url: document.vault_path || document.document_url || "",
    expiration_date: document.expiration_date || null,
    verified: ["approved", "verified"].includes(document.status),
    version: 1,
    source: document.source,
    isDemo: document.isDemo,
  }));

  return { cdlRecords, medicalCards, safetyEvents, dvirReports, driverMessages, navigationSessions, settlementStatements, driverDocuments };
}

export function importEnterpriseDemoBundleIntoDriverStore(bundle = {}, actor = "driver_demo_import") {
  const records = buildEnterpriseRecordsFromDemoBundle(bundle);
  let store = bulkImportDriverEnterpriseRecords(records, actor);
  const driverIds = [...new Set([...(bundle.drivers || []).map((driver) => driver.id), ...records.cdlRecords.map((record) => record.driver_id), ...records.medicalCards.map((record) => record.driver_id)].filter(Boolean))];
  driverIds.forEach((driverId) => evaluateDriverEnterpriseCompliance(driverId));
  store = readDriverEnterpriseStore();
  const auditEvent = { id: makeId("audit"), actor, entity_key: "driver_enterprise_store", record_id: "demo_bundle", action: "demo_bundle_connected", timestamp: nowIso(), driver_count: driverIds.length };
  return writeDriverEnterpriseStore({ ...store, auditEvents: [auditEvent, ...(store.auditEvents || [])] });
}

export function evaluateDriverEnterpriseCompliance(driverId) {
  const store = readDriverEnterpriseStore();
  const cdl = store.cdlRecords.find((row) => row.driver_id === driverId);
  const medical = store.medicalCards.find((row) => row.driver_id === driverId);
  const docs = store.driverDocuments.filter((row) => row.driver_id === driverId);
  const now = new Date();
  const blocking = [];
  const warnings = [];

  function checkRequired(label, record, dateField = "expiration_date") {
    if (!record) {
      blocking.push(`${label} missing`);
      return;
    }
    if (record.verification_status && !["verified", "approved", "valid"].includes(record.verification_status)) warnings.push(`${label} needs review`);
    if (record[dateField]) {
      const expiration = new Date(record[dateField]);
      const days = Math.ceil((expiration.getTime() - now.getTime()) / 86400000);
      if (days < 0) blocking.push(`${label} expired`);
      else if (days <= 30) warnings.push(`${label} expires in ${days} days`);
    }
  }

  checkRequired("CDL", cdl);
  checkRequired("Medical card", medical);
  if (!docs.length) warnings.push("DQF file incomplete");

  const complianceScore = Math.max(0, 100 - blocking.length * 25 - warnings.length * 10);
  const overallStatus = blocking.length ? "hold" : warnings.length ? "warning" : "compliant";
  const complianceRecord = {
    id: `compliance-${driverId}`,
    driver_id: driverId,
    overall_status: overallStatus,
    compliance_score: complianceScore,
    blocking_issues: blocking,
    warning_issues: warnings,
    last_evaluated_at: nowIso(),
    audit_trail: [{ action: "evaluated", timestamp: nowIso(), blocking_count: blocking.length, warning_count: warnings.length }],
  };
  upsertDriverEnterpriseRecord("driverCompliance", complianceRecord, "compliance_engine");
  return complianceRecord;
}

export function buildDriverEnterpriseBase44Mapping() {
  return Object.entries(DRIVER_ENTERPRISE_ENTITIES).map(([name, spec]) => ({
    localEntity: name,
    localStoreKey: spec.key,
    futureBase44Entity: spec.base44Entity,
    fields: spec.fields,
    migrationMode: "localStorage_to_Base44_entity",
  }));
}
