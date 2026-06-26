export const DRIVER_DEMO_SOURCE = "HASTEN_DRIVER_DEMO_IMPORT";
export const DRIVER_DEMO_CREATED_BY = "system_demo_seed";
export const DRIVER_DEMO_SEED_VERSION = "driver-enterprise-demo-v1.0.0";
export const DRIVER_DEMO_IMPORTED_AT = "2026-06-26T00:00:00.000Z";

const STATES = ["NC", "SC", "GA", "TX", "TN", "VA"];
const STATUSES = ["available", "under_load", "off_duty", "compliance_hold", "suspended", "maintenance_hold"];
const EQUIPMENT = ["Dry Van", "Reefer", "Flatbed", "Power Only", "Box Truck", "Step Deck"];
const LANES = ["NC → GA", "NC → TX", "Carolinas Regional", "Southeast Dedicated", "Midwest Backhaul", "Port / TWIC"];

const demoDriverNames = [
  ["Marcus", "Johnson"],
  ["Ahmed", "Kareem"],
  ["David", "Miller"],
  ["Jose", "Ramirez"],
  ["Omar", "Hassan"],
  ["Michael", "Brooks"],
  ["Sam", "Carter"],
  ["Daniel", "Wilson"],
  ["James", "Turner"],
  ["Robert", "Hill"],
  ["Chris", "Evans"],
  ["Brian", "Demo Driver"],
];

function demoMeta(entityType, index = 0) {
  return {
    isDemo: true,
    demo: true,
    entity_type: entityType,
    createdBy: DRIVER_DEMO_CREATED_BY,
    source: DRIVER_DEMO_SOURCE,
    seed_version: DRIVER_DEMO_SEED_VERSION,
    demo_imported_at: DRIVER_DEMO_IMPORTED_AT,
    created_date: new Date(Date.UTC(2026, 5, 26, 12, index, 0)).toISOString(),
    updated_date: new Date(Date.UTC(2026, 5, 26, 12, index, 0)).toISOString(),
  };
}

