import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function collectScripts(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".mjs"))
    .map((file) => path.join(dir, file))
    .sort();
}

const scripts = collectScripts("scripts");
const failed = [];

for (const script of scripts) {
  const result = spawnSync("node", ["--check", script], { encoding: "utf8" });
  if (result.status !== 0) {
    failed.push({ script, error: result.stderr || result.stdout });
  }
}

if (failed.length) {
  console.error("Script syntax verification failed:");
  failed.forEach(({ script, error }) => {
    console.error(`\n- ${script}`);
    console.error(error.trim());
  });
  process.exit(1);
}

console.log(`Script syntax verification passed for ${scripts.length} script(s).`);
