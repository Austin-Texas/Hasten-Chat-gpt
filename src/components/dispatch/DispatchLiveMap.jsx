import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Truck, MapPin, Navigation, Clock, RefreshCw, Wifi } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

// US bounding box for normalizing lat/lng to SVG coords
const MAP_BOUNDS = { minLat: 24, maxLat: 49, minLng: -125, maxLng: -66 };

function latLngToXY(lat, lng, width, height) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;
  return { x, y };
}

// Rough US state/highway background paths (simplified)
const US_OUTLINE = "M 80,60 L 85,55 L 110,52 L 130,48 L 160,46 L 200,44 L 240,43 L 280,44 L 310,46 L 340,50 L 360,52 L 380,58 L 390,65 L 395,75 L 390,85 L 380,90 L 370,95 L 360,100 L 350,110 L 345,125 L 350,140 L 355,150 L 350,158 L 340,162 L 320,165 L 300,168 L 280,170 L 260,172 L 240,172 L 220,170 L 200,168 L 180,165 L 160,162 L 140,158 L 120,152 L 105,145 L 95,135 L 88,120 L 82,105 L 78,90 L 78,75 Z";

const STATUS_COLORS = {
  en_route: "#EA580C",
  in_transit: "#F97316",
  arrived_pickup: "#EAB308",
  loaded: "#F59E0B",
  arrived_delivery: "#22C55E",
  delivered: "#22C55E",
  assigned: "#3B82F6",
  accepted: "#8B5CF6",
};

