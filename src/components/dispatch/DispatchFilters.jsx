import { useState } from "react";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

const ALL_STATUSES = [
  "available","assigned","accepted","en_route","arrived_pickup",
  "loaded","in_transit","arrived_delivery","delivered","pod_uploaded","completed","cancelled"
];

const STATUS_GROUPS = {
  "Available": ["available"],
  "In Progress": ["assigned","accepted","en_route","arrived_pickup","loaded","in_transit","arrived_delivery"],
  "Completed": ["delivered","pod_uploaded","completed"],
  "Cancelled": ["cancelled"],
};

const EQUIPMENT_TYPES = [
  "Sprinter","Cargo Van","Box Truck","Hot Shot","Gooseneck",
  "Dry Van","Power Only","Flatbed","Car Hauler","Reefer",
  "Step Deck","Conestoga","Final Mile","LTL/Partial","Expedited","White Glove",
];

export const REGIONS = [
  "Northeast","Southeast","Midwest","South Central","Mountain West","West Coast",
];

export const CORRIDORS = [
  "I-95 East Coast","I-10 Southern","I-40 Central","I-80 Northern",
  "I-35 Central","I-5 West Coast","I-5/I-10 West","Mountain West","Appalachian","Great Lakes",
];

export default function DispatchFilters({ filters, onChange, resultCount, totalCount, drivers = [] }) {
  const { search, broker, status, dateFrom, dateTo, equipmentType, driverSearch, region, stateFilter } = filters;
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const set = (key, val) => onChange({ ...filters, [key]: val });

  const hasActive = search || broker || status || dateFrom || dateTo || equipmentType || driverSearch || region || stateFilter;

  const clear = () => onChange({ search: "", broker: "", status: "", dateFrom: "", dateTo: "", equipmentType: "", driverSearch: "", region: "", stateFilter: "" });

  const applyStatusGroup = (group) => {
    const statuses = STATUS_GROUPS[group];
    // If already selected, deselect; otherwise select
    const newStatus = status === statuses[0] ? "" : statuses[0];
    set("status", newStatus);
  };

  return (
    <div className="space-y-3">
      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {/* Keyword search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Load #, city, commodity…"
            value={search}
            onChange={e => set("search", e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-orange-500/40 transition-colors"
          />
          {search && (
            <button onClick={() => set("search", "")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Driver name search */}
        <div className="relative min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Driver name…"
            value={driverSearch}
            onChange={e => set("driverSearch", e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-orange-500/40 transition-colors"
          />
          {driverSearch && (
            <button onClick={() => set("driverSearch", "")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Equipment type filter */}
        <select
          value={equipmentType}
          onChange={e => set("equipmentType", e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500/40 transition-colors min-w-36"
          title="Filter by equipment type"
        >
          <option value="">All Equipment</option>
          {EQUIPMENT_TYPES.map(eq => (
            <option key={eq} value={eq} style={{ background: "#0F1829" }}>{eq}</option>
          ))}
        </select>

        {/* Region / corridor filter */}
        <select
          value={region}
          onChange={e => set("region", e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500/40 transition-colors min-w-36"
          title="Filter by region or transport corridor"
        >
          <option value="">All Regions</option>
          <optgroup label="Corridors">
            {CORRIDORS.map(c => (
              <option key={c} value={c} style={{ background: "#0F1829" }}>{c}</option>
            ))}
          </optgroup>
          <optgroup label="Regions">
            {REGIONS.map(r => (
              <option key={r} value={r} style={{ background: "#0F1829" }}>{r}</option>
            ))}
          </optgroup>
        </select>

        {/* State filter */}
        <input
          type="text"
          placeholder="State (e.g. TX)…"
          value={stateFilter}
          onChange={e => set("stateFilter", e.target.value.toUpperCase().slice(0, 2))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors w-28 uppercase"
          title="Filter by origin or destination state code"
        />

        {/* Broker / company name */}
        <div className="relative min-w-40">
          <input
            type="text"
            placeholder="Broker / client…"
            value={broker}
            onChange={e => set("broker", e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-orange-500/40 transition-colors"
          />
          {broker && (
            <button onClick={() => set("broker", "")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Advanced filters toggle */}
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            advancedOpen || hasActive
              ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Filters
          <ChevronDown className={`w-3 h-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Clear all */}
        {hasActive && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {advancedOpen && (
        <div className="glass-card rounded-xl border border-white/5 p-4 space-y-4 animate-slide-up">
          {/* Status groups */}
          <div>
            <label className="block text-white text-xs font-semibold uppercase tracking-wider mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_GROUPS).map(([group, statuses]) => (
                <button
                  key={group}
                  onClick={() => applyStatusGroup(group)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                    status === statuses[0]
                      ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
            {status && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-slate-500 text-xs">Selected:</span>
                <StatusBadge status={status} />
              </div>
            )}
          </div>

          {/* Detailed status picker */}
          <div>
            <label className="block text-white text-xs font-semibold uppercase tracking-wider mb-2">Or select specific status</label>
            <select
              value={status}
              onChange={e => set("status", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500/40 transition-colors"
            >
              <option value="">All statuses</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s} style={{ background: "#0F1829" }}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-white text-xs font-semibold uppercase tracking-wider mb-2">Pickup Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => set("dateFrom", e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500/40 transition-colors"
                title="From date"
              />
              <span className="text-slate-600 text-xs font-medium">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => set("dateTo", e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500/40 transition-colors"
                title="To date"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { set("dateFrom", ""); set("dateTo", ""); }}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {(dateFrom || dateTo) && (
              <div className="mt-2 text-xs text-slate-400">
                {dateFrom && <span>From {new Date(dateFrom).toLocaleDateString()}</span>}
                {dateFrom && dateTo && <span> — </span>}
                {dateTo && <span>To {new Date(dateTo).toLocaleDateString()}</span>}
              </div>
            )}
          </div>

          {/* Equipment type chips */}
          <div>
            <label className="block text-white text-xs font-semibold uppercase tracking-wider mb-2">Equipment Type</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => set("equipmentType", "")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  !equipmentType
                    ? "bg-green-500/15 border-green-500/30 text-green-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                All Equipment
              </button>
              {EQUIPMENT_TYPES.map(eq => (
                <button
                  key={eq}
                  onClick={() => set("equipmentType", eq)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    equipmentType === eq
                      ? "bg-green-500/15 border-green-500/30 text-green-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result summary */}
      {hasActive && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 px-2">
          <SlidersHorizontal className="w-3 h-3" />
          Showing <span className="text-orange-400 font-medium">{resultCount}</span> of {totalCount} loads
          {driverSearch && <span className="text-slate-400">• Driver: <span className="text-white">{driverSearch}</span></span>}
          {equipmentType && <span className="text-slate-400">• Equipment: <span className="text-green-400">{equipmentType}</span></span>}
          {region && <span className="text-slate-400">• Region: <span className="text-blue-400">{region}</span></span>}
          {stateFilter && <span className="text-slate-400">• State: <span className="text-blue-400">{stateFilter}</span></span>}
          {broker && <span className="text-slate-400">• Broker: <span className="text-white">{broker}</span></span>}
          {status && <StatusBadge status={status} className="ml-1" />}
        </div>
      )}
    </div>
  );
}