export const DISPATCH_SLA_RULES = [
  { id: "pickup-60-min", label: "Pickup within 60 minutes", severity: "medium" },
  { id: "pickup-missed", label: "Pickup appointment missed", severity: "critical" },
  { id: "delivery-risk", label: "Delivery ETA at risk", severity: "high" },
  { id: "pod-missing", label: "POD missing after delivery", severity: "medium" },
  { id: "broker-update", label: "Broker update due", severity: "medium" },
  { id: "detention-eligible", label: "Detention candidate", severity: "info" },
];

function nowIso() {
  return new Date().toISOString();
}

function num(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateDispatchProfitability(load = {}) {
  const rate = num(load.rate || load.total_revenue);
  const driverPay = num(load.driver_pay || load.carrier_pay || load.linehaul_pay);
  const fuel = num(load.fuel_cost || load.estimated_fuel_cost);
  const tolls = num(load.toll_cost || load.estimated_tolls);
  const factoring = num(load.factoring_fee || rate * 0.025);
  const accessorial = num(load.detention_pay || load.layover_pay || load.tonu_pay);
  const totalCost = driverPay + fuel + tolls + factoring + accessorial;
  const margin = rate - totalCost;
  const marginPct = rate > 0 ? Number(((margin / rate) * 100).toFixed(1)) : 0;
  return {
    load_id: load.id,
    rate,
    driver_pay: driverPay,
    fuel,
    tolls,
    factoring,
    accessorial,
    total_cost: Number(totalCost.toFixed(2)),
    margin: Number(margin.toFixed(2)),
    margin_pct: marginPct,
    risk: marginPct < 0 ? "negative" : marginPct < 8 ? "low_margin" : marginPct < 15 ? "watch" : "healthy",
  };
}

export function buildDispatchProfitabilitySummary(loads = []) {
  const rows = loads.map(calculateDispatchProfitability);
  const totalMargin = rows.reduce((sum, row) => sum + row.margin, 0);
  return {
    rows,
    total_margin: Number(totalMargin.toFixed(2)),
    low_margin_count: rows.filter((row) => ["negative", "low_margin"].includes(row.risk)).length,
    healthy_count: rows.filter((row) => row.risk === "healthy").length,
  };
}

export function buildDispatchTimeline(load = {}, driver = null) {
  const driverName = driver?.full_name || `${driver?.first_name || ""} ${driver?.last_name || ""}`.trim() || "Driver";
  const events = [];
  const push = (event_type, label, timestamp, actor = "system") => {
    if (timestamp || event_type === "load_created") {
      events.push({ id: `timeline-${load.id}-${event_type}`, load_id: load.id, event_type, label, actor, timestamp: timestamp || load.created_date || nowIso() });
    }
  };
  push("load_created", "Load created", load.created_date);
  push("driver_assigned", `Assigned to ${driverName}`, load.assigned_at);
  push("driver_accepted", "Driver accepted", load.accepted_at);
  push("arrived_pickup", "Arrived pickup", load.arrived_pickup_at);
  push("loaded", "Loaded", load.loaded_at);
  push("arrived_delivery", "Arrived delivery", load.arrived_delivery_at);
  push("delivered", "Delivered", load.delivered_at);
  push("pod_uploaded", "POD uploaded", load.pod_uploaded_at);
  return events;
}

export function buildBrokerCommunicationItems(loads = []) {
  return loads
    .filter((load) => !["delivered", "completed", "cancelled"].includes(load.status))
    .map((load) => ({
      id: `broker-update-${load.id}`,
      load_id: load.id,
      load_number: load.load_number || `#${String(load.id || "").slice(-6)}`,
      broker_id: load.broker_id || load.client_id || null,
      status: load.last_broker_update_at ? "updated" : "update_due",
      suggested_message: `${load.load_number || "Load"} status: ${load.status || "active"}. ETA: ${load.eta || "pending"}.`,
      last_update_at: load.last_broker_update_at || null,
    }))
    .slice(0, 10);
}

export function buildDispatchSlaAlerts(loads = []) {
  const alerts = [];
  loads.forEach((load) => {
    if (["delivered", "completed"].includes(load.status) && !load.pod_uploaded && !load.pod_document_id) {
      alerts.push({ id: `sla-pod-${load.id}`, load_id: load.id, rule_id: "pod-missing", severity: "medium", message: `${load.load_number || "Load"} delivered but POD is missing.` });
    }
    if (["assigned", "accepted", "en_route", "in_transit"].includes(load.status) && !load.last_broker_update_at) {
      alerts.push({ id: `sla-broker-${load.id}`, load_id: load.id, rule_id: "broker-update", severity: "medium", message: `${load.load_number || "Load"} needs broker update.` });
    }
    if (num(load.dwell_minutes) >= 120) {
      alerts.push({ id: `sla-detention-${load.id}`, load_id: load.id, rule_id: "detention-eligible", severity: "info", message: `${load.load_number || "Load"} may qualify for detention.` });
    }
  });
  return alerts;
}

export function buildDispatchAiRecommendations({ snapshot = {}, loads = [] } = {}) {
  const recommendations = [];
  if (snapshot.sla?.unassigned > 0) recommendations.push("Assign unassigned loads using best-match ranking before pickup window closes.");
  if (snapshot.critical_exceptions > 0) recommendations.push("Resolve critical exceptions before assigning additional freight.");
  const profit = buildDispatchProfitabilitySummary(loads);
  if (profit.low_margin_count > 0) recommendations.push("Review low-margin loads before confirming dispatch plan.");
  const brokerUpdates = buildBrokerCommunicationItems(loads).filter((item) => item.status === "update_due").length;
  if (brokerUpdates > 0) recommendations.push("Send broker/customer status updates for active loads with no recent update.");
  if (!recommendations.length) recommendations.push("Dispatch board is stable. Continue monitoring active loads and ETAs.");
  return recommendations;
}

export function buildDispatcherExtendedSnapshot({ loads = [], drivers = [], snapshot = {} } = {}) {
  return {
    generated_at: nowIso(),
    sla_rules: DISPATCH_SLA_RULES,
    sla_alerts: buildDispatchSlaAlerts(loads),
    profitability: buildDispatchProfitabilitySummary(loads),
    broker_communications: buildBrokerCommunicationItems(loads),
    ai_recommendations: buildDispatchAiRecommendations({ snapshot, loads, drivers }),
  };
}
