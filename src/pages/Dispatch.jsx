import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, ArrowRight, Truck, ChevronRight, CheckSquare, Square, X, ChevronDown, Loader2, Map, Layers } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import DispatchLiveMap from "@/components/dispatch/DispatchLiveMap";
import DispatchCalendar from "@/components/dispatch/DispatchCalendar";
import DispatchFilters from "@/components/dispatch/DispatchFilters";
import RegionGroupView from "@/components/dispatch/RegionGroupView";
import { STATE_TO_CORRIDOR } from "@/components/dispatch/RegionGroupView";
import LoadProgressBar from "@/components/dispatch/LoadProgressBar";
import DispatchEnterprisePanel from "@/components/dispatch/DispatchEnterprisePanel";

const COLUMNS = [
  { key: "available", label: "Available", color: "blue" },
  { key: "assigned", label: "Assigned", color: "purple" },
  { key: "in_transit", label: "In Transit", color: "orange" },
  { key: "delivered", label: "Delivered", color: "green" },
];

const ALL_STATUSES = [
  "available","assigned","accepted","en_route","arrived_pickup",
  "loaded","in_transit","arrived_delivery","delivered","pod_uploaded","completed","cancelled"
];

const colColor = {
  blue: "border-blue-500/20 bg-blue-500/5",
  purple: "border-purple-500/20 bg-purple-500/5",
  orange: "border-orange-500/20 bg-orange-500/5",
  green: "border-green-500/20 bg-green-500/5",
};
const headerColor = {
  blue: "text-blue-400",
  purple: "text-purple-400",
  orange: "text-orange-400",
  green: "text-green-400",
};

