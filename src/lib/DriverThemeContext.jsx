import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const DriverThemeContext = createContext({ fontSize: "normal", colorScheme: "dark" });

export function useDriverTheme() {
  return useContext(DriverThemeContext);
}

// Font size → CSS class to apply on the driver root container
const FONT_SIZE_CLASS = {
  small:  "driver-font-small",
  normal: "",
  big:    "driver-font-big",
};

export function DriverThemeProvider({ user, children }) {
  const [fontSize, setFontSize]       = useState("normal");
  const [colorScheme, setColorScheme] = useState("dark");
  const [resolved, setResolved]       = useState("dark"); // actual dark/light after "system" resolution

  // Load driver preferences
  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1)
      .then(drivers => {
        if (!drivers.length) return;
        const d = drivers[0];
        if (d.preferred_font_size)    setFontSize(d.preferred_font_size);
        if (d.preferred_color_scheme) setColorScheme(d.preferred_color_scheme);
      })
      .catch(() => {});
  }, [user?.id]);

  // Resolve "system" to actual dark/light via media query
  useEffect(() => {
    if (colorScheme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setResolved(mq.matches ? "dark" : "light");
      const handler = (e) => setResolved(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      setResolved(colorScheme);
    }
  }, [colorScheme]);

  // Inject the style tag for driver font sizes
  useEffect(() => {
    const id = "driver-theme-style";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = `
      .driver-font-small  { font-size: 13px; }
      .driver-font-small  .text-sm  { font-size: 12px !important; }
      .driver-font-small  .text-base { font-size: 13px !important; }
      .driver-font-small  .text-lg  { font-size: 15px !important; }
      .driver-font-small  .text-xl  { font-size: 17px !important; }
      .driver-font-small  .text-2xl { font-size: 19px !important; }

      .driver-font-big    { font-size: 17px; }
      .driver-font-big    .text-sm  { font-size: 16px !important; }
      .driver-font-big    .text-base { font-size: 17px !important; }
      .driver-font-big    .text-lg  { font-size: 20px !important; }
      .driver-font-big    .text-xl  { font-size: 23px !important; }
      .driver-font-big    .text-2xl { font-size: 26px !important; }

      /* Light mode overrides for driver screens only */
      .driver-light {
        --background: 210 40% 96%;
        --foreground: 222 47% 8%;
        --card: 0 0% 100%;
        --card-foreground: 222 47% 8%;
        --border: 210 20% 85%;
        --muted: 210 20% 90%;
        --muted-foreground: 215 20% 40%;
        background: hsl(210 40% 96%) !important;
        color: hsl(222 47% 8%) !important;
      }
      .driver-light .glass-card {
        background: rgba(255,255,255,0.9) !important;
        border-color: rgba(0,0,0,0.08) !important;
        box-shadow: 0 2px 16px rgba(0,0,0,0.08) !important;
      }
      .driver-light .text-white   { color: hsl(222 47% 8%) !important; }
      .driver-light .text-slate-400 { color: hsl(215 20% 40%) !important; }
      .driver-light .text-slate-500 { color: hsl(215 20% 50%) !important; }
      .driver-light .text-slate-600 { color: hsl(215 20% 60%) !important; }
      .driver-light nav, .driver-light header {
        background: rgba(255,255,255,0.95) !important;
        border-color: rgba(0,0,0,0.08) !important;
      }
    `;
  }, []);

  const fontClass   = FONT_SIZE_CLASS[fontSize] || "";
  const themeClass  = resolved === "light" ? "driver-light" : "";

  return (
    <DriverThemeContext.Provider value={{ fontSize, colorScheme, resolved }}>
      <div className={`${fontClass} ${themeClass}`} style={{ height: "100%", display: "flex", flexDirection: "column" }} data-driver-theme="1">
        {children}
      </div>
    </DriverThemeContext.Provider>
  );
}