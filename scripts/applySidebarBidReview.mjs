import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/components/HastenLayout.jsx");
const source = fs.readFileSync(filePath, "utf8");

const bidReviewLine = '    item("Bid Review", MessageSquare, "/dispatch/bid-review", "Load Marketplace"),';
if (source.includes(bidReviewLine)) {
  console.log("Bid Review is already present in sidebar navigation.");
  process.exit(0);
}

const marketplaceLine = '    item("Marketplace", Layers, "/dispatch/load-marketplace", "Load Marketplace"),';
const count = source.split(marketplaceLine).length - 1;

if (count < 1) {
  console.error("Could not find Marketplace sidebar item.");
  process.exit(1);
}

const patched = source.replaceAll(marketplaceLine, `${marketplaceLine}\n${bidReviewLine}`);
fs.writeFileSync(filePath, patched);
console.log(`Inserted Bid Review after ${count} Marketplace sidebar item(s).`);
