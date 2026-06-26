// HASTEN Cargo LLC — Enterprise Theme Skin Presets
// Production-grade theme and density presets for admin, dispatcher, driver, and customer portals.

export const THEME_SKINS = {
  enterprise_dark: {
    id: "enterprise_dark",
    name: "Enterprise Dark",
    description: "Premium dark navy, dense operations, neon green/blue accents.",
    theme_mode: "dark",
    skin_preset: "enterprise_dark",
    accent_color: "#00E678",
    secondary_accent_color: "#4DA3FF",
    custom_accent_enabled: true,
    density: "compact",
    font_size: "default",
    glassmorphism_intensity: "medium",
    card_transparency: "soft",
    gloss_highlight: "subtle",
    shadow_level: "medium",
    border_style: "rounded",
    button_style: "gradient",
  },
  compact_dark: {
    id: "compact_dark",
    name: "Compact Dark",
    description: "Maximum enterprise density with HASTEN dark navy control-center styling.",
    theme_mode: "compact_dark",
    skin_preset: "compact_dark",
    accent_color: "#00E678",
    secondary_accent_color: "#3B82F6",
    custom_accent_enabled: true,
    density: "ultra_compact",
    font_size: "small",
    glassmorphism_intensity: "low",
    card_transparency: "solid",
    gloss_highlight: "off",
    shadow_level: "low",
    border_style: "thin",
    button_style: "solid",
  },
  clean_white: {
    id: "clean_white",
    name: "Clean White",
    description: "Bright executive SaaS mode for daytime office operations.",
    theme_mode: "light",
    skin_preset: "clean_white",
    accent_color: "#16B364",
    secondary_accent_color: "#2E90FA",
    custom_accent_enabled: true,
    density: "compact",
    font_size: "default",
    glassmorphism_intensity: "low",
    card_transparency: "solid",
    gloss_highlight: "off",
    shadow_level: "low",
    border_style: "rounded",
    button_style: "solid",
  },
  hybrid_glass: {
    id: "hybrid_glass",
    name: "Hybrid Glass",
    description: "Dark sidebar + luminous glass workspace for premium demos.",
    theme_mode: "dark",
    skin_preset: "hybrid_glass",
    accent_color: "#39E58C",
    secondary_accent_color: "#7B5CFF",
    custom_accent_enabled: true,
    density: "comfortable",
    font_size: "default",
    glassmorphism_intensity: "high",
    card_transparency: "clear",
    gloss_highlight: "strong",
    shadow_level: "high",
    border_style: "pill",
    button_style: "gradient",
  },
  executive_graphite: {
    id: "executive_graphite",
    name: "Executive Graphite",
    description: "Quiet, low-glow gray theme for finance and reports.",
    theme_mode: "dark",
    skin_preset: "executive_graphite",
    accent_color: "#22C55E",
    secondary_accent_color: "#94A3B8",
    custom_accent_enabled: true,
    density: "ultra_compact",
    font_size: "small",
    glassmorphism_intensity: "low",
    card_transparency: "solid",
    gloss_highlight: "off",
    shadow_level: "low",
    border_style: "thin",
    button_style: "solid",
  },
  high_contrast_ops: {
    id: "high_contrast_ops",
    name: "High Contrast Ops",
    description: "Maximum contrast for dispatch rooms and sunlight readability.",
    theme_mode: "high_contrast",
    skin_preset: "high_contrast_ops",
    accent_color: "#00FF88",
    secondary_accent_color: "#00B7FF",
    custom_accent_enabled: true,
    density: "compact",
    font_size: "large",
    glassmorphism_intensity: "low",
    card_transparency: "solid",
    gloss_highlight: "off",
    shadow_level: "medium",
    border_style: "rounded",
    button_style: "solid",
  },
};

export const SKIN_OPTIONS = Object.entries(THEME_SKINS).map(([key, skin]) => ({
  id: key,
  ...skin,
}));

export const UI_CONTROLS = {
  theme_mode: ["system", "dark", "light", "compact_dark", "high_contrast"],
  density: ["comfortable", "compact", "ultra_compact"],
  accent_color: ["#00E678", "#3B82F6", "#F97316", "#EF4444"],
  glassmorphism_intensity: ["low", "medium", "high"],
  font_size: ["small", "default", "large"],
  card_transparency: ["solid", "soft", "clear"],
  gloss_highlight: ["off", "subtle", "strong"],
  shadow_level: ["low", "medium", "high"],
  border_style: ["thin", "rounded", "pill"],
};

export const ROLE_DENSITY_DEFAULTS = {
  super_admin: "compact",
  admin: "compact",
  dispatcher: "compact",
  finance: "compact",
  driver: "comfortable",
  customer: "comfortable",
};

export const getGlassEffect = (intensity) => {
  switch (intensity) {
    case "low": return "bg-card/80 backdrop-blur-sm border-border/70";
    case "medium": return "bg-card/65 backdrop-blur-md border-border/60";
    case "high": return "bg-card/45 backdrop-blur-xl border-border/50";
    default: return "bg-card border-border";
  }
};

export const getCardOpacity = (transparency) => {
  switch (transparency) {
    case "solid": return "bg-opacity-100";
    case "soft": return "bg-opacity-75";
    case "clear": return "bg-opacity-45";
    default: return "bg-opacity-75";
  }
};

export const getShadowLevel = (level) => {
  switch (level) {
    case "low": return "shadow-sm";
    case "medium": return "shadow-lg";
    case "high": return "shadow-2xl";
    default: return "shadow-lg";
  }
};

export const getBorderStyle = (style) => {
  switch (style) {
    case "thin": return "rounded-lg";
    case "rounded": return "rounded-xl";
    case "pill": return "rounded-2xl";
    default: return "rounded-xl";
  }
};

export const getButtonStyle = (style, isDisabled = false) => {
  const base = "font-semibold text-sm transition-all duration-150";
  const disabled = isDisabled ? "opacity-50 cursor-not-allowed" : "";
  switch (style) {
    case "gradient": return `${base} ${disabled} bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-300 hover:to-blue-400 text-slate-950 border border-green-300/50 shadow-lg shadow-green-500/15`;
    case "solid": return `${base} ${disabled} bg-green-500 hover:bg-green-400 text-slate-950 border border-green-400/40`;
    case "ghost": return `${base} ${disabled} bg-transparent hover:bg-white/10 text-foreground border border-white/20`;
    default: return `${base} ${disabled} bg-green-500 hover:bg-green-400 text-slate-950`;
  }
};
