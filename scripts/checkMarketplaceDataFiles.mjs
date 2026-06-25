import fs from "node:fs";

const required = [
  "src/pages/LoadMarketplace.jsx",
  "src/pages/DispatchBidReview.jsx",
  "src/lib/equipmentMatching.js",
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Marketplace data file check failed:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Marketplace data file check passed.");