export default function DispatchLiveMap({ loads }) {
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const svgRef = useRef(null);
  const [svgSize, setSvgSize] = useState({ w: 800, h: 500 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSvgSize({ w: width, h: height });
    });
    if (svgRef.current) obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  const fetchPositions = async () => {
    setRefreshing(true);
    try {
      const [driverData, truckData] = await Promise.all([
        base44.entities.Driver.filter({ status: "on_load" }, "-updated_date", 50),
        base44.entities.Truck.filter({ status: "active" }, "-updated_date", 50),
      ]);
      setDrivers(driverData.filter(d => d.current_lat && d.current_lng));
      setTrucks(truckData.filter(t => t.current_lat && t.current_lng));
      setLastUpdate(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Active loads with driver info
  const activeLoads = loads.filter(l =>
    ["assigned", "accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery"].includes(l.status)
  );

  // Build driver lookup by driver entity id and user id
  const driverByUserId = Object.fromEntries(drivers.map(d => [d.user_id, d]));
  const driverById = Object.fromEntries(drivers.map(d => [d.id, d]));

  // Map load → driver position
  const loadMarkers = activeLoads.map(load => {
    const driver = driverById[load.driver_id] || driverByUserId[load.driver_id];
    if (!driver?.current_lat || !driver?.current_lng) return null;
    const pos = latLngToXY(driver.current_lat, driver.current_lng, svgSize.w, svgSize.h);
    return { load, driver, pos };
  }).filter(Boolean);

  // Truck markers (those not already shown via load)
  const loadDriverIds = new Set(loadMarkers.map(m => m.driver?.id));
  const truckMarkers = trucks
    .filter(t => t.driver_id && !loadDriverIds.has(t.driver_id))
    .map(t => ({ truck: t, pos: latLngToXY(t.current_lat, t.current_lng, svgSize.w, svgSize.h) }));

  const selectedLoad = selected ? loads.find(l => l.id === selected) : null;
  const selectedMarker = loadMarkers.find(m => m.load.id === selected);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-white/5 relative"
      style={{ background: "linear-gradient(160deg, #060D1A 0%, #0A1628 60%, #08111F 100%)", minHeight: "520px" }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0"
        style={{ background: "rgba(10,22,40,0.8)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${refreshing ? "bg-amber-400 animate-pulse" : "bg-green-400 animate-pulse"}`} />
          <span className="text-white text-sm font-semibold">Live Fleet Map</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 ml-1">
          <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-orange-400" /> {loadMarkers.length + truckMarkers.length} tracked</span>
          <span className="flex items-center gap-1"><Navigation className="w-3 h-3 text-blue-400" /> {activeLoads.length} active loads</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Updated {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchPositions}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Refresh positions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Map SVG */}
      <div ref={svgRef} className="flex-1 relative overflow-hidden">
        <svg width="100%" height="100%" className="absolute inset-0">
          {/* Grid */}
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i / 14) * 100}%`} x2="100%" y2={`${(i / 14) * 100}%`} stroke="#0f2040" strokeWidth="1" />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={`${(i / 20) * 100}%`} y1="0" x2={`${(i / 20) * 100}%`} y2="100%" stroke="#0f2040" strokeWidth="1" />
          ))}

          {/* Major highway lines (decorative) */}
          <line x1="15%" y1="35%" x2="85%" y2="38%" stroke="#1a3050" strokeWidth="3" strokeLinecap="round" />
          <line x1="12%" y1="55%" x2="88%" y2="52%" stroke="#1a3050" strokeWidth="3" strokeLinecap="round" />
          <line x1="30%" y1="15%" x2="35%" y2="85%" stroke="#1a3050" strokeWidth="2" strokeLinecap="round" />
          <line x1="60%" y1="12%" x2="62%" y2="88%" stroke="#1a3050" strokeWidth="2" strokeLinecap="round" />
          <line x1="75%" y1="10%" x2="78%" y2="85%" stroke="#1a3050" strokeWidth="2" strokeLinecap="round" />

          {/* Route lines for each active load with GPS position */}
          {loadMarkers.map(({ load, pos }) => {
            const color = STATUS_COLORS[load.status] || "#64748b";
            return (
              <g key={`route-${load.id}`}>
                <line
                  x1={pos.x} y1={pos.y}
                  x2={pos.x + 40} y2={pos.y - 30}
                  stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.3"
                />
              </g>
            );
          })}

          {/* Truck markers for loads with driver GPS */}
          {loadMarkers.map(({ load, driver, pos }) => {
            const color = STATUS_COLORS[load.status] || "#EA580C";
            const isSelected = selected === load.id;
            return (
              <g key={load.id} onClick={() => setSelected(isSelected ? null : load.id)} style={{ cursor: "pointer" }}>
                {/* Pulse ring */}
                <circle cx={pos.x} cy={pos.y} r={isSelected ? 28 : 20} fill="none" stroke={color} strokeWidth="1.5" opacity="0.3">
                  <animate attributeName="r" values={`${isSelected ? 28 : 18};${isSelected ? 36 : 26};${isSelected ? 28 : 18}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Dot */}
                <circle cx={pos.x} cy={pos.y} r={isSelected ? 10 : 7} fill={color} opacity="0.9" />
                {isSelected && <circle cx={pos.x} cy={pos.y} r="10" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />}
                {/* Truck icon text */}
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="9" fill="white" style={{ pointerEvents: "none", userSelect: "none" }}>🚛</text>
                {/* Label */}
                <rect x={pos.x - 24} y={pos.y - 26} width="48" height="14" rx="4" fill="rgba(10,22,40,0.85)" />
                <text x={pos.x} y={pos.y - 16} textAnchor="middle" fontSize="8" fill={color} fontFamily="monospace" fontWeight="bold" style={{ pointerEvents: "none" }}>
                  {load.load_number || `LD${load.id?.slice(-4).toUpperCase()}`}
                </text>
              </g>
            );
          })}

          {/* Standalone truck markers (no active load) */}
          {truckMarkers.map(({ truck, pos }) => (
            <g key={truck.id}>
              <circle cx={pos.x} cy={pos.y} r="6" fill="#3B82F6" opacity="0.7" />
              <text x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize="8" fill="white" style={{ pointerEvents: "none" }}>🚚</text>
            </g>
          ))}

          {/* Fallback — show dummy positions if no GPS data */}
          {loadMarkers.length === 0 && activeLoads.slice(0, 6).map((load, i) => {
            // Distribute evenly across map for visual
            const dummyPositions = [
              { x: svgSize.w * 0.18, y: svgSize.h * 0.45 },
              { x: svgSize.w * 0.38, y: svgSize.h * 0.32 },
              { x: svgSize.w * 0.55, y: svgSize.h * 0.58 },
              { x: svgSize.w * 0.70, y: svgSize.h * 0.38 },
              { x: svgSize.w * 0.82, y: svgSize.h * 0.65 },
              { x: svgSize.w * 0.28, y: svgSize.h * 0.70 },
            ];
            const pos = dummyPositions[i] || { x: svgSize.w * 0.5, y: svgSize.h * 0.5 };
            const color = STATUS_COLORS[load.status] || "#EA580C";
            const isSelected = selected === load.id;
            return (
              <g key={load.id} onClick={() => setSelected(isSelected ? null : load.id)} style={{ cursor: "pointer" }}>
                <circle cx={pos.x} cy={pos.y} r="18" fill="none" stroke={color} strokeWidth="1.5" opacity="0.25">
                  <animate attributeName="r" values="16;24;16" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                </circle>
                <circle cx={pos.x} cy={pos.y} r={isSelected ? 10 : 7} fill={color} opacity="0.85" />
                {isSelected && <circle cx={pos.x} cy={pos.y} r="10" fill="none" stroke="white" strokeWidth="2" />}
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="9" fill="white" style={{ pointerEvents: "none" }}>🚛</text>
                <rect x={pos.x - 24} y={pos.y - 26} width="48" height="14" rx="4" fill="rgba(10,22,40,0.85)" />
                <text x={pos.x} y={pos.y - 16} textAnchor="middle" fontSize="8" fill={color} fontFamily="monospace" fontWeight="bold" style={{ pointerEvents: "none" }}>
                  {load.load_number || `LD${load.id?.slice(-4).toUpperCase()}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5">
          {Object.entries({ "En Route": "#EA580C", "In Transit": "#F97316", "At Pickup": "#EAB308", "Delivered": "#22C55E", "Assigned": "#3B82F6" }).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs" style={{ background: "rgba(6,13,26,0.75)" }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        {/* No GPS notice */}
        {activeLoads.length > 0 && loadMarkers.length === 0 && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-amber-500/20 bg-amber-500/5 text-amber-400">
              <Wifi className="w-3 h-3" /> Positions estimated — awaiting GPS from drivers
            </div>
          </div>
        )}

        {/* Empty state */}
        {activeLoads.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Truck className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No active loads on the road</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected load detail panel */}
      {(selectedLoad || (selected && activeLoads.find(l => l.id === selected))) && (() => {
        const load = selectedLoad || activeLoads.find(l => l.id === selected);
        const driver = selectedMarker?.driver;
        const color = STATUS_COLORS[load.status] || "#EA580C";
        return (
          <div className="flex-shrink-0 border-t border-white/5 p-4" style={{ background: "rgba(10,22,40,0.9)" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                  <Truck className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-400 font-mono font-bold text-sm">{load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}</span>
                    <StatusBadge status={load.status} />
                  </div>
                  <div className="text-white text-sm flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{load.origin_city}, {load.origin_state}</span>
                    <span className="text-slate-600">→</span>
                    <MapPin className="w-3 h-3 text-orange-400" />
                    <span>{load.destination_city}, {load.destination_state}</span>
                  </div>
                  {driver && (
                    <div className="text-slate-500 text-xs mt-1">
                      Driver: {driver.first_name} {driver.last_name}
                      {driver.current_city && ` · Now near ${driver.current_city}, ${driver.current_state}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-green-400 font-bold">${(load.rate || 0).toLocaleString()}</div>
                {load.miles && <div className="text-slate-500 text-xs">{load.miles} mi</div>}
                {load.delivery_date && (
                  <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(load.delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white transition-colors text-sm mt-0.5">✕</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}