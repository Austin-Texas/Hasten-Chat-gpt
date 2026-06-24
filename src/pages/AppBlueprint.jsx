import { useMemo, useState } from "react";
import {
  Bell, CheckCircle2, ClipboardList, FileText, Home, MapPin, MessageSquare,
  Moon, Package, Palette, Route, ScanLine, Search, Settings, ShieldCheck,
  Sparkles, Sun, Truck, User, Zap, BarChart3, Activity, DollarSign
} from "lucide-react";

const themeOptions = {
  enterprise: {
    name: "Enterprise Dark",
    shell: "bg-[#030914] text-white",
    panel: "bg-[#07121d]/86 border-white/10 shadow-[0_24px_70px_rgba(0,0,0,.35)]",
    panelAlt: "bg-[#0b1723]/88 border-white/10",
    card: "bg-[#0d1b28]/80 border-white/10",
    soft: "bg-[#111f2d]/70 border-white/10",
    text: "text-white",
    muted: "text-slate-400",
    accent: "text-[#50e348]",
    button: "bg-gradient-to-r from-[#55e04a] to-[#19c95b] text-black",
    route: "#55e04a",
  },
  clean: {
    name: "Clean White",
    shell: "bg-[#f6f8fb] text-slate-950",
    panel: "bg-white border-slate-200 shadow-[0_24px_60px_rgba(15,23,42,.08)]",
    panelAlt: "bg-white border-slate-200",
    card: "bg-[#f9fbfd] border-slate-200",
    soft: "bg-white border-slate-200",
    text: "text-slate-950",
    muted: "text-slate-500",
    accent: "text-emerald-600",
    button: "bg-gradient-to-r from-emerald-500 to-lime-500 text-white",
    route: "#16a34a",
  },
  hybrid: {
    name: "Hybrid Glass",
    shell: "bg-[radial-gradient(circle_at_top_left,#172554_0%,#07111e_38%,#030712_100%)] text-white",
    panel: "bg-white/[0.07] border-white/15 shadow-[0_24px_80px_rgba(34,197,94,.10)] backdrop-blur-xl",
    panelAlt: "bg-white/[0.06] border-white/15 backdrop-blur-xl",
    card: "bg-white/[0.06] border-white/15 backdrop-blur-xl",
    soft: "bg-white/[0.05] border-white/10 backdrop-blur-xl",
    text: "text-white",
    muted: "text-slate-300/80",
    accent: "text-[#6efb75]",
    button: "bg-gradient-to-r from-[#65f24e] via-[#23d46a] to-[#2d8cff] text-black",
    route: "#64f05c",
  },
};

const navItems = ["Dashboard", "Dispatch", "Drivers", "Fleet", "Finance", "Documents", "Customers", "Support", "Administration"];
const kpis = [
  ["Total Revenue", "$45,680", "+12.5%"],
  ["Loads In Transit", "156", "+8.2%"],
  ["Active Drivers", "78", "+6.7%"],
  ["Delivered Today", "24", "+15.3%"],
];
const activities = ["Load LD123456 updated to In Transit", "Driver John D. accepted load LD123457", "POD uploaded for LD123456", "Payment processed for load LD123455"];
const themes = ["Emerald", "Ocean Blue", "Amber", "Purple", "Crimson"];

function cls(...v) { return v.filter(Boolean).join(" "); }

