import { base44 } from "@/api/base44Client";

export const DRIVER_ENTERPRISE_EVENTS = {
  DRIVER_ASSIGNED_LOAD: "DRIVER_ASSIGNED_LOAD",
  DRIVER_ACCEPTED_LOAD: "DRIVER_ACCEPTED_LOAD",
  DRIVER_REJECTED_LOAD: "DRIVER_REJECTED_LOAD",
  DRIVER_ARRIVED_PICKUP: "DRIVER_ARRIVED_PICKUP",
  DRIVER_LOADED: "DRIVER_LOADED",
  DRIVER_IN_TRANSIT: "DRIVER_IN_TRANSIT",
  DRIVER_ARRIVED_DELIVERY: "DRIVER_ARRIVED_DELIVERY",
  DRIVER_DELIVERED: "DRIVER_DELIVERED",
  DRIVER_POD_UPLOADED: "DRIVER_POD_UPLOADED",
  DRIVER_DELAY_ALERT: "DRIVER_DELAY_ALERT",
  DRIVER_HOS_VIOLATION: "DRIVER_HOS_VIOLATION",
  DRIVER_DOCUMENT_EXPIRING: "DRIVER_DOCUMENT_EXPIRING",
  DRIVER_DOCUMENT_EXPIRED: "DRIVER_DOCUMENT_EXPIRED",
  DRIVER_DVIR_SUBMITTED: "DRIVER_DVIR_SUBMITTED",
  DRIVER_DVIR_DEFECT_FOUND: "DRIVER_DVIR_DEFECT_FOUND",
  DRIVER_INCIDENT_REPORTED: "DRIVER_INCIDENT_REPORTED",
  DRIVER_SETTLEMENT_READY: "DRIVER_SETTLEMENT_READY",
  DRIVER_COACHING_REQUIRED: "DRIVER_COACHING_REQUIRED",
  DRIVER_FRAUD_ALERT: "DRIVER_FRAUD_ALERT",
  DRIVER_OFFLINE_SYNC_QUEUED: "DRIVER_OFFLINE_SYNC_QUEUED",
  DRIVER_OFFLINE_SYNC_COMPLETED: "DRIVER_OFFLINE_SYNC_COMPLETED",
};

export const DRIVER_REQUIRED_MODULES = [
  "Driver Master Profile",
  "Driver Mobile App",
  "Driver Assignment Engine",
  "Compliance Engine",
  "Safety Engine",
  "HOS Engine",
  "DVIR Engine",
  "Settlement Engine",
  "Messaging Engine",
  "Document OCR Engine",
  "Navigation Engine",
  "Telematics Integration Engine",
  "Performance Analytics Engine",
  "Driver Intelligence Engine",
  "Fraud & Security Engine",
  "Incident / Claims Management",
  "Driver Equipment Linkage",
  "Driver Coaching Engine",
  "Smart Notification Engine",
  "Offline / Poor Signal Mode",
  "Driver Retention / Rewards",
  "Driver Profitability Engine",
  "AI Driver Copilot",
];

export const DRIVER_WORKFLOWS = {
  load_assignment: ["assigned", "push_notification", "driver_accept_or_reject", "eta_confirmation", "auto_escalation"],
  pickup: ["truck_safe_navigation", "geofence_arrival", "shipper_check_in", "bol_capture", "seal_verification", "loaded_confirmation"],
  transit: ["gps_tracking", "hos_monitoring", "eta_prediction", "route_deviation_detection", "detention_alerts"],
  delivery: ["receiver_arrival", "pod_capture", "signature_capture", "unload_confirmation", "exception_handling"],
  dvir: ["pre_trip", "post_trip", "defect_severity", "repair_escalation", "maintenance_ticket"],
  document: ["scan", "ocr", "classify", "index", "vault", "audit_trail", "expiration_tracking"],
  messaging: ["dispatcher_chat", "group_chat", "emergency_message", "read_receipts", "escalation_rules"],
  navigation: ["truck_safe_route", "hazmat_restrictions", "bridge_clearance", "toll_awareness", "fuel_stops", "parking"],
};

