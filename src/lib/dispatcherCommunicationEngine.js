export const DISPATCH_COMMUNICATION_TYPES = ["broker_update", "customer_update", "driver_message", "call_note", "email_note", "escalation_note"];

function nowIso() {
  return new Date().toISOString();
}

export function createDispatchCommunication(input = {}) {
  return {
    id: input.id || `dispatch-comm-${input.load_id || "load"}-${Date.now()}`,
    load_id: input.load_id || null,
    broker_id: input.broker_id || null,
    customer_id: input.customer_id || null,
    driver_id: input.driver_id || null,
    type: input.type || "broker_update",
    channel: input.channel || "manual_note",
    direction: input.direction || "outbound",
    subject: input.subject || "Dispatch update",
    body: input.body || "Update recorded.",
    status: input.status || "logged",
    created_by: input.created_by || "dispatcher",
    created_at: input.created_at || nowIso(),
  };
}

export function buildBrokerUpdatePayload(load = {}, eta = null) {
  return {
    load_id: load.id,
    subject: `Update for ${load.load_number || "load"}`,
    body: [
      `Load: ${load.load_number || "N/A"}`,
      `Status: ${load.status || "N/A"}`,
      `Origin: ${[load.origin_city, load.origin_state].filter(Boolean).join(", ")}`,
      `Destination: ${[load.destination_city, load.destination_state].filter(Boolean).join(", ")}`,
      eta ? `ETA: ${eta}` : null,
    ].filter(Boolean).join("\n"),
  };
}

export function buildDispatchCommunicationDashboard(loads = [], messages = []) {
  const generatedUpdates = loads
    .filter((load) => ["accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery"].includes(load.status))
    .map((load) => createDispatchCommunication({ ...buildBrokerUpdatePayload(load, load.eta), load_id: load.id, broker_id: load.broker_id, customer_id: load.client_id }));
  const all = [...messages, ...generatedUpdates];
  return {
    total_threads: new Set(all.map((item) => item.load_id).filter(Boolean)).size,
    total_messages: all.length,
    broker_updates_due: generatedUpdates.filter((item) => item.status === "logged").length,
    latest_messages: all.slice(-20).reverse(),
    templates: [
      "Driver accepted and is en route.",
      "Driver arrived at shipper.",
      "Loaded and rolling to receiver.",
      "Delivery completed, POD pending.",
      "Delay risk detected; dispatcher monitoring.",
    ],
  };
}
