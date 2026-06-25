import {
  getDriverReadiness,
  getMissingDriverRequirements,
} from "../src/lib/driverReadiness.js";

const readyDriver = {
  vehicle_type: "Sprinter",
  max_payload: 3000,
  availability: "available",
  compliance_status: "compliant",
  license_expiry: "2027-12-31",
  insurance_expiry: "2027-12-31",
  w9_status: "verified",
  agreement_signed: true,
};

const reviewDriver = {
  vehicle_type: "Box Truck",
  max_payload: 9000,
  availability: "available",
  compliance_status: "at_risk",
  license_expiry: "2027-12-31",
  insurance_expiry: "2027-12-31",
  w9_status: "uploaded",
  agreement_signed: true,
};

const setupDriver = {
  vehicle_type: "",
  max_payload: 0,
  availability: "available",
  compliance_status: "non_compliant",
  w9_status: "pending",
  agreement_signed: false,
};

const checks = [
  ["ready driver returns ready", getDriverReadiness(readyDriver).level === "ready"],
  ["review driver is not ready", getDriverReadiness(reviewDriver).level !== "ready"],
  ["setup driver is blocked", getDriverReadiness(setupDriver).level === "blocked"],
  ["setup driver missing vehicle", getMissingDriverRequirements(setupDriver).includes("Vehicle type")],
  ["setup driver missing contract", getMissingDriverRequirements(setupDriver).includes("Contract")],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length) {
  console.error("Driver readiness verification failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Driver readiness verification passed.");
