import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/components/driver/CameraUpload.jsx");
let source = fs.readFileSync(filePath, "utf8");

if (!source.includes('import { addPendingUpload } from "@/lib/pendingUploads";')) {
  source = source.replace(
    'import { base44 } from "@/api/base44Client";\n',
    'import { base44 } from "@/api/base44Client";\nimport { addPendingUpload } from "@/lib/pendingUploads";\n'
  );
}

const oldBlock = `        const pending = JSON.parse(localStorage.getItem("hasten_pending_uploads") || "[]");
        pending.push({ data: e.target.result, name: file.name, type: file.type, docType, queuedAt: Date.now() });
        localStorage.setItem("hasten_pending_uploads", JSON.stringify(pending));`;

const newBlock = `        addPendingUpload({ data: e.target.result, name: file.name, type: file.type, docType, queuedAt: Date.now() });`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, source);
  console.log("Camera upload pending helper wired.");
} else if (source.includes(newBlock)) {
  console.log("Camera upload pending helper is already wired.");
} else {
  console.error("Could not find pending upload localStorage block.");
  process.exit(1);
}
