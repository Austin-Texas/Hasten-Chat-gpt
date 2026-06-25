import fs from "node:fs";

const groups = [
  ["External Dashboard", ["src/pages/ExternalDashboard.jsx", "src/pages/portal/ExternalDashboard.jsx"]],
  ["External Loads", ["src/pages/ExternalLoads.jsx", "src/pages/portal/ExternalLoads.jsx"]],
  ["External Documents", ["src/pages/ExternalDocuments.jsx", "src/pages/portal/ExternalDocuments.jsx"]],
  ["External Profile", ["src/pages/ExternalProfile.jsx", "src/pages/portal/ExternalProfile.jsx"]],
];

console.log("HASTEN external portal status\n");
for (const [label, paths] of groups) {
  const found = paths.find((file) => fs.existsSync(file));
  console.log(`${found ? "✅" : "⚠️"} ${label}${found ? `: ${found}` : ": pending"}`);
}

console.log("\nInformational report only.");