function daysFromNow(days) {
  const date = new Date("2026-06-26T12:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusForIndex(index) {
  return STATUSES[index % STATUSES.length];
}

function complianceForStatus(status, index) {
  if (status === "suspended") return "non_compliant";
  if (status === "compliance_hold") return "at_risk";
  if (index % 5 === 0) return "review_required";
  return "compliant";
}

export function buildEnterpriseDriverDemoData() {
  const drivers = demoDriverNames.map(([first, last], index) => {
    const id = `drv-demo-enterprise-${String(index + 1).padStart(2, "0")}`;
    const status = statusForIndex(index);
    const contractorType = index < 8 ? "1099_owner_operator" : "company_driver";
    const complianceStatus = complianceForStatus(status, index);
    const cdlExpiryOffset = index === 4 ? -20 : index === 7 ? 22 : 365 + index * 30;
    const medicalExpiryOffset = index === 3 ? 18 : index === 10 ? -5 : 180 + index * 18;
    const safetyScore = Math.max(58, 98 - index * 3 - (status === "suspended" ? 12 : 0));

    return {
      id,
      ...demoMeta("driver", index),
      first_name: first,
      last_name: last,
      full_name: `${first} ${last}`,
      email: `${first.toLowerCase().replace(/\s+/g, ".")}.${last.toLowerCase().replace(/\s+/g, ".")}@demo.hastencargo.local`,
      phone: `555-01${String(index + 10).padStart(2, "0")}`,
      contractor_type: contractorType,
      employment_type: contractorType === "1099_owner_operator" ? "1099" : "W2",
      status,
      availability: status,
      compliance_status: complianceStatus,
      safety_status: safetyScore >= 80 ? "good" : safetyScore >= 70 ? "monitor" : "high_risk",
      safety_score: safetyScore,
      performance_score: Math.max(62, 96 - index * 2),
      loads_completed: 18 + index * 7,
      home_terminal: index % 2 === 0 ? "Fayetteville, NC" : "Charlotte, NC",
      home_city: index % 2 === 0 ? "Fayetteville" : "Charlotte",
      home_state: "NC",
      current_city: index % 3 === 0 ? "Atlanta" : index % 3 === 1 ? "Raleigh" : "Columbia",
      current_state: STATES[index % STATES.length],
      preferred_lanes: [LANES[index % LANES.length], LANES[(index + 2) % LANES.length]],
      assigned_truck_id: `TRK-DEMO-${String(index + 101)}`,
      assigned_trailer_id: `TRL-DEMO-${String(index + 201)}`,
      vehicle_type: EQUIPMENT[index % EQUIPMENT.length],
      trailer_type: EQUIPMENT[index % EQUIPMENT.length],
      max_payload: 44000 - index * 500,
      emergency_contact_name: `Emergency Contact ${index + 1}`,
      emergency_contact_phone: `555-02${String(index + 20).padStart(2, "0")}`,
      license_number: `CDL-DEMO-${String(index + 1).padStart(3, "0")}`,
      license_class: index % 11 === 0 ? "B" : "A",
      license_state: STATES[index % STATES.length],
      license_expiry: daysFromNow(cdlExpiryOffset),
      license_status: cdlExpiryOffset < 0 ? "expired" : cdlExpiryOffset <= 30 ? "needs_review" : "valid",
      medical_expiry: daysFromNow(medicalExpiryOffset),
      medical_status: medicalExpiryOffset < 0 ? "expired" : medicalExpiryOffset <= 30 ? "needs_review" : "valid",
      insurance_expiry: daysFromNow(300 + index * 12),
      insurance_status: "valid",
      w9_status: contractorType === "1099_owner_operator" ? "verified" : "not_required",
      contract_status: "signed",
      agreement_signed: true,
      clearinghouse_status: index === 6 ? "needs_review" : "verified",
      drug_test_status: index === 8 ? "pending" : "negative_verified",
      hazmat_cert: [1, 4, 9].includes(index),
      twic_status: [1, 9].includes(index) ? "verified" : "not_required",
      pay_type: contractorType === "1099_owner_operator" ? "percentage" : "per_mile",
      pay_rate: contractorType === "1099_owner_operator" ? 82 : 0.68,
      settlement_profile_id: `settle-profile-${id}`,
      notes: "DEMO enterprise driver record for HASTEN Cargo OS testing. Not real private driver data.",
    };
  });

  const cdlRecords = Array.from({ length: 15 }, (_, index) => {
    const driver = drivers[index % drivers.length];
    return {
      id: `cdl-demo-${String(index + 1).padStart(2, "0")}`,
      ...demoMeta("cdl_record", index),
      driver_id: driver.id,
      driver_name: driver.full_name,
      cdl_number: `${driver.license_number}-${index + 1}`,
      state: driver.license_state,
      class: index % 12 === 0 ? "B" : "A",
      endorsements: ["Tanker", index % 3 === 0 ? "Hazmat" : null, index % 4 === 0 ? "Doubles/Triples" : null].filter(Boolean),
      restrictions: index % 5 === 0 ? ["Corrective lenses"] : [],
      issue_date: "2024-01-15",
      expiration_date: driver.license_expiry,
      verification_status: driver.license_status === "valid" ? "verified" : "needs_review",
      document_url: `/demo/documents/cdl-${index + 1}.pdf`,
    };
  });

  const medicalCards = Array.from({ length: 15 }, (_, index) => {
    const driver = drivers[index % drivers.length];
    return {
      id: `medical-demo-${String(index + 1).padStart(2, "0")}`,
      ...demoMeta("medical_card", index),
      driver_id: driver.id,
      driver_name: driver.full_name,
      certificate_number: `DOT-MED-DEMO-${String(index + 1).padStart(3, "0")}`,
      examiner_name: ["Dr. Smith", "Dr. Patel", "Dr. Carter"][index % 3],
      issue_date: "2025-05-01",
      expiration_date: driver.medical_expiry,
      restrictions: index % 4 === 0 ? ["Must wear corrective lenses"] : [],
      verification_status: driver.medical_status === "valid" ? "verified" : "needs_review",
      document_url: `/demo/documents/medical-${index + 1}.pdf`,
    };
  });

  const complianceDocuments = Array.from({ length: 20 }, (_, index) => {
    const driver = drivers[index % drivers.length];
    const types = ["CDL", "Medical Card", "MVR", "Drug Test", "Clearinghouse", "Road Test", "Employment Verification", "Training", "TWIC", "Hazmat"];
    const docType = types[index % types.length];
    return {
      id: `dqf-demo-${String(index + 1).padStart(2, "0")}`,
      ...demoMeta("driver_compliance_document", index),
      driver_id: driver.id,
      driver_name: driver.full_name,
      document_type: docType,
      status: index % 7 === 0 ? "needs_review" : "approved",
      expiration_date: ["CDL", "Medical Card", "TWIC", "Hazmat"].includes(docType) ? daysFromNow(90 + index * 10) : null,
      vault_path: `/demo/dqf/${driver.id}/${docType.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      ocr_status: index % 6 === 0 ? "queued" : "completed",
    };
  });

  const driverEvents = Array.from({ length: 30 }, (_, index) => {
    const driver = drivers[index % drivers.length];
    const eventTypes = ["status_changed", "load_accepted", "arrived_pickup", "loaded", "arrived_delivery", "pod_uploaded", "safety_alert", "compliance_alert", "settlement_ready", "message_sent"];
    return {
      id: `driver-event-demo-${String(index + 1).padStart(2, "0")}`,
      ...demoMeta("driver_event", index),
      driver_id: driver.id,
      driver_name: driver.full_name,
      event_type: eventTypes[index % eventTypes.length],
      severity: index % 8 === 0 ? "high" : index % 3 === 0 ? "medium" : "info",
      message: `DEMO ${eventTypes[index % eventTypes.length].replace(/_/g, " ")} event for ${driver.full_name}`,
      load_id: `LOAD-DEMO-${String((index % 25) + 1).padStart(3, "0")}`,
    };
  });

  const dvirReports = Array.from({ length: 10 }, (_, index) => {
    const driver = drivers[index % drivers.length];
    const hasDefect = index % 4 === 0;
    return {
      id: `dvir-demo-${String(index + 1).padStart(2, "0")}`,
      ...demoMeta("dvir_report", index),
      driver_id: driver.id,
      driver_name: driver.full_name,
      truck_id: driver.assigned_truck_id,
      trailer_id: driver.assigned_trailer_id,
      inspection_type: index % 2 === 0 ? "pre_trip" : "post_trip",
      status: hasDefect ? "defect_found" : "passed",
      defects: hasDefect ? ["Marker light out", "Low tire tread needs review"] : [],
      mechanic_required: hasDefect,
      submitted_at: new Date(Date.UTC(2026, 5, 20 + index, 8, 30, 0)).toISOString(),
    };
  });

  const settlements = Array.from({ length: 15 }, (_, index) => {
    const driver = drivers[index % drivers.length];
    const gross = 2600 + index * 185;
    const companyFee = driver.contractor_type === "1099_owner_operator" ? gross * 0.18 : 0;
    const deductions = 75 + (index % 4) * 45;
    const net = gross - companyFee - deductions;
    return {
      id: `settlement-demo-${String(index + 1).padStart(2, "0")}`,
      ...demoMeta("driver_settlement", index),
      driver_id: driver.id,
      driver_name: driver.full_name,
      week_start: "2026-06-15",
      week_end: "2026-06-21",
      pay_model: driver.pay_type,
      gross_revenue: Number(gross.toFixed(2)),
      company_fee: Number(companyFee.toFixed(2)),
      detention_pay: index % 3 === 0 ? 150 : 0,
      layover_pay: index % 5 === 0 ? 250 : 0,
      tonu_pay: index % 7 === 0 ? 125 : 0,
      advances: index % 4 === 0 ? 200 : 0,
      insurance_deduction: driver.contractor_type === "1099_owner_operator" ? 65 : 0,
      escrow_deduction: driver.contractor_type === "1099_owner_operator" ? 100 : 0,
      factoring_deduction: Number((gross * 0.025).toFixed(2)),
      net_pay: Number(net.toFixed(2)),
      status: index % 4 === 0 ? "ready_for_review" : "approved",
      pdf_preview_ready: true,
    };
  });

  const loadAssignments = Array.from({ length: 25 }, (_, index) => {
    const driver = drivers[index % drivers.length];
    const workflowStatus = ["assigned", "accepted", "en_route_pickup", "arrived_pickup", "loaded", "en_route_delivery", "delivered", "pod_uploaded"][index % 8];
    return {
      id: `assignment-demo-${String(index + 1).padStart(2, "0")}`,
      ...demoMeta("driver_load_assignment", index),
      load_id: `LOAD-DEMO-${String(index + 1).padStart(3, "0")}`,
      driver_id: driver.id,
      driver_name: driver.full_name,
      pickup_city: ["Fayetteville", "Charlotte", "Raleigh", "Savannah", "Atlanta"][index % 5],
      pickup_state: ["NC", "NC", "NC", "GA", "GA"][index % 5],
      delivery_city: ["Atlanta", "Dallas", "Nashville", "Columbia", "Norfolk"][index % 5],
      delivery_state: ["GA", "TX", "TN", "SC", "VA"][index % 5],
      status: workflowStatus,
      bol_uploaded: ["loaded", "en_route_delivery", "delivered", "pod_uploaded"].includes(workflowStatus),
      pod_uploaded: workflowStatus === "pod_uploaded",
      navigation_status: ["assigned", "accepted"].includes(workflowStatus) ? "not_started" : "active",
      settlement_status: ["delivered", "pod_uploaded"].includes(workflowStatus) ? "pending_settlement" : "not_ready",
    };
  });

  return {
    meta: {
      seed_version: DRIVER_DEMO_SEED_VERSION,
      imported_at: DRIVER_DEMO_IMPORTED_AT,
      source: DRIVER_DEMO_SOURCE,
      createdBy: DRIVER_DEMO_CREATED_BY,
      counts: {
        drivers: drivers.length,
        cdlRecords: cdlRecords.length,
        medicalCards: medicalCards.length,
        complianceDocuments: complianceDocuments.length,
        driverEvents: driverEvents.length,
        dvirReports: dvirReports.length,
        settlements: settlements.length,
        loadAssignments: loadAssignments.length,
      },
    },
    drivers,
    cdlRecords,
    medicalCards,
    complianceDocuments,
    driverEvents,
    dvirReports,
    settlements,
    loadAssignments,
  };
}

export function calculateDriverCompliance(driver = {}, bundle = {}) {
  const today = new Date("2026-06-26T12:00:00.000Z");
  const checks = [];

  function addCheck(key, label, status, expiresAt) {
    let normalized = status || "missing";
    if (expiresAt) {
      const expiry = new Date(expiresAt);
      const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
      if (days < 0) normalized = "expired";
      else if (days <= 30) normalized = "expiring_soon";
    }
    checks.push({ key, label, status: normalized, expiresAt: expiresAt || null });
  }

  addCheck("cdl", "CDL", driver.license_status, driver.license_expiry);
  addCheck("medical", "Medical Card", driver.medical_status, driver.medical_expiry);
  addCheck("insurance", "Insurance", driver.insurance_status, driver.insurance_expiry);
  addCheck("w9", "W-9", driver.w9_status || (driver.contractor_type === "1099_owner_operator" ? "missing" : "not_required"));
  addCheck("contract", "Contract", driver.contract_status || (driver.agreement_signed ? "signed" : "missing"));
  addCheck("drug_test", "Drug Test", driver.drug_test_status || "missing");
  addCheck("clearinghouse", "Clearinghouse", driver.clearinghouse_status || "missing");

  const blocking = checks.filter((check) => ["missing", "expired", "rejected", "non_compliant"].includes(check.status));
  const warnings = checks.filter((check) => ["expiring_soon", "needs_review", "pending", "review_required"].includes(check.status));
  const status = blocking.length ? "non_compliant" : warnings.length ? "at_risk" : "compliant";

  return {
    status,
    score: Math.max(0, 100 - blocking.length * 18 - warnings.length * 8),
    checks,
    blocking_count: blocking.length,
    warning_count: warnings.length,
    hold_required: blocking.length > 0 || driver.status === "suspended",
  };
}

export function calculateDriverSafety(driver = {}, events = [], dvirReports = []) {
  const driverEvents = events.filter((event) => event.driver_id === driver.id);
  const driverDvirs = dvirReports.filter((report) => report.driver_id === driver.id);
  const highSeverity = driverEvents.filter((event) => event.severity === "high").length;
  const mediumSeverity = driverEvents.filter((event) => event.severity === "medium").length;
  const dvirDefects = driverDvirs.filter((report) => report.status === "defect_found").length;
  const fatigueRisk = driverEvents.some((event) => String(event.event_type).includes("fatigue")) ? 12 : 0;
  const score = Math.max(0, 100 - highSeverity * 12 - mediumSeverity * 5 - dvirDefects * 9 - fatigueRisk);

  return {
    score,
    level: score >= 85 ? "excellent" : score >= 75 ? "good" : score >= 65 ? "monitor" : "high_risk",
    high_severity_events: highSeverity,
    medium_severity_events: mediumSeverity,
    dvir_defects: dvirDefects,
    fatigue_risk: fatigueRisk > 0,
  };
}

export function calculateDriverPerformance(driver = {}, assignments = []) {
  const driverAssignments = assignments.filter((assignment) => assignment.driver_id === driver.id);
  const completed = driverAssignments.filter((assignment) => ["delivered", "pod_uploaded"].includes(assignment.status)).length;
  const accepted = driverAssignments.filter((assignment) => assignment.status !== "assigned").length;
  const total = driverAssignments.length || 1;
  const acceptanceRate = Math.round((accepted / total) * 100);
  const completionRate = Math.round((completed / total) * 100);
  const podRate = Math.round((driverAssignments.filter((assignment) => assignment.pod_uploaded).length / total) * 100);
  const score = Math.round(acceptanceRate * 0.35 + completionRate * 0.45 + podRate * 0.2);

  return {
    score,
    accepted_loads: accepted,
    assigned_loads: driverAssignments.length,
    completed_loads: completed,
    acceptance_rate: acceptanceRate,
    completion_rate: completionRate,
    pod_upload_rate: podRate,
    rolling_90_day_trend: score >= 85 ? "improving" : score >= 70 ? "stable" : "declining",
  };
}

export function generateDriverEnterpriseSummary(bundle) {
  const drivers = bundle?.drivers || [];
  return drivers.map((driver) => {
    const compliance = calculateDriverCompliance(driver, bundle);
    const safety = calculateDriverSafety(driver, bundle.driverEvents || [], bundle.dvirReports || []);
    const performance = calculateDriverPerformance(driver, bundle.loadAssignments || []);
    return {
      driver_id: driver.id,
      driver_name: driver.full_name,
      status: compliance.hold_required ? "compliance_hold" : driver.status,
      compliance,
      safety,
      performance,
      enterprise_score: Math.round(compliance.score * 0.35 + safety.score * 0.35 + performance.score * 0.3),
    };
  });
}
