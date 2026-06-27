export const FLEET_COMPLIANCE_TYPES = ["registration", "insurance", "annual_inspection", "ifta", "emissions", "dot_inspection"];
export const FLEET_MAINTENANCE_TYPES = ["pm_a", "pm_b", "oil_change", "tires", "brakes", "engine", "corrective"];

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

function num(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function assetLabel(asset = {}) {
  return asset.unit_number ? `Unit #${asset.unit_number}` : asset.id ? `Asset ${String(asset.id).slice(-6)}` : "Asset";
}

export function buildFleetComplianceProfile(asset = {}) {
  const requirements = [
    { type: "registration", expires_at: asset.registration_expiry },
    { type: "insurance", expires_at: asset.insurance_expiry },
    { type: "annual_inspection", expires_at: asset.annual_inspection_expiry },
    { type: "ifta", expires_at: asset.ifta_expiry },
    { type: "emissions", expires_at: asset.emissions_expiry },
    { type: "dot_inspection", expires_at: asset.dot_inspection_expiry },
  ].map((item) => {
    const days = daysUntil(item.expires_at);
    return {
      ...item,
      days_until_expiry: days,
      status: days === null ? "missing" : days < 0 ? "expired" : days <= 30 ? "expiring" : "valid",
    };
  });
  const expired = requirements.filter((item) => item.status === "expired").length;
  const expiring = requirements.filter((item) => item.status === "expiring").length;
  const missing = requirements.filter((item) => item.status === "missing").length;
  return {
    asset_id: asset.id,
    asset_label: assetLabel(asset),
    compliance_score: Math.max(0, 100 - expired * 30 - expiring * 12 - missing * 8),
    overall_status: expired ? "expired" : expiring ? "attention" : missing ? "incomplete" : "compliant",
    requirements,
  };
}

export function buildFleetMaintenanceProfile(asset = {}) {
  const odometer = num(asset.odometer);
  const nextService = num(asset.next_service_miles);
  const milesRemaining = nextService > 0 ? nextService - odometer : null;
  const serviceDays = daysUntil(asset.next_service_date);
  const overdue = (milesRemaining !== null && milesRemaining <= 0) || (serviceDays !== null && serviceDays < 0);
  const dueSoon = !overdue && ((milesRemaining !== null && milesRemaining <= 2500) || (serviceDays !== null && serviceDays <= 30));
  return {
    asset_id: asset.id,
    asset_label: assetLabel(asset),
    odometer,
    engine_hours: num(asset.engine_hours),
    next_service_miles: nextService || null,
    miles_remaining: milesRemaining,
    next_service_date: asset.next_service_date || null,
    service_days_remaining: serviceDays,
    status: overdue ? "overdue" : dueSoon ? "due_soon" : "ok",
    recommended_work_order: overdue || dueSoon ? {
      maintenance_type: "preventive_maintenance",
      priority: overdue ? "high" : "medium",
      reason: overdue ? "PM overdue" : "PM due soon",
    } : null,
  };
}

export function buildFleetComplianceMaintenanceDashboard(trucks = []) {
  const compliance = trucks.map(buildFleetComplianceProfile);
  const maintenance = trucks.map(buildFleetMaintenanceProfile);
  return {
    compliance,
    maintenance,
    expired_assets: compliance.filter((item) => item.overall_status === "expired").length,
    attention_assets: compliance.filter((item) => item.overall_status === "attention").length,
    maintenance_overdue: maintenance.filter((item) => item.status === "overdue").length,
    maintenance_due_soon: maintenance.filter((item) => item.status === "due_soon").length,
  };
}
