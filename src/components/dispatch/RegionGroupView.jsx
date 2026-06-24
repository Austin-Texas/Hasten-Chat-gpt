import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, MapPin } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

// Maps US state → transport corridor
export const STATE_TO_CORRIDOR = {
  CT: "I-95 East Coast", DE: "I-95 East Coast", MA: "I-95 East Coast", MD: "I-95 East Coast",
  ME: "I-95 East Coast", NH: "I-95 East Coast", NJ: "I-95 East Coast", NY: "I-95 East Coast",
  PA: "I-95 East Coast", RI: "I-95 East Coast", VT: "I-95 East Coast",
  FL: "I-95 East Coast", GA: "I-95 East Coast", SC: "I-95 East Coast", NC: "I-95 East Coast", VA: "I-95 East Coast",

  CA: "I-5/I-10 West", AZ: "I-10 Southern", NM: "I-10 Southern", TX: "I-10 Southern",
  LA: "I-10 Southern", MS: "I-10 Southern", AL: "I-10 Southern",

  OK: "I-40 Central", AR: "I-40 Central", TN: "I-40 Central",

  NV: "I-80 Northern", UT: "I-80 Northern", WY: "I-80 Northern", NE: "I-80 Northern",
  IA: "I-80 Northern", IL: "I-80 Northern", IN: "I-80 Northern", OH: "I-80 Northern",

  KS: "I-35 Central", MO: "I-35 Central", MN: "I-35 Central",

  OR: "I-5 West Coast", WA: "I-5 West Coast",

  CO: "Mountain West", MT: "Mountain West", ID: "Mountain West",
  WV: "Appalachian", KY: "Appalachian",

  WI: "Great Lakes", MI: "Great Lakes", ND: "Great Lakes", SD: "Great Lakes",
};

export const CORRIDOR_ORDER = [
  "I-95 East Coast",
  "I-10 Southern",
  "I-40 Central",
  "I-80 Northern",
  "I-35 Central",
  "I-5 West Coast",
  "I-5/I-10 West",
  "Mountain West",
  "Appalachian",
  "Great Lakes",
];

export const CORRIDOR_COLORS = {
  "I-95 East Coast":  { border: "border-blue-500/20",    bg: "bg-blue-500/5",    text: "text-blue-400" },
  "I-10 Southern":    { border: "border-orange-500/20",  bg: "bg-orange-500/5",  text: "text-orange-400" },
  "I-40 Central":     { border: "border-purple-500/20",  bg: "bg-purple-500/5",  text: "text-purple-400" },
  "I-80 Northern":     { border: "border-cyan-500/20",    bg: "bg-cyan-500/5",    text: "text-cyan-400" },
  "I-35 Central":     { border: "border-green-500/20",   bg: "bg-green-500/5",   text: "text-green-400" },
  "I-5 West Coast":   { border: "border-teal-500/20",    bg: "bg-teal-500/5",   text: "text-teal-400" },
  "I-5/I-10 West":    { border: "border-teal-500/20",    bg: "bg-teal-500/5",   text: "text-teal-400" },
  "Mountain West":    { border: "border-amber-500/20",   bg: "bg-amber-500/5",   text: "text-amber-400" },
  "Appalachian":      { border: "border-slate-500/20",   bg: "bg-slate-500/5",   text: "text-slate-400" },
  "Great Lakes":      { border: "border-indigo-500/20",  bg: "bg-indigo-500/5",  text: "text-indigo-400" },
};

function getCorridor(state) {
  return state ? (STATE_TO_CORRIDOR[state] || "Other") : "Unknown";
}

export default function RegionGroupView({ loads = [] }) {
  const [groupBy, setGroupBy] = useState("corridor"); // "corridor" | "state"

  const groups = useMemo(() => {
    const map = {};
    loads.forEach(load => {
      const state = load.destination_state || "—";
      let key;
      if (groupBy === "state") {
        key = state;
      } else {
        key = getCorridor(state);
      }
      if (!map[key]) map[key] = [];
      map[key].push(load);
    });
    return map;
  }, [loads, groupBy]);

  const sortedKeys = useMemo(() => {
    const keys = Object.keys(groups);
    if (groupBy === "corridor") {
      return CORRIDOR_ORDER.filter(k => groups[k])
        .concat(keys.filter(k => !CORRIDOR_ORDER.includes(k)))
        .sort((a, b) => groups[b].length - groups[a].length);
    }
    return keys.sort((a, b) => groups[b].length - groups[a].length);
  }, [groups, groupBy]);

  if (loads.length === 0) {
    return (
      <div className="glass-card rounded-xl border border-white/5 p-12 text-center">
        <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No loads to group by region</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group toggle */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Group by:</span>
        <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/5">
          <button
            onClick={() => setGroupBy("corridor")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${groupBy === "corridor" ? "bg-green-500 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Corridor
          </button>
          <button
            onClick={() => setGroupBy("state")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${groupBy === "state" ? "bg-green-500 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Destination State
          </button>
        </div>
        <span className="text-slate-600 text-xs ml-auto">{sortedKeys.length} groups • {loads.length} loads</span>
      </div>

      {/* Region columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedKeys.map(key => {
          const items = groups[key];
          const colors = CORRIDOR_COLORS[key] || { border: "border-slate-500/20", bg: "bg-slate-500/5", text: "text-slate-400" };
          return (
            <div key={key} className={`flex-shrink-0 w-72 rounded-xl border ${colors.border} ${colors.bg} p-3 flex flex-col`} style={{ minHeight: "300px" }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <span className={`font-semibold text-sm ${colors.text} truncate block`}>{key}</span>
                  {groupBy === "corridor" && (
                    <span className="text-slate-600 text-[10px]">
                      {[...new Set(items.map(l => l.destination_state))].filter(Boolean).length} states
                    </span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${colors.border} ${colors.text} font-bold flex-shrink-0`}>
                  {items.length}
                </span>
              </div>

              {/* Load cards */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {items.map(load => (
                  <Link
                    key={load.id}
                    to={`/loads/${load.id}`}
                    className="block glass-card rounded-lg p-3 border border-white/5 hover:border-orange-500/20 transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="text-orange-400 font-mono text-xs font-bold">
                        {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                      </span>
                      <StatusBadge status={load.status} />
                    </div>
                    <div className="text-slate-300 text-xs mb-2 flex items-center gap-1">
                      <span>{load.origin_city}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                      <span>{load.destination_city}, {load.destination_state}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />{load.equipment_type || "—"}
                      </span>
                      <span className="text-green-400 font-medium">${(load.rate || 0).toLocaleString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}