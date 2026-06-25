import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/pages/OwnerOperatorSettlement.jsx");
let source = fs.readFileSync(filePath, "utf8");

const importLine = "import SettlementApprovalAction from '@/components/settlement/SettlementApprovalAction';";
if (!source.includes(importLine)) {
  source = source.replace(
    "import SettlementPolicyWarnings from '@/components/settlement/SettlementPolicyWarnings';",
    "import SettlementPolicyWarnings from '@/components/settlement/SettlementPolicyWarnings';\n" + importLine
  );
}

const oldButton = `<button\n                          onClick={(e) => {\n                            e.stopPropagation();\n                            handleApproveSettlement(settlement.id);\n                          }}\n                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 transition-colors"\n                        >\n                          <Check className="w-3 h-3" /> Approve\n                        </button>`;

const newButton = `<SettlementApprovalAction\n                          settlement={settlement}\n                          driver={settlementDriver}\n                          onApprove={handleApproveSettlement}\n                        />`;

if (source.includes(newButton)) {
  console.log("Settlement approval action is already wired.");
} else if (source.includes(oldButton)) {
  source = source.replace(oldButton, newButton);
  fs.writeFileSync(filePath, source);
  console.log("Settlement approval action wired in OwnerOperatorSettlement.jsx.");
} else {
  console.error("Could not find settlement approval button to patch.");
  process.exit(1);
}
