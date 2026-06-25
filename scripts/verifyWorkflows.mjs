import fs from "node:fs";

const workflows = [
  ["Build CI", ".github/workflows/ci.yml", "npm run build"],
  ["Helper verification", ".github/workflows/verify-helpers.yml", "verifyDriverReadiness"],
  ["Verify all", ".github/workflows/verify-all.yml", "verifyAllHelpers"],
];

const failed = [];
for (const [label, file, text] of workflows) {
  if (!fs.existsSync(file)) {
    failed.push(`${label}: missing ${file}`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(text)) failed.push(`${label}: missing ${text}`);
}

if (failed.length) {
  console.error("Workflow verification failed:");
  failed.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log("Workflow verification passed.");
