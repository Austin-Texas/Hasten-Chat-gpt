import fs from "node:fs";
import path from "node:path";

function read(file) {
  return fs.readFileSync(path.resolve(file), "utf8");
}

const checks = [
  {
    label: "Driver Load Detail access gate",
    file: "src/App.jsx",
    wired: (source) => source.includes("@/pages/driver/DriverLoadDetailAccessGate"),
    apply: "node scripts/applyDriverLoadDetailGate.mjs",
  },
  {
    label: "Sidebar Bid Review shortcut",
    file: "src/components/HastenLayout.jsx",
    wired: (source) => source.includes("/dispatch/bid-review"),
    apply: "node scripts/applySidebarBidReview.mjs",
  },
  {
    label: "Compliance readiness shortcut",
    file: "src/pages/Compliance.jsx",
    wired: (source) => source.includes("/drivers/readiness"),
    apply: "node scripts/applyComplianceReadinessShortcut.mjs",
  },
  {
    label: "Settlement approval confirmation",
    file: "src/pages/OwnerOperatorSettlement.jsx",
    wired: (source) => source.includes("SettlementApprovalAction"),
    apply: "node scripts/applySettlementApprovalAction.mjs",
  },
];

let pending = 0;
console.log("HASTEN pending patch report\n");
for (const check of checks) {
  const source = read(check.file);
  const ok = check.wired(source);
  console.log(`${ok ? "✅" : "⚠️"} ${check.label}`);
  if (!ok) {
    pending += 1;
    console.log(`   Apply: ${check.apply}`);
  }
}

console.log(`\n${pending} pending patch${pending === 1 ? "" : "es"}.`);
if (pending > 0) {
  console.log("Run: node scripts/applyRecommendedPatches.mjs");
}
