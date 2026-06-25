import fs from "node:fs";

const required = [
  "src/App.jsx",
  "src/components/HastenLayout.jsx",
  "src/pages/Dashboard.jsx",
  "src/pages/Drivers.jsx",
  "src/pages/DriverReadinessCenter.jsx",
  "src/pages/Compliance.jsx",
  "src/pages/LoadMarketplace.jsx",
  "src/pages/DispatchBidReview.jsx",
  "src/pages/OwnerOperatorSettlement.jsx",
  "src/pages/SystemDiagnostics.jsx",
  "src/lib/driverReadiness.js",
  "src/lib/complianceReadiness.js",
  "src/lib/settlementPolicy.js",
  "src/lib/settlementStatusFlow.js",
  "src/components/settlement/SettlementPolicyWarnings.jsx",
  "src/components/settlement/SettlementApprovalAction.jsx",
  "src/components/settlement/SettlementStatusProgress.jsx",
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Console release readiness check failed:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Console release readiness check passed.");
