import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/pages/driver/DriverLoadDetail.jsx");
let source = fs.readFileSync(filePath, "utf8");

const replacements = [
  {
    from: '<CameraUpload docType="bol" label="Upload BOL" onUploaded={(url) => handleDocUploaded(url, "bol")} />',
    to: '<CameraUpload docType="bol" label="Upload BOL" targetId={load.id} targetType="load" onUploaded={(url) => handleDocUploaded(url, "bol")} />',
  },
  {
    from: '<CameraUpload docType="pod" label="Upload POD" onUploaded={(url) => handleDocUploaded(url, "pod")} />',
    to: '<CameraUpload docType="pod" label="Upload POD" targetId={load.id} targetType="load" onUploaded={(url) => handleDocUploaded(url, "pod")} />',
  },
  {
    from: '<CameraUpload\n              docType="receipt"\n              label="Attach Receipt"\n              onUploaded={(url) => setReceiptUrl(url)}\n            />',
    to: '<CameraUpload\n              docType="receipt"\n              label="Attach Receipt"\n              targetId={load.id}\n              targetType="load_expense"\n              onUploaded={(url) => setReceiptUrl(url)}\n            />',
  },
];

let changed = false;
for (const { from, to } of replacements) {
  if (source.includes(to)) continue;
  if (source.includes(from)) {
    source = source.replace(from, to);
    changed = true;
  }
}

if (!changed && !source.includes('targetType="load"')) {
  console.error("Could not find DriverLoadDetail CameraUpload blocks to patch.");
  process.exit(1);
}

fs.writeFileSync(filePath, source);
console.log("DriverLoadDetail upload context patch applied.");
