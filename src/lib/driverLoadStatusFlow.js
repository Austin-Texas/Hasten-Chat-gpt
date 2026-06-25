export const DRIVER_LOAD_STATUS_FLOW = [
  "assigned",
  "accepted",
  "en_route",
  "arrived_pickup",
  "loaded",
  "in_transit",
  "arrived_delivery",
  "delivered",
  "pod_uploaded",
  "completed",
];

export const DRIVER_TERMINAL_STATUSES = ["completed", "cancelled"];

export function getStatusIndex(status) {
  return DRIVER_LOAD_STATUS_FLOW.indexOf(status);
}

export function getNextDriverLoadStatus(status) {
  const index = getStatusIndex(status);
  if (index < 0 || index >= DRIVER_LOAD_STATUS_FLOW.length - 1) return null;
  return DRIVER_LOAD_STATUS_FLOW[index + 1];
}

export function canMoveToNextStatus(status) {
  return Boolean(getNextDriverLoadStatus(status));
}

export function isValidDriverStatusTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  if (DRIVER_TERMINAL_STATUSES.includes(fromStatus)) return false;
  return getNextDriverLoadStatus(fromStatus) === toStatus;
}

export function getDriverStatusProgress(status) {
  const index = getStatusIndex(status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / DRIVER_LOAD_STATUS_FLOW.length) * 100);
}

export function getStatusActionLabel(status) {
  const next = getNextDriverLoadStatus(status);
  if (!next) return "No next status";
  const labels = {
    accepted: "Accept Load",
    en_route: "Start Route",
    arrived_pickup: "Arrived Pickup",
    loaded: "Mark Loaded",
    in_transit: "Start Transit",
    arrived_delivery: "Arrived Delivery",
    delivered: "Mark Delivered",
    pod_uploaded: "Upload POD",
    completed: "Complete Load",
  };
  return labels[next] || `Move to ${next.replaceAll("_", " ")}`;
}
