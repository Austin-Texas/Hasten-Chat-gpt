import fs from "node:fs";

const files = [
  ["Auth context", "src/lib/AuthContext.jsx"],
  ["Base44 client", "src/api/base44Client.js"],
  ["App routes", "src/App.jsx"],
  ["Driver load access", "src/lib/driverLoadAccess.js"],
  ["Driver load detail gate", "src/pages/driver/DriverLoadDetailAccessGate.jsx"],
];

console.log("HASTEN auth readiness\n");
for (const [label, file] of files) {
  console.log(`${fs.existsSync(file) ? "✅" : "⚠️"} ${label}: ${file}`);
}

console.log("\nManual review still required for final role permissions.");
