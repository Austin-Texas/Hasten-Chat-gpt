import { buildQueuedUploadRecordAction, buildQueuedUploadRecordActions } from "../src/lib/queuedUploadRecordActions.js";

const bolItem = {
  file_url: "https://files.example/bol.pdf",
  context: { target_id: "load-1", target_type: "load", file_role: "bol" },
};
const podItem = {
  file_url: "https://files.example/pod.jpg",
  context: { target_id: "load-2", target_type: "load", file_role: "pod" },
};
const receiptItem = {
  file_url: "https://files.example/receipt.jpg",
  context: { target_id: "expense-1", target_type: "load_expense", file_role: "receipt" },
};

const bolAction = buildQueuedUploadRecordAction(bolItem);
const podAction = buildQueuedUploadRecordAction(podItem);
const receiptAction = buildQueuedUploadRecordAction(receiptItem);
const actions = buildQueuedUploadRecordActions([bolItem, podItem, receiptItem, {}]);

const checks = [
  ["bol maps to Load", bolAction?.entity === "Load"],
  ["bol maps to bol_url", bolAction?.updates?.bol_url === bolItem.file_url],
  ["pod maps to pod_url", podAction?.updates?.pod_url === podItem.file_url],
  ["receipt maps to Expense", receiptAction?.entity === "Expense"],
  ["receipt maps to receipt_url", receiptAction?.updates?.receipt_url === receiptItem.file_url],
  ["action list filters invalid", actions.length === 3],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length) {
  console.error("Queued upload record action verification failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Queued upload record action verification passed.");
