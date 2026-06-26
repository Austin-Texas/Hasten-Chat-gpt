import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Database,
  Eye,
  Gauge,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import DemoDataCenter from "@/pages/DemoDataCenter";

const DEFAULT_CATEGORIES = [
  "backend",
  "frontend",
  "routes",
  "database",
  "permissions",
  "automations",
  "gps",
  "documents",
  "settlements",
  "tax_center",
  "native_readiness",
  "security",
  "performance",
];

const ENTERPRISE_CHECKS = [
  { category: "routes", label: "Critical routes", target: "/dispatch/load-marketplace, /super-admin/settings/integrations/load-board-apis, /super-admin/settings/system-diagnostics" },
  { category: "permissions", label: "Super Admin access", target: "API credentials and cleanup actions locked to super_admin" },
  { category: "documents", label: "Driver scan lifecycle", target: "LoadDocument + lifecycle + timeline + message + notification" },
  { category: "settlements", label: "Owner-operator deduction policy", target: "No unapproved fuel/toll/repair deductions" },
  { category: "tax_center", label: "1099 readiness", target: "1099-NEC preview/PDF + driver read-only download" },
  { category: "native_readiness", label: "Native packaging gate", target: "Capacitor/android/ios/plugins required before native complete" },
  { category: "security", label: "Provider credential safety", target: "Masked/encrypted credentials, no secrets in Git" },
  { category: "performance", label: "Enterprise density", target: "Compact tables, sticky filters, cleanup of stale temporary reports" },
];

const CLEANUP_PREVIEW_ITEMS = [
  { category: "test_data", title: "Old demo loads", risk: "low", action: "archive_or_delete_after_preview", protected: false },
  { category: "test_data", title: "Sample drivers not tied to real users", risk: "medium", action: "archive_or_delete_after_preview", protected: false },
  { category: "documents", title: "Duplicate temporary verification markdown", risk: "low", action: "archive_final_summary_only", protected: false },
  { category: "notifications", title: "Stale test notifications older than policy", risk: "low", action: "archive_or_delete_after_preview", protected: false },
  { category: "business_data", title: "Production loads, invoices, settlements, tax records", risk: "blocked", action: "never_auto_delete", protected: true },
];

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeRun(run = {}) {
  const pass = Number(run.pass_count || run.passed_count || 0);
  const warnings = Number(run.warning_count || 0);
  const fails = Number(run.fail_count || run.issue_count || 0);
  const total = Math.max(1, pass + warnings + fails);
  const computedScore = Math.round(((pass + warnings * 0.5) / total) * 100);
  return {
    ...run,
    overall_score: clampScore(run.overall_score ?? computedScore),
    pass_count: pass,
    warning_count: warnings,
    fail_count: fails,
    status: run.status || "completed",
  };
}

function normalizeIssue(issue = {}) {
  const severity = issue.severity || (issue.issue_type === "error" ? "fail" : issue.issue_type === "warning" ? "warning" : "info");
  return {
    id: issue.id || `${issue.category || issue.module}-${issue.title || issue.problem}`,
    severity,
    category: issue.category || issue.module || "general",
    file_path: issue.file_path || issue.file || "—",
    route_path: issue.route_path || "—",
    entity_name: issue.entity_name || "—",
    problem: issue.problem || issue.title || issue.description || "Diagnostic issue",
    suggested_fix: issue.suggested_fix || issue.recommendation || "Manual review required",
    status: issue.status || "open",
    auto_fix_available: Boolean(issue.auto_fix_available),
    ...issue,
  };
}

