import fs from "node:fs";

function exists(file) {
  return fs.existsSync(file);
}

function readJson(file) {
  if (!exists(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const pkg = readJson("package.json");
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

const checks = [
  ["package.json", exists("package.json")],
  ["Vite config", exists("vite.config.js") || exists("vite.config.mjs") || exists("vite.config.ts")],
  ["Capacitor config", exists("capacitor.config.ts") || exists("capacitor.config.js") || exists("capacitor.config.json")],
  ["Android folder", exists("android")],
  ["iOS folder", exists("ios")],
  ["@capacitor/core dependency", Boolean(deps["@capacitor/core"])],
  ["@capacitor/android dependency", Boolean(deps["@capacitor/android"])],
  ["@capacitor/ios dependency", Boolean(deps["@capacitor/ios"])],
];

console.log("HASTEN native packaging status\n");
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "⚠️"} ${label}`);
}

console.log("\nThis report is informational. It does not fail the build.");
