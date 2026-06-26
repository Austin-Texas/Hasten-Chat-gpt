import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const diagnosticsPath = "src/pages/SystemDiagnostics.jsx";
const appPath = "src/App.jsx";

const diagnostics = fs.readFileSync(diagnosticsPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");

const requiredDiagnosticsSnippets = [
  "SystemDiagnosticRun",
  "SystemDiagnosticIssue",
  "DEFAULT_CATEGORIES",
  "overall_score",
  "CleanupPreview",
  "CLEANUP_PREVIEW_ITEMS",
  "never_auto_delete",
  "super_admin",
  "Run Diagnostics",
  "Issue Table",
  "Manual Fix Required",
];

const requiredAppSnippets = [
  "/super-admin/settings/system-diagnostics",
  "/super-admin/settings/platform-cleanup",
  "<SystemDiagnostics />",
];

for (const snippet of requiredDiagnosticsSnippets) {
  assert(diagnostics.includes(snippet), `Missing diagnostics requirement: ${snippet}`);
}

for (const snippet of requiredAppSnippets) {
  assert(app.includes(snippet), `Missing route requirement: ${snippet}`);
}

assert(!app.includes("<PlatformCleanup"), "Platform cleanup should not become a duplicate standalone module.");
assert(diagnostics.includes("Production business data") || diagnostics.includes("never_auto_delete"), "Cleanup must protect production data.");

console.log("PASS diagnostics cleanup center verification");
console.log(JSON.stringify({
  diagnosticsPath,
  appPath,
  checkedDiagnostics: requiredDiagnosticsSnippets.length,
  checkedRoutes: requiredAppSnippets.length,
}, null, 2));
