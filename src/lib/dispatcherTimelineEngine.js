export const DISPATCH_TIMELINE_EVENT_TYPES = [
  "load_created",
  "driver_matched",
  "driver_assigned",
  "driver_accepted",
  "driver_rejected",
  "arrived_pickup",
  "loaded",
  "arrived_delivery",
  "delivered",
  "pod_uploaded",
  "broker_update_sent",
  "exception_created",
  "exception_resolved",
];

function nowIso() {
  return new Date().toISOString();
}

export function createDispatchTimelineEvent(input = {}) {
  return {
    id: input.id || `dispatch-timeline-${input.event_type || "event"}-${Date.now()}`,
    load_id: input.load_id || null,
    driver_id: input.driver_id || null,
    actor_id: input.actor_id || null,
    actor_role: input.actor_role || "dispatcher",
    event_type: input.event_type || "dispatch_note",
    message: input.message || "Dispatch event recorded.",
    metadata: input.metadata || {},
    created_at: input.created_at || nowIso(),
  };
}

export function buildDispatchTimelineFromLoad(load = {}) {
  const events = [];
  events.push(createDispatchTimelineEvent({ load_id: load.id, event_type: "load_created", message: `${load.load_number || "Load"} created.`, created_at: load.created_date || load.created_at || nowIso() }));
  if (load.driver_id) events.push(createDispatchTimelineEvent({ load_id: load.id, driver_id: load.driver_id, event_type: "driver_assigned", message: "Driver assigned to load.", created_at: load.assigned_at || load.updated_date || nowIso() }));
  if (["accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery", "delivered", "completed"].includes(load.status)) events.push(createDispatchTimelineEvent({ load_id: load.id, driver_id: load.driver_id, event_type: "driver_accepted", message: "Driver accepted or active on load.", created_at: load.accepted_at || load.updated_date || nowIso() }));
  if (["arrived_pickup", "loaded", "in_transit", "arrived_delivery", "delivered", "completed"].includes(load.status)) events.push(createDispatchTimelineEvent({ load_id: load.id, driver_id: load.driver_id, event_type: "arrived_pickup", message: "Driver arrived at pickup." }));
  if (["loaded", "in_transit", "arrived_delivery", "delivered", "completed"].includes(load.status)) events.push(createDispatchTimelineEvent({ load_id: load.id, driver_id: load.driver_id, event_type: "loaded", message: "Load confirmed loaded." }));
  if (["arrived_delivery", "delivered", "completed"].includes(load.status)) events.push(createDispatchTimelineEvent({ load_id: load.id, driver_id: load.driver_id, event_type: "arrived_delivery", message: "Driver arrived at delivery." }));
  if (["delivered", "completed"].includes(load.status)) events.push(createDispatchTimelineEvent({ load_id: load.id, driver_id: load.driver_id, event_type: "delivered", message: "Load delivered." }));
  if (load.pod_uploaded || load.pod_document_id) events.push(createDispatchTimelineEvent({ load_id: load.id, driver_id: load.driver_id, event_type: "pod_uploaded", message: "POD uploaded." }));
  return events.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export function buildDispatchTimelineDashboard(loads = []) {
  const events = loads.flatMap((load) => buildDispatchTimelineFromLoad(load));
  return {
    total_events: events.length,
    load_count: loads.length,
    latest_events: events.slice(-20).reverse(),
    events_by_type: DISPATCH_TIMELINE_EVENT_TYPES.reduce((acc, type) => ({ ...acc, [type]: events.filter((event) => event.event_type === type).length }), {}),
  };
}
