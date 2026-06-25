import {
  getSettlementPolicyWarnings,
  isOwnerOperatorDriver,
  settlementNeedsReview,
} from "../src/lib/settlementPolicy.js";

const ownerOperator = { driver_type: "owner_operator", employment_type: "1099_contractor" };
const contractorDriver = { driver_type: "contractor" };
const unknownDriver = {};
const companyDriver = { driver_type: "company_driver", employment_type: "w2" };

const cleanSettlement = {
  payout_recipient: "Driver LLC",
  company_fee_amount: 250,
  fuel_advance: 0,
  insurance_deduction: 0,
  other_deduction: 0,
  escrow_hold: 0,
};

const reviewSettlement = {
  payout_recipient: "",
  company_fee_amount: 0,
  fuel_advance: 100,
  insurance_deduction: 50,
  other_deduction: 25,
  escrow_hold: 10,
};

const checks = [
  ["owner operator recognized", isOwnerOperatorDriver(ownerOperator)],
  ["contractor recognized", isOwnerOperatorDriver(contractorDriver)],
  ["unknown driver defaults to review path", isOwnerOperatorDriver(unknownDriver)],
  ["company driver bypasses owner operator warnings", !isOwnerOperatorDriver(companyDriver)],
  ["clean settlement has no warnings", getSettlementPolicyWarnings(cleanSettlement, ownerOperator).length === 0],
  ["review settlement has warnings", getSettlementPolicyWarnings(reviewSettlement, ownerOperator).length > 0],
  ["unknown driver review settlement has warnings", getSettlementPolicyWarnings(reviewSettlement, unknownDriver).length > 0],
  ["review settlement needs review", settlementNeedsReview(reviewSettlement, ownerOperator)],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length) {
  console.error("Settlement policy verification failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Settlement policy verification passed.");
