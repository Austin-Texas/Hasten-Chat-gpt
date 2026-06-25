import fs from "node:fs";
import path from "node:path";

const appPath = path.resolve("src/App.jsx");
const currentImport = "import DriverLoadDetail from '@/pages/driver/DriverLoadDetail';";
const gatedImport = "import DriverLoadDetail from '@/pages/driver/DriverLoadDetailAccessGate';";

const source = fs.readFileSync(appPath, "utf8");

if (source.includes(gatedImport)) {
  console.log("Driver load detail gate is wired.");
  process.exit(0);
}

if (source.includes(currentImport)) {
  console.log("Driver load detail gate is not wired yet. Run scripts/applyDriverLoadDetailGate.mjs to patch App.jsx.");
  process.exit(0);
}

console.error("Could not determine DriverLoadDetail route wiring state.");
process.exit(1);
