import fs from "node:fs";

const helper = fs.readFileSync("src/lib/complianceReadiness.js", "utf8");
const page = fs.readFileSync("src/pages/DriverReadinessCenter.jsx", "utf8");

const checks = [
  helper.includes("getReadinessExportRows"),
  page.includes("getReadinessExportRows"),
  page.includes("Export CSV"),
  page.includes("text/csv"),
];

if (checks.every(Boolean)) {
  console.log("Readiness export wiring is present.");
  process.exit(0);
}

console.error("Readiness export wiring is incomplete.");
process.exit(1);
