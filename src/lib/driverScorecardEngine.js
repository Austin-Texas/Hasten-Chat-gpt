import { DRIVER_COMPLIANCE_DOCS } from "@/lib/driverEnterpriseEvents";

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function d(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getExpirationStatus(dateValue, fallback = "missing") {
  const date = d(dateValue);
  if (!date) return fallback || "missing";
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring_7_days";
  if (days <= 30) return "expiring_30_days";
  if (days <= 90) return "expiring_90_days";
  return "valid";
}

export function buildComplianceFile(driver = {}, documents = []) {
  const docMap = Object.fromEntries((documents || []).map((doc) => [doc.document_type || doc.type, doc]));
  const items = DRIVER_COMPLIANCE_DOCS.map((type) => {
    const doc = docMap[type] || {};
    const expiresAt = doc.expiration_date || doc.expires_at || driver[`${type}_expiration`] || null;
    return {
      type,
      status: getExpirationStatus(expiresAt, doc.status || "missing"),
      expiration_date: expiresAt,
      document_id: doc.id || null,
      verification_status: doc.verification_status || doc.review_status || "pending_review",
    };
  });
  return {
    driver_id: driver.id,
    dqf_status: items.some((item) => ["expired", "missing"].includes(item.status)) ? "incomplete" : "complete",
    items,
    alerts: items.filter((item) => ["expired", "expiring_7_days", "expiring_30_days", "expiring_90_days", "missing"].includes(item.status)),
  };
}

export function buildPerformanceProfile(loads = []) {
  const completed = loads.filter((load) => ["completed", "delivered", "closed"].includes(load.status));
  const onTimePickup = completed.filter((load) => load.pickup_on_time !== false).length;
  const onTimeDelivery = completed.filter((load) => load.delivery_on_time !== false).length;
  const totalMiles = completed.reduce((sum, load) => sum + n(load.miles), 0);
  const grossRevenue = completed.reduce((sum, load) => sum + n(load.rate || load.total_revenue), 0);
  return {
    completed_loads: completed.length,
    on_time_pickup_percent: completed.length ? Math.round((onTimePickup / completed.length) * 100) : 100,
    on_time_delivery_percent: completed.length ? Math.round((onTimeDelivery / completed.length) * 100) : 100,
    acceptance_rate: 100,
    dwell_time_avg_minutes: 0,
    detention_events: completed.filter((load) => load.detention_claim_id).length,
    route_efficiency_percent: 100,
    total_miles: totalMiles,
    gross_revenue: grossRevenue,
  };
}

export function buildSettlementProfile(driver = {}, settlements = []) {
  const totalGross = settlements.reduce((sum, settlement) => sum + n(settlement.gross_load_revenue || settlement.gross_amount), 0);
  const totalNet = settlements.reduce((sum, settlement) => sum + n(settlement.final_driver_net_pay || settlement.net_pay), 0);
  return {
    driver_id: driver.id,
    pay_model: driver.pay_model || (driver.driver_type === "owner_driver" ? "percentage" : "company_payroll"),
    dispatch_fee_percent: n(driver.dispatch_fee_percent, 0),
    deduction_policy: "Deduct only approved advances or contract-allowed charges.",
    total_gross: totalGross,
    total_net: totalNet,
    statements_count: settlements.length,
    next_statement_status: settlements.some((s) => s.status === "pending_approval") ? "pending_approval" : "none",
  };
}

export function buildProfitabilityProfile(loads = [], settlements = []) {
  const grossRevenue = loads.reduce((sum, load) => sum + n(load.rate || load.total_revenue), 0);
  const settlementCost = settlements.reduce((sum, settlement) => sum + n(settlement.final_driver_net_pay || settlement.net_pay), 0);
  const miles = loads.reduce((sum, load) => sum + n(load.miles), 0);
  return {
    gross_revenue: grossRevenue,
    settlement_cost: settlementCost,
    net_margin: grossRevenue - settlementCost,
    revenue_per_mile: miles ? Number((grossRevenue / miles).toFixed(2)) : 0,
    deadhead_percent: 0,
  };
}

export function buildDriverReadinessScore({ driver = {}, loads = [], documents = [], events = [], settlements = [] } = {}) {
  const compliance = buildComplianceFile(driver, documents);
  const performance = buildPerformanceProfile(loads);
  const settlement = buildSettlementProfile(driver, settlements);
  const activeLoad = loads.find((load) => !["completed", "closed", "cancelled"].includes(load.status));
  const docPenalty = Math.min(50, compliance.alerts.length * 8);
  const latePenalty = activeLoad && activeLoad.delivery_date && d(activeLoad.delivery_date) < new Date() ? 20 : 0;
  const eventPenalty = Math.min(30, events.length * 2);
  const settlementPenalty = settlement.next_statement_status === "pending_approval" ? 5 : 0;
  const score = Math.max(0, 100 - docPenalty - latePenalty - eventPenalty - settlementPenalty);
  return {
    driver_id: driver.id,
    overall_score: Math.round(score),
    compliance_score: Math.max(0, 100 - docPenalty),
    performance_score: Math.round((performance.on_time_pickup_percent + performance.on_time_delivery_percent) / 2),
    finance_score: Math.max(0, 100 - settlementPenalty),
    recommended_action: score < 70 ? "Review compliance, schedule, or settlement blockers before next dispatch." : "Driver is ready for normal operations.",
    compliance,
    performance,
    settlement,
  };
}

export function driverCopilotPrompts() {
  return [
    "What is my next required action?",
    "What documents are missing or expiring?",
    "Why is my settlement amount lower?",
    "Do I have any HOS or fatigue risk?",
    "Which load documents still need POD or BOL?",
    "What should I do if I am delayed at pickup?",
    "Can I safely accept another load?",
    "What is my 90-day trend?",
  ];
}
