import {
  buildQueuedUploadContext,
  getQueuedUploadContext,
  hasQueuedUploadTarget,
  mergeQueuedUploadContext,
} from "../src/lib/queuedUploadContext.js";

const context = buildQueuedUploadContext({
  targetId: "load-1",
  targetType: "load",
  fileRole: "pod",
  source: "driver_scan",
});
const item = mergeQueuedUploadContext({ name: "proof.jpg" }, context);
const resolved = getQueuedUploadContext(item);

const checks = [
  ["target id saved", resolved.target_id === "load-1"],
  ["target type saved", resolved.target_type === "load"],
  ["file role saved", resolved.file_role === "pod"],
  ["target detected", hasQueuedUploadTarget(item)],
  ["missing target rejected", !hasQueuedUploadTarget({})],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length) {
  console.error("Queued upload context verification failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Queued upload context verification passed.");
