import { spawnSync } from "node:child_process";

const steps = [
  ["Apply recommended patches", "scripts/applyRecommendedPatches.mjs"],
  ["Verify helpers and patch status", "scripts/verifyAllHelpers.mjs"],
  ["Report pending patches", "scripts/reportPendingPatches.mjs"],
];

for (const [label, script] of steps) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("node", [script], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n${label} failed. Inspect ${script}.`);
    process.exit(result.status || 1);
  }
}

console.log("\nRecommended patches applied and verified. Run npm run build, review git diff, then commit.");
