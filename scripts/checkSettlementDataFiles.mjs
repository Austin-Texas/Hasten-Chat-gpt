import fs from "node:fs";

const required = [
  "src/pages/OwnerOperatorSettlement.jsx",
  "src/lib/settlementPolicy.js",
  "src/lib/settlementStatusFlow.js",
  "src/components/settlement/SettlementPolicyWarnings.jsx",
  "src/components/settlement/SettlementApprovalAction.jsx",
  "src/components/settlement/SettlementStatusProgress.jsx",
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Settlement data file check failed:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Settlement data file check passed.");
