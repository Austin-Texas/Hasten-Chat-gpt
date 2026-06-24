import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Truck, Search, Navigation, Clock, RefreshCw, User } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import HastenMap from "@/components/maps/HastenMap";

const ACTIVE_STATUSES = ["in_transit","en_route","arrived_pickup","loaded","arrived_delivery","accepted"];

// Deterministic pseudo-position for a driver based on their ID (for display when no real GPS)
function pseudoPos(id, seed = 0) {
  let h = seed;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const x = 10 + (Math.abs(h) % 80);
  const y = 15 + (Math.abs(h >> 8) % 70);
  return { x, y };
}

export default function Tracking() {
  const [loads, setLoads]       = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [trucks, setTrucks]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [allLoads, allDrivers, allTrucks] = await Promise.all([
        base44.entities.Load.list("-updated_date", 100),
        base44.entities.Driver.list("-updated_date", 100),
        base44.entities.Truck.list("-updated_date", 50),
      ]);
      setLoads(allLoads.filter(l => ACTIVE_STATUSES.includes(l.status)));
      setDrivers(allDrivers.filter(d => d.status === "on_load" || d.status === "available"));
      setTrucks(allTrucks.filter(t => t.status === "active"));
      setLastRefresh(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Update selected load when data refreshes
  useEffect(() => {
    if (selected) {
      const updated = loads.find(l => l.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [loads]);

  const filtered = loads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.load_number || "").toLowerCase().includes(q) ||
      (l.origin_city || "").toLowerCase().includes(q) ||
      (l.destination_city || "").toLowerCase().includes(q);
  });

  // Drivers with real or pseudo GPS positions
  const driverPins = drivers.map((d, i) => {
    const hasGPS = d.current_lat && d.current_lng;
    // Map real lat/lng to SVG % (approximate US bbox: lat 25-49, lng -125 to -65)
    let x, y;
    if (hasGPS) {
      x = ((d.current_lng + 125) / 60) * 100;
      y = ((49 - d.current_lat) / 24) * 100;
      x = Math.max(5, Math.min(95, x));
      y = Math.max(5, Math.min(95, y));
    } else {
      const pos = pseudoPos(d.id, i);
      x = pos.x; y = pos.y;
    }
    const load = loads.find(l => l.driver_id === d.id);
    return { driver: d, x, y, hasGPS, load };
  });

  return (
    <div className="flex gap-0 h-full -m-4 lg:-m-6 animate-slide-up overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/5 overflow-hidden"
        style={{ background: "hsl(var(--sidebar-background))" }}>

        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-white font-heading font-bold text-lg">Live Tracking</h1>
            <button onClick={() => fetchData(true)} disabled={refreshing}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-400" : ""}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="text" placeholder="Search loads…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40" />
          </div>
        </div>

        {/* Stats bar */}
        <div className="px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-slate-400">{filtered.length} loads active</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-orange-400" />{trucks.length}</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3 text-blue-400" />{drivers.length}</span>
            </div>
          </div>
        </div>

        {/* Load list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-lg" />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No active loads</p>
            </div>
          ) : filtered.map(load => {
            const driver = drivers.find(d => d.id === load.driver_id);
            return (
              <button key={load.id} onClick={() => setSelected(load)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                  selected?.id === load.id
                    ? "border-orange-500/30 bg-orange-500/8"
                    : "border-white/5 bg-white/2 hover:border-orange-500/15 hover:bg-white/4"
                }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-orange-400 font-mono text-xs font-bold">{load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}</span>
                  <StatusBadge status={load.status} />
                </div>
                <div className="text-white text-xs font-medium flex items-center gap-1 mb-1">
                  <span className="truncate">{load.origin_city}</span>
                  <span className="text-slate-600 flex-shrink-0">→</span>
                  <span className="truncate">{load.destination_city}</span>
                </div>
                {driver && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-4 h-4 rounded-full bg-orange-500/15 flex items-center justify-center">
                      <span className="text-orange-400 text-[8px] font-bold">{driver.first_name?.[0]}</span>
                    </div>
                    <span>{driver.first_name} {driver.last_name}</span>
                    {driver.current_lat ? (
                      <span className="text-green-400 ml-auto flex items-center gap-1">
                        ●{" "}
                        {driver.last_location_update
                          ? (() => {
                              const ago = Math.round((Date.now() - new Date(driver.last_location_update)) / 1000);
                              return ago < 60 ? `${ago}s ago` : `${Math.round(ago/60)}m ago`;
                            })()
                          : "GPS"}
                      </span>
                    ) : null}
                  </div>
                )}
                {load.eta && (
                  <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>ETA {new Date(load.eta).toLocaleDateString()}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Last refresh */}
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-slate-600 text-xs">Updated {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · auto-refresh 30s</p>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Real Leaflet map */}
        <HastenMap
          center={
            selected && drivers.find(d => d.id === selected.driver_id)?.current_lat
              ? [drivers.find(d => d.id === selected.driver_id).current_lat, drivers.find(d => d.id === selected.driver_id).current_lng]
              : [39.5, -98.35]
          }
          zoom={selected && drivers.find(d => d.id === selected.driver_id)?.current_lat ? 8 : 4}
          height="100%"
          driverMarkers={driverPins.map(pin => ({
            id: pin.driver.id,
            lat: pin.driver.current_lat,
            lng: pin.driver.current_lng,
            label: `${pin.driver.first_name} ${pin.driver.last_name}${pin.load ? " · " + (pin.load.load_number || pin.load.id?.slice(-6)) : ""}`,
            hasGPS: pin.hasGPS,
            speed: pin.driver.speed,
            isSelected: selected && pin.load?.id === selected.id,
            lastUpdate: pin.driver.last_location_update,
          }))}
          pickupMarker={selected ? {
            lat: selected.origin_lat,
            lng: selected.origin_lng,
            label: `${selected.origin_address || ""} ${selected.origin_city}, ${selected.origin_state}`,
          } : null}
          deliveryMarker={selected ? {
            lat: selected.destination_lat,
            lng: selected.destination_lng,
            label: `${selected.destination_address || ""} ${selected.destination_city}, ${selected.destination_state}`,
          } : null}
          geofenceRadius={500}
          onDriverClick={(driverId) => {
            const load = filtered.find(l => l.driver_id === driverId);
            if (load) setSelected(load);
          }}
        />

        {/* Overlay: stats */}
        <div className="absolute top-3 left-3 z-[1000] flex gap-2 flex-wrap pointer-events-none">
          <div className="glass-card rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-xs font-medium">{filtered.length} Active Loads</span>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2">
            <span className="text-green-400 text-xs">{driverPins.filter(p => p.hasGPS).length} GPS live</span>
          </div>
          {refreshing && (
            <div className="glass-card rounded-xl px-3 py-2 border border-orange-500/20 flex items-center gap-2 pointer-events-auto">
              <RefreshCw className="w-3 h-3 text-orange-400 animate-spin" />
              <span className="text-orange-400 text-xs">Updating…</span>
            </div>
          )}
        </div>

        {/* Selected load info panel */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-xl">
            <div className="glass-card rounded-2xl p-4 border border-orange-500/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-orange-400 font-mono font-bold text-sm">{selected.load_number || `#LD${selected.id?.slice(-6).toUpperCase()}`}</span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="text-white text-sm flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span className="truncate">{selected.origin_city}, {selected.origin_state}</span>
                    <span className="text-slate-600 flex-shrink-0">→</span>
                    <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    <span className="truncate">{selected.destination_city}, {selected.destination_state}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    {selected.eta && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" /> ETA: {new Date(selected.eta).toLocaleString()}
                      </span>
                    )}
                    {selected.miles && <span className="text-slate-500">{selected.miles} mi</span>}
                    {(() => {
                      const driver = drivers.find(d => d.id === selected.driver_id);
                      return driver ? (
                        <span className="flex items-center gap-1 text-slate-400">
                          <User className="w-3 h-3" /> {driver.first_name} {driver.last_name}
                          {driver.current_lat && <span className="text-green-400 ml-1">● GPS Live</span>}
                        </span>
                      ) : null;
                    })()}
                    <span className="text-green-400 font-bold">${(selected.rate || 0).toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-sm transition-colors flex-shrink-0">✕</button>
              </div>
            </div>
          </div>
        )}

        {!loading && !selected && filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
            <div className="text-center">
              <Navigation className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">No active loads in transit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}