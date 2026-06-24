/* ============================================================
   HASTEN UI PERSISTENCE SYSTEM
   Manages theme/density/glass/font/layout classes on <body>
   via localStorage. Exposes window.HASTEN_UI for dropdowns.
   ============================================================ */

const STORAGE_KEY = "hasten-ui-settings";

const defaults = {
  theme: "theme-dark",
  density: "h-density-compact",
  glass: "glass-low",
  font: "font-default",
  layout: "layout-enterprise"
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaults, ...saved } : defaults;
  } catch {
    return defaults;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

function applySettings(settings) {
  const body = document.body;
  if (!body) return;

  body.classList.remove(
    "theme-dark", "theme-light", "theme-high-contrast",
    "h-density-comfortable", "h-density-compact", "h-density-ultra",
    "glass-low", "glass-medium", "glass-high",
    "font-small", "font-default", "font-large",
    "layout-enterprise", "layout-premium"
  );

  body.classList.add(
    settings.theme,
    settings.density,
    settings.glass,
    settings.font,
    settings.layout
  );
}

let settings = loadSettings();
applySettings(settings);

const HASTEN_UI = {
  getSettings() {
    return { ...settings };
  },
  setTheme(theme) {
    settings.theme = theme;
    saveSettings(settings);
    applySettings(settings);
  },
  setDensity(density) {
    settings.density = density;
    saveSettings(settings);
    applySettings(settings);
  },
  setGlass(level) {
    settings.glass = level;
    saveSettings(settings);
    applySettings(settings);
  },
  setFont(size) {
    settings.font = size;
    saveSettings(settings);
    applySettings(settings);
  },
  setLayout(layout) {
    settings.layout = layout;
    saveSettings(settings);
    applySettings(settings);
  },
  applyRoleDefaults(role) {
    if (!role) return;
    const r = role.toLowerCase();
    if (["admin", "dispatcher", "superadmin", "super_admin"].includes(r)) {
      this.setDensity("h-density-compact");
      this.setLayout("layout-enterprise");
    }
    if (["driver", "customer"].includes(r)) {
      this.setDensity("h-density-comfortable");
      this.setLayout("layout-premium");
    }
  }
};

window.HASTEN_UI = HASTEN_UI;

export { HASTEN_UI };