export const DRIVER_ENTERPRISE_ROADMAP = [
  {
    phase: "Phase 1",
    name: "Foundation and Demo Import",
    status: "implemented",
    items: [
      "Driver master demo data",
      "Enterprise local data layer",
      "Demo import/reset controls",
      "Duplicate seed protection",
      "Base44-ready mapping",
    ],
  },
  {
    phase: "Phase 2",
    name: "Compliance, Documents, Safety, Settlement Engines",
    status: "implemented",
    items: [
      "CDL record model",
      "Medical card model",
      "Driver compliance file / DQF",
      "Document vault and OCR workflow",
      "Safety telemetry and fatigue engine",
      "Settlement statement engine",
      "Automation rules",
    ],
  },
  {
    phase: "Phase 3",
    name: "Workflow and Scorecard Operations",
    status: "implemented_local_first",
    items: [
      "Pickup workflow states",
      "Delivery workflow states",
      "DVIR workflow states",
      "Document workflow states",
      "Messaging workflow states",
      "Navigation workflow states",
      "Safety/performance/compliance/behavior scorecards",
      "90-day rolling trend model",
    ],
  },
  {
    phase: "Phase 4",
    name: "Driver Portal and Native App Readiness",
    status: "implemented_local_first",
    items: [
      "Self-service portal payload",
      "Compliance alerts",
      "Document upload queue",
      "Settlement viewer data",
      "Safety alerts",
      "HOS provider mapping",
      "Future Motive/Samsara/Trimble integration adapters",
    ],
  },
];

export const DRIVER_ENTERPRISE_REQUIREMENT_COVERAGE = {
  driverDataModels: "implemented_local_first",
  cdlRecordModel: "implemented_local_first",
  medicalCardModel: "implemented_local_first",
  driverComplianceFile: "implemented_local_first",
  driverSafetyProfile: "implemented_local_first",
  driverPerformanceProfile: "implemented_scorecard_layer",
  driverSettlementProfile: "implemented_local_first",
  driverAvailabilityModel: "implemented_status_model",
  pickupWorkflow: "implemented_state_machine",
  deliveryWorkflow: "implemented_state_machine",
  dvirWorkflow: "implemented_state_machine_and_defect_hold",
  documentWorkflow: "implemented_ocr_ready",
  messagingWorkflow: "implemented_data_model",
  navigationWorkflow: "implemented_data_model",
  loadAssignments: "implemented_demo_and_navigation_records",
  documentScannerOcr: "implemented_ocr_workflow_not_real_ocr_api",
  hosIntegration: "future_provider_mapping_ready",
  safetyAlerts: "implemented_automation_layer",
  settlementViewer: "implemented_portal_payload",
  dqfCdlMedicalHazmatTwicDrugClearinghouse: "implemented_requirement_engine",
  telemetryViolationsAlertsFatigue: "implemented_local_first",
  scorecardRequirements: "implemented_local_first",
  settlementRequirements: "implemented_local_first",
  documentRequirements: "implemented_local_first",
  driverPortalRequirements: "implemented_portal_payload",
};

export function getDriverEnterpriseRoadmapSummary() {
  const totalPhases = DRIVER_ENTERPRISE_ROADMAP.length;
  const implemented = DRIVER_ENTERPRISE_ROADMAP.filter((phase) => String(phase.status).includes("implemented")).length;
  const coverage = Object.values(DRIVER_ENTERPRISE_REQUIREMENT_COVERAGE);
  return {
    total_phases: totalPhases,
    implemented_phases: implemented,
    requirement_count: coverage.length,
    local_first_count: coverage.filter((value) => String(value).includes("implemented")).length,
    roadmap: DRIVER_ENTERPRISE_ROADMAP,
    coverage: DRIVER_ENTERPRISE_REQUIREMENT_COVERAGE,
  };
}
