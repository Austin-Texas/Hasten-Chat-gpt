import { spawnSync } from "node:child_process";

const commands = [
  ["Project smoke check", "scripts/smokeCheckProjectFiles.mjs"],
  ["Patch script verification", "scripts/verifyPatchScripts.mjs"],
  ["Core route verification", "scripts/verifyCoreRoutes.mjs"],
  ["Driver readiness", "scripts/verifyDriverReadiness.mjs"],
  ["Driver load access", "scripts/verifyDriverLoadAccess.mjs"],
  ["Driver load detail gate", "scripts/checkDriverLoadDetailGate.mjs"],
  ["Sidebar Bid Review", "scripts/checkSidebarBidReview.mjs"],
  ["Settlement policy", "scripts/verifySettlementPolicy.mjs"],
];

for (const [label, script] of commands) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("node", [script], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n${label} failed.`);
    process.exit(result.status || 1);
  }
}

console.log("\nAll HASTEN helper checks passed.");
