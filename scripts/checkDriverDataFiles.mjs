import fs from "node:fs";

const required = [
  "src/pages/driver/DriverLoads.jsx",
  "src/pages/driver/DriverLoadDetail.jsx",
  "src/pages/driver/DriverLoadDetailAccessGate.jsx",
  "src/pages/driver/DriverScan.jsx",
  "src/lib/driverLoadAccess.js",
  "src/lib/driverLoadStatusFlow.js",
  "src/lib/pendingUploads.js",
  "src/lib/pendingUploadRetry.js",
  "src/lib/queuedUploadContext.js",
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Driver data file check failed:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Driver data file check passed.");
