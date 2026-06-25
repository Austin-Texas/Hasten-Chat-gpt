import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/pages/Compliance.jsx");
let source = fs.readFileSync(filePath, "utf8");

if (!source.includes("import { Link } from \"react-router-dom\";")) {
  source = source.replace(
    "import { useState, useEffect } from \"react\";",
    "import { useState, useEffect } from \"react\";\nimport { Link } from \"react-router-dom\";"
  );
}

source = source.replace(
  "import { AlertTriangle, CheckCircle2, Clock, FileText, BarChart3, Filter, Download, TrendingDown } from \"lucide-react\";",
  "import { AlertTriangle, CheckCircle2, Clock, FileText, BarChart3, Filter, Download, TrendingDown, ShieldCheck } from \"lucide-react\";"
);

if (source.includes("/drivers/readiness")) {
  console.log("Compliance readiness shortcut is already wired.");
  fs.writeFileSync(filePath, source);
  process.exit(0);
}

const oldBlock = `        <button\n          onClick={handleExport}\n          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"\n        >\n          <Download className="w-4 h-4" />\n          Export Report\n        </button>`;

const newBlock = `        <div className="flex items-center gap-2">\n          <Link\n            to="/drivers/readiness"\n            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 hover:text-white transition-colors"\n          >\n            <ShieldCheck className="w-4 h-4" />\n            Driver Readiness\n          </Link>\n          <button\n            onClick={handleExport}\n            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"\n          >\n            <Download className="w-4 h-4" />\n            Export Report\n          </button>\n        </div>`;

if (!source.includes(oldBlock)) {
  console.error("Could not find Compliance export button block.");
  process.exit(1);
}

fs.writeFileSync(filePath, source.replace(oldBlock, newBlock));
console.log("Compliance readiness shortcut wired.");
