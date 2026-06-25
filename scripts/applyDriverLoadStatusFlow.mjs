import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("src/pages/driver/DriverLoadDetail.jsx");
let source = fs.readFileSync(filePath, "utf8");

const importLine = 'import { DRIVER_LOAD_STATUS_FLOW, getDriverStatusProgress, getNextDriverLoadStatus, getStatusActionLabel, isValidDriverStatusTransition } from "@/lib/driverLoadStatusFlow";';
if (!source.includes(importLine)) {
  source = source.replace(
    'import ArrivalModal from "@/components/driver/ArrivalModal";\n',
    'import ArrivalModal from "@/components/driver/ArrivalModal";\n' + importLine + '\n'
  );
}

const localWorkflow = `// ─── Status workflow ──────────────────────────────────────────────────────────
const STATUS_SEQUENCE = [
  "assigned","accepted","en_route","arrived_pickup",
  "loaded","in_transit","arrived_delivery","delivered","pod_uploaded","completed"
];
const STATUS_ACTIONS = {
  assigned:         { next: "accepted",         label: "Accept Load",           color: "green" },
  accepted:         { next: "en_route",          label: "En Route to Pickup",      color: "blue" },
  en_route:         { next: "arrived_pickup",    label: "Arrived at Pickup",       color: "orange" },
  arrived_pickup:   { next: "loaded",            label: "Confirm Loaded",        color: "orange" },
  loaded:           { next: "in_transit",        label: "Depart — Start Transit", color: "orange" },
  in_transit:       { next: "arrived_delivery",  label: "Arrived at Delivery",   color: "blue" },
  arrived_delivery: { next: "delivered",         label: "Confirm Delivered",     color: "green" },
  delivered:        { next: "pod_uploaded",      label: "Upload POD to Complete", color: "green" },
};`;

const sharedWorkflow = `// ─── Status workflow ──────────────────────────────────────────────────────────
const STATUS_SEQUENCE = DRIVER_LOAD_STATUS_FLOW;`;

if (source.includes(localWorkflow)) {
  source = source.replace(localWorkflow, sharedWorkflow);
}

source = source.replace(
  '  const action = STATUS_ACTIONS[load.status];\n  const progress = idx >= 0 ? ((idx + 1) / STATUS_SEQUENCE.length) * 100 : 100;',
  '  const nextStatus = getNextDriverLoadStatus(load.status);\n  const action = nextStatus ? { next: nextStatus, label: getStatusActionLabel(load.status) } : null;\n  const progress = getDriverStatusProgress(load.status);'
);

source = source.replace(
  '    const action = STATUS_ACTIONS[load.status];\n    if (!action) return;',
  '    const nextStatus = getNextDriverLoadStatus(load.status);\n    if (!nextStatus || !isValidDriverStatusTransition(load.status, nextStatus)) return;\n    const action = { next: nextStatus };'
);

fs.writeFileSync(filePath, source);
console.log("Driver load status flow helper wired in DriverLoadDetail.jsx.");
