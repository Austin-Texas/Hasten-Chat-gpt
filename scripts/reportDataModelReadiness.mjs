import fs from "node:fs";

const groups = [
  ["Loads", ["src/pages/LoadMarketplace.jsx", "src/pages/driver/DriverLoads.jsx", "src/pages/driver/DriverLoadDetail.jsx"]],
  ["Drivers", ["src/pages/Drivers.jsx", "src/lib/driverReadiness.js", "src/lib/driverLoadAccess.js"]],
  ["Settlements", ["src/pages/OwnerOperatorSettlement.jsx", "src/lib/settlementPolicy.js", "src/lib/settlementStatusFlow.js"]],
  ["Documents", ["src/components/driver/DocumentOCRProcessor.jsx", "src/lib/pendingUploads.js", "src/lib/pendingUploadRetry.js"]],
  ["Compliance", ["src/pages/Compliance.jsx", "src/lib/complianceReadiness.js", "src/pages/DriverReadinessCenter.jsx"]],
  ["Marketplace", ["src/pages/LoadMarketplace.jsx", "src/pages/DispatchBidReview.jsx", "src/lib/equipmentMatching.js"]],
  ["Search and timeline", ["src/pages/SystemDiagnostics.jsx"]],
];

console.log("HASTEN data model readiness\n");
for (const [label, files] of groups) {
  const present = files.filter((file) => fs.existsSync(file));
  console.log(`${present.length ? "✅" : "⚠️"} ${label}: ${present.length}/${files.length} files found`);
}

console.log("\nInformational report only. Review missing groups before release.");
