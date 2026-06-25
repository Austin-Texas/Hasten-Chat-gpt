import fs from "node:fs";

const requiredScripts = [
  "scripts/applyDriverLoadDetailGate.mjs",
  "scripts/applySidebarBidReview.mjs",
  "scripts/applyComplianceReadinessShortcut.mjs",
  "scripts/applySettlementApprovalAction.mjs",
  "scripts/applyCameraUploadValidationSafe.mjs",
  "scripts/applyCameraUploadPendingHelper.mjs",
  "scripts/applyRecommendedPatches.mjs",
  "scripts/reportPendingPatches.mjs",
];

const missing = requiredScripts.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Missing patch scripts:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Patch script verification passed.");
