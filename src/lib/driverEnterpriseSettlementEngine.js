import { readDriverEnterpriseStore, writeDriverEnterpriseStore } from "./driverEnterpriseDataLayer";

export const DRIVER_SETTLEMENT_PAY_MODELS = ["percentage", "flat", "per_mile", "hourly", "hybrid"];
export const DRIVER_SETTLEMENT_DEDUCTION_TYPES = ["company_fee", "factoring_fee", "insurance", "escrow", "advance", "chargeback", "toll", "fuel_card", "maintenance"];
export const DRIVER_SETTLEMENT_EARNINGS_TYPES = ["linehaul", "detention", "layover", "tonu", "bonus", "fuel_surcharge_share"];

function nowIso() {
  return new Date().toISOString();
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function calculateDriverSettlementStatement(input = {}) {
  const earnings = {
    linehaul: money(input.linehaul ?? input.gross_revenue),
    detention: money(input.detention || input.detention_pay),
    layover: money(input.layover || input.layover_pay),
    tonu: money(input.tonu || input.tonu_pay),
    bonus: money(input.bonus),
    fuel_surcharge_share: money(input.fuel_surcharge_share),
  };
  const deductions = {
    company_fee: money(input.company_fee),
    factoring_fee: money(input.factoring_fee || input.factoring_deduction),
    insurance: money(input.insurance || input.insurance_deduction),
    escrow: money(input.escrow || input.escrow_deduction),
    advance: money(input.advance || input.advances),
    chargeback: money(input.chargeback),
    toll: money(input.toll),
    fuel_card: money(input.fuel_card),
    maintenance: money(input.maintenance),
  };
  const grossRevenue = money(Object.values(earnings).reduce((sum, value) => sum + value, 0));
  const totalDeductions = money(Object.values(deductions).reduce((sum, value) => sum + value, 0));
  const netPay = money(grossRevenue - totalDeductions);
  const status = input.status || (input.pod_verified ? "ready_for_review" : "draft");

  return {
    id: input.id || `settlement-${input.driver_id || "driver"}-${input.week_start || Date.now()}`,
    driver_id: input.driver_id,
    week_start: input.week_start,
    week_end: input.week_end,
    pay_model: input.pay_model || input.pay_type || "percentage",
    earnings,
    deductions,
    gross_revenue: grossRevenue,
    total_deductions: totalDeductions,
    net_pay: netPay,
    status,
    pdf_ready: ["ready_for_review", "approved", "paid"].includes(status),
    statement_number: input.statement_number || `HST-SET-${String(Date.now()).slice(-8)}`,
    generated_at: nowIso(),
  };
}

export function generateWeeklyDriverSettlementStatements({ weekStart, weekEnd } = {}) {
  const store = readDriverEnterpriseStore();
  const byDriver = new Map();
  (store.settlementStatements || []).forEach((statement) => {
    if (!statement.driver_id) return;
    byDriver.set(statement.driver_id, statement);
  });

  const navDriverIds = [...new Set((store.navigationSessions || []).map((session) => session.driver_id).filter(Boolean))];
  const generated = navDriverIds.map((driverId) => {
    const existing = byDriver.get(driverId) || {};
    const completedRoutes = (store.navigationSessions || []).filter((session) => session.driver_id === driverId && session.route_progress_pct >= 100).length;
    const podCount = (store.driverDocuments || []).filter((doc) => doc.driver_id === driverId && doc.doc_type === "POD" && doc.verified).length;
    const podVerified = completedRoutes > 0 && podCount > 0;
    return calculateDriverSettlementStatement({
      ...existing,
      id: existing.id || `settlement-${driverId}-${weekStart || "current"}`,
      driver_id: driverId,
      week_start: weekStart || existing.week_start || "current_week_start",
      week_end: weekEnd || existing.week_end || "current_week_end",
      gross_revenue: existing.gross_revenue || completedRoutes * 2200,
      company_fee: existing.deductions?.company_fee || existing.company_fee || completedRoutes * 350,
      factoring_fee: existing.deductions?.factoring_fee || existing.factoring_fee || completedRoutes * 55,
      insurance: existing.deductions?.insurance || existing.insurance || 65,
      escrow: existing.deductions?.escrow || existing.escrow || 100,
      pod_verified: podVerified,
      status: podVerified ? "ready_for_review" : "draft",
    });
  });

  const existingNonGenerated = (store.settlementStatements || []).filter((statement) => !generated.some((item) => item.id === statement.id));
  const auditEvent = {
    id: `audit-settlements-${Date.now()}`,
    actor: "driver_settlement_engine",
    entity_key: "settlementStatements",
    record_id: "weekly_generation",
    action: "weekly_settlements_generated",
    generated_count: generated.length,
    timestamp: nowIso(),
  };

  return writeDriverEnterpriseStore({
    ...store,
    settlementStatements: [...generated, ...existingNonGenerated],
    auditEvents: [auditEvent, ...(store.auditEvents || [])],
  });
}

export function getDriverSettlementDashboard(store = readDriverEnterpriseStore()) {
  const statements = store.settlementStatements || [];
  return {
    statements,
    total: statements.length,
    draft: statements.filter((item) => item.status === "draft").length,
    ready_for_review: statements.filter((item) => item.status === "ready_for_review").length,
    approved: statements.filter((item) => item.status === "approved").length,
    paid: statements.filter((item) => item.status === "paid").length,
    gross_total: money(statements.reduce((sum, item) => sum + Number(item.gross_revenue || 0), 0)),
    net_total: money(statements.reduce((sum, item) => sum + Number(item.net_pay || 0), 0)),
  };
}

export function buildDriverSettlementPortalPayload(driverId, store = readDriverEnterpriseStore()) {
  const statements = (store.settlementStatements || []).filter((item) => item.driver_id === driverId);
  return {
    driver_id: driverId,
    statements,
    latest_statement: statements[0] || null,
    totals: {
      gross: money(statements.reduce((sum, item) => sum + Number(item.gross_revenue || 0), 0)),
      deductions: money(statements.reduce((sum, item) => sum + Number(item.total_deductions || 0), 0)),
      net: money(statements.reduce((sum, item) => sum + Number(item.net_pay || 0), 0)),
    },
  };
}
