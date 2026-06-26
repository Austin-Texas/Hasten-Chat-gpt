import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  FileText,
  Home,
  MessageSquare,
  Moon,
  Package,
  Palette,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Truck,
  User,
  Zap,
} from "lucide-react";
import {
  ADMIN_SIDEBAR,
  DRIVER_BOTTOM_NAV,
  EQUIPMENT_TYPES,
  MASTER_QUALITY_TARGET,
  PRODUCT_IDENTITY,
  ROUTE_MANIFEST,
} from "@/lib/hastenMasterSpec";

const themeOptions = {
  enterprise: {
    name: "Enterprise Dark",
    shell: "bg-[#030914] text-white",
    panel: "bg-[#07121d]/86 border-white/10 shadow-[0_24px_70px_rgba(0,0,0,.35)]",
    card: "bg-[#0d1b28]/80 border-white/10",
    soft: "bg-[#111f2d]/70 border-white/10",
    muted: "text-slate-400",
    accent: "text-[#50e348]",
    button: "bg-gradient-to-r from-[#55e04a] to-[#19c95b] text-black",
    route: "#55e04a",
  },
  clean: {
    name: "Clean White",
    shell: "bg-[#f6f8fb] text-slate-950",
    panel: "bg-white border-slate-200 shadow-[0_24px_60px_rgba(15,23,42,.08)]",
    card: "bg-[#f9fbfd] border-slate-200",
    soft: "bg-white border-slate-200",
    muted: "text-slate-500",
    accent: "text-emerald-600",
    button: "bg-gradient-to-r from-emerald-500 to-lime-500 text-white",
    route: "#16a34a",
  },
  hybrid: {
    name: "Hybrid Glass",
    shell: "bg-[radial-gradient(circle_at_top_left,#172554_0%,#07111e_38%,#030712_100%)] text-white",
    panel: "bg-white/[0.07] border-white/15 shadow-[0_24px_80px_rgba(34,197,94,.10)] backdrop-blur-xl",
    card: "bg-white/[0.06] border-white/15 backdrop-blur-xl",
    soft: "bg-white/[0.05] border-white/10 backdrop-blur-xl",
    muted: "text-slate-300/80",
    accent: "text-[#6efb75]",
    button: "bg-gradient-to-r from-[#65f24e] via-[#23d46a] to-[#2d8cff] text-black",
    route: "#64f05c",
  },
};

const kpis = [
  ["Loads In Transit", "156", "+8.2%"],
  ["Matched Drivers", "78", "+6.7%"],
  ["Open Bids", "24", "+15.3%"],
  ["Pending Docs", "12", "review"],
];

function cls(...values) {
  return values.filter(Boolean).join(" ");
}

function BrandMark({ small = false }) {
  return (
    <div className={cls("grid place-items-center rounded-xl border border-emerald-400/40 font-black text-emerald-400", small ? "h-9 w-9 text-sm" : "h-14 w-14 text-xl")}>
      HC
    </div>
  );
}

