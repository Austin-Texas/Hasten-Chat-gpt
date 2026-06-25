export const DRIVER_REQUIRED_DOCUMENTS = [
  { key: "license", label: "Driver License" },
  { key: "insurance", label: "Insurance" },
  { key: "w9", label: "W-9" },
  { key: "contract", label: "Contract" },
];

export function normalizeDriverProfile(user = {}, driver = {}) {
  return {
    id: driver?.id || user?.id,
    user_id: driver?.user_id || user?.id,
    full_name: driver?.full_name || user?.full_name || user?.name || "Driver",
    email: driver?.email || user?.email,
    phone: driver?.phone || user?.phone,
    vehicle_type: driver?.vehicle_type || user?.vehicle_type || "Sprinter",
    trailer_type: driver?.trailer_type || user?.trailer_type || "",
    max_payload: Number(driver?.max_payload || user?.max_payload || 3000),
    availability: driver?.availability || driver?.status || user?.availability || "available",
    compliance_status: driver?.compliance_status || user?.compliance_status || "needs_review",
    license_status: driver?.license_status || "unknown",
    insurance_status: driver?.insurance_status || "unknown",
    w9_status: driver?.w9_status || "unknown",
    contract_status: driver?.contract_status || "unknown",
    safety_status: driver?.safety_status || "unknown",
    onboarding_status: driver?.onboarding_status || "in_progress",
    ...driver,
  };
}

export function getMissingDriverRequirements(profile = {}) {
  const missing = [];
  if (!profile.vehicle_type) missing.push("Vehicle type");
  if (!profile.max_payload || Number(profile.max_payload) <= 0) missing.push("Max payload");
  if (!["valid", "approved", "active"].includes(String(profile.compliance_status || "").toLowerCase())) missing.push("Compliance approval");
  if (["expired", "missing", "unknown", "needs_review"].includes(String(profile.license_status || "unknown").toLowerCase())) missing.push("Driver license");
  if (["expired", "missing", "unknown", "needs_review"].includes(String(profile.insurance_status || "unknown").toLowerCase())) missing.push("Insurance");
  if (["missing", "unknown", "needs_review"].includes(String(profile.w9_status || "unknown").toLowerCase())) missing.push("W-9");
  if (["missing", "unknown", "needs_review"].includes(String(profile.contract_status || "unknown").toLowerCase())) missing.push("Contract");
  return [...new Set(missing)];
}

export function getDriverReadiness(profile = {}) {
  const missing = getMissingDriverRequirements(profile);
  const compliance = String(profile.compliance_status || "").toLowerCase();
  const availability = String(profile.availability || profile.status || "").toLowerCase();
  const isAvailable = ["available", "active", "ready"].includes(availability);
  const isApproved = ["valid", "approved", "active"].includes(compliance);

  if (!missing.length && isAvailable && isApproved) {
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
