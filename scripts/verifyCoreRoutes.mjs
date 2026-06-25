import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx", "utf8");

const routes = [
  "/dashboard",
  "/drivers",
  "/drivers/readiness",
  "/dispatch/load-marketplace",
  "/dispatch/bid-review",
  "/finance/settlements",
  "/driver/dashboard",
  "/driver/loads",
  "/driver/loads/:id",
  "/driver/scan",
  "/driver/messages",
  "/driver/profile",
  "/driver/profile/about-vehicle",
  "/driver/settlement-preview",
];

const missing = routes.filter((route) => !app.includes(`path="${route}"`));
if (missing.length) {
  console.error("Missing core routes:");
  missing.forEach((route) => console.error(`- ${route}`));
  process.exit(1);
}

console.log("Core route verification passed.");
