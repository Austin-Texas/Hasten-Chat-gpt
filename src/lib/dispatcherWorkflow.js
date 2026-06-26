import { base44, isLocalDemoMode } from "@/api/base44Client";

export const DISPATCHER_EVENTS = {
  LOAD_CREATED: "LOAD_CREATED",
  LOAD_ASSIGNED: "LOAD_ASSIGNED",
  DRIVER_ACCEPTED: "DRIVER_ACCEPTED",
  DRIVER_REJECTED: "DRIVER_REJECTED",
  ARRIVED_PICKUP: "ARRIVED_PICKUP",
  LOADED: "LOADED",
  IN_TRANSIT: "IN_TRANSIT",
  ARRIVED_DELIVERY: "ARRIVED_DELIVERY",
  DELIVERED: "DELIVERED",
  POD_UPLOADED: "POD_UPLOADED",
  INVOICE_CREATED: "INVOICE_CREATED",
  SETTLEMENT_CREATED: "SETTLEMENT_CREATED",
  LOAD_CLOSED: "LOAD_CLOSED",
};

export const DISPATCHER_EXCEPTIONS = {
  NO_DRIVER_ASSIGNED: "NO_DRIVER_ASSIGNED",
  LATE_PICKUP_RISK: "LATE_PICKUP_RISK",
  LATE_DELIVERY_RISK: "LATE_DELIVERY_RISK",
  MISSING_RATE_CONFIRMATION: "MISSING_RATE_CONFIRMATION",
  MISSING_POD: "MISSING_POD",
  CUSTOMER_CREDIT_HOLD: "CUSTOMER_CREDIT_HOLD",
  DRIVER_DOC_EXPIRED: "DRIVER_DOC_EXPIRED",
  TRUCK_MAINTENANCE_DUE: "TRUCK_MAINTENANCE_DUE",
  TRACKING_LOST: "TRACKING_LOST",
};

export const CUSTOMER_TYPES = ["broker", "direct_client", "shipper", "receiver"];

function now() {
  return new Date().toISOString();
}

function asNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

async function safeCreate(entityName, payload) {
  try {
    return await base44.entities[entityName].create(payload);
  } catch (error) {
    console.warn(`[dispatcherWorkflow] ${entityName}.create skipped`, error?.message || error);
    return null;
  }
}

async function safeList(entityName, sort = "-created_date", limit = 200) {
  try {
    return await base44.entities[entityName].list(sort, limit);
  } catch (error) {
    console.warn(`[dispatcherWorkflow] ${entityName}.list skipped`, error?.message || error);
    return [];
  }
}

async function safeUpdate(entityName, id, payload) {
  try {
    return await base44.entities[entityName].update(id, payload);
  } catch (error) {
    console.warn(`[dispatcherWorkflow] ${entityName}.update skipped`, error?.message || error);
    return null;
  }
}

export async function listCustomers(sort = "-created_date", limit = 200) {
  const customers = await safeList("Customer", sort, limit);
  if (customers.length) return customers;

  // Migration compatibility only: old local/dev records may still live in Client.
  const legacy = await safeList("Client", sort, limit);
  return legacy.map(normalizeCustomer);
}

export async function getCustomer(id) {
  try {
    const record = await base44.entities.Customer.get(id);
    if (record?.id) return normalizeCustomer(record);
  } catch (error) {
    console.warn("[dispatcherWorkflow] Customer.get fallback", error?.message || error);
  }
  try {
    const record = await base44.entities.Client.get(id);
    return normalizeCustomer(record);
  } catch {
    return null;
  }
}

export function normalizeCustomer(payload = {}) {
  const type = payload.customer_type || payload.type || "direct_client";
  return {
    ...payload,
    customer_type: type,
    type,
    status: payload.status || "active",
    payment_terms: payload.payment_terms || "net30",
    billing_status: payload.billing_status || "active",
    updated_at: payload.updated_at || now(),
  };
}

export async function saveCustomer(payload = {}, id = null) {
  const normalized = normalizeCustomer(payload);
  const record = id
    ? await base44.entities.Customer.update(id, normalized)
    : await base44.entities.Customer.create({ ...normalized, created_at: normalized.created_at || now() });

  await logDispatcherEvent("CUSTOMER_SAVED", {
    entity_type: "Customer",
    entity_id: record.id,
    customer_id: record.id,
    customer_name: record.company_name,
    event_label: id ? "Customer updated" : "Customer created",
  });

  return normalizeCustomer(record);
}