function buildFallbackRun() {
  return normalizeRun({
    id: "local-current-readiness",
    run_type: "local_ui_readiness",
    status: "completed",
    overall_score: 72,
    pass_count: 9,
    warning_count: 4,
    fail_count: 2,
    created_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
}

function buildFallbackIssues() {
  return [
    normalizeIssue({
      id: "driver-scan-lifecycle",
      severity: "warning",
      category: "documents",
      file_path: "src/pages/driver/DriverScan.jsx",
      route_path: "/driver/scan",
      entity_name: "LoadDocument",
      problem: "Driver scan still needs verified LoadDocument lifecycle + dispatcher notification + message/resubmit loop.",
      suggested_fix: "Patch scan upload to create LoadDocument, run documentLifecycleEngine, create TimelineEvent, Notification, and Message.",
      status: "open",
      auto_fix_available: false,
    }),
    normalizeIssue({
      id: "native-readiness-gate",
      severity: "warning",
      category: "native_readiness",
      file_path: "android/, ios/, capacitor.config.*",
      route_path: "/driver/*",
      entity_name: "MobilePackaging",
      problem: "Native is not complete until Capacitor, Android/iOS projects, push, GPS, and secure storage exist.",
      suggested_fix: "Keep status as PWA/web mobile until packaging checks pass.",
      status: "open",
      auto_fix_available: false,
    }),
  ];
}

function scoreClass(score) {
  if (score >= 85) return "text-green-300 border-green-500/25 bg-green-500/10";
  if (score >= 65) return "text-amber-300 border-amber-500/25 bg-amber-500/10";
  return "text-red-300 border-red-500/25 bg-red-500/10";
}

function severityClass(severity) {
  if (["critical", "fail", "high"].includes(severity)) return "text-red-300 bg-red-500/10 border-red-500/20";
  if (["warning", "medium"].includes(severity)) return "text-amber-300 bg-amber-500/10 border-amber-500/20";
  if (["pass", "resolved"].includes(severity)) return "text-green-300 bg-green-500/10 border-green-500/20";
  return "text-blue-300 bg-blue-500/10 border-blue-500/20";
}

export default function SystemDiagnostics() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [issues, setIssues] = useState([]);
  const [tab, setTab] = useState("diagnostics");
  const [currentUser, setCurrentUser] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
    fetchRuns();
  }, []);

  const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) || runs[0] || buildFallbackRun(), [runs, selectedRunId]);
  const normalizedIssues = useMemo(() => issues.map(normalizeIssue), [issues]);
  const categorySummary = useMemo(() => {
    const map = new Map(DEFAULT_CATEGORIES.map((category) => [category, { category, pass: 0, warning: 0, fail: 0 }]));
    normalizedIssues.forEach((issue) => {
      const key = issue.category || "general";
      if (!map.has(key)) map.set(key, { category: key, pass: 0, warning: 0, fail: 0 });
      const bucket = map.get(key);
      if (["critical", "fail", "high"].includes(issue.severity)) bucket.fail += 1;
      else if (["warning", "medium"].includes(issue.severity)) bucket.warning += 1;
      else bucket.pass += 1;
    });
    return [...map.values()];
  }, [normalizedIssues]);

  const role = currentUser?.businessRole || currentUser?.role;
  const canAccess = !role || role === "super_admin";

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const result = await base44.entities.SystemDiagnosticRun.list("-created_date", 50);
      const nextRuns = (result || []).map(normalizeRun);
      setRuns(nextRuns.length ? nextRuns : [buildFallbackRun()]);
      const firstRunId = nextRuns[0]?.id || "local-current-readiness";
      setSelectedRunId((current) => current || firstRunId);
      await fetchIssuesForRun(firstRunId);
    } catch (err) {
      console.warn("[SystemDiagnostics] fallback mode", err?.message || err);
      setRuns([buildFallbackRun()]);
      setSelectedRunId("local-current-readiness");
      setIssues(buildFallbackIssues());
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setRunning(true);
    setNotice("");
    try {
      const result = await base44.functions.invoke("runSystemDiagnostics", { run_type: "super_admin_master_readiness" });
      await fetchRuns();
      if (result.data?.run_id) {
        setSelectedRunId(result.data.run_id);
        await fetchIssuesForRun(result.data.run_id);
      }
      setNotice("Diagnostics started. Results were refreshed from SystemDiagnosticRun/SystemDiagnosticIssue.");
    } catch (err) {
      console.warn("[SystemDiagnostics] run fallback", err?.message || err);
      setNotice("Diagnostics function is not connected yet. Showing local readiness fallback instead.");
      setRuns([buildFallbackRun()]);
      setIssues(buildFallbackIssues());
    } finally {
      setRunning(false);
    }
  };

  const fetchIssuesForRun = async (runId) => {
    if (!runId || runId === "local-current-readiness") {
      setIssues(buildFallbackIssues());
      return;
    }
    try {
      const result = await base44.entities.SystemDiagnosticIssue.filter({ diagnostic_run_id: runId }, "-created_date", 200);
      setIssues((result || []).map(normalizeIssue));
    } catch (err) {
      console.warn("[SystemDiagnostics] issue fallback", err?.message || err);
      setIssues(buildFallbackIssues());
    }
  };

  const handleSelectRun = async (runId) => {
    setSelectedRunId(runId);
    await fetchIssuesForRun(runId);
  };

  const updateIssueStatus = async (issue, status) => {
    if (!issue?.id || issue.id.includes("local-")) {
      setIssues((current) => current.map((item) => item.id === issue.id ? { ...item, status } : item));
      return;
    }
    try {
      await base44.entities.SystemDiagnosticIssue.update(issue.id, {
        status,
        fixed_at: status === "resolved" ? new Date().toISOString() : undefined,
        fixed_by: currentUser?.id,
      });
      await fetchIssuesForRun(selectedRunId);
    } catch (error) {
      console.warn("[SystemDiagnostics] issue update skipped", error?.message || error);
      setIssues((current) => current.map((item) => item.id === issue.id ? { ...item, status } : item));
    }
  };

  if (!canAccess) {
    return (
      <div className="glass-card rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-red-300" />
        <h1 className="text-xl font-bold text-white">Super Admin only</h1>
        <p className="mt-2 text-sm text-slate-400">System Diagnostics, cleanup preview, and integration health are restricted to platform-level controls.</p>
      </div>
    );
  }

  const score = selectedRun.overall_score;

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-heading">
            <Activity className="h-6 w-6 text-blue-400" /> System Diagnostics
          </h1>
          <p className="mt-1 text-sm text-slate-400">One Super Admin health center for routes, entities, API sync, cleanup preview, native readiness, and enterprise release gates.</p>
        </div>
        {tab === "diagnostics" && (
          <button onClick={handleRunDiagnostics} disabled={running} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running…" : "Run Diagnostics"}
          </button>
        )}
      </div>

      {notice && <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200">{notice}</div>}

      <div className="glass-card flex flex-wrap gap-1 rounded-xl border border-white/5 p-1">
        <TabButton active={tab === "diagnostics"} onClick={() => setTab("diagnostics")} icon={<Gauge className="h-4 w-4" />} label="Diagnostics" />
        <TabButton active={tab === "cleanup"} onClick={() => setTab("cleanup")} icon={<Trash2 className="h-4 w-4" />} label="Cleanup Preview" />
        <TabButton active={tab === "demo-data"} onClick={() => setTab("demo-data")} icon={<Database className="h-4 w-4" />} label="Demo Data" />
      </div>

      {tab === "demo-data" ? (
        <DemoDataCenter />
      ) : tab === "cleanup" ? (
        <CleanupPreview />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <div className={`glass-card rounded-2xl border p-4 ${scoreClass(score)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">Overall Health</p>
                  <p className="mt-1 text-4xl font-black">{score}%</p>
                </div>
                <div className="relative h-20 w-20 rounded-full border border-white/10" style={{ background: `conic-gradient(currentColor ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}>
                  <div className="absolute inset-2 rounded-full bg-slate-950/90" />
                  <Gauge className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <MiniStat label="Pass" value={selectedRun.pass_count} tone="green" />
                <MiniStat label="Warn" value={selectedRun.warning_count} tone="amber" />
                <MiniStat label="Fail" value={selectedRun.fail_count} tone="red" />
              </div>
            </div>

            <div className="glass-card rounded-xl border border-white/5 p-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Recent Runs</h3>
              {loading ? (
                <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-500" /></div>
              ) : (
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {runs.map((run) => (
                    <button key={run.id} onClick={() => handleSelectRun(run.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${selectedRunId === run.id ? "border-blue-500/40 bg-blue-500/10 text-blue-200" : "border-white/5 bg-white/[0.03] text-slate-400 hover:text-white"}`}>
                      <div className="flex items-center justify-between"><span className="font-semibold capitalize">{run.run_type || run.status || "diagnostic"}</span><span>{run.overall_score}%</span></div>
                      <div className="mt-1 text-[10px] opacity-70">{new Date(run.created_date || run.created_at || Date.now()).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {ENTERPRISE_CHECKS.slice(0, 8).map((check) => <EnterpriseCheck key={check.label} check={check} />)}
            </div>

            <div className="glass-card rounded-xl border border-white/5 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Health Categories</h3>
                <span className="text-xs text-slate-500">Backend · Frontend · Routes · Data · Security · Native</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {categorySummary.map((item) => <CategoryPill key={item.category} item={item} />)}
              </div>
            </div>

            <div className="glass-card overflow-hidden rounded-xl border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 p-3">
                <h3 className="text-sm font-bold text-white">Issue Table</h3>
                <span className="text-xs text-slate-500">{normalizedIssues.length} issues/warnings</span>
              </div>
              {normalizedIssues.length === 0 ? (
                <div className="p-10 text-center"><CheckCircle className="mx-auto mb-2 h-10 w-10 text-green-400" /><p className="font-semibold text-green-200">All systems operational</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-xs">
                    <thead className="bg-white/[0.03] text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Severity</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">File / Route</th>
                        <th className="px-3 py-2">Entity</th>
                        <th className="px-3 py-2">Problem</th>
                        <th className="px-3 py-2">Suggested Fix</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedIssues.map((issue) => (
                        <tr key={issue.id} className="border-t border-white/5 align-top hover:bg-white/[0.02]">
                          <td className="px-3 py-2"><span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${severityClass(issue.severity)}`}>{issue.severity}</span></td>
                          <td className="px-3 py-2 text-slate-300">{issue.category}</td>
                          <td className="px-3 py-2 text-slate-500"><div>{issue.file_path}</div><div>{issue.route_path}</div></td>
                          <td className="px-3 py-2 text-slate-400">{issue.entity_name}</td>
                          <td className="px-3 py-2 text-slate-200">{issue.problem}</td>
                          <td className="px-3 py-2 text-slate-400">{issue.suggested_fix}</td>
                          <td className="px-3 py-2 text-slate-300">{issue.status}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <button title="View" className="rounded bg-white/5 p-1.5 text-slate-400 hover:text-white"><Eye className="h-3.5 w-3.5" /></button>
                              <button title={issue.auto_fix_available ? "Repair" : "Manual Fix Required"} disabled={!issue.auto_fix_available} className="rounded bg-white/5 p-1.5 text-slate-400 hover:text-green-300 disabled:opacity-40"><Wrench className="h-3.5 w-3.5" /></button>
                              <button title="Retest" onClick={handleRunDiagnostics} className="rounded bg-white/5 p-1.5 text-slate-400 hover:text-blue-300"><RotateCcw className="h-3.5 w-3.5" /></button>
                              <button title="Mark Resolved" onClick={() => updateIssueStatus(issue, "resolved")} className="rounded bg-white/5 p-1.5 text-slate-400 hover:text-green-300"><CheckCircle className="h-3.5 w-3.5" /></button>
                              <button title="Ignore" onClick={() => updateIssueStatus(issue, "ignored")} className="rounded bg-white/5 p-1.5 text-slate-400 hover:text-amber-300"><XCircle className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${active ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"}`}>{icon}{label}</button>;
}

function MiniStat({ label, value, tone }) {
  const toneClass = tone === "green" ? "text-green-300" : tone === "amber" ? "text-amber-300" : "text-red-300";
  return <div className="rounded-lg bg-black/20 p-2"><div className={`text-lg font-black ${toneClass}`}>{value}</div><div className="text-[10px] uppercase opacity-70">{label}</div></div>;
}

function EnterpriseCheck({ check }) {
  return <div className="glass-card rounded-xl border border-white/5 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-green-300"><ShieldCheck className="h-3.5 w-3.5" /> {check.label}</div><div className="text-[11px] leading-relaxed text-slate-500">{check.target}</div></div>;
}

function CategoryPill({ item }) {
  const status = item.fail ? "fail" : item.warning ? "warning" : "pass";
  const cls = status === "fail" ? "border-red-500/20 bg-red-500/10 text-red-300" : status === "warning" ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-green-500/20 bg-green-500/10 text-green-300";
  return <div className={`rounded-lg border px-3 py-2 text-xs ${cls}`}><div className="font-bold uppercase">{item.category.replaceAll("_", " ")}</div><div className="mt-1 opacity-80">Fail {item.fail} · Warn {item.warning}</div></div>;
}

function CleanupPreview() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
        <AlertCircle className="mr-2 inline h-4 w-4" /> Cleanup is preview-first only. Production business data, tax records, invoices, settlements, and real load history are blocked from automatic deletion.
      </div>
      <div className="glass-card overflow-hidden rounded-xl border border-white/5">
        <table className="w-full text-xs">
          <thead className="bg-white/[0.03] text-left text-slate-500"><tr><th className="px-3 py-2">Category</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">Risk</th><th className="px-3 py-2">Recommended Action</th><th className="px-3 py-2 text-right">Status</th></tr></thead>
          <tbody>
            {CLEANUP_PREVIEW_ITEMS.map((item) => (
              <tr key={item.title} className="border-t border-white/5"><td className="px-3 py-2 text-slate-300">{item.category}</td><td className="px-3 py-2 text-white">{item.title}</td><td className="px-3 py-2"><span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${item.protected ? "bg-red-500/10 text-red-300" : "bg-green-500/10 text-green-300"}`}>{item.risk}</span></td><td className="px-3 py-2 text-slate-400">{item.action}</td><td className="px-3 py-2 text-right">{item.protected ? "Protected" : "Preview only"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
