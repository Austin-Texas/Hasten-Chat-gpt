import { useState } from "react";
import {
  HelpCircle, BookOpen, Truck, Package, MapPin, DollarSign,
  FileText, MessageSquare, Shield, Users, ChevronDown, ChevronUp,
  AlertCircle, Zap, BarChart3, Download,
  Wrench, ClipboardList, UserCheck, Search, ArrowRight, LifeBuoy
} from "lucide-react";
import { Link } from "react-router-dom";

const ROLE_GUIDES = [
  { role: "Admin", color: "orange", icon: Shield, desc: "Full platform access — manage drivers, fleet, finance, CRM, and all system settings." },
  { role: "Dispatcher", color: "blue", icon: ClipboardList, desc: "Assign loads, track drivers, manage dispatch board, and communicate with the field." },
  { role: "Driver", color: "green", icon: Truck, desc: "Mobile-first app — view loads, update status, upload BOL/POD, chat with dispatch." },
  { role: "Client / Broker", color: "cyan", icon: Users, desc: "Client portal — track shipments, view invoices, and communicate with your team." },
];

const MODULES = [
  {
    icon: LayoutDashboardIcon,
    title: "Dashboard & Analytics",
    color: "orange",
    path: "/dashboard",
    steps: [
      "The Dashboard shows live KPIs: active loads, drivers on duty, revenue, and alerts.",
      "Use Dispatch Analytics to see load volume, on-time performance, and driver metrics.",
      "KPI cards are clickable — they deep-link to the relevant filtered list.",
    ],
    tips: ["Check the dashboard every morning before dispatching.", "Red KPI cards = items needing immediate attention."],
  },
  {
    icon: ClipboardList,
    title: "Dispatch Board",
    color: "blue",
    path: "/dispatch",
    steps: [
      "Open Dispatch Board to see all available and in-progress loads side by side.",
      "Drag-and-drop or click 'Assign' to assign a driver + truck to a load.",
      "Use filters (status, driver, equipment type) to find specific loads quickly.",
      "Bulk-select multiple loads and assign or update them at once using keyboard shortcuts.",
    ],
    tips: ["Loads highlighted in red are past their pickup window.", "Use Load Templates to pre-fill common routes in seconds."],
  },
  {
    icon: Package,
    title: "Loads Management",
    color: "purple",
    path: "/loads",
    steps: [
      "Go to Loads → New Load (or use a Load Template) to create a freight order.",
      "Fill in origin, destination, equipment type, rate, and driver assignment.",
      "The inline Margin Calculator shows estimated profit after fuel and driver pay.",
      "Once saved, the load appears on the Dispatch Board and the Driver's mobile app.",
      "Track status progression: Available → Assigned → Accepted → En Route → Delivered.",
    ],
    tips: ["Always enter miles — they drive payroll, IFTA, and ETA calculations.", "Mark actual_pickup time to enable GPS ETA slip alerts."],
  },
  {
    icon: MapPin,
    title: "Live Tracking",
    color: "green",
    path: "/tracking",
    steps: [
      "Live Tracking shows all active drivers on an interactive map with real-time GPS.",
      "Click a driver pin to see their current load, speed, and last update time.",
      "The system automatically updates ETA every 15 minutes using GPS position.",
      "Dispatchers receive email alerts if a load's ETA slips 45+ minutes behind schedule.",
    ],
    tips: ["GPS updates every 15 seconds from the driver's mobile app.", "Drivers must have location permission enabled in the HASTEN driver app."],
  },
  {
    icon: Truck,
    title: "Fleet Management",
    color: "amber",
    path: "/fleet",
    steps: [
      "Fleet lists all trucks with status, odometer, and compliance expiry dates.",
      "Click a truck to see its full detail: maintenance history, insurance, registration.",
      "Compliance badges turn yellow (30 days) and red (expired) automatically.",
      "Add maintenance records when service is performed to reset the service interval.",
    ],
    tips: ["Set next_service_miles on each truck to trigger automatic maintenance alerts.", "The system emails dispatchers when a truck is within 500 miles of service."],
  },
  {
    icon: UserCheck,
    title: "Driver Management",
    color: "cyan",
    path: "/drivers",
    steps: [
      "Drivers lists all drivers with status, current load, and safety score.",
      "Click a driver to view their full profile: CDL, endorsements, HOS, and load history.",
      "Dispatchers can view and approve compliance documents from the driver detail page.",
      "Driver Scorecards rank drivers by safety, on-time rate, and miles driven.",
    ],
    tips: ["Drivers with HOS violations are automatically flagged with a red badge.", "Invite new drivers via the Admin panel — they'll receive a setup email."],
  },
  {
    icon: DollarSign,
    title: "Finance & Payroll",
    color: "green",
    path: "/finance",
    steps: [
      "Finance shows total revenue, expenses, net profit, and invoice status in one view.",
      "Use Auto-Generate to create invoices for all completed loads with no invoice yet.",
      "Payroll tab calculates driver pay based on their pay type (per mile, %, flat, hourly).",
      "The Settlement Generator produces a driver settlement report for any date range.",
      "Export any report as CSV or PDF from the Export Report button.",
    ],
    tips: ["Expense Approvals must be processed before payroll runs — check that tab first.", "IFTA Quarterly auto-calculates state mileage from your load data."],
  },
  {
    icon: FileText,
    title: "Documents & BOL/POD",
    color: "slate",
    path: "/documents",
    steps: [
      "Document Portal lists all uploaded BOL, POD, Rate Confirmations by load.",
      "Drivers upload documents directly from the mobile app camera.",
      "Dispatchers can approve or reject documents — rejected docs notify the driver.",
      "Download or share any document directly from the portal.",
    ],
    tips: ["Set up email alerts for missing PODs on delivered loads.", "All documents are attached to the load, driver, and client records automatically."],
  },
  {
    icon: MessageSquare,
    title: "Messaging",
    color: "blue",
    path: "/messages",
    steps: [
      "Dispatcher Inbox shows all driver conversations organized by load.",
      "Click a conversation to reply — messages are delivered instantly to the driver's app.",
      "You can attach files (photos, PDFs) directly in the message thread.",
      "Unread counts appear as orange badges in the sidebar and top navigation.",
    ],
    tips: ["Messages sent from the dispatch board pre-fill the load context.", "Drivers can also message directly from within a load detail screen."],
  },
  {
    icon: Shield,
    title: "Compliance & Safety",
    color: "red",
    path: "/compliance",
    steps: [
      "Compliance tracks CDL expiry, medical cards, TWIC, and DOT certifications per driver.",
      "Safety shows violations, incidents, and safety scores across the fleet.",
      "The system sends automated compliance alert emails 30 days before any expiry.",
      "Expired items are blocked from load assignment in the dispatch board.",
    ],
    tips: ["Review Compliance weekly to stay ahead of DOT audits.", "Drivers can upload renewal documents from the mobile app."],
  },
];

