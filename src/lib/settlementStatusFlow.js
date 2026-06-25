export const SETTLEMENT_STATUS_FLOW = [
  "draft",
  "pending_review",
  "approved",
  "paid",
];

export const SETTLEMENT_TERMINAL_STATUSES = ["paid", "void", "cancelled", "rejected"];

export function getSettlementStatusIndex(status) {
  return SETTLEMENT_STATUS_FLOW.indexOf(status);
}

export function getNextSettlementStatus(status) {
  const index = getSettlementStatusIndex(status);
  if (index < 0 || index >= SETTLEMENT_STATUS_FLOW.length - 1) return null;
  return SETTLEMENT_STATUS_FLOW[index + 1];
}

export function canMoveSettlementNext(status) {
  return Boolean(getNextSettlementStatus(status));
}

export function isValidSettlementStatusTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  if (SETTLEMENT_TERMINAL_STATUSES.includes(fromStatus)) return false;
  return getNextSettlementStatus(fromStatus) === toStatus;
}

export function settlementStatusLabel(status) {
  const labels = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    paid: "Paid",
    void: "Void",
    cancelled: "Cancelled",
    rejected: "Rejected",
  };
  return labels[status] || String(status || "Unknown").replaceAll("_", " ");
}

export function getSettlementProgress(status) {
  const index = getSettlementStatusIndex(status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / SETTLEMENT_STATUS_FLOW.length) * 100);
}
