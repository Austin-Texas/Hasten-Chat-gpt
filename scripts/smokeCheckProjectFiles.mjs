import fs from "node:fs";

const checks = [
  ["Driver readiness helper", "src/lib/driverReadiness.js", "getDriverReadiness"],
  ["Driver readiness center", "src/pages/DriverReadinessCenter.jsx", "Driver Readiness Center"],
  ["Driver readiness panel", "src/components/compliance/DriverReadinessPanel.jsx", "Readiness Completion"],
  ["Driver load access helper", "src/lib/driverLoadAccess.js", "getLoadDriverIds"],
  ["Driver load access gate", "src/pages/driver/DriverLoadDetailAccessGate.jsx", "fetchLoadById"],
  ["Driver scan", "src/pages/driver/DriverScan.jsx", "Document Scanner"],
  ["OCR processor", "src/components/driver/DocumentOCRProcessor.jsx", "MAX_UPLOAD_MB"],
  ["Pending uploads helper", "src/lib/pendingUploads.js", "listPendingUploads"],
  ["Pending uploads notice", "src/components/driver/PendingUploadsNotice.jsx", "PendingUploadsNotice"],
  ["Settlement policy", "src/lib/settlementPolicy.js", "getSettlementPolicyWarnings"],
  ["Settlement warning UI", "src/components/settlement/SettlementPolicyWarnings.jsx", "Settlement review needed"],
  ["Settlement approval UI", "src/components/settlement/SettlementApprovalAction.jsx", "Continue with approval"],
  ["Patch runner", "scripts/applyRecommendedPatches.mjs", "applyCameraUploadValidationSafe"],
];

const failed = [];
for (const [label, file, text] of checks) {
  if (!fs.existsSync(file)) {
    failed.push(`${label}: missing ${file}`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(text)) failed.push(`${label}: missing expected text ${text}`);
}

if (failed.length) {
  console.error("Project smoke check failed:");
  failed.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log("HASTEN project smoke check passed.");