function PhoneFrame({ theme }) {
  return (
    <div className="mx-auto w-[245px] rounded-[2rem] border border-white/15 bg-black/80 p-2 shadow-2xl">
      <div className={cls("relative min-h-[470px] overflow-hidden rounded-[1.65rem] p-4", theme.card)}>
        <div className="mb-4 flex items-center justify-between text-[10px] font-bold"><span>9:41</span><span>▴ Wi‑Fi ▭</span></div>
        <div className="mb-4 flex items-start justify-between">
          <div><h3 className="text-lg font-bold">Hi, Driver 👋</h3><p className={cls("text-xs", theme.muted)}>Available • Fayetteville, NC</p></div>
          <div className="relative rounded-2xl border border-white/10 p-2"><Bell className="h-4 w-4" /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#55e04a]" /></div>
        </div>
        <div className={cls("mb-3 rounded-2xl border p-3", theme.soft)}>
          <p className={cls("text-[10px] uppercase tracking-widest", theme.muted)}>Active Load</p>
          <div className="mt-1 flex justify-between"><b className="text-xl text-emerald-400">HC-DEMO-001</b><span className="rounded-full bg-violet-500/20 px-2 py-1 text-xs text-violet-200">Assigned</span></div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm"><b>Fayetteville</b><span className={theme.muted}>→</span><b>Raleigh</b></div>
          <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-2 w-[66%] rounded-full bg-gradient-to-r from-emerald-400 to-violet-500" /></div>
        </div>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[["Duty", "On"], ["Miles", "68"], ["HOS", "6:45"], ["Earned", "$450"]].map(([label, value]) => (
            <div key={label} className={cls("rounded-xl border p-2 text-center", theme.soft)}><b className={label === "Earned" ? theme.accent : ""}>{value}</b><p className={cls("text-[9px]", theme.muted)}>{label}</p></div>
          ))}
        </div>
        <p className={cls("mb-2 text-[10px] uppercase tracking-[.2em]", theme.muted)}>Quick Actions</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
          {[
            "Start Trip",
            "Arrived Pickup",
            "Upload POD",
            "Send ETA",
            "Report Issue",
            "Emergency",
          ].map((action) => <button key={action} className={cls("rounded-xl border p-3 text-left", action === "Emergency" ? "border-rose-400/30 bg-rose-500/10 text-rose-300" : theme.soft)} type="button">{action}</button>)}
        </div>
        <div className="absolute bottom-3 left-3 right-3 grid grid-cols-5 gap-1 text-center text-[10px]">
          {DRIVER_BOTTOM_NAV.map((label) => {
            const Icon = { Home, Loads: Package, Scan: ScanLine, Chat: MessageSquare, Profile: User }[label];
            return <div key={label} className={cls(label === "Scan" ? "rounded-2xl bg-blue-500 p-2 shadow-[0_0_25px_rgba(59,130,246,.8)]" : "p-2", label === "Home" ? theme.accent : theme.muted)}><Icon className="mx-auto h-4 w-4" /><span>{label}</span></div>;
          })}
        </div>
      </div>
    </div>
  );
}

