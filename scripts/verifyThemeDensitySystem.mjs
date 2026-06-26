import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = {
  main: "src/main.jsx",
  bridge: "src/lib/hasten-density-bridge.css",
  themeSkins: "src/lib/themeSkins.js",
  useTheme: "src/hooks/useTheme.js",
  adminControls: "src/components/admin/UIControlsPanel.jsx",
  driverSettings: "src/pages/driver/DriverSettings.jsx",
  customerPortal: "src/pages/client/ClientPortal.jsx",
};

const content = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, fs.readFileSync(path, "utf8")]));

assert(content.main.includes("hasten-density-bridge.css"), "main.jsx must import density bridge CSS.");
assert(content.bridge.includes('[data-portal="enterprise"]'), "Density bridge must target enterprise portal.");
assert(content.bridge.includes("density-ultra-compact"), "Density bridge must support ultra compact density.");
assert(content.bridge.includes("theme-compact-dark"), "Density bridge must support compact dark theme.");
assert(content.themeSkins.includes("compact_dark"), "Theme skins must include compact_dark.");
assert(content.themeSkins.includes("ROLE_DENSITY_DEFAULTS"), "Theme skins must define role density defaults.");
assert(content.useTheme.includes("theme-compact-dark"), "useTheme must apply compact dark class.");
assert(content.adminControls.includes("Theme Mode") && content.adminControls.includes("Density") && content.adminControls.includes("Accent Color"), "Admin controls must expose theme mode, density, and accent color.");
assert(content.driverSettings.includes("Appearance") && content.driverSettings.includes("ThemeSetting"), "Driver settings must save appearance to ThemeSetting.");
assert(content.customerPortal.includes("/client/settings") && content.customerPortal.includes("ClientAppearanceSettings"), "Customer portal must include appearance settings page.");

console.log("PASS theme density system verification");
console.log(JSON.stringify(files, null, 2));
