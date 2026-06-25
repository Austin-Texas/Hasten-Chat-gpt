import fs from "node:fs";

const files = [
  [".env", ".env"],
  [".env.example", ".env.example"],
  ["Vite config", "vite.config.js"],
  ["Package file", "package.json"],
];

console.log("HASTEN environment readiness\n");
for (const [label, file] of files) {
  console.log(`${fs.existsSync(file) ? "✅" : "⚠️"} ${label}: ${file}`);
}

console.log("\nInformational report only. Do not commit real secrets.");
