export const OWNER_OPERATOR_ADJUSTMENT_FIELDS = [
  "fuel_advance",
  "insurance_deduction",
  "other_deduction",
  "escrow_hold",
];

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

export function isOwnerOperatorDriver(driver = {}) {
  const driverType = normalize(driver.driver_type);
  const employmentType = normalize(driver.employment_type);

  if (!driverType && !employmentType) return true;

  return ["owner_operator", "contractor", "1099_contractor"].includes(driverType) ||
    ["owner_operator", "contractor", "1099_contractor"].includes(employmentType);
}

export function getSettlementPolicyWarnings(settlement = {}, driver = {}) {
  const warnings = [];
  if (!isOwnerOperatorDriver(driver)) return warnings;

  OWNER_OPERATOR_ADJUSTMENT_FIELDS.forEach((field) => {
    const amount = Number(settlement[field] || 0);
    if (amount > 0) {
      warnings.push(`${field.replaceAll("_", " ")} needs supporting approval before final payout.`);
    }
  });

  if (!settlement.payout_recipient) {
    warnings.push("Payout recipient is missing.");
  }

  if (Number(settlement.company_percentage || 0) <= 0 && Number(settlement.company_fee_amount || 0) <= 0) {
    warnings.push("Company fee is missing.");
  }

  return warnings;
}

export function settlementNeedsReview(settlement = {}, driver = {}) {
  return getSettlementPolicyWarnings(settlement, driver).length > 0;
}
