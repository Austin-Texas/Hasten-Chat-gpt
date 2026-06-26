import { runDriverEnterpriseAutomations, getDriverAutomationDashboard } from "./driverEnterpriseAutomationEngine";
import { recalculateDriverSafetyProfiles, getDriverSafetyDashboard } from "./driverEnterpriseSafetyEngine";
import { recalcDriverScorecards, getDriverScorecardSummary } from "./driverScorecardLite";
import { generateWeeklyDriverSettlementStatements, getDriverSettlementDashboard } from "./driverEnterpriseSettlementEngine";
import { getDriverDocumentVaultDashboard } from "./driverEnterpriseDocumentEngine";
import { getDriverPortalSummary } from "./driverSelfServicePortalEngine";
import { getDriverEnterpriseRoadmapSummary } from "./driverEnterpriseRoadmap";
import { readDriverEnterpriseStore } from "./driverEnterpriseDataLayer";

export function runDriverEnterpriseFullRecalculation(options = {}) {
  runDriverEnterpriseAutomations();
  recalculateDriverSafetyProfiles();
  recalcDriverScorecards();
  if (options.generateSettlements !== false) {
    generateWeeklyDriverSettlementStatements(options.settlementWindow || {});
  }
  return buildDriverEnterpriseExecutiveSummary();
}

export function buildDriverEnterpriseExecutiveSummary(store = readDriverEnterpriseStore()) {
  return {
    automation: getDriverAutomationDashboard(store),
    safety: getDriverSafetyDashboard(store),
    scorecards: getDriverScorecardSummary(store),
    settlements: getDriverSettlementDashboard(store),
    documents: getDriverDocumentVaultDashboard(store),
    portal: getDriverPortalSummary(store),
    roadmap: getDriverEnterpriseRoadmapSummary(),
    generated_at: new Date().toISOString(),
  };
}
