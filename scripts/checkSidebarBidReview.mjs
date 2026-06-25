import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/components/HastenLayout.jsx");
const source = fs.readFileSync(filePath, "utf8");

if (source.includes('/dispatch/bid-review')) {
  console.log("Sidebar Bid Review shortcut is wired.");
  process.exit(0);
}

console.log("Sidebar Bid Review shortcut is not wired yet. Run scripts/applySidebarBidReview.mjs to patch HastenLayout.jsx.");