export default function Dispatch() {
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("kanban");
  const [trucks, setTrucks] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkDriver, setBulkDriver] = useState("");
  const [applying, setApplying] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "", broker: "", status: "", dateFrom: "", dateTo: "", equipmentType: "", driverSearch: "", region: "", stateFilter: "" });
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem("favoriteDrivers")) || []);

  const applyFilters = (list) => {
    const { search, broker, status, dateFrom, dateTo, equipmentType, driverSearch, region, stateFilter } = filters;
    let matchedDriverIds = null;
    if (driverSearch) {
      const q = driverSearch.toLowerCase();
      matchedDriverIds = new Set(
        drivers
          .filter(d => `${d.first_name} ${d.last_name}`.toLowerCase().includes(q))
          .map(d => d.id)
      );
    }
    return list.filter(l => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          (l.load_number || "").toLowerCase().includes(q) ||
          (l.origin_city || "").toLowerCase().includes(q) ||
          (l.destination_city || "").toLowerCase().includes(q) ||
          (l.commodity || "").toLowerCase().includes(q) ||
          (l.bol_number || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (broker) {
        const q = broker.toLowerCase();
        const hit =
          (l.broker_id || "").toLowerCase().includes(q) ||
          (l.client_id || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (status && l.status !== status) return false;
      if (dateFrom && l.pickup_date && l.pickup_date.slice(0, 10) < dateFrom) return false;
      if (dateTo && l.pickup_date && l.pickup_date.slice(0, 10) > dateTo) return false;
      if (equipmentType && l.equipment_type !== equipmentType) return false;
      if (stateFilter) {
        const sf = stateFilter.toUpperCase();
        if ((l.origin_state || "").toUpperCase() !== sf && (l.destination_state || "").toUpperCase() !== sf) return false;
      }
      if (region) {
        const destCorridor = STATE_TO_CORRIDOR[l.destination_state] || "";
        const origCorridor = STATE_TO_CORRIDOR[l.origin_state] || "";
        const hit = destCorridor === region || origCorridor === region ||
                    destCorridor.includes(region) || origCorridor.includes(region);
        if (!hit) return false;
      }
      if (matchedDriverIds !== null) {
        if (!l.driver_id || !matchedDriverIds.has(l.driver_id)) return false;
      }
      return true;
    });
  };

  const filteredLoads = applyFilters(loads);

  useEffect(() => {
    Promise.all([
      base44.entities.Load.list("-created_date", 200),
      base44.entities.Driver.list("-created_date", 100),
      base44.entities.Truck.list("-created_date", 100),
    ])
      .then(([ld, dr, tr]) => {
        setLoads(ld);
        setDrivers(dr);
        setTrucks(tr);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        if (filteredLoads.length > 0) selectAll();
      }
      if (e.key === "Enter" && selected.size > 0 && bulkDriver) {
        e.preventDefault();
        applyBulkDriver();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, bulkDriver, filteredLoads]);

  const fetchLoads = () => {
    base44.entities.Load.list("-created_date", 200)
      .then(setLoads).catch(console.error);
  };

  const getByStatus = (colKey) => {
    let statusGroup;
    if (colKey === "in_transit") {
      statusGroup = ["accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery"];
    } else if (colKey === "delivered") {
      statusGroup = ["delivered", "pod_uploaded", "completed"];
    } else {
      statusGroup = [colKey];
    }
    return filteredLoads.filter(l => statusGroup.includes(l.status));
  };

  const toggleSelect = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => { setSelected(new Set()); setBulkStatus(""); setBulkDriver(""); };

  const toggleFavorite = (driverId) => {
    setFavorites(prev => {
      const next = prev.includes(driverId) ? prev.filter(id => id !== driverId) : [...prev, driverId];
      localStorage.setItem("favoriteDrivers", JSON.stringify(next));
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredLoads.map(l => l.id)));
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setApplying(true);
    try {
      await Promise.all([...selected].map(id => 
        base44.functions.invoke('updateLoadStatus', { load_id: id, new_status: bulkStatus })
      ));
      await fetchLoads();
      clearSelection();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const applyBulkDriver = async () => {
    if (!bulkDriver || selected.size === 0) return;
    setApplying(true);
    try {
      await Promise.all([...selected].map(id => 
        base44.functions.invoke('updateLoadStatus', { load_id: id, new_status: "assigned", driver_id: bulkDriver })
      ));
      await fetchLoads();
      clearSelection();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0 || !confirm(`Delete ${selected.size} load${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setApplying(true);
    try {
      await Promise.all([...selected].map(id => base44.entities.Load.delete(id)));
      await fetchLoads();
      clearSelection();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const selectionBar = selected.size > 0 && (
    <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-xl border border-blue-500/30 bg-blue-500/10 animate-slide-up flex-wrap shadow-lg">
      <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
        <CheckSquare className="w-5 h-5" />
        {selected.size} load{selected.size !== 1 ? "s" : ""} selected
      </div>
      <div className="flex-1" />
      <div className="relative">
        <button
            onClick={() => setDriverDropdownOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/40 text-sm font-medium text-blue-300 hover:text-blue-200 hover:border-blue-500/60 transition-all"
            title="Select a driver from available drivers (favorites pinned at top)"
          >
          <Truck className="w-4 h-4" />
          {bulkDriver ? drivers.find(d => d.id === bulkDriver)?.first_name + " " + drivers.find(d => d.id === bulkDriver)?.last_name : "Assign driver…"}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {driverDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 glass-card border border-white/10 rounded-xl shadow-2xl min-w-[280px] max-h-96 overflow-hidden flex flex-col">
            {favorites.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-orange-400 bg-white/3 border-b border-white/5">⭐ Favorites</div>
                <div className="p-1 space-y-0">
                  {favorites.map(driverId => {
                    const d = drivers.find(dr => dr.id === driverId && dr.status === "available");
                    return d ? (
                      <button key={d.id} onClick={() => { setBulkDriver(d.id); setDriverDropdownOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-orange-500/15 transition-colors text-left text-slate-200 hover:text-white text-sm group">
                        <span className="w-2 h-2 rounded-full bg-orange-400" />
                        <span className="flex-1 font-medium">{d.first_name} {d.last_name}</span>
                        <span className="text-xs text-slate-500">{d.current_city || "—"}</span>
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(d.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-orange-400">★</button>
                      </button>
                    ) : null;
                  })}
                </div>
              </>
            )}
            <div className={`px-4 py-2 text-xs font-semibold text-slate-400 bg-white/3 border-b border-white/5 ${favorites.length > 0 ? "" : "border-t"}`}>
              Available ({drivers.filter(d => d.status === "available").length})
            </div>
            <div className="p-1 overflow-y-auto">
              {drivers.filter(d => d.status === "available").map(d => (
                <button key={d.id} onClick={() => { setBulkDriver(d.id); setDriverDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors text-left text-slate-300 hover:text-white text-sm group">
                  <span className="flex-1">{d.first_name} {d.last_name}</span>
                  <span className="text-xs text-slate-500">{d.current_city || "—"}</span>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(d.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-orange-400">{favorites.includes(d.id) ? "★" : "☆"}</button>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        onClick={applyBulkDriver}
        disabled={!bulkDriver || applying}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-50 transition-all bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/50 shadow-lg"
        title="Assign all selected loads to the chosen driver (Ctrl+Enter)"
      >
        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
        {applying ? "Assigning…" : "Assign All"}
      </button>
      <div className="relative">
        <button
            onClick={() => setStatusDropdownOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-all"
            title="Choose a load status to apply to all selected loads"
          >
          {bulkStatus ? <StatusBadge status={bulkStatus} /> : "Set status…"}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {statusDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 glass-card border border-white/10 rounded-xl p-1 min-w-[200px] max-h-64 overflow-y-auto shadow-2xl">
            {ALL_STATUSES.map(s => (
              <button key={s} onClick={() => { setBulkStatus(s); setStatusDropdownOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left">
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
        title="Update the status of all selected loads"
      >
        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
        {applying ? "Applying…" : "Apply Status"}
      </button>
      <button
         onClick={bulkDelete}
         disabled={applying}
         className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-50 transition-all bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border border-red-400/50 shadow-lg"
         title="Delete all selected loads permanently"
       >
        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        {applying ? "Deleting…" : "Delete"}
      </button>
      <button onClick={clearSelection} className="p-2.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Clear all selections (Esc)">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const availableDriverCount = drivers.filter(d => d.status === "available").length;

  return (
    <div className="space-y-4 animate-slide-up h-full flex flex-col" onClick={() => {
      statusDropdownOpen && setStatusDropdownOpen(false);
      driverDropdownOpen && setDriverDropdownOpen(false);
    }}>
      {selected.size === 0 && filteredLoads.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-blue-500/20 bg-gradient-to-r from-blue-500/8 to-cyan-500/8 animate-slide-up">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-white font-bold text-sm flex items-center gap-2">
                🚀 Quick Bulk Assign
              </div>
              <p className="text-slate-400 text-xs mt-1">Select loads (Ctrl+A) then pick a driver from {availableDriverCount} available</p>
            </div>
            <button
               onClick={selectAll}
               className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all whitespace-nowrap"
               title="Quick-select all loads matching current filters (Ctrl+A)"
             >
               Select All Loads
             </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Dispatch Board</h1>
          <p className="text-slate-400 text-sm mt-0.5">{filteredLoads.length} of {loads.length} loads • {availableDriverCount} drivers available</p>

        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/5">
            <button onClick={() => setView("kanban")} title="Kanban view: Organize loads by status columns for easy drag-and-drop"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${view === "kanban" ? "bg-green-500 text-white" : "text-slate-400 hover:text-white"}`}>
              Kanban
            </button>
            <button onClick={() => setView("list")} title="List view: Detailed table with all load information and quick actions"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${view === "list" ? "bg-green-500 text-white" : "text-slate-400 hover:text-white"}`}>
              List
            </button>
            <button onClick={() => setView("region")} title="Region view: Group loads by transport corridor or destination state"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${view === "region" ? "bg-green-500 text-white" : "text-slate-400 hover:text-white"}`}>
              🗺️ Region
            </button>
            <button onClick={() => setView("calendar")} title="Calendar view: Visualize loads by pickup and delivery dates"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${view === "calendar" ? "bg-green-500 text-white" : "text-slate-400 hover:text-white"}`}>
              📅 Calendar
            </button>
            <button onClick={() => setView("map")} title="Live Map: See all load locations and driver positions in real-time"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${view === "map" ? "bg-green-500 text-white" : "text-slate-400 hover:text-white"}`}>
              <Map className="w-3 h-3" /> Live Map
            </button>
          </div>
          <Link to="/dispatch/marketplace" title="Browse external load board marketplace"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm border border-green-500/30 bg-green-500/15 hover:bg-green-500/25 transition-colors">
            <Layers className="w-4 h-4 text-green-400" /> Marketplace
          </Link>
          <Link to="/loads/new" title="Create a new load and assign it to available drivers"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm"
            style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
            <Plus className="w-4 h-4" /> New Load
          </Link>
        </div>
      </div>

      <DispatchEnterprisePanel loads={filteredLoads} drivers={drivers} trucks={trucks} />

      <DispatchFilters
        filters={filters}
        onChange={setFilters}
        resultCount={filteredLoads.length}
        totalCount={loads.length}
        drivers={drivers}
      />

      {selectionBar}

      {loading ? (
        <div className="flex gap-4">{[1,2,3,4].map(i => <div key={i} className="skeleton flex-1 h-96 rounded-xl" />)}</div>
      ) : view === "region" ? (
        <RegionGroupView loads={filteredLoads} />
      ) : view === "calendar" ? (
        <DispatchCalendar loads={filteredLoads} drivers={drivers} trucks={trucks} />
      ) : view === "map" ? (
        <div className="flex-1">
          <DispatchLiveMap loads={loads} />
        </div>
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map(col => {
            const items = getByStatus(col.key);
            return (
              <div key={col.key} className={`flex-shrink-0 w-72 rounded-xl border ${colColor[col.color]} p-3 flex flex-col`} style={{ minHeight: "400px" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-semibold text-sm ${headerColor[col.color]}`}>{col.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${colColor[col.color]} ${headerColor[col.color]} font-bold`}>{items.length}</span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {items.map(load => {
                    const isSelected = selected.has(load.id);
                    return (
                      <div key={load.id} className="relative group">
                        <Link to={`/loads/${load.id}`}
                          className={`block glass-card rounded-lg p-3 border transition-all duration-150 cursor-pointer pl-9 ${isSelected ? "border-orange-500/40 bg-orange-500/5" : "border-white/5 hover:border-orange-500/20"}`}>
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <span className="text-orange-400 font-mono text-xs font-bold">
                              {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                            </span>
                            <StatusBadge status={load.status} />
                          </div>
                          <div className="text-slate-300 text-xs mb-2 flex items-center gap-1">
                            <span>{load.origin_city}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                            <span>{load.destination_city}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{load.equipment_type || "—"}</span>
                            <span className="text-green-400 font-medium">${(load.rate || 0).toLocaleString()}</span>
                          </div>
                          <LoadProgressBar load={load} />
                        </Link>
                        <button
                           onClick={(e) => toggleSelect(load.id, e)}
                           className="absolute left-2.5 top-3.5 z-10 text-slate-500 hover:text-orange-400 transition-colors"
                           title="Click to select/deselect this load for bulk actions"
                         >
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-orange-400" />
                            : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </button>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-8">No loads</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
          {filteredLoads.length > 0 && (
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/10 bg-white/[0.02]">
              <button onClick={selectAll} className="text-slate-500 hover:text-orange-400 transition-colors" title="Select all visible loads">
                <Square className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500">Select all</span>
            </div>
          )}
          {filteredLoads.map(load => {
            const isSelected = selected.has(load.id);
            return (
              <div key={load.id} className={`relative flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group ${isSelected ? "bg-orange-500/5" : ""}`}>
                <button onClick={(e) => toggleSelect(load.id, e)}
                  className="text-slate-500 hover:text-orange-400 transition-colors flex-shrink-0"
                  title="Select this load for bulk actions">
                  {isSelected ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4" />}
                </button>
                <Link to={`/loads/${load.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-orange-400 font-mono text-xs font-bold mb-1">{load.load_number}</div>
                    <div className="text-white text-sm font-medium truncate">{load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}</div>
                  </div>
                  <StatusBadge status={load.status} />
                  <div className="text-slate-400 text-xs w-24 truncate">{load.equipment_type}</div>
                  <div className="text-green-400 font-bold text-sm w-20 text-right">${(load.rate || 0).toLocaleString()}</div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </Link>
              </div>
            );
          })}
          {filteredLoads.length === 0 && (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No loads found</p>
              <Link to="/loads/new" className="text-green-400 text-sm mt-2 inline-block">Create a load →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
