import {
  DRIVER_DEMO_SEED_VERSION,
  DRIVER_DEMO_SOURCE,
  buildEnterpriseDriverDemoData,
  calculateDriverCompliance,
  calculateDriverSafety,
  calculateDriverPerformance,
} from "./enterpriseDriverDemo";

const STORAGE_KEY = "hasten_local_drivers";
const ENTERPRISE_DEMO_KEY = "hasten_driver_enterprise_demo_bundle";
const ENTERPRISE_DEMO_SEED_KEY = "hasten_driver_enterprise_demo_seed_version";

const defaultDrivers = [
  {
    id: "drv-demo-1",
    first_name: "Marcus",
    last_name: "Johnson",
    email: "driver@hasten.com",
    phone: "555-0101",
    license_number: "CDL-DEMO-001",
    license_class: "A",
    license_state: "NC",
    license_expiry: "2027-12-31",
    medical_expiry: "2027-06-30",
    hazmat_cert: false,
    hire_date: "2026-06-01",
    pay_type: "per_mile",
    pay_rate: 3.2,
    home_city: "Fayetteville",
    home_state: "NC",
    emergency_contact_name: "Demo Contact",
    emergency_contact_phone: "555-0102",
    notes: "Local demo driver.",
    status: "available",
    safety_score: 100,
    loads_completed: 0,
    created_date: "2026-06-24T00:00:00.000Z",
  },
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readDrivers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDrivers));
      return defaultDrivers;
    }
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDrivers));
    return defaultDrivers;
  }
}

function writeDrivers(drivers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
  window.dispatchEvent(new CustomEvent("hasten_drivers_changed", { detail: drivers }));
}

function dispatchEnterpriseBundle(bundle) {
  window.dispatchEvent(new CustomEvent("hasten_driver_enterprise_demo_changed", { detail: bundle }));
}

export function listLocalDrivers() {
  return readDrivers();
}

export function getLocalDriver(id) {
  return readDrivers().find((driver) => driver.id === id) || null;
}

export function createLocalDriver(data) {
  const now = new Date().toISOString();
  const driver = {
    ...data,
    id: `drv-${Date.now()}`,
    status: data.status || "available",
    safety_score: Number(data.safety_score || 100),
    loads_completed: Number(data.loads_completed || 0),
    pay_rate: data.pay_rate === "" ? 0 : Number(data.pay_rate),
    created_date: now,
    updated_date: now,
  };
  const drivers = [driver, ...readDrivers()];
  writeDrivers(drivers);
  return driver;
}

export function updateLocalDriver(id, data) {
  const drivers = readDrivers();
  const index = drivers.findIndex((driver) => driver.id === id);
  if (index === -1) throw new Error("Driver not found");
  const updated = {
    ...drivers[index],
    ...data,
    pay_rate: data.pay_rate === "" ? 0 : Number(data.pay_rate),
    updated_date: new Date().toISOString(),
  };
  drivers[index] = updated;
  writeDrivers(drivers);
  return updated;
}

export function getEnterpriseDriverDemoBundle() {
  return readJson(ENTERPRISE_DEMO_KEY, null);
}

export function hasEnterpriseDriverDemoData() {
  return localStorage.getItem(ENTERPRISE_DEMO_SEED_KEY) === DRIVER_DEMO_SEED_VERSION;
}

export function importEnterpriseDriverDemoData({ force = false } = {}) {
  if (!force && hasEnterpriseDriverDemoData()) {
    return {
      imported: false,
      duplicatePrevented: true,
      seedVersion: DRIVER_DEMO_SEED_VERSION,
      bundle: getEnterpriseDriverDemoBundle(),
      drivers: readDrivers(),
    };
  }

  const bundle = buildEnterpriseDriverDemoData();
  const existingDrivers = readDrivers();
  const realDrivers = existingDrivers.filter((driver) => driver?.source !== DRIVER_DEMO_SOURCE && !driver?.isDemo);
  const drivers = [...bundle.drivers, ...realDrivers];

  writeDrivers(drivers);
  writeJson(ENTERPRISE_DEMO_KEY, bundle);
  localStorage.setItem(ENTERPRISE_DEMO_SEED_KEY, DRIVER_DEMO_SEED_VERSION);
  dispatchEnterpriseBundle(bundle);

  return {
    imported: true,
    duplicatePrevented: false,
    seedVersion: DRIVER_DEMO_SEED_VERSION,
    bundle,
    drivers,
  };
}

export function resetEnterpriseDriverDemoData() {
  const existingDrivers = readDrivers();
  const realDrivers = existingDrivers.filter((driver) => driver?.source !== DRIVER_DEMO_SOURCE && !driver?.isDemo);

  writeDrivers(realDrivers.length ? realDrivers : defaultDrivers);
  localStorage.removeItem(ENTERPRISE_DEMO_KEY);
  localStorage.removeItem(ENTERPRISE_DEMO_SEED_KEY);
  dispatchEnterpriseBundle(null);

  return {
    reset: true,
    drivers: realDrivers.length ? realDrivers : defaultDrivers,
  };
}

export function recalculateEnterpriseDriverDemoData() {
  const bundle = getEnterpriseDriverDemoBundle() || buildEnterpriseDriverDemoData();
  const drivers = readDrivers();
  const recalculatedDrivers = drivers.map((driver) => {
    if (driver?.source !== DRIVER_DEMO_SOURCE && !driver?.isDemo) return driver;

    const compliance = calculateDriverCompliance(driver, bundle);
    const safety = calculateDriverSafety(driver, bundle.driverEvents || [], bundle.dvirReports || []);
    const performance = calculateDriverPerformance(driver, bundle.loadAssignments || []);

    return {
      ...driver,
      compliance_status: compliance.status,
      compliance_score: compliance.score,
      compliance_hold_required: compliance.hold_required,
      status: compliance.hold_required ? "compliance_hold" : driver.status,
      safety_score: safety.score,
      safety_status: safety.level,
      performance_score: performance.score,
      on_time_pickup_pct: performance.completion_rate,
      on_time_delivery_pct: performance.completion_rate,
      load_acceptance_rate: performance.acceptance_rate,
      cancellation_rate: Math.max(0, 100 - performance.acceptance_rate),
      rolling_90_day_trend: performance.rolling_90_day_trend,
      updated_date: new Date().toISOString(),
    };
  });

  const updatedBundle = {
    ...bundle,
    drivers: recalculatedDrivers.filter((driver) => driver?.source === DRIVER_DEMO_SOURCE || driver?.isDemo),
    recalculated_at: new Date().toISOString(),
  };

  writeDrivers(recalculatedDrivers);
  writeJson(ENTERPRISE_DEMO_KEY, updatedBundle);
  dispatchEnterpriseBundle(updatedBundle);

  return {
    recalculated: true,
    bundle: updatedBundle,
    drivers: recalculatedDrivers,
  };
}

export function generateWeeklyEnterpriseDemoSettlements() {
  const bundle = getEnterpriseDriverDemoBundle() || buildEnterpriseDriverDemoData();
  const settlements = bundle.settlements || [];
  const generated = settlements.map((settlement) => ({
    ...settlement,
    status: "ready_for_review",
    pdf_preview_ready: true,
    generated_at: new Date().toISOString(),
  }));
  const updatedBundle = {
    ...bundle,
    settlements: generated,
    weekly_settlements_generated_at: new Date().toISOString(),
  };
  writeJson(ENTERPRISE_DEMO_KEY, updatedBundle);
  dispatchEnterpriseBundle(updatedBundle);
  return {
    generated: true,
    count: generated.length,
    settlements: generated,
    bundle: updatedBundle,
  };
}
