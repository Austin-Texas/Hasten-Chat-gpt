import fs from "node:fs";

const source = fs.readFileSync("src/pages/driver/DriverLoadDetail.jsx", "utf8");

const wired = source.includes("driverLoadStatusFlow") &&
  source.includes("getNextDriverLoadStatus") &&
  source.includes("isValidDriverStatusTransition");

if (wired) {
  console.log("Driver load status flow helper is wired.");
  process.exit(0);
}

console.log("Driver load status flow helper is not wired yet. Run scripts/applyDriverLoadStatusFlow.mjs.");
