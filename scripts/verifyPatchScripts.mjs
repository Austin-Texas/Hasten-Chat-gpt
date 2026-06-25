import fs from "node:fs";

const requiredScripts = [
  "scripts/applyDriverLoadDetailGate.mjs",
  "scripts/checkDriverLoadDetailGate.mjs",
  "scripts/applyDriverLoadStatusFlow.mjs",
  "scripts/checkDriverLoadStatusFlowWiring.mjs",
  "scripts/applySidebarBidReview.mjs",
  "scripts/checkSidebarBidReview.mjs",
  "scripts/applyComplianceReadinessShortcut.mjs",
  "scripts/applySettlementApprovalAction.mjs",
  "scripts/checkSettlementApprovalAction.mjs",
  "scripts/applySettlementStatusProgress.mjs",
  "scripts/applyCameraUploadValidationSafe.mjs",
  "scripts/applyCameraUploadPendingHelper.mjs",
  "scripts/applyPendingUploadsRetryToScan.mjs",
  "scripts/checkPendingUploadRetryWiring.mjs",
  "scripts/applyRecommendedPatches.mjs",
  "scripts/applyAndVerifyRecommendedPatches.mjs",
  "scripts/reportPendingPatches.mjs",
  "scripts/smokeCheckProjectFiles.mjs",
  "scripts/verifyAllHelpers.mjs",
];

const missing = requiredScripts.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Missing patch scripts:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Patch script verification passed.");
