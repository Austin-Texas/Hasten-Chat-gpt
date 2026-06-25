import { spawnSync } from "node:child_process";

const patches = [
  ["Driver load detail access gate", "scripts/applyDriverLoadDetailGate.mjs"],
  ["Driver load status flow", "scripts/applyDriverLoadStatusFlow.mjs"],
  ["Sidebar Bid Review shortcut", "scripts/applySidebarBidReview.mjs"],
  ["Compliance readiness shortcut", "scripts/applyComplianceReadinessShortcut.mjs"],
  ["Settlement approval confirmation", "scripts/applySettlementApprovalAction.mjs"],
  ["Settlement status progress", "scripts/applySettlementStatusProgress.mjs"],
  ["Camera upload validation", "scripts/applyCameraUploadValidationSafe.mjs"],
  ["Camera pending upload helper", "scripts/applyCameraUploadPendingHelper.mjs"],
  ["Driver scan pending upload retry", "scripts/applyPendingUploadsRetryToScan.mjs"],
];

for (const [label, script] of patches) {
  console.log(`\n▶ Applying ${label}`);
  const result = spawnSync("node", [script], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n${label} patch failed. Stop and inspect ${script}.");
    process.exit(result.status || 1);
  }
}

console.log("\nRecommended HASTEN patches applied. Review changed files, run build, then commit.");