function PhoneFrame({ theme, type = "home" }) {
  return (
    <div className="mx-auto w-[235px] rounded-[2rem] border border-white/15 bg-black/80 p-2 shadow-2xl">
      <div className={cls("min-h-[455px] rounded-[1.65rem] p-4 relative overflow-hidden", theme.panelAlt)}>
        <div className="flex items-center justify-between text-[10px] font-bold mb-4"><span>9:41</span><span>▴  Wi‑Fi  ▭</span></div>
        {type === "home" && (
          <>
            <div className="flex justify-between items-start mb-4">
              <div><h3 className="font-bold text-lg">Hi, Driver 👋</h3><p className={cls("text-xs", theme.muted)}>Good morning</p></div>
              <div className="relative rounded-2xl border border-white/10 p-2"><Bell className="w-4 h-4"/><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#55e04a]" /></div>
            </div>
            <div className={cls("rounded-2xl border p-3 mb-3", theme.card)}>
              <p className={cls("text-[10px] uppercase tracking-widest", theme.muted)}>Active Load</p>
              <div className="flex justify-between mt-1"><b className="text-xl text-orange-400">#81356</b><span className="text-xs rounded-full px-2 py-1 bg-violet-500/20 text-violet-200">In Transit</span></div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mt-4 text-sm"><b>Freeport, TX</b><span className={theme.muted}>→</span><b>Port Allen, LA</b></div>
              <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-violet-500 w-[66%]" /></div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {["Driving", "212", "6:45", "$450"].map((x, i)=><div key={x} className={cls("rounded-xl border p-2 text-center", theme.soft)}><b className={i===3?theme.accent:""}>{x}</b><p className={cls("text-[9px]", theme.muted)}>{["Duty","Miles","HOS","Earned"][i]}</p></div>)}
            </div>
            <p className={cls("text-[10px] uppercase tracking-[.2em] mb-2", theme.muted)}>Quick Actions</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {["Start Trip","Arrived Pickup","Upload POD","Send ETA","Report Issue","Emergency"].map((x,i)=><button key={x} className={cls("rounded-xl border p-3 text-left", i===5 ? "bg-rose-500/10 border-rose-400/30 text-rose-300" : theme.soft)}>{x}</button>)}
            </div>
          </>
        )}
        {type === "load" && (
          <>
            <div className="flex items-center gap-2 mb-4"><span>←</span><h3 className="font-bold">Load Details</h3><span className={cls("ml-auto text-xs", theme.accent)}>In Transit</span></div>
            <b className="text-xl">#LD123456</b>
            <div className={cls("mt-4 rounded-2xl border p-4", theme.card)}>
              {["Dallas, TX • May 12, 08:00 AM", "Houston, TX • May 13, 02:00 PM", "620 mi", "18,000 lbs", "Dry Van", "$2,400.00"].map((x)=><div key={x} className="flex items-center gap-2 py-2 border-b border-white/10 last:border-0"><MapPin className="w-3.5 h-3.5 text-emerald-400"/><span className="text-xs">{x}</span></div>)}
            </div>
            <button className={cls("mt-5 w-full rounded-xl py-3 text-sm font-bold", theme.button)}>Update Status</button>
          </>
        )}
        {type === "map" && (
          <>
            <div className="flex items-center gap-2 mb-4"><span>←</span><h3 className="font-bold">Live Tracking</h3></div>
            <div className={cls("relative h-[255px] rounded-2xl border overflow-hidden", theme.card)} style={{backgroundImage:"linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px, transparent 1px)", backgroundSize:"26px 26px"}}>
              <div className="absolute left-[50%] top-9 w-2 h-[170px] rounded-full rotate-12" style={{background:theme.route, boxShadow:`0 0 22px ${theme.route}`}} />
              <span className="absolute left-[54%] top-8 text-2xl">📍</span><span className="absolute left-[37%] bottom-9 text-2xl">📍</span>
            </div>
            <div className={cls("mt-4 rounded-2xl border p-4", theme.card)}><p className={cls("text-xs", theme.muted)}>ETA to Delivery</p><h3 className={cls("font-bold", theme.accent)}>May 13, 02:00 PM</h3><p className="text-xs">12h 45m remaining • 620 miles</p></div>
          </>
        )}
        <div className="absolute bottom-3 left-3 right-3 grid grid-cols-5 gap-1 text-[10px] text-center">
          {[[Home,"Home"],[Package,"Loads"],[ScanLine,"Scan"],[MessageSquare,"Chat"],[User,"Profile"]].map(([Icon,label],i)=><div key={label} className={cls(i===2?"rounded-2xl bg-blue-500 p-2 shadow-[0_0_25px_rgba(59,130,246,.8)]":"p-2", i===0 && type==="home" ? theme.accent : theme.muted)}><Icon className="w-4 h-4 mx-auto"/><span>{label}</span></div>)}
        </div>
      </div>
    </div>
  );
}