function LayoutDashboardIcon({ className }) {
  return <BarChart3 className={className} />;
}

const COLOR_MAP = {
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", icon: "text-orange-400", badge: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/20",   icon: "text-blue-400",   badge: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  green:  { bg: "bg-green-500/10",  border: "border-green-500/20",  icon: "text-green-400",  badge: "bg-green-500/15 text-green-400 border-green-500/25" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", icon: "text-purple-400", badge: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
  cyan:   { bg: "bg-cyan-500/10",   border: "border-cyan-500/20",   icon: "text-cyan-400",   badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" },
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/20",  icon: "text-amber-400",  badge: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  slate:  { bg: "bg-slate-500/10",  border: "border-slate-500/20",  icon: "text-slate-400",  badge: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
  red:    { bg: "bg-red-500/10",    border: "border-red-500/20",    icon: "text-red-400",    badge: "bg-red-500/15 text-red-400 border-red-500/25" },
};

function ModuleCard({ module }) {
  const [open, setOpen] = useState(false);
  const c = COLOR_MAP[module.color] || COLOR_MAP.orange;

  return (
    <div className={`glass-card rounded-xl border ${c.border} overflow-hidden transition-all duration-200`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/2 transition-colors"
      >
        <div className={`w-10 h-10 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
          <module.icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">{module.title}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{module.steps.length} steps · {module.tips.length} tips</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={module.path}
            onClick={e => e.stopPropagation()}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${c.badge} transition-colors`}
          >
            Open <ArrowRight className="w-3 h-3" />
          </Link>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-white/5 animate-slide-up">
          <div className="mt-4 space-y-4">
            {/* Steps */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">How to use</h4>
              <ol className="space-y-2">
                {module.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full ${c.bg} border ${c.border} flex items-center justify-center text-[10px] font-bold ${c.icon}`}>
                      {i + 1}
                    </span>
                    <span className="text-slate-300 text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Pro Tips</h4>
              <div className="space-y-2">
                {module.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/3 border border-white/5">
                    <Zap className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${c.icon}`} />
                    <span className="text-slate-300 text-xs leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to={module.path}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${c.badge} transition-colors`}
            >
              Go to {module.title} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

const FAQS = [
  { q: "How do drivers get access to the app?", a: "Go to Admin → Invite User, enter the driver's email, and set their role to 'driver'. They'll receive a setup email and can log in from the HASTEN driver app on iOS or Android." },
  { q: "How does GPS tracking work?", a: "The driver app requests location permission on first launch. Once granted, GPS coordinates update every 15 seconds and are sent to the dispatch tracking map. No extra hardware needed." },
  { q: "How are loads assigned to drivers?", a: "From the Dispatch Board, click the load card and select a driver and truck. The driver immediately receives a push notification on their mobile app." },
  { q: "How do I generate an invoice?", a: "Go to Finance → Auto-Generate to create invoices for all completed loads automatically. Or use Manual Invoice / Bulk Invoice to create them one at a time or in batches." },
  { q: "What triggers the delay alert emails?", a: "The GPS ETA Slip Alert runs every 15 minutes. If a load's recalculated arrival time is 45+ minutes behind the scheduled delivery date, all dispatchers receive an email alert." },
  { q: "How does detention pay get tracked?", a: "The Detention Alert runs every 15 minutes. If a driver has been at a pickup or delivery facility for 2+ hours (per manifest timestamps), dispatchers receive an alert with estimated detention pay at $75/hr." },
  { q: "How do I run an IFTA report?", a: "Go to Finance → IFTA Tax, select the quarter, and click Generate Report. The system pulls mileage from your completed loads and calculates tax owed per state. Export as PDF or CSV." },
  { q: "Can clients see their shipments?", a: "Yes. Clients log in via the Client Portal at /client. They can track their loads in real time, view invoices, download documents, and message the dispatch team." },
];

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaq, setOpenFaq]       = useState(null);

  const filteredModules = searchTerm
    ? MODULES.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.steps.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
    : MODULES;

  const filteredFaqs = searchTerm
    ? FAQS.filter(f => f.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.a.toLowerCase().includes(searchTerm.toLowerCase()))
    : FAQS;

  return (
    <div className="space-y-8 animate-slide-up max-w-4xl mx-auto">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5"
        style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.12) 0%, rgba(15,24,41,0.95) 50%, rgba(59,130,246,0.08) 100%)" }}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-white font-heading font-bold text-2xl">HASTEN Help Center</h1>
              <p className="text-slate-400 text-sm">Everything you need to run your freight operation</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search modules, features, or questions…"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>
        </div>

        {/* App screenshots strip */}
        <div className="px-8 pb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { img: "https://media.base44.com/images/public/6a362e36efad82b70b0a27d0/828ae0579_ChatGPT_Image_Jun_20__2026__01_56_06_AM.png", label: "Driver App UI" },
            { img: "https://media.base44.com/images/public/6a362e36efad82b70b0a27d0/dfe9e9e0b_app_login.png", label: "Driver Login" },
            { img: "https://media.base44.com/images/public/6a362e36efad82b70b0a27d0/ce312c8ab_3.png", label: "Platform Plan" },
            { img: "https://media.base44.com/images/public/6a362e36efad82b70b0a27d0/787dcaf6c_2.png", label: "Mobile Dashboard" },
          ].map(item => (
            <div key={item.label} className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-slate-900">
              <img src={item.img} alt={item.label} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/60 text-white text-xs font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Role quick-start */}
      {!searchTerm && (
        <div>
          <h2 className="text-white font-heading font-semibold text-lg mb-3">Quick Start by Role</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ROLE_GUIDES.map(r => {
              const c = COLOR_MAP[r.color] || COLOR_MAP.orange;
              return (
                <div key={r.role} className={`glass-card rounded-xl p-4 border ${c.border}`}>
                  <div className={`w-9 h-9 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center mb-3`}>
                    <r.icon className={`w-4.5 h-4.5 ${c.icon}`} />
                  </div>
                  <h3 className={`font-semibold text-sm mb-1 ${c.icon}`}>{r.role}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Module guides */}
      <div>
        <h2 className="text-white font-heading font-semibold text-lg mb-3">
          {searchTerm ? `Results for "${searchTerm}"` : "Module Guides"}
        </h2>
        {filteredModules.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center border border-white/5">
            <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No modules match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredModules.map(m => <ModuleCard key={m.title} module={m} />)}
          </div>
        )}
      </div>

      {/* FAQ */}
      {(!searchTerm || filteredFaqs.length > 0) && (
        <div>
          <h2 className="text-white font-heading font-semibold text-lg mb-3">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {filteredFaqs.map((faq, i) => (
              <div key={i} className="glass-card rounded-xl border border-white/5 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/2 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="flex-1 text-white font-medium text-sm">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    <p className="text-slate-300 text-sm leading-relaxed pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact dispatch */}
      <div className="glass-card-orange rounded-xl p-6 border border-orange-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
            <LifeBuoy className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Still need help?</h3>
            <p className="text-slate-400 text-sm mb-3">Contact your HASTEN dispatch team or system administrator for account-specific support.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/messages" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
                <MessageSquare className="w-4 h-4" /> Message Dispatch
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Platform note */}
      <div className="glass-card rounded-xl p-5 border border-white/5 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-white font-semibold text-sm mb-1">About the HASTEN Driver Mobile App</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              The current driver experience is a mobile-optimized Progressive Web App (PWA) — it runs in the browser on any device including Android and iPhone. To publish as a native app on the Google Play Store or Apple App Store, the code would need to be wrapped with a native shell (e.g. Capacitor, Expo, or a WebView wrapper). The UI and all logic are already mobile-first and ready for that wrapper step.
            </p>
          </div>
        </div>
      </div>

      {/* Documentation Downloads */}
      <div className="border-t border-white/5 pt-8">
        <h2 className="text-white font-heading font-semibold text-lg mb-4">📚 Documentation & Blueprints</h2>
        <p className="text-slate-400 text-sm mb-4">Complete system documentation and audits. Download for permanent reference or project continuation.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a
            href="/docs/HASTEN_MASTER_BLUEPRINT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/15 transition-colors group"
          >
            <Download className="w-5 h-5 text-blue-400 flex-shrink-0 group-hover:text-blue-300 transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">Master Blueprint</div>
              <div className="text-slate-400 text-xs mt-0.5">System overview, architecture, features</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
          </a>

          <a
            href="/docs/HASTEN_SYSTEM_COMPLETION_AUDIT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:border-green-500/40 hover:bg-green-500/15 transition-colors group"
          >
            <Download className="w-5 h-5 text-green-400 flex-shrink-0 group-hover:text-green-300 transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">Completion Audit</div>
              <div className="text-slate-400 text-xs mt-0.5">What's 100% complete, what's missing</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-green-400 transition-colors flex-shrink-0" />
          </a>

          <a
            href="/docs/PRODUCTION_HARDENING_AUDIT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/15 transition-colors group"
          >
            <Download className="w-5 h-5 text-red-400 flex-shrink-0 group-hover:text-red-300 transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">Hardening Audit</div>
              <div className="text-slate-400 text-xs mt-0.5">Security, compliance, stability gaps & fixes</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors flex-shrink-0" />
          </a>

          <a
            href="/docs/NATIVE_PUBLISHING_AUDIT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/15 transition-colors group"
          >
            <Download className="w-5 h-5 text-purple-400 flex-shrink-0 group-hover:text-purple-300 transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">Native Publishing Audit</div>
              <div className="text-slate-400 text-xs mt-0.5">Android/iOS app store roadmap & timeline</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
          </a>

          <a
            href="/docs/NEXT_STEPS.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/15 transition-colors group"
          >
            <Download className="w-5 h-5 text-orange-400 flex-shrink-0 group-hover:text-orange-300 transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">Next Steps</div>
              <div className="text-slate-400 text-xs mt-0.5">Immediate action items & sprint planning</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition-colors flex-shrink-0" />
          </a>

          <a
            href="/docs/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/15 transition-colors group"
          >
            <Download className="w-5 h-5 text-cyan-400 flex-shrink-0 group-hover:text-cyan-300 transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">Changelog</div>
              <div className="text-slate-400 text-xs mt-0.5">Version history & release schedule</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
          </a>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-white/3 border border-white/5">
          <p className="text-slate-400 text-xs leading-relaxed">
            💡 <strong>Tip:</strong> Download and save these files locally. If this chat is lost or you need to restart, you can upload these .md files to continue the project without losing context.
          </p>
        </div>
      </div>

    </div>
  );
}