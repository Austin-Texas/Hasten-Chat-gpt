import fs from "node:fs";
import path from "node:path";

const appPath = path.resolve("src/App.jsx");
const before = "import DriverLoadDetail from '@/pages/driver/DriverLoadDetail';";
const after = "import DriverLoadDetail from '@/pages/driver/DriverLoadDetailAccessGate';";

const source = fs.readFileSync(appPath, "utf8");
if (source.includes(after)) {
  console.log("Driver load detail access gate is already wired.");
  process.exit(0);
}

if (!source.includes(before)) {
  console.error("Could not find DriverLoadDetail import to patch.");
  process.exit(1);
}

fs.writeFileSync(appPath, source.replace(before, after));
console.log("Driver load detail access gate wired in src/App.jsx.");
