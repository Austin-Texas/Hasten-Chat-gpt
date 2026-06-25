export const OWNER_OPERATOR_ADJUSTMENT_FIELDS = [
  "fuel_advance",
  "insurance_deduction",
  "other_deduction",
  "escrow_hold",
];

export function isOwnerOperatorDriver(driver = {}) {
  return (
    driver.driver_type === "owner_operator" ||
    driver.employment_type === "1099_contractor" ||
    driver.employment_type === "owner_operator"
  );
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
