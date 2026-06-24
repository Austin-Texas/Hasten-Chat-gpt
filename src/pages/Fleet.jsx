import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Truck, Plus, Search, AlertTriangle, CheckCircle, Clock, Wrench, ChevronRight, CheckSquare, Square, X, Loader2 } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import KpiCard from "@/components/hasten/KpiCard";
import FleetAlertsPanel from "@/components/fleet/FleetAlertsPanel";

export default function Fleet() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    base44.entities.Truck.list("-created_date", 100)
      .then(setTrucks).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleSelect = (id, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const STATUS_OPTS = ["all", "active", "idle", "maintenance", "out_of_service"];
  const filtered = trucks.filter(t => {
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (t.unit_number || "").toLowerCase().includes(q) ||
      `${t.make} ${t.model}`.toLowerCase().includes(q) ||
      (t.license_plate || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const selectAll = () => {
    setSelected(new Set(filtered.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelected(new Set());
    setBulkStatus("");
    setStatusDropdownOpen(false);
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setApplying(true);
    try {
      await Promise.all([...selected].map(id => base44.entities.Truck.update(id, { status: bulkStatus })));
      base44.entities.Truck.list("-created_date", 100).then(setTrucks);
      clearSelection();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0 || !confirm(`Delete ${selected.size} truck${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setApplying(true);
    try {
      await Promise.all([...selected].map(id => base44.entities.Truck.delete(id)));
      base44.entities.Truck.list("-created_date", 100).then(setTrucks);
      clearSelection();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const isExpiringOrExpired = (date) => {
    if (!date) return false;
    const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff < 30;
  };

  const selectionBar = selected.size > 0 && (
    <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-xl border border-blue-500/30 bg-blue-500/10 animate-slide-up flex-wrap shadow-lg">
      <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
        <CheckSquare className="w-5 h-5" />
        {selected.size} truck{selected.size !== 1 ? "s" : ""} selected
      </div>
      <div className="flex-1" />
      
      {/* Status picker */}
      <div className="relative">
        <button
          onClick={() => setStatusDropdownOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-all"
          title="Choose a status to apply to all selected trucks"
        >
          {bulkStatus ? <StatusBadge status={bulkStatus} /> : "Set status…"}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        {statusDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 glass-card border border-white/10 rounded-xl p-1 min-w-[200px] max-h-64 overflow-y-auto shadow-2xl">
            {["active", "idle", "maintenance", "out_of_service"].map(s => (
              <button key={s} onClick={() => { setBulkStatus(s); setStatusDropdownOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left capitalize">
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        )}
      </div>
      <button
         onClick={applyBulkStatus}
         disabled={!bulkStatus || applying}
         className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-50 transition-all bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 border border-orange-400/50 shadow-lg"
         title="Update the status of all selected trucks"
       >
        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
        {applying ? "Updating…" : "Apply Status"}
      </button>
      <button
         onClick={bulkDelete}
         disabled={applying}
         className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-50 transition-all bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border border-red-400/50 shadow-lg"
         title="Delete all selected trucks permanently"
       >
        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        {applying ? "Deleting…" : "Delete"}
      </button>
      <button onClick={clearSelection} className="p-2.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Clear all selections (Esc)">
         <X className="w-4 h-4" />
       </button>
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Fleet Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">{trucks.length} vehicles</p>
        </div>
        <Link to="/fleet/new" title="Register a new truck in the fleet"
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
          <Plus className="w-4 h-4" /> Add Truck
        </Link>
      </div>

      <FleetAlertsPanel />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <KpiCard label="Active" value={trucks.filter(t => t.status === "active").length} icon={CheckCircle} color="green" />
         <KpiCard label="Idle" value={trucks.filter(t => t.status === "idle").length} icon={Clock} color="amber" />
         <KpiCard label="Maintenance" value={trucks.filter(t => t.status === "maintenance").length} icon={Wrench} color="orange" />
         <KpiCard label="Utilization" value={(() => {
           const activeTrucks = trucks.filter(t => t.status === "active").length;
           if (activeTrucks === 0) return "0%";
           return `${activeTrucks}/${trucks.length}`;
         })()} icon={AlertTriangle} color="red" />
       </div>

      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} title={`Filter trucks by ${s === "all" ? "all statuses" : s.replace("_", " ")} status`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all duration-150 ${
                statusFilter === s ? "bg-orange-500/15 border-orange-500/30 text-orange-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        {filtered.length > 0 && selected.size === 0 && (
          <button onClick={selectAll} title="Select all visible trucks for bulk actions"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:text-blue-200 hover:border-blue-500/40 transition-all">
            Select All
          </button>
        )}
      </div>

      {selectionBar}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search unit number, make, plate…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No trucks found</p>
          <Link to="/fleet/new" className="text-orange-400 text-sm mt-2 inline-block">Add a truck →</Link>
        </div>
      ) : (
       <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
         {/* Select-all row */}
         {filtered.length > 0 && (
           <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/5">
             <button onClick={selected.size === filtered.length ? clearSelection : selectAll} title={selected.size === filtered.length ? "Deselect all trucks" : "Select all trucks"}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
               {selected.size === filtered.length
                 ? <CheckSquare className="w-4 h-4 text-orange-400" />
                 : <Square className="w-4 h-4" />}
               {selected.size === filtered.length ? "Deselect all" : "Select all"}
             </button>
           </div>
         )}
         {filtered.map(truck => {
           const regExpiring = isExpiringOrExpired(truck.registration_expiry);
           const insExpiring = isExpiringOrExpired(truck.insurance_expiry);
           const inspExpiring = isExpiringOrExpired(truck.annual_inspection_expiry);
           const hasAlert = regExpiring || insExpiring || inspExpiring;
           const isSelected = selected.has(truck.id);
           return (
             <div key={truck.id} className={`flex items-center gap-4 px-5 py-4 transition-colors group ${isSelected ? "bg-orange-500/5" : "hover:bg-white/2"}`}>
               <button onClick={(e) => toggleSelect(truck.id, e)} title="Select/deselect truck for bulk actions"
                  className="flex-shrink-0 text-slate-500 hover:text-orange-400 transition-colors">
                 {isSelected
                   ? <CheckSquare className="w-4 h-4 text-orange-400" />
                   : <Square className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />}
               </button>
               <Link to={`/fleet/${truck.id}`} className="flex-1 flex items-center gap-4 min-w-0 block">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    truck.status === "active" ? "bg-green-500/10 border border-green-500/20" :
                    truck.status === "maintenance" ? "bg-amber-500/10 border border-amber-500/20" :
                    "bg-white/5 border border-white/10"
                  }`}>
                    <Truck className={`w-5 h-5 ${
                      truck.status === "active" ? "text-green-400" :
                      truck.status === "maintenance" ? "text-amber-400" : "text-slate-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-mono font-bold text-sm">#{truck.unit_number}</span>
                      <StatusBadge status={truck.status || "idle"} />
                      {hasAlert && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="text-slate-400 text-sm">{truck.year} {truck.make} {truck.model}</div>
                    <div className="text-slate-600 text-xs">{truck.license_plate} {truck.license_plate_state ? `· ${truck.license_plate_state}` : ""}</div>
                  </div>
                  <div className="hidden sm:block text-right text-xs text-slate-500">
                    {truck.odometer ? <div>{truck.odometer.toLocaleString()} mi</div> : null}
                    {truck.current_city && <div>{truck.current_city}, {truck.current_state}</div>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}