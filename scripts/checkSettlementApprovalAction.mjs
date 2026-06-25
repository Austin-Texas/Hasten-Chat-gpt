import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/pages/OwnerOperatorSettlement.jsx");
const source = fs.readFileSync(filePath, "utf8");

if (source.includes("SettlementApprovalAction")) {
  console.log("Settlement approval confirmation is wired.");
  process.exit(0);
}

console.log("Settlement approval confirmation is not wired yet. Run scripts/applySettlementApprovalAction.mjs to patch OwnerOperatorSettlement.jsx.");
