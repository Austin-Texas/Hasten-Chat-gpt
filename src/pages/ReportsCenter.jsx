import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, DollarSign, Route, UserCheck, FileText, ShieldCheck, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function ReportCard({ icon: Icon, title, value, subtitle }) {
  return <div className="glass-card rounded-xl border border-white/10 p-4"><div className="flex items-center justify-between"><div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center"><Icon className="w-5 h-5 text-green-300" /></div><div className="text-right"><div className="text-white text-xl font-bold">{value}</div><div className="text-slate-500 text-xs">{subtitle}</div></div></div><div className="mt-3 text-white font-semibold">{title}</div></div>
}

export default function ReportsCenter() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ loads: [], invoices: [], settlements: [], drivers: [], docs: [], compliance: [] });
  const load = async () => {
    setLoading(true);
    try {
      const [loads, invoices, settlements, drivers, docs, compliance] = await Promise.all([
        base44.entities.Load.list("-created_date", 500).catch(() => []),
        base44.entities.Invoice.list("-created_date", 500).catch(() => []),
        base44.entities.Settlement.list("-created_date", 500).catch(() => []),
        base44.entities.Driver.list("-created_date", 500).catch(() => []),
        base44.entities.LoadDocument.list("-created_date", 500).catch(() => []),
        base44.entities.ComplianceStatus.list("-created_date", 500).catch(() => []),
      ]);
      setData({ loads, invoices, settlements, drivers, docs, compliance });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const stats = useMemo(() => {
    const revenue = data.loads.reduce((s,l)=>s+(Number(l.rate || l.total_rate || 0)),0);
    const paid = data.invoices.filter(i => i.status === "paid").reduce((s,i)=>s+Number(i.total_amount || 0),0);
    const settlement = data.settlements.reduce((s,i)=>s+Number(i.net_amount || i.net_pay || 0),0);
    return { revenue, paid, settlement };
  }, [data]);
  const reportTypes = [
    { icon: DollarSign, title: "Revenue Report", desc: "Gross revenue, invoices, paid vs pending, broker/customer aging." },
    { icon: BarChart3, title: "Margin Report", desc: "Load margin, settlement cost, accessorials, detention recovery." },
    { icon: Route, title: "Lane Profitability", desc: "Best lanes by RPM, total margin, equipment type, and deadhead risk." },
    { icon: UserCheck, title: "Driver Performance", desc: "On-time percentage, completed loads, document score, safety score." },
    { icon: FileText, title: "Settlement + Tax", desc: "Weekly settlements, 1099/W-2 documents, year-end summaries." },
    { icon: ShieldCheck, title: "Compliance Report", desc: "Expiring CDL, medical cards, insurance, agreements, and missing docs." },
  ];
  return <div className="space-y-5 animate-slide-up"><div className="flex items-center justify-between gap-3"><div><h1 className="text-white font-heading font-bold text-2xl">Reports Center</h1><p className="text-slate-400 text-sm mt-0.5">Enterprise reporting hub for revenue, margins, lanes, drivers, settlements, tax, and compliance.</p></div><Button onClick={load} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white"><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><ReportCard icon={DollarSign} title="Gross Load Revenue" value={`$${stats.revenue.toLocaleString()}`} subtitle="all loads" /><ReportCard icon={DollarSign} title="Paid Invoices" value={`$${stats.paid.toLocaleString()}`} subtitle="paid" /><ReportCard icon={UserCheck} title="Drivers" value={data.drivers.length} subtitle="active records" /><ReportCard icon={FileText} title="Documents" value={data.docs.length} subtitle="uploaded" /></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{reportTypes.map((r)=><div key={r.title} className="glass-card rounded-xl border border-white/10 p-5 hover:border-green-500/30 transition-colors"><div className="flex items-start gap-3"><div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><r.icon className="w-5 h-5 text-green-300" /></div><div className="flex-1"><div className="text-white font-semibold">{r.title}</div><p className="text-slate-400 text-sm mt-1">{r.desc}</p><Button variant="outline" size="sm" className="mt-4 border-white/10 text-slate-200"><Download className="w-4 h-4 mr-2" />Open / Export</Button></div></div></div>)}</div></div>
}
