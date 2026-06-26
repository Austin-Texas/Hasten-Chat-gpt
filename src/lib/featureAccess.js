export const STORAGE_FEATURES = "hasten_feature_access";
export const FEATURE_ACCESS_EVENT = "hasten_feature_access_changed";

export const rolesForAccess = ["super_admin", "admin", "dispatcher", "driver", "customer"];

export const featureGroups = [
  {
    key: "Dashboard",
    label: "Dashboard",
    items: ["Dashboard", "Approvals", "Reports", "Activity", "Notifications"],
  },
  {
    key: "Dispatch",
    label: "Dispatch",
    items: ["Dispatch Board", "Load Marketplace", "Loads", "Load Templates", "Quotes", "Shipments", "Tracking", "Detention", "Bid Review"],
  },
  {
    key: "Drivers",
    label: "Drivers",
    items: ["Drivers", "Contractors", "Scorecards"],
  },
  {
    key: "Fleet",
    label: "Fleet",
    items: ["Fleet", "Equipment", "Maintenance", "Safety", "Compliance", "Utilization", "IFTA"],
  },
  {
    key: "Finance",
    label: "Finance",
    items: ["Finance", "Settlements", "Weekly Settlements", "Expenses", "Factoring", "Tax Center", "Payment Profiles", "Profitability"],
  },
  {
    key: "Documents",
    label: "Documents",
    items: ["Document Portal", "Pending Documents", "Contractor Documents", "Lifecycle", "Driver Scan"],
  },
  {
    key: "Customers",
    label: "Customers",
    items: ["Customers", "Quote Requests", "Customer Shipments", "Customer Tracking", "Customer Documents", "Customer Invoices"],
  },
  {
    key: "Support",
    label: "Support",
    items: ["Messages", "Support Tickets", "Feedback", "Help Center", "Incident Center", "Admin Assistant", "Dispatcher Assistant"],
  },
  {
    key: "Driver App",
    label: "Driver App",
    items: ["Driver Home", "Driver Loads", "Driver Scan", "Driver Chat", "Driver Profile", "Driver Settings", "Driver Support", "Driver Emergency"],
  },
  {
    key: "Administration",
    label: "Administration",
    items: ["Users & Access", "Settings", "Theme Showcase", "App Blueprint", "API Integrations", "System Diagnostics", "Security"],
  },
];

export const featureSections = [...new Set(featureGroups.flatMap((group) => [group.key, ...group.items]))];

function allAccess(value) {
  return Object.fromEntries(featureSections.map((section) => [section, value]));
}

const dispatcherAccess = {
  ...allAccess(false),
  Dashboard: true,
  Dispatch: true,
  "Dispatch Board": true,
  "Load Marketplace": true,
  "Bid Review": true,
  Loads: true,
  "Load Templates": true,
  Quotes: true,
  Shipments: true,
  Tracking: true,
  Detention: true,
  Drivers: true,
  Scorecards: true,
  Documents: true,
  "Document Portal": true,
  Support: true,
  Messages: true,
  "Support Tickets": true,
  Notifications: true,
  "Incident Center": true,
  "Dispatcher Assistant": true,
  "Help Center": true,
};

const driverAccess = {
  ...allAccess(false),
  "Driver App": true,
  "Driver Home": true,
  "Driver Loads": true,
  "Driver Scan": true,
  "Driver Chat": true,
  "Driver Profile": true,
  "Driver Settings": true,
  "Driver Support": true,
  "Driver Emergency": true,
  Documents: true,
  "Driver Scan": true,
  Messages: true,
  Settlements: true,
  Support: true,
};

const customerAccess = {
  ...allAccess(false),
  Dashboard: true,
  Customers: true,
  "Quote Requests": true,
  "Customer Shipments": true,
  Tracking: true,
  "Customer Tracking": true,
  Documents: true,
  "Customer Documents": true,
  Finance: true,
  "Customer Invoices": true,
  Support: true,
  Messages: true,
  "Support Tickets": true,
  "Help Center": true,
};

export const defaultFeatureAccess = {
  super_admin: allAccess(true),
  admin: allAccess(true),
  dispatcher: dispatcherAccess,
  driver: driverAccess,
  customer: customerAccess,
};

export function roleToAccessKey(role) {
  return rolesForAccess.includes(role) ? role : "admin";
}

export function loadFeatureAccess() {
  try {
    const raw = localStorage.getItem(STORAGE_FEATURES);
    const saved = raw ? JSON.parse(raw) : {};
    return rolesForAccess.reduce((acc, role) => {
      acc[role] = { ...defaultFeatureAccess[role], ...(saved[role] || {}) };
      return acc;
    }, {});
  } catch {
    return defaultFeatureAccess;
  }
}

export function saveFeatureAccess(nextAccess) {
  const normalized = rolesForAccess.reduce((acc, role) => {
    acc[role] = { ...defaultFeatureAccess[role], ...(nextAccess?.[role] || {}) };
    return acc;
  }, {});

  localStorage.setItem(STORAGE_FEATURES, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(FEATURE_ACCESS_EVENT, { detail: normalized }));
  return normalized;
}

export function isFeatureEnabled(featureAccess, role, section) {
  if (!section) return true;
  if (section === "Administration" || section === "Users & Access") return true;

  const accessKey = roleToAccessKey(role);
  const roleAccess = featureAccess?.[accessKey] || defaultFeatureAccess[accessKey] || defaultFeatureAccess.admin;
  return roleAccess?.[section] !== false;
}

export function resetFeatureAccess() {
  return saveFeatureAccess(defaultFeatureAccess);
}
