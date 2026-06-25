import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/components/driver/CameraUpload.jsx");
const source = fs.readFileSync(filePath, "utf8");

const checks = [
  source.includes("const MAX_UPLOAD_MB = 15;"),
  source.includes("const fileSizeMb = file.size / (1024 * 1024);"),
  source.includes("max {MAX_UPLOAD_MB}MB"),
  !source.includes("AlertCircle, Image"),
];

if (checks.every(Boolean)) {
  console.log("Camera upload validation is wired.");
  process.exit(0);
}

console.log("Camera upload validation is not wired yet. Run scripts/applyCameraUploadValidationSafe.mjs.");
