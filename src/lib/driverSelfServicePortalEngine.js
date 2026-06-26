import { readDriverEnterpriseStore } from "./driverEnterpriseDataLayer";
import { buildDriverDocumentPortalPayload } from "./driverEnterpriseDocumentEngine";
import { buildDriverSettlementPortalPayload } from "./driverEnterpriseSettlementEngine";

export function buildDriverSelfServicePortal(driverId, store = readDriverEnterpriseStore()) {
  const compliance = (store.driverCompliance || []).find((x) => x.driver_id === driverId) || null;
  const scorecard = (store.driverScorecards || []).find((x) => x.driver_id === driverId) || null;
  const safetyProfile = (store.driverSafetyProfiles || []).find((x) => x.driver_id === driverId) || null;
  const alerts = (store.driverAlerts || []).filter((x) => x.driver_id === driverId && x.status === "open");
  const navigation = (store.navigationSessions || []).filter((x) => x.driver_id === driverId);
  const dvir = (store.dvirReports || []).filter((x) => x.driver_id === driverId);
  const messages = (store.driverMessages || []).filter((x) => x.driver_id === driverId);
  const documents = buildDriverDocumentPortalPayload(driverId, store);
  const settlements = buildDriverSettlementPortalPayload(driverId, store);

  return {
    driver_id: driverId,
    compliance,
    scorecard,
    safetyProfile,
    alerts,
    documents,
    settlements,
    active_workflows: {
      navigation,
      dvir,
      messages,
    },
    actions: [
      "review_compliance_status",
      "upload_missing_documents",
      "view_settlement_statements",
      "review_open_alerts",
      "complete_dvir",
      "message_dispatcher",
    ],
  };
}

export function getDriverPortalSummary(store = readDriverEnterpriseStore()) {
  const driverIds = [...new Set([
    ...(store.driverCompliance || []).map((x) => x.driver_id),
    ...(store.driverDocuments || []).map((x) => x.driver_id),
    ...(store.settlementStatements || []).map((x) => x.driver_id),
    ...(store.driverAlerts || []).map((x) => x.driver_id),
  ].filter(Boolean))];
  return {
    drivers_with_portal_data: driverIds.length,
    compliance_items: (store.driverCompliance || []).length,
    document_items: (store.driverDocuments || []).length,
    settlement_items: (store.settlementStatements || []).length,
    open_alerts: (store.driverAlerts || []).filter((x) => x.status === "open").length,
  };
}
