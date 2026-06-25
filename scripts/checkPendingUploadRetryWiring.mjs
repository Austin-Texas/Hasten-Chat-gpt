import fs from "node:fs";

const helper = fs.readFileSync("src/lib/pendingUploadRetry.js", "utf8");
const component = fs.readFileSync("src/components/driver/PendingUploadsRetry.jsx", "utf8");

const checks = [
  helper.includes("dataUrlToFile"),
  helper.includes("retryPendingUploads"),
  component.includes("PendingUploadsRetry"),
  component.includes("retryPendingUploads"),
];

if (checks.every(Boolean)) {
  console.log("Pending upload retry wiring is present.");
  process.exit(0);
}

console.error("Pending upload retry wiring is incomplete.");
process.exit(1);
