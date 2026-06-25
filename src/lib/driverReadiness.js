export const DRIVER_REQUIRED_DOCUMENTS = [
  { key: "license", label: "Driver License" },
  { key: "insurance", label: "Insurance" },
  { key: "w9", label: "W-9" },
  { key: "contract", label: "Contract" },
];

const APPROVED_VALUES = ["valid", "approved", "active", "compliant", "verified", "uploaded", "signed"];
const NOT_READY_VALUES = ["expired", "missing", "unknown", "needs_review", "pending", "at_risk", "non_compliant", "rejected"];

function clean(value) {
  return String(value || "").toLowerCase();
}

function dateIsFuture(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= new Date();
}

function dateIsExpired(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date < new Date();
}

function isApproved(value) {
  return APPROVED_VALUES.includes(clean(value));
}

function isNotReady(value) {
  return NOT_READY_VALUES.includes(clean(value));
}

export function normalizeDriverProfile(user = {}, driver = {}) {
  const firstLast = `${driver?.first_name || ""} ${driver?.last_name || ""}`.trim();
  return {
    id: driver?.id || user?.id,
    user_id: driver?.user_id || user?.id,
    full_name: driver?.full_name || user?.full_name || user?.name || firstLast || "Driver",
    email: driver?.email || user?.email,
    phone: driver?.phone || user?.phone,
    vehicle_type: driver?.vehicle_type || user?.vehicle_type || "",
    trailer_type: driver?.trailer_type || user?.trailer_type || "",
    max_payload: Number(driver?.max_payload || user?.max_payload || 0),
    availability: driver?.availability || driver?.status || user?.availability || "available",
    compliance_status: driver?.compliance_status || user?.compliance_status || "at_risk",
    license_status: driver?.license_status || (dateIsFuture(driver?.license_expiry) ? "valid" : "unknown"),
    insurance_status: driver?.insurance_status || (dateIsFuture(driver?.insurance_expiry) ? "valid" : "unknown"),
    w9_status: driver?.w9_status || "pending",
    contract_status: driver?.contract_status || (driver?.agreement_signed ? "signed" : "pending"),
    license_expiry: driver?.license_expiry,
    insurance_expiry: driver?.insurance_expiry,
    agreement_signed: Boolean(driver?.agreement_signed),
    safety_status: driver?.safety_status || "unknown",
    onboarding_status: driver?.onboarding_status || "in_progress",
    ...driver,
  };
}

export function getMissingDriverRequirements(profile = {}) {
  const p = normalizeDriverProfile({}, profile);
  const missing = [];
  if (!p.vehicle_type) missing.push("Vehicle type");
  if (!p.max_payload || Number(p.max_payload) <= 0) missing.push("Max payload");
  if (clean(p.compliance_status) !== "compliant" && !isApproved(p.compliance_status)) missing.push("Compliance approval");
  if (dateIsExpired(p.license_expiry) || isNotReady(p.license_status)) missing.push("Driver license");
  if (dateIsExpired(p.insurance_expiry) || isNotReady(p.insurance_status)) missing.push("Insurance");
  if (!["verified", "uploaded"].includes(clean(p.w9_status)) && !isApproved(p.w9_status)) missing.push("W-9");
  if (!p.agreement_signed && !isApproved(p.contract_status)) missing.push("Contract");
  return [...new Set(missing)];
}

export function getDriverReadiness(profile = {}) {
  const p = normalizeDriverProfile({}, profile);
  const missing = getMissingDriverRequirements(p);
  const availability = clean(p.availability || p.status);
  const isAvailable = ["available", "active", "ready"].includes(availability);

  if (!missing.length && isAvailable) {
    return {
      level: "ready",
      label: "Ready",
      message: "Driver is ready for compatible offers.",
      missing,
    };
  }

  if (!isAvailable) {
    return {
      level: "warning",
      label: "Not Available",
      message: "Driver availability is not active.",
      missing,
    };
  }

  return {
    level: missing.length > 2 ? "blocked" : "warning",
    label: missing.length > 2 ? "Needs Setup" : "Needs Review",
    message: missing.length ? `Missing: ${missing.join(", ")}` : "Compliance needs review.",
    missing,
  };
}

export function readinessClass(level) {
  if (level === "ready") return "border-green-500/20 bg-green-500/10 text-green-300";
  if (level === "blocked") return "border-red-500/20 bg-red-500/10 text-red-300";
  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}

export function enrichDriversWithReadiness(drivers = []) {
  return drivers.map((driver) => ({ ...driver, readiness: getDriverReadiness(driver) }));
}

export function getDriverReadinessStats(drivers = []) {
  const enriched = enrichDriversWithReadiness(drivers);
  return {
    total: enriched.length,
    ready: enriched.filter((driver) => driver.readiness.level === "ready").length,
    warning: enriched.filter((driver) => driver.readiness.level === "warning").length,
    blocked: enriched.filter((driver) => driver.readiness.level === "blocked").length,
  };
}

export function filterDriversByReadiness(drivers = [], level = "all") {
  const enriched = enrichDriversWithReadiness(drivers);
  if (level === "all") return enriched;
  return enriched.filter((driver) => driver.readiness.level === level);
}
