import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/components/driver/CameraUpload.jsx");
let source = fs.readFileSync(filePath, "utf8");

source = source.replace(
  'import { Camera, Upload, X, CheckCircle, AlertCircle, Image } from "lucide-react";',
  'import { Camera, Upload, X, CheckCircle, AlertCircle } from "lucide-react";'
);

if (!source.includes("const MAX_UPLOAD_MB = 15;")) {
  source = source.replace(
    'import { Camera, Upload, X, CheckCircle, AlertCircle } from "lucide-react";\n',
    'import { Camera, Upload, X, CheckCircle, AlertCircle } from "lucide-react";\n\nconst MAX_UPLOAD_MB = 15;\n'
  );
}

if (!source.includes("const fileSizeMb = file.size / (1024 * 1024);")) {
  source = source.replace(
    '    setError("");\n    setDone(false);',
    '    setError("");\n    setDone(false);\n\n    const fileSizeMb = file.size / (1024 * 1024);\n    if (fileSizeMb > MAX_UPLOAD_MB) {\n      setPreview(null);\n      setError(`File is too large. Maximum upload size is ${MAX_UPLOAD_MB}MB.`);\n      return;\n    }'
  );
}

const browseInput = '<input ref={fileRef} type="file" accept={accept} className="hidden"\n            onChange={e => handleFile(e.target.files?.[0])} />';
const browseWithNote = `${browseInput}\n          <p className="text-[10px] text-slate-600 text-center col-span-2">{label} · max {MAX_UPLOAD_MB}MB</p>`;

if (!source.includes("max {MAX_UPLOAD_MB}MB")) {
  if (!source.includes(browseInput)) {
    console.error("Could not find browse file input block.");
    process.exit(1);
  }
  source = source.replace(browseInput, browseWithNote);
}

fs.writeFileSync(filePath, source);
console.log("Safe camera upload validation patch applied.");
