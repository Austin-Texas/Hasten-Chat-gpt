import {
  canMoveSettlementNext,
  getNextSettlementStatus,
  getSettlementProgress,
  isValidSettlementStatusTransition,
  settlementStatusLabel,
} from "../src/lib/settlementStatusFlow.js";

const checks = [
  ["draft moves to pending review", getNextSettlementStatus("draft") === "pending_review"],
  ["pending review moves to approved", getNextSettlementStatus("pending_review") === "approved"],
  ["approved moves to paid", getNextSettlementStatus("approved") === "paid"],
  ["paid has no next", !canMoveSettlementNext("paid")],
  ["valid approve transition", isValidSettlementStatusTransition("pending_review", "approved")],
  ["invalid skip rejected", !isValidSettlementStatusTransition("draft", "approved")],
  ["terminal transition rejected", !isValidSettlementStatusTransition("paid", "draft")],
  ["paid progress is 100", getSettlementProgress("paid") === 100],
  ["label is readable", settlementStatusLabel("pending_review") === "Pending Review"],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length) {
  console.error("Settlement status flow verification failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Settlement status flow verification passed.");