function DashboardPreview({ theme }) {
  return (
    <div className={cls("rounded-[1.8rem] border p-4", theme.panel)}>
      <div className="grid grid-cols-[190px_1fr] gap-4">
        <aside className={cls("hidden lg:block rounded-2xl border p-4", theme.card)}>
          <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-black text-xl">A)</div><div><b>HASTEN</b><p className={cls("text-xs", theme.accent)}>Cargo LLC</p></div></div>
          <div className="space-y-1 text-sm">{navItems.map((x,i)=><div key={x} className={cls("flex items-center gap-2 rounded-xl px-3 py-2", i===0 ? "bg-emerald-500/15 text-emerald-400" : theme.muted)}><Home className="w-4 h-4"/>{x}</div>)}</div>
        </aside>
        <main className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div><h2 className="font-black text-2xl tracking-tight">Dashboard Overview</h2><p className={cls("text-sm", theme.muted)}>Enterprise logistics platform • Web dashboard + driver app</p></div><div className={cls("flex items-center gap-2 rounded-xl border px-3 py-2", theme.card)}><Search className="w-4 h-4"/><span className={cls("text-xs", theme.muted)}>Search anything...</span></div></div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{kpis.map(([l,v,d],i)=><div key={l} className={cls("rounded-2xl border p-4", theme.card, i===0?"ring-1 ring-emerald-400/30":"")}><p className={cls("text-xs", theme.muted)}>{l}</p><b className="text-2xl block mt-1">{v}</b><span className="text-xs text-emerald-400">{d} vs last 30 days</span></div>)}</div>
          <div className="grid xl:grid-cols-[.8fr_1.2fr] gap-3">
            <div className={cls("rounded-2xl border p-4", theme.card)}><h3 className="font-bold mb-3">Load Status Overview</h3><div className="flex gap-5 items-center"><div className="w-28 h-28 rounded-full bg-[conic-gradient(#55e04a_0_40%,#2d8cff_40%_70%,#fbbf24_70%_86%,#64748b_86%)] grid place-items-center"><div className={cls("rounded-full w-20 h-20 grid place-items-center", theme.shell)}><b>156</b></div></div><div className="text-xs space-y-2">{["Assigned 24","In Transit 78","Delivered 40","Completed 10"].map(x=><p key={x}>● {x}</p>)}</div></div></div>
            <div className={cls("relative rounded-2xl border p-4 min-h-[180px] overflow-hidden", theme.card)} style={{backgroundImage:"linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px, transparent 1px)", backgroundSize:"32px 32px"}}><h3 className="font-bold relative z-10">Live Tracking Map</h3><div className="absolute left-24 top-28 right-16 h-1 rounded-full rotate-[-12deg]" style={{background:theme.route, boxShadow:`0 0 24px ${theme.route}`}}/><span className="absolute left-28 top-24">📍</span><span className="absolute right-20 top-16">📍</span><span className="absolute left-1/2 bottom-12">📍</span></div>
          </div>
          <div className="grid lg:grid-cols-3 gap-3"><div className={cls("lg:col-span-2 rounded-2xl border p-4", theme.card)}><div className="flex justify-between"><h3 className="font-bold">Recent Activity</h3><span className={theme.accent}>View All</span></div>{activities.map((a,i)=><div key={a} className="flex items-center gap-2 py-2 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-400"/><span>{a}</span><span className={cls("ml-auto text-xs", theme.muted)}>{i+2}m ago</span></div>)}</div><div className={cls("rounded-2xl border p-4", theme.card)}><h3 className="font-bold mb-3">Upcoming Deliveries</h3>{["LD123456 Houston", "LD123457 Atlanta", "LD123458 Miami"].map(x=><p key={x} className="text-sm py-2 border-b border-white/10 last:border-0">{x}</p>)}</div></div>
        </main>
      </div>
    </div>
  );
}

