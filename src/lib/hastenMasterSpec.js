export const PRODUCT_IDENTITY = {
  name: "HASTEN Cargo LLC",
  slogan: "Drive smart. Deliver trust.",
  shortName: "HASTEN",
};

export const ACTIVE_ROLES = [
  "super_admin",
  "admin",
  "dispatcher",
  "driver",
  "customer",
];

export const CUSTOMER_TYPES = ["broker", "direct_client", "shipper"];

export const ADMIN_SIDEBAR = [
  "Dashboard",
  "Dispatch",
  "Drivers",
  "Fleet",
  "Finance",
  "Documents",
  "Customers",
  "Support",
  "Administration",
];

export const DRIVER_BOTTOM_NAV = ["Home", "Loads", "Scan", "Chat", "Profile"];

export const EQUIPMENT_TYPES = {
  priority: [
    "Sprinter",
    "Cargo Van",
    "Box Truck",
    "Hot Shot",
    "Gooseneck / Fifth Wheel",
    "Dry Van",
    "Power Only",
    "Flatbed",
    "Car Hauler",
  ],
  future: [
    "Reefer",
    "Step Deck",
    "Conestoga",
    "Final Mile",
    "LTL / Partial",
    "Expedited",
    "White Glove",
  ],
};

export const DRIVER_EQUIPMENT_FIELDS = [
  "vehicle_type",
  "trailer_type",
  "max_payload",
  "cargo_length",
  "cargo_width",
  "cargo_height",
  "dock_high",
  "liftgate",
  "reefer",
  "hazmat",
  "team_driver",
  "current_location",
  "home_location",
  "preferred_lanes",
  "availability",
  "compliance_status",
];

export const API_PROVIDER_TYPES = [
  "DAT",
  "Truckstop",
  "123Loadboard",
  "TQL",
  "C.H. Robinson",
  "Direct Broker API",
  "Shipper API",
  "Custom Webhook/API",
  "CSV/SFTP Import",
];

export const API_AUTH_TYPES = ["API Key", "OAuth2", "Bearer Token", "Webhook", "SFTP", "CSV"];

export const EXTERNAL_LOAD_FIELDS = [
  "source_provider",
  "external_load_id",
  "broker_customer_id",
  "broker_name",
  "pickup_city",
  "pickup_state",
  "pickup_zip",
  "pickup_datetime_start",
  "pickup_datetime_end",
  "delivery_city",
  "delivery_state",
  "delivery_zip",
  "delivery_datetime_start",
  "delivery_datetime_end",
  "required_equipment",
  "trailer_type",
  "weight",
  "length",
  "width",
  "height",
  "pieces",
  "pallets",
  "commodity",
  "hazmat",
  "temperature_controlled",
  "team_required",
  "miles_total",
  "deadhead_miles",
  "route_distance",
  "rate_available",
  "broker_rate_hidden",
  "rate_type",
  "fuel_surcharge",
  "accessorials",
  "payment_terms",
  "references",
  "contact_name",
  "contact_phone",
  "contact_email",
  "raw_payload_json",
  "normalized_status",
  "imported_at",
  "updated_at",
  "expires_at",
];

export const DRIVER_BID_STATUSES = [
  "interested",
  "bid_submitted",
  "declined",
  "accepted_by_dispatch",
  "rejected_by_dispatch",
  "expired",
  "counter_offer",
];

export const LOAD_LIFECYCLE = [
  "Available",
  "Assigned",
  "Accepted",
  "Dispatched",
  "Arrived Pickup",
  "Loaded",
  "In Transit",
  "Arrived Delivery",
  "Delivered",
  "POD Uploaded",
  "Invoiced",
  "Settled",
  "Closed",
];

export const DRIVER_SCAN_CONFIG = {
  title: "Scan",
  subtitle: "AI document capture — BOL, POD, receipts",
  extractionFields: [
    "BOL Number",
    "Load Number",
    "Weight",
    "Pieces",
    "Delivery Date",
    "Signature Detected",
    "Confidence Score",
  ],
};

export const FINANCE_MENU = [
  "Overview",
  "Profitability",
  "Settlements",
  "Payment Profiles",
  "Factoring",
  "Tax Center",
  "Expense Approvals",
  "IFTA",
];

export const SETTLEMENT_FIELDS = [
  "gross_load_revenue",
  "dispatch_company_fee",
  "factoring_fee",
  "fuel_advance",
  "toll_advance",
  "escrow_hold",
  "approved_deductions",
  "bonus",
  "final_driver_net_pay",
  "HASTEN_net_revenue",
  "payment_status",
  "payout_recipient",
];

export const TAX_CENTER_RULES = {
  form: "1099-NEC",
  box1: "SUM(initial_quote_price + detention_pay)",
  box4: "$0.00",
  noFuelDeductionIn1099: true,
  driverTaxDocumentsReadOnly: true,
};

export const NATIVE_READINESS_GATES = [
  "Capacitor installed or React Native project exists",
  "android/ folder present",
  "ios/ folder present",
  "push notifications configured",
  "background GPS configured",
  "camera plugin working",
  "biometric login supported",
  "secure storage supported",
];

export const TEST_REQUIREMENTS = [
  "Super Admin can configure API source",
  "API import creates ExternalLoad",
  "Equipment matching works",
  "Sprinter driver sees only Sprinter-compatible loads",
  "Hot Shot driver sees only Hot Shot-compatible loads",
  "Broker/source rate hidden from driver",
  "Dispatcher sees full source rate",
  "Driver submits interest/bid",
  "Dispatcher sees bid review",
  "Dispatcher accepts and assigns",
  "ExternalLoad converts to internal Load",
  "updateLoadStatus is called",
  "Driver notification sent",
  "/driver/scan exists",
  "AI scan creates LoadDocument",
  "Chat supports document rejection/resubmit",
  "IncidentReport workflow works",
  "Driver profile shows settlement/compliance/tax documents",
  "Tax Center generates 1099 preview",
  "Driver downloads tax document read-only",
  "Theme dark/light/system works",
  "Density compact mode works",
  "Native status is clearly reported",
  "No false native-complete claim",
  "All direct Load.update workflow bypasses are audited",
  "Super Admin diagnostics creates SystemDiagnosticRun",
  "Cleanup preview works before deleting test data",
];

export const MASTER_QUALITY_TARGET = [
  "enterprise dispatch control",
  "compact admin dashboards",
  "premium native driver app",
  "load-board/API automation",
  "hidden-rate driver auction",
  "equipment-based load matching",
  "settlement and 1099 automation",
  "world-class theme system",
  "super admin diagnostics",
];

export const ROUTE_MANIFEST = {
  loadBoardApis: "/super-admin/settings/integrations/load-board-apis",
  systemDiagnostics: "/super-admin/settings/system-diagnostics",
  loadMarketplace: "/dispatch/load-marketplace",
  bidReview: "/dispatch/bid-review",
  driverScan: "/driver/scan",
  financeTaxCenter: "/finance/tax-center",
  financeSettlements: "/finance/settlements",
  userAccess: "/admin/users-access",
};
