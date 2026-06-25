import fs from "node:fs";

const checks = [
  ["Driver detail gate file", "src/pages/driver/DriverLoadDetailAccessGate.jsx"],
  ["Driver access helper", "src/lib/driverLoadAccess.js"],
  ["App route file", "src/App.jsx"],
  ["Layout file", "src/components/HastenLayout.jsx"],
];

console.log("HASTEN route guard coverage\n");
for (const [label, file] of checks) {
  console.log(`${fs.existsSync(file) ? "✅" : "⚠️"} ${label}: ${file}`);
}
