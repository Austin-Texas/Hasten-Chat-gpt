import fs from "node:fs";

const files = [
  "package.json",
  "src/components/driver/MobileLayout.jsx",
  "src/pages/driver/DriverDashboard.jsx",
  "src/pages/driver/DriverLoads.jsx",
  "src/pages/driver/DriverScan.jsx",
  "src/pages/driver/DriverProfile.jsx",
  "src/pages/driver/DriverSettlementPreview.jsx",
];

const missing = files.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Mobile packaging readiness check failed:");
  missing.forEach((file) => console.error(`- missing ${file}`));
  process.exit(1);
}

console.log("Mobile packaging readiness check passed.");