export async function logDispatcherEvent(eventType, payload = {}) {
  const event = {
    event_type: eventType,
    type: eventType,
    entity_type: payload.entity_type || "Load",
    entity_id: payload.entity_id || payload.load_id || payload.customer_id || payload.document_id,
    load_id: payload.load_id,
    driver_id: payload.driver_id,
    customer_id: payload.customer_id,
    title: payload.title || payload.event_label || eventType,
    description: payload.description || payload.event_label || eventType,
    metadata: JSON.stringify({ ...payload, dispatcher_event: true }),
    created_at: now(),
    created_by: payload.created_by || "dispatcher",
  };

  await safeCreate("DispatcherEvent", event);
  await safeCreate("TimelineEvent", event);
  return event;
}

export async function createException(exceptionType, payload = {}) {
  const exception = {
    exception_type: exceptionType,
    type: exceptionType,
    status: payload.status || "open",
    severity: payload.severity || "medium",
    load_id: payload.load_id,
    driver_id: payload.driver_id,
    customer_id: payload.customer_id,
    title: payload.title || exceptionType,
    description: payload.description || exceptionType,
    metadata: JSON.stringify(payload),
    created_at: now(),
    updated_at: now(),
  };
  await safeCreate("DispatcherException", exception);
  await safeCreate("TimelineEvent", {
    ...exception,
    event_type: "DISPATCH_EXCEPTION",
    entity_type: "DispatcherException",
    entity_id: exception.load_id || exception.driver_id || exception.customer_id,
  });
  return exception;
}

export function normalizeLoadPayload(payload = {}) {
  const miles = asNumber(payload.miles ?? payload.miles_total);
  const rate = asNumber(payload.rate ?? payload.total_revenue);
  const weight = asNumber(payload.weight);
  const ratePerMile = asNumber(payload.rate_per_mile);
  const next = { ...payload };

  if (Number.isFinite(miles)) {
    next.miles = miles;
    next.miles_total = payload.miles_total ?? miles;
  }
  if (Number.isFinite(rate)) {
    next.rate = rate;
    next.total_revenue = payload.total_revenue ?? rate;
  }
  if (Number.isFinite(weight)) next.weight = weight;

  if (Number.isFinite(rate) && Number.isFinite(miles) && miles > 0) {
    const calculated = Number((rate / miles).toFixed(2));
    if (payload.rate_per_mile === "" || payload.rate_per_mile === undefined || payload.rate_per_mile === null) {
      next.rate_per_mile = calculated;
    } else if (Number.isFinite(ratePerMile) && Math.abs(ratePerMile - calculated) > 0.05) {
      next.__rateConflict = `Rate/mile conflict: $${rate} ÷ ${miles} mi = $${calculated}/mi, not $${ratePerMile}/mi.`;
    } else if (Number.isFinite(ratePerMile)) {
      next.rate_per_mile = ratePerMile;
    }
  }

  return next;
}

export function validateDispatcherLoad(payload = {}, { requireCustomer = true } = {}) {
  const normalized = normalizeLoadPayload(payload);
  const errors = [];
  const customerId = normalized.customer_id || normalized.client_id || normalized.broker_id;

  if (requireCustomer && !customerId) errors.push("Customer is required.");
  if (!normalized.origin_city && !normalized.origin_address) errors.push("Origin is required.");
  if (!normalized.destination_city && !normalized.destination_address) errors.push("Destination is required.");
  if (!normalized.equipment_type && !normalized.required_equipment) errors.push("Equipment type is required.");

  ["miles", "weight", "rate"].forEach((field) => {
    if (normalized[field] !== "" && normalized[field] !== null && normalized[field] !== undefined && Number.isNaN(asNumber(normalized[field]))) {
      errors.push(`${field.replace(/_/g, " ")} must be numeric.`);
    }
  });

  if (normalized.__rateConflict) errors.push(normalized.__rateConflict);

  return { ok: errors.length === 0, errors, payload: normalized };
}

