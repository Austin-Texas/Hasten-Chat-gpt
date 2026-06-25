import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/pages/driver/DriverScan.jsx");
let source = fs.readFileSync(filePath, "utf8");

if (!source.includes('import PendingUploadsRetry from "@/components/driver/PendingUploadsRetry";')) {
  source = source.replace(
    'import DocumentOCRProcessor from "@/components/driver/DocumentOCRProcessor";\n',
    'import DocumentOCRProcessor from "@/components/driver/DocumentOCRProcessor";\nimport PendingUploadsRetry from "@/components/driver/PendingUploadsRetry";\n'
  );
}

if (source.includes("<PendingUploadsRetry />")) {
  console.log("Pending uploads retry is already wired in DriverScan.");
  fs.writeFileSync(filePath, source);
  process.exit(0);
}

const insertAfter = `      </div>\n\n      {loading ? (`;
const replacement = `      </div>\n\n      <PendingUploadsRetry />\n\n      {loading ? (`;

if (!source.includes(insertAfter)) {
  console.error("Could not find DriverScan insertion point.");
  process.exit(1);
}

fs.writeFileSync(filePath, source.replace(insertAfter, replacement));
console.log("Pending uploads retry wired in DriverScan.");
