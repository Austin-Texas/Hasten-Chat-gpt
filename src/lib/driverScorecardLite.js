import { readDriverEnterpriseStore, writeDriverEnterpriseStore } from "./driverEnterpriseDataLayer";

function nowIso() {
  return new Date().toISOString();
}

function score(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function risk(value) {
  if (value >= 85) return "low";
  if (value >= 70) return "medium";
  if (value >= 55) return "high";
  return "critical";
}

function trend(value) {
  if (value >= 85) return "improving";
  if (value >= 70) return "stable";
  return "declining";
}

function driverIds(store) {
  return [...new Set([
    ...(store.driverCompliance || []).map((x) => x.driver_id),
    ...(store.safetyEvents || []).map((x) => x.driver_id),
    ...(store.dvirReports || []).map((x) => x.driver_id),
    ...(store.navigationSessions || []).map((x) => x.driver_id),
    ...(store.settlementStatements || []).map((x) => x.driver_id),
    ...(store.driverDocuments || []).map((x) => x.driver_id),
  ].filter(Boolean))];
}

export function buildDriverScorecard(driverId, store = readDriverEnterpriseStore()) {
  const compliance = (store.driverCompliance || []).find((x) => x.driver_id === driverId);
  const safetyEvents = (store.safetyEvents || []).filter((x) => x.driver_id === driverId);
  const dvirs = (store.dvirReports || []).filter((x) => x.driver_id === driverId);
  const docs = (store.driverDocuments || []).filter((x) => x.driver_id === driverId);
  const nav = (store.navigationSessions || []).filter((x) => x.driver_id === driverId);
  const settlements = (store.settlementStatements || []).filter((x) => x.driver_id === driverId);
  const alerts = (store.driverAlerts || []).filter((x) => x.driver_id === driverId);

  const badEvents = safetyEvents.filter((x) => ["high", "critical"].includes(x.severity)).length;
  const defects = dvirs.filter((x) => x.status === "defect_found" || x.maintenance_hold_required).length;
  const safetyScore = score(100 - badEvents * 12 - defects * 8);

  const completedRoutes = nav.filter((x) => x.route_progress_pct >= 100 || x.status === "completed").length;
  const verifiedPod = docs.filter((x) => x.doc_type === "POD" && x.verified).length;
  const settlementReady = settlements.filter((x) => ["ready_for_review", "approved", "paid"].includes(x.status)).length;
  const performanceScore = score(70 + completedRoutes * 5 + verifiedPod * 5 + settlementReady * 3);

  const complianceScore = score(compliance?.compliance_score ?? 70);
  const openAlerts = alerts.filter((x) => x.status === "open").length;
  const rejectedDocs = docs.filter((x) => ["rejected", "resubmit_required"].includes(x.ocr_status)).length;
  const behaviorScore = score(95 - openAlerts * 5 - rejectedDocs * 4);

  const overall = score(safetyScore * 0.35 + performanceScore * 0.25 + complianceScore * 0.25 + behaviorScore * 0.15);

  return {
    id: `driver-scorecard-${driverId}`,
    driver_id: driverId,
    overall_score: overall,
    safety_score: safetyScore,
    performance_score: performanceScore,
    compliance_score: complianceScore,
    behavior_score: behaviorScore,
    risk_level: risk(overall),
    rolling_90_day_trend: trend(overall),
    metrics: {
      bad_safety_events: badEvents,
      dvir_defects: defects,
      completed_routes: completedRoutes,
      verified_pod_documents: verifiedPod,
      settlement_ready_count: settlementReady,
      open_alerts: openAlerts,
      rejected_documents: rejectedDocs,
    },
    calculated_at: nowIso(),
  };
}

export function recalcDriverScorecards() {
  const store = readDriverEnterpriseStore();
  const cards = driverIds(store).map((id) => buildDriverScorecard(id, store));
  const auditEvent = {
    id: `audit-driver-scorecards-${Date.now()}`,
    actor: "driver_scorecard_engine",
    entity_key: "driverScorecards",
    record_id: "all",
    action: "recalculated",
    count: cards.length,
    timestamp: nowIso(),
  };
  return writeDriverEnterpriseStore({
    ...store,
    driverScorecards: cards,
    auditEvents: [auditEvent, ...(store.auditEvents || [])],
  });
}

export function getDriverScorecardSummary(store = readDriverEnterpriseStore()) {
  const cards = store.driverScorecards || [];
  const avg = cards.length ? Math.round(cards.reduce((sum, x) => sum + x.overall_score, 0) / cards.length) : 0;
  return {
    total: cards.length,
    average_score: avg,
    low_risk: cards.filter((x) => x.risk_level === "low").length,
    medium_risk: cards.filter((x) => x.risk_level === "medium").length,
    high_or_critical: cards.filter((x) => ["high", "critical"].includes(x.risk_level)).length,
    cards,
  };
}
