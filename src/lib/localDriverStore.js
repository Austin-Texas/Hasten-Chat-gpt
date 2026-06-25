const STORAGE_KEY = "hasten_local_drivers";

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
