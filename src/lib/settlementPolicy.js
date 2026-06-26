export const OWNER_OPERATOR_ADJUSTMENT_FIELDS = [
  "fuel_advance",
  "toll_advance",
  "escrow_hold",
  "approved_deductions",
  "factoring_fee",
  "insurance_deduction",
  "maintenance_deduction",
  "repair_deduction",
  "other_deduction",
];

export const SETTLEMENT_CALCULATION_FIELDS = [
  "gross_load_revenue",
  "dispatch_company_fee",
  "factoring_fee",
  "fuel_advance",
  "toll_advance",
  "escrow_hold",
  "approved_deductions",
  "bonus",
  "final_driver_net_pay",
  "hasten_net_revenue",
  "payment_status",
  "payout_recipient",
];

export const DEDUCTION_APPROVAL_RULE = "Do not automatically deduct fuel, tolls, maintenance, repairs, or insurance unless HASTEN advanced the money, the driver requested the advance, the contract allows deduction, or the charge was approved and recorded.";

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isOwnerOperatorDriver(driver = {}) {
  const driverType = normalize(driver.driver_type);
  const employmentType = normalize(driver.employment_type);

  if (!driverType && !employmentType) return true;

  return ["owner_operator", "owner-operator", "contractor", "1099_contractor", "1099"].includes(driverType) ||
    ["owner_operator", "owner-operator", "contractor", "1099_contractor", "1099"].includes(employmentType);
}

export function deductionHasApproval(settlement = {}, field) {
  if (money(settlement[field]) <= 0) return true;
  const approvalMap = settlement.deduction_approvals || settlement.approved_deductions_json || {};
  const approvals = typeof approvalMap === "string" ? safeJson(approvalMap, {}) : approvalMap;
  return Boolean(
    settlement[`${field}_approved`] ||
    settlement[`${field}_advance_requested`] ||
    settlement[`${field}_contract_allowed`] ||
    approvals?.[field]?.approved ||
    approvals?.[field]?.advanced ||
    approvals?.[field]?.contract_allowed
  );
}

export function calculateOwnerOperatorSettlement(settlement = {}) {
  const grossLoadRevenue = money(settlement.gross_load_revenue ?? settlement.gross_load_amount ?? settlement.total_revenue ?? settlement.rate);
  const dispatchCompanyFee = money(settlement.dispatch_company_fee ?? settlement.company_fee_amount);
  const factoringFee = money(settlement.factoring_fee);
  const fuelAdvance = money(settlement.fuel_advance);
  const tollAdvance = money(settlement.toll_advance);
  const escrowHold = money(settlement.escrow_hold);
  const approvedDeductions = money(settlement.approved_deductions ?? settlement.other_deduction);
  const bonus = money(settlement.bonus);
  const driverNetPay = grossLoadRevenue - dispatchCompanyFee - factoringFee - fuelAdvance - tollAdvance - escrowHold - approvedDeductions + bonus;
  const hastenNetRevenue = dispatchCompanyFee - factoringFee;

  return {
    gross_load_revenue: grossLoadRevenue,
    dispatch_company_fee: dispatchCompanyFee,
    factoring_fee: factoringFee,
    fuel_advance: fuelAdvance,
    toll_advance: tollAdvance,
    escrow_hold: escrowHold,
    approved_deductions: approvedDeductions,
    bonus,
    final_driver_net_pay: driverNetPay,
    hasten_net_revenue: hastenNetRevenue,
    payment_status: settlement.payment_status || "pending",
    payout_recipient: settlement.payout_recipient || settlement.driver_name || "driver",
  };
}

export function getSettlementPolicyWarnings(settlement = {}, driver = {}) {
  const warnings = [];
  if (!isOwnerOperatorDriver(driver)) return warnings;

  OWNER_OPERATOR_ADJUSTMENT_FIELDS.forEach((field) => {
    const amount = money(settlement[field]);
    if (amount > 0 && !deductionHasApproval(settlement, field)) {
      warnings.push(`${field.replaceAll("_", " ")} needs advance, driver request, contract allowance, or recorded approval before final payout.`);
    }
  });

  if (!settlement.payout_recipient) warnings.push("Payout recipient is missing.");
  if (money(settlement.company_percentage) <= 0 && money(settlement.company_fee_amount) <= 0 && money(settlement.dispatch_company_fee) <= 0) warnings.push("Company/dispatch fee is missing.");

  return warnings;
}

export function settlementNeedsReview(settlement = {}, driver = {}) {
  return getSettlementPolicyWarnings(settlement, driver).length > 0;
}

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}
