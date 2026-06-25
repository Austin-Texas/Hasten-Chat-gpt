import {
  canMoveToNextStatus,
  getDriverStatusProgress,
  getNextDriverLoadStatus,
  getStatusActionLabel,
  isValidDriverStatusTransition,
} from "../src/lib/driverLoadStatusFlow.js";

const checks = [
  ["assigned moves to accepted", getNextDriverLoadStatus("assigned") === "accepted"],
  ["accepted can move next", canMoveToNextStatus("accepted")],
  ["completed has no next", !canMoveToNextStatus("completed")],
  ["valid next transition", isValidDriverStatusTransition("accepted", "en_route")],
  ["invalid skip transition rejected", !isValidDriverStatusTransition("accepted", "loaded")],
  ["terminal transition rejected", !isValidDriverStatusTransition("completed", "assigned")],
  ["progress is positive", getDriverStatusProgress("assigned") > 0],
  ["completed progress is 100", getDriverStatusProgress("completed") === 100],
  ["action label exists", getStatusActionLabel("accepted") === "Start Route"],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length) {
  console.error("Driver load status flow verification failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Driver load status flow verification passed.");