export const DRIVER_COMPLIANCE_REQUIREMENTS = [
  "DQF",
  "CDL",
  "Medical Card",
  "Hazmat",
  "TWIC",
  "Drug Tests",
  "Alcohol Tests",
  "Clearinghouse",
  "Annual Review",
  "MVR",
  "PSP",
  "Insurance",
  "W-9",
  "Driver Agreement",
];

export const DRIVER_SAFETY_SIGNALS = [
  "speeding",
  "harsh_braking",
  "rapid_acceleration",
  "distracted_driving",
  "fatigue_risk",
  "collision_alert",
  "roll_stability_event",
  "roadside_inspection",
  "violation",
  "incident",
];

export const DRIVER_SCORECARD_METRICS = {
  safety: ["violations", "incidents", "coaching", "harsh_events", "speeding_events"],
  performance: ["on_time_pickup_pct", "on_time_delivery_pct", "dwell_time", "detention_hours", "acceptance_rate"],
  compliance: ["expired_documents", "expiring_documents", "failed_inspections", "clearinghouse_status"],
  behavior: ["idle_time", "route_deviation", "late_pod_uploads", "message_response_time"],
  trends: ["30_day", "90_day", "rolling_average", "weighted_score"],
};

export const DRIVER_COPILOT_PROMPTS = [
  "What is my next stop?",
  "Which documents are missing for this load?",
  "Why is my settlement lower than expected?",
  "How many hours do I have left today?",
  "Is my CDL or medical card expiring soon?",
  "Can I request detention for this stop?",
  "What should I scan before delivery?",
  "Am I at risk of being late?",
  "What is my safety score this week?",
  "What actions do I need to complete before payout?",
];

function num(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - new Date()) / 86400000);
}

