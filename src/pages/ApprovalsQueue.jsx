import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, ClipboardCheck, FileText, ShieldAlert, DollarSign, UserCheck, LifeBuoy, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusBadge = (status) => {
  const s = (status || "pending").toLowerCase();
  if (["approved", "paid", "resolved", "closed", "complete", "completed"].includes(s)) return "bg-green-500/15 text-green-300 border-green-500/30";
  if (["rejected", "failed", "critical", "overdue"].includes(s)) return "bg-red-500/15 text-red-300 border-red-500/30";
  if (["reviewing", "in_review", "needs_review", "pending"].includes(s)) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-blue-500/15 text-blue-300 border-blue-500/30";
};

function ApprovalCard({ icon: Icon, title, count, description, color = "green" }) {
  const colorClass = color === "red" ? "text-red-300 bg-red-500/10 border-red-500/20" : color === "amber" ? "text-amber-300 bg-amber-500/10 border-amber-500/20" : "text-green-300 bg-green-500/10 border-green-500/20";
  return (
    <div className="glass-card rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorClass}`}><Icon className="w-5 h-5" /></div>
        <div className="text-2xl font-bold text-white">{count}</div>
      </div>
      <div className="mt-3 text-white font-semibold">{title}</div>
      <div className="text-xs text-slate-400 mt-1">{description}</div>
    </div>
  );
}

export default function ApprovalsQueue() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ drivers: [], documents: [], settlements: [], taxDocs: [], tickets: [], compliance: [] });
  const [tab, setTab] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [drivers, documents, settlements, taxDocs, tickets, compliance] = await Promise.all([
        base44.entities.Driver.list("-created_date", 100).catch(() => []),
        base44.entities.DriverDocument.list("-created_date", 100).catch(() => []),
        base44.entities.Settlement.list("-created_date", 100).catch(() => []),
        base44.entities.TaxDocument.list("-created_date", 100).catch(() => []),
        base44.entities.SupportTicket.list("-created_date", 100).catch(() => []),
        base44.entities.ComplianceStatus.list("-created_date", 100).catch(() => []),
      ]);
      setData({ drivers, documents, settlements, taxDocs, tickets, compliance });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const items = [];
    data.drivers.filter(d => ["pending", "pending_approval", "inactive"].includes((d.status || "").toLowerCase()) || d.approval_status === "pending").forEach(d => items.push({ type: "Driver", icon: UserCheck, title: d.name || d.full_name || d.email || "Driver approval", status: d.approval_status || d.status || "pending", section: "drivers", detail: "New driver / owner-operator needs approval" }));
    data.documents.filter(d => ["pending", "uploaded", "needs_review", "rejected"].includes((d.status || "").toLowerCase())).forEach(d => items.push({ type: "Document", icon: FileText, title: d.document_type || d.file_name || "Document review", status: d.status || "pending", section: "documents", detail: d.driver_id ? `Driver: ${d.driver_id}` : "Compliance document needs review" }));
    data.settlements.filter(s => ["draft", "pending", "needs_review", "approved"].includes((s.status || "").toLowerCase())).forEach(s => items.push({ type: "Settlement", icon: DollarSign, title: s.settlement_number || s.id || "Settlement approval", status: s.status || "pending", section: "finance", detail: `Net: $${Number(s.net_amount || s.net_pay || 0).toLocaleString()}` }));
    data.taxDocs.filter(t => ["draft", "generated", "reviewed"].includes((t.status || "").toLowerCase())).forEach(t => items.push({ type: "Tax", icon: ClipboardCheck, title: `${t.tax_year || "Tax"} ${t.document_type || "document"}`, status: t.status || "draft", section: "tax", detail: "Tax document awaiting review/publish" }));
    data.tickets.filter(t => ["open", "new", "escalated"].includes((t.status || "").toLowerCase())).forEach(t => items.push({ type: "Support", icon: LifeBuoy, title: t.subject || "Support ticket", status: t.status || "open", section: "support", detail: t.priority ? `Priority: ${t.priority}` : "Customer/driver support needs action" }));
    data.compliance.filter(c => ["warning", "expired", "non_compliant", "pending"].includes((c.status || c.compliance_status || "").toLowerCase())).forEach(c => items.push({ type: "Compliance", icon: ShieldAlert, title: c.name || c.driver_name || "Compliance issue", status: c.status || c.compliance_status || "warning", section: "compliance", detail: "Compliance item needs review" }));
    return tab === "all" ? items : items.filter(i => i.section === tab);
  }, [data, tab]);

  const tabs = ["all", "drivers", "documents", "finance", "tax", "compliance", "support"];

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Approvals Queue</h1>
          <p className="text-slate-400 text-sm mt-0.5">One command queue for driver, document, settlement, tax, compliance, and support approvals.</p>
        </div>
        <Button onClick={load} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white"><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <ApprovalCard icon={UserCheck} title="Drivers" count={data.drivers.filter(d => (d.approval_status || d.status || "").includes("pending")).length} description="Pending onboarding" />
        <ApprovalCard icon={FileText} title="Documents" count={data.documents.filter(d => ["pending", "uploaded", "needs_review"].includes((d.status || "").toLowerCase())).length} description="Needs review" color="amber" />
        <ApprovalCard icon={DollarSign} title="Settlements" count={data.settlements.filter(s => ["draft", "pending", "needs_review"].includes((s.status || "").toLowerCase())).length} description="Finance queue" />
        <ApprovalCard icon={ShieldAlert} title="Compliance" count={data.compliance.filter(c => ["warning", "expired", "non_compliant", "pending"].includes((c.status || c.compliance_status || "").toLowerCase())).length} description="Safety warnings" color="red" />
        <ApprovalCard icon={LifeBuoy} title="Support" count={data.tickets.filter(t => ["open", "new", "escalated"].includes((t.status || "").toLowerCase())).length} description="Needs response" color="amber" />
      </div>
      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        <div className="flex flex-wrap gap-2 p-3 border-b border-white/10">
          {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${tab === t ? "bg-green-500/15 text-green-300 border border-green-500/30" : "bg-white/5 text-slate-400 border border-white/10"}`}>{t}</button>)}
        </div>
        <div className="divide-y divide-white/5">
          {loading ? <div className="p-8 text-slate-400">Loading queue…</div> : rows.length === 0 ? <div className="p-10 text-center"><CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" /><div className="text-white font-semibold">No pending approvals</div><p className="text-slate-400 text-sm">Everything looks clean for this queue.</p></div> : rows.map((r, idx) => <div key={idx} className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"><div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><r.icon className="w-5 h-5 text-green-300" /></div><div className="flex-1 min-w-0"><div className="text-white font-semibold truncate">{r.title}</div><div className="text-slate-400 text-xs">{r.type} • {r.detail}</div></div><Badge className={statusBadge(r.status)}>{String(r.status).replaceAll("_", " ")}</Badge><Button variant="outline" size="sm" className="border-white/10 text-slate-200">Review</Button></div>)}
        </div>
      </div>
    </div>
  );
}
