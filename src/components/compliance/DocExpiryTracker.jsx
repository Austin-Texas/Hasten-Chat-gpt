import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, CheckCircle, Search, Download, ChevronRight, Shield, FileText, CreditCard } from "lucide-react";

const DOC_TYPES = [
  { key: "license_expiry", label: "CDL License", icon: FileText, field: "license_expiry" },
  { key: "medical_expiry", label: "Medical Card", icon: Shield, field: "medical_expiry" },
  { key: "twic_expiry",    label: "TWIC Card",    icon: CreditCard, field: "twic_expiry"  },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function ExpiryPill({ days }) {
  if (days === null) return <span className="text-slate-600 text-xs">—</span>;
  if (days < 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25"><AlertTriangle className="w-3 h-3" />Expired {Math.abs(days)}d ago</span>;
  if (days <= 7)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25"><AlertTriangle className="w-3 h-3" />{days}d left</span>;
  if (days <= 30)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25"><Clock className="w-3 h-3" />{days}d left</span>;
  return <span className="text-slate-400 text-xs">{new Date(Date.now() + days * 86400000).toLocaleDateString()}</span>;
}

export default function DocExpiryTracker({ drivers }) {
  const [search, setSearch]         = useState("");
  const [docFilter, setDocFilter]   = useState("all");   // all | license | medical | twic
  const [window30, setWindow30]     = useState(false);   // true = only next 30 days

  // Flatten drivers × docs into individual expiry rows
  const rows = useMemo(() => {
    const result = [];
    drivers.forEach(d => {
      DOC_TYPES.forEach(doc => {
        const days = daysUntil(d[doc.field]);
        result.push({ driver: d, doc, days, expiry: d[doc.field] });
      });
    });
    // Sort: expired first → expiring soon → ok → no date
    return result.sort((a, b) => {
      const aVal = a.days === null ? 9999 : a.days;
      const bVal = b.days === null ? 9999 : b.days;
      return aVal - bVal;
    });
  }, [drivers]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      // Doc type filter
      if (docFilter !== "all" && r.doc.key !== `${docFilter}_expiry`) return false;
      // 30-day window toggle
      if (window30 && (r.days === null || r.days > 30)) return false;
      // Search
      if (search) {
        const q = search.toLowerCase();
        const name = `${r.driver.first_name} ${r.driver.last_name}`.toLowerCase();
        if (!name.includes(q) && !(r.driver.license_number || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, docFilter, window30, search]);

  // Summary counts
  const counts = useMemo(() => {
    const allRows = rows.filter(r => r.days !== null);
    return {
      expired:  allRows.filter(r => r.days < 0).length,
      critical: allRows.filter(r => r.days >= 0 && r.days <= 7).length,
      soon:     allRows.filter(r => r.days > 7 && r.days <= 30).length,
    };
  }, [rows]);

  const handleExport = () => {
    const csv = [
      ["Driver", "License #", "Document", "Expiry Date", "Days Remaining", "Status"].join(","),
      ...filtered.map(r => [
        `${r.driver.first_name} ${r.driver.last_name}`,
        r.driver.license_number || "",
        r.doc.label,
        r.expiry || "",
        r.days !== null ? r.days : "",
        r.days === null ? "No Date" : r.days < 0 ? "Expired" : r.days <= 30 ? "Expiring Soon" : "Valid",
      ].join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `doc-expiry-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">Expired</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{counts.expired}</div>
          <div className="text-slate-500 text-xs mt-0.5">documents past due</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">Critical</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{counts.critical}</div>
          <div className="text-slate-500 text-xs mt-0.5">expiring within 7 days</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Expiring Soon</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{counts.soon}</div>
          <div className="text-slate-500 text-xs mt-0.5">expiring within 30 days</div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search driver name or license…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
          />
        </div>

        {/* Doc type pills */}
        {[
          { value: "all",     label: "All Docs" },
          { value: "license", label: "CDL License" },
          { value: "medical", label: "Medical Card" },
          { value: "twic",    label: "TWIC Card" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setDocFilter(opt.value)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              docFilter === opt.value
                ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}

        {/* 30-day toggle */}
        <button
          onClick={() => setWindow30(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            window30
              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Next 30 Days
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors ml-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle className="w-12 h-12 text-green-500/40 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">All documents are up to date</p>
            <p className="text-slate-600 text-sm mt-1">No records match the current filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Document</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((r, i) => {
                  const isUrgent = r.days !== null && r.days <= 7;
                  const Doc = r.doc.icon;
                  return (
                    <tr
                      key={`${r.driver.id}-${r.doc.key}`}
                      className={`hover:bg-white/2 transition-colors ${isUrgent ? "bg-red-500/3" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-400 text-xs font-bold">
                              {(r.driver.first_name || "?").charAt(0)}{(r.driver.last_name || "").charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-white font-medium">{r.driver.first_name} {r.driver.last_name}</div>
                            <div className="text-slate-500 text-xs">{r.driver.license_number || "No license #"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Doc className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-300">{r.doc.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm ${r.days !== null && r.days < 0 ? "text-red-400 line-through" : "text-slate-300"}`}>
                          {r.expiry ? new Date(r.expiry).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <ExpiryPill days={r.days} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize
                          ${r.driver.status === "available" ? "bg-green-500/15 text-green-400 border-green-500/25" :
                            r.driver.status === "on_load"   ? "bg-orange-500/15 text-orange-400 border-orange-500/25" :
                            r.driver.status === "off_duty"  ? "bg-slate-500/15 text-slate-400 border-slate-500/25" :
                            "bg-red-500/15 text-red-400 border-red-500/25"}`}>
                          {(r.driver.status || "unknown").replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/drivers/${r.driver.id}`}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-orange-400 transition-colors"
                        >
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 text-xs text-slate-500">
            Showing {filtered.length} document record{filtered.length !== 1 ? "s" : ""}
            {window30 ? " expiring within 30 days" : ""}
          </div>
        )}
      </div>
    </div>
  );
}