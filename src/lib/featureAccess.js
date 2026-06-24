export const STORAGE_FEATURES = "hasten_feature_access";
export const FEATURE_ACCESS_EVENT = "hasten_feature_access_changed";

export const featureSections = [
  "Dashboard",
  "Dispatch",
  "Loads",
  "Drivers",
  "Fleet",
  "Tracking",
  "Documents",
  "Finance",
  "Payroll",
  "Settlements",
  "Reports",
  "Messages",
  "Support",
  "Settings",
];

export const defaultFeatureAccess = {
  admin: {
    Dashboard: true,
    Dispatch: true,
    Loads: true,
    Drivers: true,
    Fleet: true,
    Tracking: true,
    Documents: true,
    Finance: true,
    Payroll: true,
    Settlements: true,
    Reports: true,
    Messages: true,
    Support: true,
    Settings: true,
  },
  dispatcher: {
    Dashboard: true,
    Dispatch: true,
    Loads: true,
    Drivers: true,
    Fleet: true,
    Tracking: true,
    Documents: true,
    Finance: false,
    Payroll: false,
    Settlements: false,
    Reports: false,
    Messages: true,
    Support: true,
    Settings: false,
  },
  driver: {
    Dashboard: false,
    Dispatch: false,
    Loads: true,
    Drivers: false,
    Fleet: false,
    Tracking: true,
    Documents: true,
    Finance: false,
    Payroll: false,
    Settlements: true,
    Reports: false,
    Messages: true,
    Support: true,
    Settings: false,
  },
  customer: {
    Dashboard: true,
    Dispatch: false,
    Loads: false,
    Drivers: false,
    Fleet: false,
    Tracking: true,
    Documents: true,
    Finance: false,
    Payroll: false,
    Settlements: false,
    Reports: false,
    Messages: true,
    Support: true,
    Settings: false,
  },
};

export function roleToAccessKey(role) {
  if (role === "super_admin") return "admin";
  return role || "admin";
}

export function loadFeatureAccess() {
  try {
    const raw = localStorage.getItem(STORAGE_FEATURES);
    if (!raw) return defaultFeatureAccess;
    return { ...defaultFeatureAccess, ...JSON.parse(raw) };
  } catch {
    return defaultFeatureAccess;
  }
}

export function saveFeatureAccess(nextAccess) {
  localStorage.setItem(STORAGE_FEATURES, JSON.stringify(nextAccess));
  window.dispatchEvent(new CustomEvent(FEATURE_ACCESS_EVENT, { detail: nextAccess }));
}

export function isFeatureEnabled(featureAccess, role, section) {
  if (!section) return true;

  // Keep Administration visible so admins do not lock themselves out of permission controls.
  if (section === "Administration" || section === "Users & Access") return true;

  const accessKey = roleToAccessKey(role);
  const roleAccess = featureAccess?.[accessKey] || defaultFeatureAccess[accessKey] || defaultFeatureAccess.admin;
  return roleAccess?.[section] !== false;
}
