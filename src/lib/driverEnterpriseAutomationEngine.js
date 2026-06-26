import {
  evaluateDriverEnterpriseCompliance,
  readDriverEnterpriseStore,
  writeDriverEnterpriseStore,
} from "./driverEnterpriseDataLayer";

export const DRIVER_AUTOMATION_RULES = [
  {
    id: "cdl-expiration-watch",
    name: "Expiring CDL",
    category: "compliance",
    trigger: "CDL expiration date is expired or within 30 days",
    action: "create compliance alert and place driver on compliance hold when expired",
    severity: "high",
  },
  {
    id: "medical-expiration-watch",
    name: "Expiring Medical Card",
    category: "compliance",
    trigger: "DOT medical card expiration date is expired or within 30 days",
    action: "create compliance alert and place driver on compliance hold when expired",
    severity: "high",
  },
  {
    id: "missing-dqf-watch",
    name: "Missing DQF Document",
    category: "compliance",
    trigger: "driver has no verified DQF document package",
    action: "create DQF incomplete warning for admin review",
    severity: "medium",
  },
  {
    id: "dvir-defect-watch",
    name: "DVIR Defect Found",
    category: "maintenance",
    trigger: "DVIR report status is defect_found or mechanic_required is true",
    action: "create maintenance hold alert and flag truck/trailer for repair workflow",
    severity: "high",
  },
  {
    id: "pod-missing-watch",
    name: "POD Missing",
    category: "document",
    trigger: "load assignment delivered without POD uploaded",
    action: "block settlement readiness and notify driver/dispatcher",
    severity: "medium",
  },
  {
    id: "settlement-ready-watch",
    name: "Settlement Ready",
    category: "settlement",
    trigger: "POD approved or uploaded and delivered assignment exists",
    action: "mark settlement statement ready_for_review",
    severity: "info",
  },
  {
    id: "safety-violation-watch",
    name: "Safety Violation Created",
    category: "safety",
    trigger: "high severity driver safety event exists",
    action: "create safety alert, reduce safety score, and route to review queue",
    severity: "high",
  },
  {
    id: "fatigue-risk-watch",
    name: "Fatigue Detection",
    category: "safety",
    trigger: "fatigue event or long active navigation without rest marker",
    action: "create fatigue risk alert and recommend dispatcher check-in",
    severity: "critical",
  },
  {
    id: "driver-status-change-watch",
    name: "Driver Status Change",
    category: "operations",
    trigger: "driver compliance or workflow status changes",
    action: "create audit event and update dispatcher visibility",
    severity: "info",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function makeAlertId(ruleId, recordId) {
  return `driver-alert-${ruleId}-${recordId}`;
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const expiry = new Date(dateValue);
  if (Number.isNaN(expiry.getTime())) return null;
  return Math.ceil((expiry.getTime() - Date.now()) / 86400000);
}

function createAlert({ rule, driverId, recordId, message, severity = rule.severity, metadata = {} }) {
  return {
    id: makeAlertId(rule.id, recordId || driverId || Date.now()),
    rule_id: rule.id,
    rule_name: rule.name,
    category: rule.category,
    driver_id: driverId || null,
    record_id: recordId || null,
    message,
    severity,
    status: "open",
    metadata,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function upsertAlerts(existingAlerts = [], newAlerts = []) {
  const byId = new Map(existingAlerts.map((alert) => [alert.id, alert]));
  newAlerts.forEach((alert) => byId.set(alert.id, { ...byId.get(alert.id), ...alert }));
  return Array.from(byId.values()).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export function runDriverEnterpriseAutomations() {
  const store = readDriverEnterpriseStore();
  const alerts = [];

  const cdlRule = DRIVER_AUTOMATION_RULES.find((rule) => rule.id === "cdl-expiration-watch");
  (store.cdlRecords || []).forEach((record) => {
    const days = daysUntil(record.expiration_date);
    if (days !== null && days <= 30) {
      alerts.push(createAlert({
        rule: cdlRule,
        driverId: record.driver_id,
        recordId: record.id,
        severity: days < 0 ? "critical" : "high",
        message: days < 0 ? "CDL is expired. Driver must be placed on compliance hold." : `CDL expires in ${days} days.`,
        metadata: { days_until_expiration: days, expiration_date: record.expiration_date },
      }));
      evaluateDriverEnterpriseCompliance(record.driver_id);
    }
  });

  const medicalRule = DRIVER_AUTOMATION_RULES.find((rule) => rule.id === "medical-expiration-watch");
  (store.medicalCards || []).forEach((record) => {
    const days = daysUntil(record.expiration_date);
    if (days !== null && days <= 30) {
      alerts.push(createAlert({
        rule: medicalRule,
        driverId: record.driver_id,
        recordId: record.id,
        severity: days < 0 ? "critical" : "high",
        message: days < 0 ? "Medical card is expired. Driver must be placed on compliance hold." : `Medical card expires in ${days} days.`,
        metadata: { days_until_expiration: days, expiration_date: record.expiration_date },
      }));
      evaluateDriverEnterpriseCompliance(record.driver_id);
    }
  });

  const dqfRule = DRIVER_AUTOMATION_RULES.find((rule) => rule.id === "missing-dqf-watch");
  const driverIds = new Set([
    ...(store.cdlRecords || []).map((row) => row.driver_id),
    ...(store.medicalCards || []).map((row) => row.driver_id),
    ...(store.driverDocuments || []).map((row) => row.driver_id),
  ].filter(Boolean));
  driverIds.forEach((driverId) => {
    const hasVerifiedDqf = (store.driverDocuments || []).some((doc) => doc.driver_id === driverId && doc.doc_type === "DQF" && doc.verified);
    if (!hasVerifiedDqf) {
      alerts.push(createAlert({
        rule: dqfRule,
        driverId,
        recordId: driverId,
        message: "Driver DQF package is missing or not fully verified.",
      }));
    }
  });

  const dvirRule = DRIVER_AUTOMATION_RULES.find((rule) => rule.id === "dvir-defect-watch");
  (store.dvirReports || []).filter((report) => report.status === "defect_found" || report.maintenance_hold_required).forEach((report) => {
    alerts.push(createAlert({
      rule: dvirRule,
      driverId: report.driver_id,
      recordId: report.id,
      message: `DVIR defect requires maintenance review for truck ${report.truck_id || "unknown"}.`,
      metadata: { truck_id: report.truck_id, trailer_id: report.trailer_id, defects: report.defects || [] },
    }));
  });

  const podRule = DRIVER_AUTOMATION_RULES.find((rule) => rule.id === "pod-missing-watch");
  (store.navigationSessions || []).filter((session) => session.route_progress_pct >= 100).forEach((session) => {
    const hasPod = (store.driverDocuments || []).some((doc) => doc.load_id === session.load_id && doc.doc_type === "POD" && doc.verified);
    if (!hasPod) {
      alerts.push(createAlert({
        rule: podRule,
        driverId: session.driver_id,
        recordId: session.load_id || session.id,
        message: `POD missing for delivered load ${session.load_id || "unknown"}. Settlement should remain blocked.`,
        metadata: { load_id: session.load_id },
      }));
    }
  });

  const safetyRule = DRIVER_AUTOMATION_RULES.find((rule) => rule.id === "safety-violation-watch");
  (store.safetyEvents || []).filter((event) => ["high", "critical"].includes(event.severity)).forEach((event) => {
    alerts.push(createAlert({
      rule: safetyRule,
      driverId: event.driver_id,
      recordId: event.id,
      severity: event.severity,
      message: `Safety event requires review: ${event.event_type}.`,
      metadata: { event_type: event.event_type, load_id: event.load_id },
    }));
  });

  const fatigueRule = DRIVER_AUTOMATION_RULES.find((rule) => rule.id === "fatigue-risk-watch");
  (store.safetyEvents || []).filter((event) => String(event.event_type || "").includes("fatigue")).forEach((event) => {
    alerts.push(createAlert({
      rule: fatigueRule,
      driverId: event.driver_id,
      recordId: event.id,
      severity: "critical",
      message: "Fatigue risk event detected. Dispatcher check-in recommended.",
      metadata: { event_type: event.event_type, load_id: event.load_id },
    }));
  });

  const nextStore = readDriverEnterpriseStore();
  const mergedAlerts = upsertAlerts(nextStore.driverAlerts || [], alerts);
  const auditEvent = {
    id: `audit-driver-automation-${Date.now()}`,
    actor: "driver_automation_engine",
    entity_key: "driverAlerts",
    record_id: "automation_run",
    action: "automation_rules_executed",
    alerts_created_or_updated: alerts.length,
    timestamp: nowIso(),
  };

  return writeDriverEnterpriseStore({
    ...nextStore,
    driverAlerts: mergedAlerts,
    auditEvents: [auditEvent, ...(nextStore.auditEvents || [])],
  });
}

export function getDriverAutomationDashboard(store = readDriverEnterpriseStore()) {
  const alerts = store.driverAlerts || [];
  return {
    rules: DRIVER_AUTOMATION_RULES,
    alerts,
    open_alerts: alerts.filter((alert) => alert.status === "open").length,
    critical_alerts: alerts.filter((alert) => alert.severity === "critical").length,
    high_alerts: alerts.filter((alert) => alert.severity === "high").length,
    compliance_alerts: alerts.filter((alert) => alert.category === "compliance").length,
    safety_alerts: alerts.filter((alert) => alert.category === "safety").length,
    document_alerts: alerts.filter((alert) => alert.category === "document").length,
    maintenance_alerts: alerts.filter((alert) => alert.category === "maintenance").length,
  };
}