function severityFromScore(score) {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function buildDriverMasterRecord(driver = {}) {
  return {
    driver_id: driver.id,
    employee_type: driver.employee_type || driver.driver_type || "owner_operator_1099",
    contractor_type: driver.contractor_type || "1099_owner_operator",
    status: driver.status || "off_duty",
    active_load_id: driver.current_load_id || driver.active_load_id || null,
    home_terminal: driver.home_terminal || driver.terminal || "remote",
    dispatch_group: driver.dispatch_group || "default",
    preferred_routes: driver.preferred_routes || driver.lanes || [],
    current_location: driver.current_location || { lat: driver.current_lat, lng: driver.current_lng },
    duty_status: driver.duty_status || "unknown",
    availability_status: driver.availability_status || driver.status || "unknown",
  };
}

export function calculateDriverRiskScore({ driver = {}, compliance = {}, safety = {}, performance = {}, settlement = {}, tracking = {} } = {}) {
  const cdlDays = daysUntil(compliance.cdl_expiration || driver.cdl_expiration);
  const medicalDays = daysUntil(compliance.medical_card_expiration || driver.medical_card_expiration);
  const insuranceDays = daysUntil(compliance.insurance_expiration || driver.insurance_expiration);

  const complianceRisk = [cdlDays, medicalDays, insuranceDays].reduce((score, days) => {
    if (days === null) return score + 12;
    if (days < 0) return score + 35;
    if (days <= 7) return score + 25;
    if (days <= 30) return score + 15;
    if (days <= 90) return score + 7;
    return score;
  }, 0);

  const safetyRisk = num(safety.violations) * 12 + num(safety.incidents) * 18 + num(safety.harsh_events) * 3 + num(safety.speeding_events) * 3;
  const fatigueRisk = num(tracking.hours_remaining) > 0 && num(tracking.hours_remaining) < 2 ? 35 : num(tracking.hours_remaining) === 0 ? 55 : 0;
  const deliveryRisk = num(performance.late_deliveries_90d) * 8 + Math.max(0, 100 - num(performance.on_time_delivery_pct)) * 0.4;
  const settlementRisk = num(settlement.disputed_settlements) * 12 + num(settlement.unapproved_deductions) * 10;
  const fraudRisk = num(tracking.gps_mismatch_count) * 20 + num(settlement.duplicate_receipt_count) * 15 + num(performance.late_pod_uploads) * 4;

  const overall = Math.min(100, Math.round((complianceRisk + safetyRisk + fatigueRisk + deliveryRisk + settlementRisk + fraudRisk) / 2));

  return {
    driver_id: driver.id,
    fatigue_score: Math.min(100, Math.round(fatigueRisk)),
    compliance_score: Math.min(100, Math.round(complianceRisk)),
    safety_score: Math.min(100, Math.round(safetyRisk)),
    fraud_score: Math.min(100, Math.round(fraudRisk)),
    delivery_risk_score: Math.min(100, Math.round(deliveryRisk)),
    settlement_risk_score: Math.min(100, Math.round(settlementRisk)),
    overall_score: overall,
    severity: severityFromScore(overall),
    recommended_action: getDriverRecommendedAction({ overall, complianceRisk, safetyRisk, fraudRisk, fatigueRisk }),
    calculated_at: new Date().toISOString(),
  };
}

function getDriverRecommendedAction({ overall, complianceRisk, safetyRisk, fraudRisk, fatigueRisk }) {
  if (fraudRisk >= 40) return "Review fraud indicators before payout or assignment.";
  if (complianceRisk >= 35) return "Place driver on compliance hold until documents are reviewed.";
  if (fatigueRisk >= 35) return "Check HOS before dispatching another load.";
  if (safetyRisk >= 40) return "Schedule coaching and review recent safety events.";
  if (overall >= 60) return "Dispatcher review required before next assignment.";
  return "Driver is available for normal workflow with standard monitoring.";
}

export function buildDriverProfitability({ driver = {}, loads = [], settlements = [], claims = [] } = {}) {
  const driverLoads = loads.filter((load) => load.driver_id === driver.id);
  const grossRevenue = driverLoads.reduce((sum, load) => sum + num(load.total_revenue ?? load.rate), 0);
  const settlementCost = settlements.filter((s) => s.driver_id === driver.id).reduce((sum, s) => sum + num(s.final_driver_net_pay ?? s.net_pay), 0);
  const claimCost = claims.filter((claim) => claim.driver_id === driver.id).reduce((sum, claim) => sum + num(claim.amount), 0);
  const miles = driverLoads.reduce((sum, load) => sum + num(load.miles ?? load.miles_total), 0);
  const deadheadMiles = driverLoads.reduce((sum, load) => sum + num(load.deadhead_miles), 0);
  const netMargin = grossRevenue - settlementCost - claimCost;

  return {
    driver_id: driver.id,
    gross_revenue: grossRevenue,
    settlement_cost: settlementCost,
    claim_cost: claimCost,
    net_margin: netMargin,
    revenue_per_mile: miles > 0 ? Number((grossRevenue / miles).toFixed(2)) : 0,
    deadhead_percent: miles > 0 ? Number(((deadheadMiles / miles) * 100).toFixed(1)) : 0,
    load_count: driverLoads.length,
  };
}

export function detectDriverFraudSignals({ driver = {}, documents = [], trackingEvents = [], receipts = [] } = {}) {
  const alerts = [];
  const bolNumbers = new Set();
  documents.forEach((doc) => {
    const bol = doc.bol_number || doc.extracted_bol_number;
    if (bol && bolNumbers.has(bol)) alerts.push({ alert_type: "DUPLICATE_BOL", severity: "high", driver_id: driver.id, evidence: bol });
    if (bol) bolNumbers.add(bol);
    if (doc.signature_detected === false && ["pod", "proof_of_delivery"].includes(doc.document_type)) alerts.push({ alert_type: "POD_SIGNATURE_MISSING", severity: "medium", driver_id: driver.id, evidence: doc.id });
  });

  const receiptKeys = new Set();
  receipts.forEach((receipt) => {
    const key = `${receipt.vendor || "unknown"}-${receipt.amount || 0}-${receipt.date || receipt.created_at || "date"}`;
    if (receiptKeys.has(key)) alerts.push({ alert_type: "DUPLICATE_RECEIPT", severity: "high", driver_id: driver.id, evidence: key });
    receiptKeys.add(key);
  });

  trackingEvents.forEach((event) => {
    if (num(event.speed) > 95) alerts.push({ alert_type: "IMPOSSIBLE_ROUTE_SPEED", severity: "critical", driver_id: driver.id, evidence: event.id });
    if (event.source === "manual" && event.gps_mismatch === true) alerts.push({ alert_type: "GPS_MISMATCH", severity: "high", driver_id: driver.id, evidence: event.id });
  });

  return alerts;
}

export async function logDriverEnterpriseEvent(eventType, payload = {}) {
  const event = {
    event_type: eventType,
    type: eventType,
    entity_type: payload.entity_type || "Driver",
    entity_id: payload.entity_id || payload.driver_id || payload.load_id,
    driver_id: payload.driver_id,
    load_id: payload.load_id,
    truck_id: payload.truck_id,
    title: payload.title || eventType,
    description: payload.description || eventType,
    metadata: JSON.stringify({ ...payload, driver_enterprise_event: true }),
    created_at: new Date().toISOString(),
    created_by: payload.created_by || "driver_system",
  };

  await base44.entities.DriverEvent?.create?.(event).catch(() => null);
  await base44.entities.TimelineEvent.create(event).catch(() => null);
  return event;
}

export async function createDriverIncident(payload = {}) {
  const incident = {
    driver_id: payload.driver_id,
    load_id: payload.load_id,
    incident_type: payload.incident_type || "driver_reported",
    severity: payload.severity || "medium",
    location: payload.location || "unknown",
    description: payload.description || "Driver incident reported",
    photo_urls: payload.photo_urls || [],
    police_report: payload.police_report || null,
    insurance_claim: payload.insurance_claim || null,
    status: payload.status || "open",
    created_at: new Date().toISOString(),
  };
  const created = await base44.entities.DriverIncident?.create?.(incident).catch(() => null);
  await logDriverEnterpriseEvent(DRIVER_ENTERPRISE_EVENTS.DRIVER_INCIDENT_REPORTED, { ...incident, entity_id: created?.id, entity_type: "DriverIncident" });
  return created || incident;
}

export async function createDriverCoachingRecord(payload = {}) {
  const record = {
    driver_id: payload.driver_id,
    event_type: payload.event_type || "safety_review",
    coach: payload.coach || "Safety Manager",
    notes: payload.notes || "Coaching required based on safety/performance event.",
    completed: false,
    followup_required: payload.followup_required !== false,
    due_at: payload.due_at,
    created_at: new Date().toISOString(),
  };
  const created = await base44.entities.CoachingRecord?.create?.(record).catch(() => null);
  await logDriverEnterpriseEvent(DRIVER_ENTERPRISE_EVENTS.DRIVER_COACHING_REQUIRED, { ...record, entity_id: created?.id, entity_type: "CoachingRecord" });
  return created || record;
}

export function buildSmartNotificationRule(eventType, priority = "medium") {
  const channelsByPriority = {
    critical: ["push", "sms", "dispatcher_alert"],
    high: ["push", "dispatcher_alert"],
    medium: ["push"],
    low: ["in_app"],
  };
  return {
    event_type: eventType,
    priority,
    channels: channelsByPriority[priority] || channelsByPriority.medium,
    quiet_hours_respected: !["critical", "high"].includes(priority),
    escalation_rules: priority === "critical" ? ["notify_dispatcher", "notify_safety", "repeat_15_min"] : ["notify_driver"],
  };
}

export function queueOfflineDriverAction(action = {}) {
  const item = {
    id: `offline-${Date.now()}`,
    action_type: action.action_type || "driver_action",
    payload: action.payload || {},
    status: "queued",
    queued_at: new Date().toISOString(),
  };
  const key = "hasten_driver_offline_queue";
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  localStorage.setItem(key, JSON.stringify([item, ...existing]));
  return item;
}

export function buildDriverRewardProfile({ driver = {}, scorecard = {} } = {}) {
  const safeMiles = num(scorecard.safe_miles);
  const onTime = num(scorecard.on_time_delivery_pct);
  const cleanInspections = num(scorecard.clean_inspections);
  const points = Math.round(safeMiles / 100 + onTime + cleanInspections * 25);
  const tier = points >= 1000 ? "platinum" : points >= 600 ? "gold" : points >= 300 ? "silver" : "bronze";
  return {
    driver_id: driver.id,
    points,
    tier,
    badges: [
      safeMiles >= 10000 ? "Safe Miles 10K" : null,
      onTime >= 95 ? "On-Time Pro" : null,
      cleanInspections >= 3 ? "Clean Inspection Streak" : null,
    ].filter(Boolean),
    bonus_eligible: ["gold", "platinum"].includes(tier),
  };
}
