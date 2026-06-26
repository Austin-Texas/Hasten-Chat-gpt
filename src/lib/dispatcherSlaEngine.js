export const DISPATCH_SLA_RULES = [
  { id: "pickup_soon", label: "Pickup soon", severity: "medium" },
  { id: "pickup_missed", label: "Pickup missed", severity: "critical" },
  { id: "delivery_eta_risk", label: "Delivery ETA risk", severity: "high" },
  { id: "pod_missing", label: "POD missing", severity: "medium" },
  { id: "broker_update_due", label: "Broker update due", severity: "medium" },
  { id: "detention_candidate", label: "Detention candidate", severity: "info" },
];

function now() {
  return new Date();
}

function minutesUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - now().getTime()) / 60000);
}

function makeAlert(load, rule, message) {
  return {
    id: `sla-${rule.id}-${load.id}`,
    load_id: load.id,
    load_number: load.load_number || `#${String(load.id || "").slice(-6)}`,
    rule_id: rule.id,
    rule_label: rule.label,
    severity: rule.severity,
    status: "open",
    message,
    created_at: new Date().toISOString(),
  };
}

export function buildDispatchSlaAlerts(loads = []) {
  const alerts = [];
  loads.forEach((load) => {
    const status = load.status || "available";
    const pickupMins = minutesUntil(load.pickup_date || load.pickup_at || load.pickup_appointment_at);
    const deliveryMins = minutesUntil(load.delivery_date || load.delivery_at || load.delivery_appointment_at);

    if (!["delivered", "completed", "cancelled"].includes(status) && pickupMins !== null && pickupMins <= 60 && pickupMins >= 0) {
      alerts.push(makeAlert(load, DISPATCH_SLA_RULES[0], `${load.load_number || "Load"} pickup is within ${pickupMins} minutes.`));
    }
    if (!["delivered", "completed", "cancelled"].includes(status) && pickupMins !== null && pickupMins < 0 && ["available", "assigned", "accepted", "en_route"].includes(status)) {
      alerts.push(makeAlert(load, DISPATCH_SLA_RULES[1], `${load.load_number || "Load"} pickup appointment appears missed.`));
    }
    if (!["delivered", "completed", "cancelled"].includes(status) && deliveryMins !== null && deliveryMins < 120 && ["loaded", "in_transit", "arrived_delivery"].includes(status)) {
      alerts.push(makeAlert(load, DISPATCH_SLA_RULES[2], `${load.load_number || "Load"} delivery ETA is at risk.`));
    }
    if (["delivered", "completed"].includes(status) && !load.pod_uploaded && !load.pod_document_id) {
      alerts.push(makeAlert(load, DISPATCH_SLA_RULES[3], `${load.load_number || "Load"} is delivered but missing POD.`));
    }
    if (["accepted", "en_route", "arrived_pickup", "loaded", "in_transit"].includes(status) && !load.last_broker_update_at) {
      alerts.push(makeAlert(load, DISPATCH_SLA_RULES[4], `${load.load_number || "Load"} may need a broker/customer update.`));
    }
    if (["arrived_pickup", "arrived_delivery", "loaded"].includes(status) && Number(load.dwell_minutes || 0) >= 120) {
      alerts.push(makeAlert(load, DISPATCH_SLA_RULES[5], `${load.load_number || "Load"} may be detention eligible.`));
    }
  });
  return alerts;
}

export function getDispatchSlaDashboard(loads = []) {
  const alerts = buildDispatchSlaAlerts(loads);
  return {
    total_alerts: alerts.length,
    critical: alerts.filter((alert) => alert.severity === "critical").length,
    high: alerts.filter((alert) => alert.severity === "high").length,
    medium: alerts.filter((alert) => alert.severity === "medium").length,
    info: alerts.filter((alert) => alert.severity === "info").length,
    alerts,
  };
}