function DashboardPreview({ theme }) {
  return (
    <div className={cls("rounded-[1.8rem] border p-4", theme.panel)}>
      <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
        <aside className={cls("hidden rounded-2xl border p-4 lg:block", theme.card)}>
          <div className="mb-6 flex items-center gap-3"><BrandMark small /><div><b>{PRODUCT_IDENTITY.shortName}</b><p className={cls("text-xs", theme.accent)}>Cargo LLC</p></div></div>
          <div className="space-y-1 text-sm">
            {ADMIN_SIDEBAR.map((item, index) => <div key={item} className={cls("flex items-center gap-2 rounded-xl px-3 py-2", index === 0 ? "bg-emerald-500/15 text-emerald-400" : theme.muted)}><Home className="h-4 w-4" />{item}</div>)}
          </div>
        </aside>
        <main className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h2 className="text-2xl font-black tracking-tight">Dispatch Control Center</h2><p className={cls("text-sm", theme.muted)}>Compact operations dashboard • marketplace • bids • settlements</p></div>
            <div className={cls("flex items-center gap-2 rounded-xl border px-3 py-2", theme.card)}><Search className="h-4 w-4" /><span className={cls("text-xs", theme.muted)}>Search anything...</span></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(([label, value, delta], index) => <div key={label} className={cls("rounded-2xl border p-4", theme.card, index === 0 ? "ring-1 ring-emerald-400/30" : "")}><p className={cls("text-xs", theme.muted)}>{label}</p><b className="mt-1 block text-2xl">{value}</b><span className="text-xs text-emerald-400">{delta}</span></div>)}
          </div>
          <div className="grid gap-3 xl:grid-cols-[.85fr_1.15fr]">
            <div className={cls("rounded-2xl border p-4", theme.card)}>
              <h3 className="mb-3 font-bold">Load Status Overview</h3>
              <div className="flex items-center gap-5"><div className="grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(#55e04a_0_40%,#2d8cff_40%_70%,#fbbf24_70%_86%,#64748b_86%)]"><div className={cls("grid h-20 w-20 place-items-center rounded-full", theme.shell)}><b>156</b></div></div><div className="space-y-2 text-xs">{["Assigned 24", "In Transit 78", "Delivered 40", "Pending POD 14"].map((item) => <p key={item}>● {item}</p>)}</div></div>
            </div>
            <div className={cls("relative min-h-[180px] overflow-hidden rounded-2xl border p-4", theme.card)} style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
              <h3 className="relative z-10 font-bold">Live Dispatch Map</h3>
              <div className="absolute left-24 right-16 top-28 h-1 rotate-[-12deg] rounded-full" style={{ background: theme.route, boxShadow: `0 0 24px ${theme.route}` }} />
              <span className="absolute left-28 top-24">📍</span><span className="absolute right-20 top-16">📍</span><span className="absolute bottom-12 left-1/2">🚚</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppBlueprint() {
  const [activeTheme, setActiveTheme] = useState("enterprise");
  const theme = useMemo(() => themeOptions[activeTheme], [activeTheme]);

  return (
    <div className={cls("min-h-[calc(100vh-4rem)] space-y-5 rounded-3xl p-4 lg:p-6", theme.shell)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-400"><Sparkles className="h-3.5 w-3.5" /> HASTEN Master Blueprint</div>
          <h1 className="text-3xl font-black tracking-tight lg:text-4xl">{PRODUCT_IDENTITY.name}</h1>
          <p className={cls("mt-2 max-w-3xl", theme.muted)}>{PRODUCT_IDENTITY.slogan} — enterprise dispatch control with a premium driver app and no placeholder brand marks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(themeOptions).map(([id, option]) => <button key={id} onClick={() => setActiveTheme(id)} className={cls("rounded-xl border px-4 py-2 text-sm font-bold", activeTheme === id ? theme.button : theme.card)} type="button">{id === "clean" ? <Sun className="mr-1 inline h-4 w-4" /> : <Moon className="mr-1 inline h-4 w-4" />}{option.name}</button>)}
        </div>
      </div>

      <div className={cls("rounded-[2rem] border p-4 lg:p-5", theme.panel)}>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3"><BrandMark /><div><h2 className="text-2xl font-black">{PRODUCT_IDENTITY.shortName} <span className={theme.accent}>Cargo LLC</span></h2><p className={theme.muted}>Uber Freight + Samsara + Tesla + Bloomberg Terminal direction</p></div></div>
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
            {[[Palette, "Theme system"], [ShieldCheck, "Role access"], [Truck, "Equipment match"], [ScanLine, "Scan workflow"], [Zap, "Native readiness"]].map(([Icon, label]) => <div key={label} className={cls("rounded-xl border p-3 text-center", theme.card)}><Icon className="mx-auto mb-1 h-5 w-5 text-emerald-400" />{label}</div>)}
          </div>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <DashboardPreview theme={theme} />
          <div className={cls("rounded-[1.8rem] border p-4", theme.panel)}>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-black">Driver App — Mobile First</h2><p className={cls("text-xs", theme.muted)}>{DRIVER_BOTTOM_NAV.join(" • ")}</p></div><Zap className="h-5 w-5 text-emerald-400" /></div>
            <PhoneFrame theme={theme} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className={cls("rounded-3xl border p-5", theme.panel)}>
          <h2 className="mb-4 text-xl font-black">Priority Equipment</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {EQUIPMENT_TYPES.priority.map((item) => <div key={item} className={cls("rounded-xl border p-3", theme.soft)}><Truck className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />{item}</div>)}
          </div>
        </div>
        <div className={cls("rounded-3xl border p-5", theme.panel)}>
          <h2 className="mb-4 text-xl font-black">Required Routes</h2>
          <div className="space-y-2 text-xs">
            {Object.entries(ROUTE_MANIFEST).map(([key, path]) => <div key={key} className={cls("rounded-xl border p-3", theme.soft)}><FileText className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />{path}</div>)}
          </div>
        </div>
        <div className={cls("rounded-3xl border p-5", theme.panel)}>
          <h2 className="mb-4 text-xl font-black">Quality Target</h2>
          <div className="space-y-2 text-xs">
            {MASTER_QUALITY_TARGET.map((item) => <div key={item} className={cls("rounded-xl border p-3", theme.soft)}><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />{item}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
