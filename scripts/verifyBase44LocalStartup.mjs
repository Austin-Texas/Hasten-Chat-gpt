import fs from "node:fs";

const file = "src/api/base44Client.js";
const content = fs.readFileSync(file, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(content.includes("const getRealClient = () =>"), "Base44 client must lazy initialize real SDK.");
assert(content.includes("if (isLocalDemoMode || realClientFailed) return null;"), "Local demo mode must not initialize real SDK.");
assert(!content.includes("const realBase44Client = createClient"), "Real Base44 client must not be created at module load.");
assert(content.includes("service token"), "Service-token failures must be treated as recoverable fallback errors.");
assert(content.includes("export const base44 = makeBase44(isLocalDemoMode);"), "base44 export must use safe factory.");

console.log("PASS Base44 local startup verification");