export async function createLoadWithWorkflow(payload = {}) {
  const validation = validateDispatcherLoad(payload, { requireCustomer: Boolean(payload.customer_id || payload.client_id || payload.broker_id) });
  if (!validation.ok) {
    const error = new Error(validation.errors.join(" "));
    error.validationErrors = validation.errors;
    throw error;
  }

  const created = await base44.entities.Load.create({
    ...validation.payload,
    load_number: validation.payload.load_number || `HC-${Date.now().toString().slice(-8)}`,
    status: validation.payload.status || "available",
    created_at: validation.payload.created_at || now(),
    updated_at: now(),
  });

  await logDispatcherEvent(DISPATCHER_EVENTS.LOAD_CREATED, {
    entity_type: "Load",
    entity_id: created.id,
    load_id: created.id,
    customer_id: created.customer_id || created.client_id || created.broker_id,
    title: `Load ${created.load_number || created.id} created`,
    description: `${created.origin_city || "Origin"} → ${created.destination_city || "Destination"}`,
  });

  if (!created.driver_id) {
    await createException(DISPATCHER_EXCEPTIONS.NO_DRIVER_ASSIGNED, {
      load_id: created.id,
      severity: "low",
      title: "No driver assigned",
      description: `Load ${created.load_number || created.id} is available with no assigned driver.`,
    });
  }

  return created;
}

export async function updateLoadStatusWithWorkflow(loadId, newStatus, extra = {}) {
  try {
    await base44.functions.invoke("updateLoadStatus", { load_id: loadId, new_status: newStatus, ...extra });
  } catch {
    await safeUpdate("Load", loadId, { status: newStatus, ...extra, updated_at: now() });
  }

  const eventMap = {
    assigned: DISPATCHER_EVENTS.LOAD_ASSIGNED,
    accepted: DISPATCHER_EVENTS.DRIVER_ACCEPTED,
    rejected: DISPATCHER_EVENTS.DRIVER_REJECTED,
    arrived_pickup: DISPATCHER_EVENTS.ARRIVED_PICKUP,
    loaded: DISPATCHER_EVENTS.LOADED,
    in_transit: DISPATCHER_EVENTS.IN_TRANSIT,
    arrived_delivery: DISPATCHER_EVENTS.ARRIVED_DELIVERY,
    delivered: DISPATCHER_EVENTS.DELIVERED,
    pod_uploaded: DISPATCHER_EVENTS.POD_UPLOADED,
    completed: DISPATCHER_EVENTS.LOAD_CLOSED,
    closed: DISPATCHER_EVENTS.LOAD_CLOSED,
  };

  await logDispatcherEvent(eventMap[newStatus] || "LOAD_STATUS_UPDATED", {
    entity_type: "Load",
    entity_id: loadId,
    load_id: loadId,
    driver_id: extra.driver_id,
    title: `Load status updated to ${newStatus}`,
  });
}

export async function logMarketplaceSync({ status = "success", sourceCount = 0, loadCount = 0, message = "Marketplace sync completed", mode = "manual" } = {}) {
  const job = await safeCreate("MarketplaceSyncJob", {
    status,
    mode,
    source_count: sourceCount,
    load_count: loadCount,
    message,
    started_at: now(),
    completed_at: now(),
  });

  await logDispatcherEvent("MARKETPLACE_SYNC", {
    entity_type: "MarketplaceSyncJob",
    entity_id: job?.id,
    title: message,
    description: `${loadCount} loads · ${sourceCount} sources · ${status}`,
    source_count: sourceCount,
    load_count: loadCount,
    mode,
  });

  return job;
}

export async function ensureDevMarketplaceRecords(localLoads = []) {
  if (!isLocalDemoMode) return { sources: [], loads: [] };
  const nowIso = now();
  const sources = [...new Set(localLoads.map((load) => load.source_provider).filter(Boolean))];

  await Promise.all(sources.map((name) => safeCreate("MarketplaceSource", {
    id: `local-marketplace-source-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    provider: name,
    status: "active",
    configured: true,
    last_sync_at: nowIso,
  })));

  const createdLoads = await Promise.all(localLoads.map((load) => safeCreate("MarketplaceLoad", {
    ...load,
    id: `marketplace-${load.id}`,
    source_provider: load.source_provider,
    external_load_id: load.external_load_id || load.id,
    status: load.normalized_status || "available",
    synced_at: nowIso,
  })));

  return { sources, loads: createdLoads.filter(Boolean) };
}
