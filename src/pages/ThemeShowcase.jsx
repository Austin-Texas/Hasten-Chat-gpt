import { useState } from "react";
import { THEME_SKINS } from "@/lib/themeSkins";
import { Monitor, Moon, Sun, Sparkles, Truck, BarChart3, ShieldCheck, Bell, Palette } from "lucide-react";

const cards = [
  { label: "Active Loads", value: "128", delta: "+12%", icon: Truck },
  { label: "Gross Revenue", value: "$284K", delta: "+8.4%", icon: BarChart3 },
  { label: "Compliance", value: "96%", delta: "7 alerts", icon: ShieldCheck },
  { label: "Notifications", value: "24", delta: "9 urgent", icon: Bell },
];

const skinClasses = {
  enterprise_dark: "dark skin-enterprise-dark",
  clean_white: "light skin-clean-white",
  hybrid_glass: "dark skin-hybrid-glass",
  executive_graphite: "dark skin-executive-graphite",
  high_contrast_ops: "dark high-contrast skin-high-contrast-ops",
};

export default function ThemeShowcase() {
  const [active, setActive] = useState("enterprise_dark");
  const skin = THEME_SKINS[active];

  return (
    <div className={`min-h-[calc(100vh-4rem)] ${skinClasses[active] || "dark skin-enterprise-dark"}`}>
      <div className="hasten-theme-shell min-h-[calc(100vh-4rem)] rounded-2xl p-4 lg:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 hasten-theme-pill rounded-full px-3 py-1 text-xs font-bold mb-3">
              <Palette className="w-3.5 h-3.5" /> HASTEN Theme Lab
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Enterprise multi-theme preview</h1>
            <p className="text-muted-foreground text-sm mt-1">Dark, clean white, hybrid glass, graphite, and high contrast modes with live toggle behavior.</p>
          </div>
          <div className="grid grid-cols-2 md:flex gap-2">
            {Object.values(THEME_SKINS).map((option) => (
              <button
                key={option.id}
                onClick={() => setActive(option.id)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  active === option.id
                    ? "hasten-theme-button border-transparent"
                    : "hasten-theme-card text-foreground hover:border-primary/40"
                }`}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>

        <div className="hasten-theme-card rounded-2xl p-4 lg:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-widest">Current Skin</p>
              <h2 className="text-xl font-bold text-foreground mt-1">{skin.name}</h2>
              <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{skin.description}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {skin.theme_mode === "light" ? <Sun className="w-4 h-4" /> : skin.id === "hybrid_glass" ? <Sparkles className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="capitalize">{skin.theme_mode.replace("_", " ")}</span>
              <span>•</span>
              <Monitor className="w-4 h-4" />
              <span>{skin.density}</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {cards.map(({ label, value, delta, icon: Icon }) => (
            <div key={label} className="hasten-theme-card rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{label}</p>
                  <div className="text-2xl font-bold text-foreground mt-2">{value}</div>
                  <div className="hasten-theme-pill inline-flex mt-3 rounded-full px-2 py-1 text-xs font-bold">{delta}</div>
                </div>
                <div className="hasten-theme-pill rounded-xl p-2"><Icon className="w-5 h-5" /></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid xl:grid-cols-[1.3fr_.7fr] gap-4">
          <div className="hasten-theme-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Dispatch Control Board</h3>
                <p className="text-muted-foreground text-xs">Enterprise table density preview</p>
              </div>
              <button className="hasten-theme-button rounded-xl px-4 py-2 text-xs font-bold">Sync Loads</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-xs uppercase">
                  <tr className="border-b border-border/60">
                    <th className="text-left p-3">Load</th><th className="text-left p-3">Route</th><th className="text-left p-3">Equipment</th><th className="text-left p-3">Status</th><th className="text-right p-3">Margin</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {[
                    ["LD-1207", "Dallas → Houston", "Hot Shot", "In Auction", "18.5%"],
                    ["LD-1208", "Charlotte → DC", "Dry Van", "Assigned", "22.1%"],
                    ["LD-1209", "Atlanta → Miami", "Box Truck", "At Pickup", "14.8%"],
                  ].map((r) => (
                    <tr key={r[0]} className="border-b border-border/50 hover:bg-primary/5">
                      {r.map((c, i) => <td key={i} className={`p-3 ${i === 4 ? "text-right font-bold text-primary" : ""}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hasten-theme-card rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-foreground">Driver Mobile Preview</h3>
            <div className="rounded-[2rem] border border-border/70 p-3 bg-background/70 max-w-[260px] mx-auto">
              <div className="rounded-[1.5rem] hasten-theme-card p-4 space-y-3">
                <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Hi, Driver</p><h4 className="font-bold text-foreground">On Load</h4></div><div className="hasten-theme-pill rounded-full px-2 py-1 text-xs">Live</div></div>
                <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3"><p className="text-xs text-muted-foreground">Current Load</p><p className="font-bold text-foreground">Dallas → Houston</p><div className="h-2 rounded-full bg-muted mt-3"><div className="h-2 rounded-full bg-primary w-2/3" /></div></div>
                <div className="grid grid-cols-2 gap-2 text-xs"><button className="hasten-theme-button rounded-xl py-2 font-bold">Arrived</button><button className="hasten-theme-card rounded-xl py-2 font-bold text-foreground">Scan POD</button></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
