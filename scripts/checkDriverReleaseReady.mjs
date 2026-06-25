import fs from "node:fs";

const required = [
  "src/components/driver/MobileLayout.jsx",
  "src/pages/driver/DriverDashboard.jsx",
  "src/pages/driver/DriverLoads.jsx",
  "src/pages/driver/DriverLoadDetailAccessGate.jsx",
  "src/pages/driver/DriverScan.jsx",
  "src/pages/driver/DriverProfile.jsx",
  "src/pages/driver/DriverSettlementPreview.jsx",
  "src/lib/driverLoadAccess.js",
  "src/lib/driverLoadStatusFlow.js",
  "src/lib/pendingUploads.js",
  "src/lib/pendingUploadRetry.js",
  "src/lib/queuedUploadContext.js",
  "src/lib/queuedUploadRetrySummary.js",
  "src/lib/settlementPolicy.js",
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Driver release readiness check failed:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Driver release readiness check passed.");
