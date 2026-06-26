import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  FileText, Download, Plus, Search, Loader2, ChevronLeft,
  CheckCircle2, Clock, AlertCircle, DollarSign,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaxDocumentGenerator from "@/components/admin/TaxDocumentGenerator";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "text-slate-400 bg-slate-500/10 border-slate-500/20", icon: Clock },
  generated: { label: "Generated", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: FileText },
  published: { label: "Sent to Driver", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
  sent_to_driver: { label: "Sent to Driver", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
  downloaded: { label: "Downloaded", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: Download },
  voided: { label: "Voided", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: AlertCircle },
};

export default function TaxCenter() {
  const [taxDocs, setTaxDocs] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.TaxDocument.list("-created_date", 200),
      base44.entities.Driver.list("-created_date", 200),
    ])
      .then(([docs, drs]) => {
        setTaxDocs((docs || []).filter((doc) => (doc.document_type || "1099_nec") === "1099_nec"));
        setDrivers(drs || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = taxDocs.filter((doc) => {
    if (search) {
      const q = search.toLowerCase();
      const hit =
        (doc.driver_name || "").toLowerCase().includes(q) ||
        (doc.tax_year || "").toString().includes(q) ||
        "1099-nec".includes(q);
      if (!hit) return false;
    }
    if (filterYear !== "all" && doc.tax_year?.toString() !== filterYear) return false;
    return true;
  });

  const years = [...new Set(taxDocs.map((d) => d.tax_year).filter(Boolean))].sort((a, b) => b - a);

  const handlePublish = async (docId) => {
    try {
      await base44.entities.TaxDocument.update(docId, {
        status: "sent_to_driver",
        published_at: new Date().toISOString(),
        sent_to_driver_at: new Date().toISOString(),
      });
      setTaxDocs((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: "sent_to_driver", published_at: new Date().toISOString() } : d))
      );
      const doc = taxDocs.find((d) => d.id === docId);
      if (doc?.user_id) {
        await base44.entities.Notification.create({
          user_id: doc.user_id,
          driver_id: doc.driver_id,
          type: "tax_document_ready",
          title: "1099-NEC ready",
          message: `Your ${doc.tax_year} HASTEN 1099-NEC is ready for read-only download.`,
          read: false,
          created_at: new Date().toISOString(),
        }).catch(() => null);
      }
    } catch (err) {
      console.error("Publish failed:", err);
    }
  };

  const formatCurrency = (val) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totals = filtered.reduce(
    (acc, doc) => {
      acc.box1 += doc.box_1_nonemployee_compensation ?? doc.gross_amount ?? 0;
      acc.box4 += doc.box_4_federal_income_tax_withheld ?? doc.federal_income_tax_withheld ?? 0;
      return acc;
    },
    { box1: 0, box4: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-white font-heading font-bold text-2xl">Tax Center</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              1099-NEC only for HASTEN 1099 owner-operator drivers. Box 1 is gross quote + detention; Box 4 is $0.00.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowGenerator(true)} className="bg-green-500 hover:bg-green-600 text-black font-bold">
          <Plus className="w-4 h-4 mr-1" />
          Generate 1099-NEC
        </Button>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
        Tax policy: no fuel, toll, maintenance, repair, insurance, escrow, or other deduction is subtracted from 1099 gross. Driver app access is read-only download after publishing.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> 1099 Box 1 Gross</div>
          <div className="text-white font-bold text-xl">{formatCurrency(totals.box1)}</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Box 4 Federal Withheld</div>
          <div className="text-blue-300 font-bold text-xl">{formatCurrency(totals.box4)}</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><FileText className="w-3.5 h-3.5" /> 1099 Documents</div>
          <div className="text-green-400 font-bold text-xl">{filtered.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by driver or year..." className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white"><SelectValue placeholder="All Years" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-green-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center"><FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400 text-sm">No 1099-NEC documents found. Generate one to get started.</p></div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">Driver</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Year</th>
                <th className="text-right px-4 py-3 font-semibold">Box 1 Gross</th>
                <th className="text-right px-4 py-3 font-semibold">Box 4</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((doc) => {
                const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                const StatusIcon = statusCfg.icon;
                return (
                  <tr key={doc.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-medium">{doc.driver_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-400">1099-NEC</td>
                    <td className="px-4 py-3 text-slate-400">{doc.tax_year}</td>
                    <td className="px-4 py-3 text-right text-green-300 font-medium">{formatCurrency(doc.box_1_nonemployee_compensation ?? doc.gross_amount)}</td>
                    <td className="px-4 py-3 text-right text-blue-300">{formatCurrency(doc.box_4_federal_income_tax_withheld ?? 0)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${statusCfg.color}`}><StatusIcon className="w-3 h-3" />{statusCfg.label}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {doc.status === "generated" && <button onClick={() => handlePublish(doc.id)} className="px-2 py-1 rounded text-xs text-green-400 hover:bg-green-500/10 transition-colors" title="Publish read-only driver download">Publish & Send</button>}
                        {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title="Download"><Download className="w-3.5 h-3.5" /></a>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TaxDocumentGenerator isOpen={showGenerator} onClose={() => setShowGenerator(false)} drivers={drivers} />
    </div>
  );
}