export default function AppBlueprint() {
  const [activeTheme, setActiveTheme] = useState("enterprise");
  const theme = useMemo(() => themeOptions[activeTheme], [activeTheme]);

  return (
    <div className={cls("min-h-[calc(100vh-4rem)] rounded-3xl p-4 lg:p-6 space-y-5", theme.shell)}>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-3"><Sparkles className="w-3.5 h-3.5"/> HASTEN Enterprise UI Blueprint</div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Web Dashboard + Driver App Structure</h1>
          <p className={cls("mt-2 max-w-3xl", theme.muted)}>Matches your reference style: premium dark glass, clean white option, hybrid theme toggle, enterprise web dashboard, and mobile-first driver workflow.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(themeOptions).map(([id, t]) => <button key={id} onClick={()=>setActiveTheme(id)} className={cls("rounded-xl border px-4 py-2 text-sm font-bold", activeTheme===id ? theme.button : theme.card)}>{id === "clean" ? <Sun className="inline w-4 h-4 mr-1"/> : <Moon className="inline w-4 h-4 mr-1"/>}{t.name}</button>)}
        </div>
      </div>

      <div className={cls("rounded-[2rem] border p-4 lg:p-5", theme.panel)}>
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-3"><div className="w-14 h-14 rounded-2xl border border-emerald-400/40 grid place-items-center text-2xl font-black text-emerald-400">A)</div><div><h2 className="text-2xl font-black">HASTEN <span className={theme.accent}>Cargo LLC</span></h2><p className={theme.muted}>Drive smart. Deliver trust.</p></div></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">{[[Palette,"Theme toggle"],[ShieldCheck,"Role access"],[Route,"Real-time sync"],[ScanLine,"Scan workflow"],[Truck,"Enterprise ready"]].map(([Icon,t])=><div key={t} className={cls("rounded-xl border p-3 text-center", theme.card)}><Icon className="w-5 h-5 mx-auto mb-1 text-emerald-400"/>{t}</div>)}</div>
        </div>
        <div className="grid xl:grid-cols-[1.2fr_.8fr] gap-5">
          <DashboardPreview theme={theme} />
          <div className={cls("rounded-[1.8rem] border p-4", theme.panel)}>
            <div className="flex items-center justify-between mb-4"><div><h2 className="font-black text-xl">Driver App — Mobile First</h2><p className={cls("text-xs", theme.muted)}>Home • Loads • Scan • Chat • Profile</p></div><Zap className="w-5 h-5 text-emerald-400"/></div>
            <div className="grid md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-4"><PhoneFrame theme={theme} type="home"/><PhoneFrame theme={theme} type="load"/><PhoneFrame theme={theme} type="map"/></div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[.8fr_1.2fr] gap-4">
        <div className={cls("rounded-3xl border p-5", theme.panel)}>
          <h2 className="text-xl font-black mb-4">Driver App Structure</h2>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {["Home\nDashboard", "Loads\nMy Loads", "Scan\nDocs", "Chat\nMessages", "Profile\nSettings"].map((x,i)=><div key={x} className={cls("rounded-2xl border p-3", i===2 ? "bg-blue-500/20 border-blue-400/40" : theme.card)}>{x.split("\n").map(y=><p key={y}>{y}</p>)}</div>)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">{["Active Load", "Quick Actions", "POD Upload", "Emergency", "Settlement", "Compliance"].map(x=><div key={x} className={cls("rounded-xl border p-3", theme.soft)}><CheckCircle2 className="inline w-3.5 h-3.5 mr-1 text-emerald-400"/>{x}</div>)}</div>
        </div>
        <div className={cls("rounded-3xl border p-5", theme.panel)}>
          <h2 className="text-xl font-black mb-4">Theme Options</h2>
          <div className="grid md:grid-cols-5 gap-3">{themes.map((x,i)=><div key={x} className={cls("rounded-2xl border p-3", theme.card)}><div className="h-24 rounded-xl border border-white/10 mb-3" style={{background:["linear-gradient(135deg,#052e16,#111827)","linear-gradient(135deg,#172554,#f8fafc)","linear-gradient(135deg,#451a03,#111827)","linear-gradient(135deg,#2e1065,#111827)","linear-gradient(135deg,#450a0a,#111827)"][i]}}/><b>{x}</b><p className={cls("text-xs", theme.muted)}>{i===0?"Default":i===1?"Light / Trustworthy":i===2?"Warning / Energy":i===3?"Royal / Premium":"Critical Ops"}</p></div>)}</div>
        </div>
      </div>
    </div>
  );
}
