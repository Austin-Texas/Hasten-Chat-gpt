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

source = source.replace(
  '<span className="text-slate-300 text-xs font-medium">Browse Files</span>',
  '<span className="text-slate-300 text-xs font-medium">Browse Files</span>'
);

if (!source.includes("max {MAX_UPLOAD_MB}MB")) {
  source = source.replace(
    '        </div>\n      )}',
    '        </div>\n        <p className="text-[10px] text-slate-600 text-center">{label} · max {MAX_UPLOAD_MB}MB</p>\n      )}'
  );
}

fs.writeFileSync(filePath, source);
console.log("Camera upload validation patch applied.");
