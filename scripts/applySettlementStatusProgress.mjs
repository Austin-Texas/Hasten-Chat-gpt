import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/pages/OwnerOperatorSettlement.jsx");
let source = fs.readFileSync(filePath, "utf8");

const importLine = "import SettlementStatusProgress from '@/components/settlement/SettlementStatusProgress';";
if (!source.includes(importLine)) {
  source = source.replace(
    "import SettlementPolicyWarnings from '@/components/settlement/SettlementPolicyWarnings';",
    "import SettlementPolicyWarnings from '@/components/settlement/SettlementPolicyWarnings';\n" + importLine
  );
}

const anchor = `<div className="mb-3">
                      <SettlementPolicyWarnings settlement={settlement} driver={settlementDriver} />
                    </div>`;

const replacement = `${anchor}

                    <div className="mb-3">
                      <SettlementStatusProgress status={settlement.status} />
                    </div>`;

if (source.includes("<SettlementStatusProgress status={settlement.status} />")) {
  console.log("Settlement status progress is already wired.");
  fs.writeFileSync(filePath, source);
  process.exit(0);
}

if (!source.includes(anchor)) {
  console.error("Could not find settlement warnings block to insert progress component.");
  process.exit(1);
}

fs.writeFileSync(filePath, source.replace(anchor, replacement));
console.log("Settlement status progress wired in OwnerOperatorSettlement.jsx.");
