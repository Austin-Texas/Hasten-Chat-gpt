import fs from "node:fs";

const files = [".env", ".env.example", "package.json", "vite.config.js"];

console.log("HASTEN secret safety report\n");
for (const file of files) {
  const exists = fs.existsSync(file);
  console.log(`${exists ? "✅" : "⚠️"} ${file}${file === ".env" && exists ? " should stay local only" : ""}`);
}

console.log("\nReview manually before release. Do not publish real keys in Git.");
