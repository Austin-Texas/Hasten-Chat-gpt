import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/components/driver/CameraUpload.jsx");
let source = fs.readFileSync(filePath, "utf8");

if (!source.includes('import { buildQueuedUploadContext } from "@/lib/queuedUploadContext";')) {
  source = source.replace(
    'import { base44 } from "@/api/base44Client";\n',
    'import { base44 } from "@/api/base44Client";\nimport { buildQueuedUploadContext } from "@/lib/queuedUploadContext";\n'
  );
}

source = source.replace(
  'export default function CameraUpload({ onUploaded, label = "Upload Document", accept = "image/*,application/pdf", docType = "document" }) {',
  'export default function CameraUpload({ onUploaded, label = "Upload Document", accept = "image/*,application/pdf", docType = "document", targetId = null, targetType = null }) {'
);

const oldItem = '{ data: e.target.result, name: file.name, type: file.type, docType, queuedAt: Date.now() }';
const newItem = '{ data: e.target.result, name: file.name, type: file.type, docType, context: buildQueuedUploadContext({ targetId, targetType, fileRole: docType }), queuedAt: Date.now() }';

if (source.includes(oldItem)) {
  source = source.replace(oldItem, newItem);
} else if (!source.includes('buildQueuedUploadContext({ targetId, targetType, fileRole: docType })')) {
  console.error("Could not find queued upload item block in CameraUpload.jsx.");
  process.exit(1);
}

fs.writeFileSync(filePath, source);
console.log("CameraUpload queued upload context patch applied.");
