import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = {
  enterprise: "src/lib/driverEnterprise.js",
  center: "src/pages/driver/DriverIntelligenceCenter.jsx",
  app: "src/App.jsx",
};

const content = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, fs.readFileSync(path, "utf8")]));

const requiredEvents = [
  "DRIVER_ASSIGNED_LOAD",
  "DRIVER_ACCEPTED_LOAD",
  "DRIVER_REJECTED_LOAD",
  "DRIVER_ARRIVED_PICKUP",
  "DRIVER_DELIVERED",
  "DRIVER_POD_UPLOADED",
  "DRIVER_HOS_VIOLATION",
  "DRIVER_DOCUMENT_EXPIRING",
  "DRIVER_DVIR_SUBMITTED",
  "DRIVER_INCIDENT_REPORTED",
  "DRIVER_SETTLEMENT_READY",
  "DRIVER_COACHING_REQUIRED",
  "DRIVER_FRAUD_ALERT",
  "DRIVER_OFFLINE_SYNC_QUEUED",
];

const requiredModules = [
  "Driver Intelligence Engine",
  "Fraud & Security Engine",
  "Incident / Claims Management",
  "Driver Equipment Linkage",
  "Driver Coaching Engine",
  "Smart Notification Engine",
  "Offline / Poor Signal Mode",
  "Driver Retention / Rewards",
  "Driver Profitability Engine",
  "AI Driver Copilot",
];

for (const event of requiredEvents) assert(content.enterprise.includes(event), `Missing driver enterprise event: ${event}`);
for (const module of requiredModules) assert(content.enterprise.includes(module), `Missing driver enterprise module: ${module}`);

assert(content.enterprise.includes("calculateDriverRiskScore"), "Driver risk score engine missing.");
assert(content.enterprise.includes("detectDriverFraudSignals"), "Driver fraud detection missing.");
assert(content.enterprise.includes("buildDriverProfitability"), "Driver profitability engine missing.");
assert(content.enterprise.includes("buildDriverRewardProfile"), "Driver reward engine missing.");
assert(content.enterprise.includes("queueOfflineDriverAction"), "Offline queue helper missing.");
assert(content.center.includes("DriverIntelligenceCenter"), "Driver Intelligence Center page missing.");
assert(content.center.includes("AI Driver Copilot"), "AI Driver Copilot section missing.");
assert(content.center.includes("Fraud & Security Engine"), "Fraud section missing.");

const routeWired = content.app.includes("DriverIntelligenceCenter") && content.app.includes('/driver/intelligence');
if (!routeWired) {
  console.warn("WARN route is not wired yet. Add import DriverIntelligenceCenter and /driver/intelligence route in src/App.jsx.");
} else {
  console.log("Driver intelligence route is wired.");
}

console.log("PASS driver enterprise foundation verification");
console.log(JSON.stringify({ checkedFiles: files, routeWired }, null, 2));
