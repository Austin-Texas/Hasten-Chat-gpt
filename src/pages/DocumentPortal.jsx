import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  FileText, Search, Eye, CheckCircle, Clock, XCircle,
  Filter, Download, RefreshCw, AlertTriangle, ChevronDown
} from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

const DOC_STATUSES = ["pending", "verified", "rejected"];

const STATUS_CONFIG = {
  pending:  { label: "Pending Review", icon: Clock,        classes: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  verified: { label: "Verified",       icon: CheckCircle,  classes: "bg-green-500/10 border-green-500/20 text-green-400" },
  rejected: { label: "Rejected",       icon: XCircle,      classes: "bg-red-500/10 border-red-500/20 text-red-400" },
};

function DocStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.classes}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function DocRow({ doc, onStatusChange, updating }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`border-b border-white/5 last:border-0 transition-colors ${updating ? "opacity-60 pointer-events-none" : "hover:bg-white/[0.02]"}`}>
      <div className="flex items-center gap-4 px-5 py-4">
        {/* File icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          doc.doc_status === "verified" ? "bg-green-500/10 border border-green-500/20" :
          doc.doc_status === "rejected" ? "bg-red-500/10 border border-red-500/20" :
          "bg-amber-500/10 border border-amber-500/20"
        }`}>
          <FileText className={`w-4 h-4 ${
            doc.doc_status === "verified" ? "text-green-400" :
            doc.doc_status === "rejected" ? "text-red-400" : "text-amber-400"
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-white font-semibold text-sm">{doc.doc_type_label}</span>
            <DocStatusBadge status={doc.doc_status || "pending"} />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span className="font-mono text-orange-400/80">{doc.load_number}</span>
            <span>{doc.origin_city} → {doc.destination_city}</span>
            <span>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown date"}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {doc.url && (
            <a href={doc.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs transition-colors"
              title="View document"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </a>
          )}

          {/* Status changer */}
          <div className="relative">
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs transition-colors"
            >
              Update <ChevronDown className="w-3 h-3" />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 z-20 glass-card border border-white/10 rounded-xl p-1 min-w-[160px] shadow-2xl">
                {DOC_STATUSES.map(s => {
                  const cfg = STATUS_CONFIG[s];
                  const Icon = cfg.icon;
                  return (
                    <button key={s} onClick={() => { onStatusChange(doc, s); setOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5 ${doc.doc_status === s ? "text-orange-400" : "text-slate-300"}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentPortal() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchLoads = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Load.list("-created_date", 300);
      setLoads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoads(); }, []);

  // Flatten loads into individual document rows
  const allDocs = loads.flatMap(load => {
    const loadNum = load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`;
    const base = {
      load_id: load.id,
      load_number: loadNum,
      origin_city: load.origin_city || "—",
      destination_city: load.destination_city || "—",
    };
    const docs = [];
    if (load.bol_url) {
      docs.push({
        ...base,
        id: `${load.id}_bol`,
        doc_type: "bol",
        doc_type_label: "Bill of Lading (BOL)",
        url: load.bol_url,
        doc_status: load.bol_status || "pending",
        uploaded_at: load.updated_date,
      });
    }
    if (load.pod_url) {
      docs.push({
        ...base,
        id: `${load.id}_pod`,
        doc_type: "pod",
        doc_type_label: "Proof of Delivery (POD)",
        url: load.pod_url,
        doc_status: load.pod_status || "pending",
        uploaded_at: load.updated_date,
      });
    }
    return docs;
  });

  // KPI counts
  const pendingCount  = allDocs.filter(d => (d.doc_status || "pending") === "pending").length;
  const verifiedCount = allDocs.filter(d => d.doc_status === "verified").length;
  const rejectedCount = allDocs.filter(d => d.doc_status === "rejected").length;

  // Filtered view
  const filtered = allDocs.filter(doc => {
    if (filterStatus !== "all" && (doc.doc_status || "pending") !== filterStatus) return false;
    if (filterType !== "all" && doc.doc_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !doc.load_number.toLowerCase().includes(q) &&
        !doc.origin_city.toLowerCase().includes(q) &&
        !doc.destination_city.toLowerCase().includes(q) &&
        !doc.doc_type_label.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const handleStatusChange = async (doc, newStatus) => {
    setUpdatingId(doc.id);
    try {
      const field = doc.doc_type === "bol" ? "bol_status" : "pod_status";
      await base44.entities.Load.update(doc.load_id, { [field]: newStatus });
      setLoads(prev => prev.map(l =>
        l.id === doc.load_id ? { ...l, [field]: newStatus } : l
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up" onClick={() => {}}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Document Portal</h1>
          <p className="text-slate-400 text-sm mt-0.5">{allDocs.length} documents across {loads.filter(l => l.bol_url || l.pod_url).length} loads</p>
        </div>
        <button onClick={fetchLoads} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-400" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending Review", count: pendingCount, color: "amber", status: "pending" },
          { label: "Verified",       count: verifiedCount,color: "green",  status: "verified" },
          { label: "Rejected",       count: rejectedCount,color: "red",    status: "rejected" },
        ].map(kpi => (
          <button
            key={kpi.status}
            onClick={() => setFilterStatus(filterStatus === kpi.status ? "all" : kpi.status)}
            className={`glass-card rounded-xl p-4 border text-left transition-all duration-150 kpi-card ${
              filterStatus === kpi.status
                ? kpi.color === "amber" ? "border-amber-500/30 bg-amber-500/5"
                  : kpi.color === "green" ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
                : "border-white/5 hover:border-white/10"
            }`}
          >
            <div className={`text-2xl font-bold font-heading mb-0.5 ${
              kpi.color === "amber" ? "text-amber-400" : kpi.color === "green" ? "text-green-400" : "text-red-400"
            }`}>{kpi.count}</div>
            <div className="text-slate-400 text-xs">{kpi.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search load #, city, document type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-orange-500/40 transition-colors"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500/40 transition-colors appearance-none cursor-pointer"
        >
          <option value="all" className="bg-slate-900">All Types</option>
          <option value="bol" className="bg-slate-900">BOL only</option>
          <option value="pod" className="bg-slate-900">POD only</option>
        </select>
        {(filterStatus !== "all" || filterType !== "all" || search) && (
          <button
            onClick={() => { setFilterStatus("all"); setFilterType("all"); setSearch(""); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <span className="text-slate-500 text-xs ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Document table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider bg-white/[0.02]">
          <span>Document</span>
          <span>Load</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">
              {allDocs.length === 0 ? "No documents uploaded yet" : "No documents match your filters"}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              {allDocs.length === 0 ? "Documents appear here once drivers upload BOLs and PODs" : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          filtered.map(doc => (
            <DocRow
              key={doc.id}
              doc={doc}
              onStatusChange={handleStatusChange}
              updating={updatingId === doc.id}
            />
          ))
        )}
      </div>

      {/* Missing docs alert */}
      {!loading && (() => {
        const missing = loads.filter(l =>
          ["delivered", "pod_uploaded", "completed"].includes(l.status) && (!l.bol_url || !l.pod_url)
        );
        if (missing.length === 0) return null;
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-400 font-medium text-sm">{missing.length} load{missing.length !== 1 ? "s" : ""} missing documents</div>
              <div className="text-slate-400 text-xs mt-0.5">
                {missing.slice(0, 3).map(l => l.load_number || `#LD${l.id?.slice(-6).toUpperCase()}`).join(", ")}
                {missing.length > 3 ? ` and ${missing.length - 3} more` : ""} — delivered but BOL/POD not uploaded.
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}