import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Package, Truck, CheckCircle, Clock, AlertCircle, Search } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import HastenMap from "@/components/maps/HastenMap";

const LOAD_STATUS_SEQUENCE = [
  "available", "assigned", "accepted", "en_route",
  "arrived_pickup", "loaded", "in_transit", "arrived_delivery", "delivered", "pod_uploaded", "completed"
];

export default function ClientTracking({ client }) {
  const [loads, setLoads] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [manifests, setManifests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState(null);

  useEffect(() => {
    if (!client?.id) return;

    const fetchData = async () => {
      try {
        const clientLoads = await base44.entities.Load.filter(
          { client_id: client.id },
          "-created_date",
          100
        );
        setLoads(clientLoads);

        // Auto-select first in-transit load
        const active = clientLoads.find(l => ["en_route", "in_transit", "arrived_delivery"].includes(l.status));
        if (active) {
          setSelectedLoad(active);
          fetchManifests(active.id);
          if (active.driver_id) {
            base44.entities.Driver.filter({ id: active.driver_id }, "-created_date", 1)
              .then(res => setDriver(res[0] || null)).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Error fetching loads:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const unsub = base44.entities.Load.subscribe(() => fetchData());
    return () => unsub();
  }, [client?.id]);

  const fetchManifests = async (loadId) => {
    try {
      const events = await base44.entities.Manifest.filter(
        { load_id: loadId },
        "-created_date",
        50
      );
      setManifests(events);
    } catch (err) {
      console.error("Error fetching manifests:", err);
    }
  };

  const handleLoadSelect = (load) => {
    setSelectedLoad(load);
    fetchManifests(load.id);
    if (load.driver_id) {
      base44.entities.Driver.filter({ id: load.driver_id }, "-created_date", 1)
        .then(res => setDriver(res[0] || null)).catch(() => {});
    } else {
      setDriver(null);
    }
  };

  const filteredLoads = loads.filter(l =>
    (l.load_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.origin_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.destination_city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLoadProgress = (status) => {
    const idx = LOAD_STATUS_SEQUENCE.indexOf(status);
    return idx >= 0 ? Math.round((idx / LOAD_STATUS_SEQUENCE.length) * 100) : 0;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Track Shipments</h1>
        <p className="text-slate-400 text-sm mt-0.5">Real-time tracking of your active loads</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loads List */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl border border-white/5 flex flex-col h-[600px]">
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search loads..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : filteredLoads.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No shipments found</div>
              ) : (
                filteredLoads.map(load => (
                  <button
                    key={load.id}
                    onClick={() => handleLoadSelect(load)}
                    className={`w-full text-left p-4 hover:bg-white/5 transition-colors border-l-2 ${
                      selectedLoad?.id === load.id
                        ? "bg-orange-500/10 border-l-orange-500"
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Package className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-mono text-sm font-bold">{load.load_number}</div>
                        <div className="text-slate-400 text-xs mt-1 truncate">{load.origin_city} → {load.destination_city}</div>
                        <div className="mt-2">
                          <StatusBadge status={load.status} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Load Details & Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {selectedLoad ? (
            <>
              {/* Live Map */}
              <div className="glass-card rounded-xl border border-white/5 overflow-hidden" style={{ height: 260 }}>
                <HastenMap
                  center={
                    driver?.current_lat ? [driver.current_lat, driver.current_lng] :
                    [39.5, -98.35]
                  }
                  zoom={driver?.current_lat ? 8 : 4}
                  height="260px"
                  driverMarkers={driver?.current_lat ? [{
                    id: driver.id,
                    lat: driver.current_lat,
                    lng: driver.current_lng,
                    label: `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver",
                    hasGPS: !!driver.current_lat,
                    isSelected: true,
                    lastUpdate: driver.last_location_update,
                  }] : []}
                  pickupMarker={selectedLoad.origin_lat ? {
                    lat: selectedLoad.origin_lat,
                    lng: selectedLoad.origin_lng,
                    label: `${selectedLoad.origin_city}, ${selectedLoad.origin_state}`,
                  } : null}
                  deliveryMarker={selectedLoad.destination_lat ? {
                    lat: selectedLoad.destination_lat,
                    lng: selectedLoad.destination_lng,
                    label: `${selectedLoad.destination_city}, ${selectedLoad.destination_state}`,
                  } : null}
                  geofenceRadius={300}
                />
              </div>

              {/* Load Header */}
              <div className="glass-card rounded-xl border border-white/5 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">{selectedLoad.load_number}</h2>
                    <p className="text-slate-400 text-sm mt-1">
                      {selectedLoad.origin_city}, {selectedLoad.origin_state} → {selectedLoad.destination_city}, {selectedLoad.destination_state}
                    </p>
                  </div>
                  <StatusBadge status={selectedLoad.status} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Equipment</div>
                    <div className="text-white text-sm font-medium">{selectedLoad.equipment_type}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Distance</div>
                    <div className="text-white text-sm font-medium">{selectedLoad.miles} miles</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {selectedLoad.eta && (
                    <div className="bg-white/3 rounded-lg p-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <div>
                        <div className="text-slate-400 text-xs">ETA</div>
                        <div className="text-white text-sm font-medium">
                          {new Date(selectedLoad.eta).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )}
                  {driver?.last_location_update && (
                    <div className="bg-white/3 rounded-lg p-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                      <div>
                        <div className="text-slate-400 text-xs">Last GPS Update</div>
                        <div className="text-white text-sm font-medium">
                          {new Date(driver.last_location_update).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Alert banners from manifest */}
                {manifests.filter(m => m.event_title?.includes("Deviation") || m.event_title?.includes("Idle")).slice(0, 2).map(alert => (
                  <div key={alert.id} className="bg-amber-500/8 border border-amber-500/20 rounded-lg p-2.5 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="text-amber-400 text-xs font-semibold">{alert.event_title}</span>
                      <span className="text-slate-500 text-xs ml-2">{new Date(alert.event_timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}

                {/* Customer-Safe Documents */}
                <div className="space-y-2">
                  <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Documents</h3>
                  <div className="flex gap-2 flex-wrap">
                    {selectedLoad.bol_url && (
                      <a href={selectedLoad.bol_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 text-xs font-medium transition-colors">
                        📋 BOL
                      </a>
                    )}
                    {selectedLoad.pod_url && (
                      <a href={selectedLoad.pod_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 text-xs font-medium transition-colors">
                        ✓ POD
                      </a>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-xs uppercase tracking-wider">Progress</span>
                    <span className="text-orange-400 text-xs font-bold">{getLoadProgress(selectedLoad.status)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                      style={{ width: `${getLoadProgress(selectedLoad.status)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="glass-card rounded-xl border border-white/5 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  Activity Timeline
                </h3>

                {manifests.length === 0 ? (
                  <p className="text-slate-500 text-sm">No tracking events yet</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {manifests.map((event, idx) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-orange-500 mt-1.5" />
                          {idx < manifests.length - 1 && <div className="w-0.5 h-8 bg-white/10 my-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-white text-sm font-medium capitalize">
                                {event.event_type?.replace(/_/g, " ") || event.event_title}
                              </div>
                              {event.location_city && (
                                <div className="text-slate-400 text-xs mt-0.5">
                                  {event.location_city}, {event.location_state}
                                </div>
                              )}
                              {event.event_description && (
                                <div className="text-slate-500 text-xs mt-1">{event.event_description}</div>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs whitespace-nowrap">
                              {new Date(event.event_timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl border border-white/5 p-12 text-center">
              <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">Select a shipment to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}