import { readDriverEnterpriseStore } from "./driverEnterpriseDataLayer";

export const DRIVER_PROMPT_REQUIREMENTS = [
  "Driver Master Profile",
  "CDL Record Model",
  "Medical Card Model",
  "Driver Compliance File / DQF",
  "Driver Safety Profile",
  "Driver Performance Profile",
  "Driver Settlement Profile",
  "Driver Availability Model",
  "Pickup Workflow",
  "Delivery Workflow",
  "DVIR Workflow",
  "Document Workflow",
  "Messaging Workflow",
  "Navigation Workflow",
  "Load Assignments",
  "Navigation",
  "Document Scanner + OCR",
  "Messaging",
  "HOS Integration",
  "DVIR",
  "Safety Alerts",
  "Settlement Viewer",
  "Compliance Automation",
  "Safety Telemetry",
  "Scorecards",
  "Weekly Settlements",
  "Document Vault",
  "Driver Self-Service Portal",
  "Demo Data Import",
];

export function validateDriverEnterprisePromptCoverage(store = readDriverEnterpriseStore()) {
  const checks = {
    data_models: Boolean(store.schema_version),
    cdl_records: (store.cdlRecords || []).length > 0,
    medical_cards: (store.medicalCards || []).length > 0,
    compliance: (store.driverCompliance || []).length > 0,
    safety_events: (store.safetyEvents || []).length > 0,
    dvir: (store.dvirReports || []).length > 0,
    documents: (store.driverDocuments || []).length > 0,
    messages: (store.driverMessages || []).length > 0,
    navigation: (store.navigationSessions || []).length > 0,
    settlements: (store.settlementStatements || []).length > 0,
    automations: Array.isArray(store.driverAlerts || []),
    scorecards: Array.isArray(store.driverScorecards || []),
    audit: (store.auditEvents || []).length > 0,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  return {
    prompt_requirements: DRIVER_PROMPT_REQUIREMENTS,
    checks,
    passed,
    total,
    completion_pct: Math.round((passed / total) * 100),
    status: passed === total ? "complete" : "needs_runtime_demo_import_or_recalculation",
    next_actions: passed === total ? ["Run app build", "Verify routes", "Check GitHub Actions"] : ["Import Driver Demo Data", "Run Full Recalculation", "Open Driver Intelligence Center"],
  };
}

export function getDriverEnterpriseBuildRiskChecklist() {
  return [
    "Verify DriverEnterprisePortalPanels imports driverHosEngine",
    "Verify DriverIntelligenceCenter imports DriverWorkflowControls",
    "Verify driverWorkflowActions imports driverEnterpriseDocumentEngine",
    "Verify /drivers/enterprise route loads",
    "Verify /driver/intelligence route loads",
    "Run local npm build or GitHub Actions",
  ];
}
