import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { Truck, MapPin, AlertCircle } from "lucide-react";

export default function DriverLocationHeatmap({ drivers }) {
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [mapCenter, setMapCenter] = useState([39.8, -98.5]); // US center

  useEffect(() => {
    // Filter drivers with valid locations and active/on_load status
    const driversWithLocations = drivers.filter(d =>
      d.current_lat && d.current_lng && ["on_load", "available"].includes(d.status)
    );

    setActiveDrivers(driversWithLocations);

    // Calculate map center from average location
    if (driversWithLocations.length > 0) {
      const avgLat = driversWithLocations.reduce((s, d) => s + d.current_lat, 0) / driversWithLocations.length;
      const avgLng = driversWithLocations.reduce((s, d) => s + d.current_lng, 0) / driversWithLocations.length;
      setMapCenter([avgLat, avgLng]);
    }
  }, [drivers]);

  // Custom truck icon
  const truckIcon = new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgOGgtM1YzYTEgMSAwIDAgMC0xLTFIN2ExIDEgMCAwIDAtMSAxdjVIMlYzaDJ2NUg0djZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0ydi02ek03IDRoOHY0SDd2LTR6bTAgMTRhMiAyIDAgMSAxLTQgMCAyIDIgMCAwIDEgNCAwem04IDBhMiAyIDAgMSAxLTQgMCAyIDIgMCAwIDEgNCAweiIgZmlsbD0iI0VBNTgwQyIvPjwvc3ZnPg==",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });

  if (activeDrivers.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 border border-white/5 text-center">
        <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No drivers with active locations</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-semibold text-sm">Driver Location Heatmap</h3>
        </div>
        <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/25 px-2 py-1 rounded">
          {activeDrivers.length} Active
        </span>
      </div>

      {/* Map */}
      <div className="h-96 w-full relative bg-slate-900">
        <MapContainer center={mapCenter} zoom={4} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />

          {/* Driver density circles (heatmap alternative) */}
          {activeDrivers.map(driver => (
            <CircleMarker
              key={`circle-${driver.id}`}
              center={[driver.current_lat, driver.current_lng]}
              radius={driver.status === "on_load" ? 10 : 6}
              fillColor={driver.status === "on_load" ? "#EA580C" : "#22C55E"}
              fillOpacity={0.6}
              stroke={true}
              color={driver.status === "on_load" ? "#F97316" : "#16A34A"}
              weight={2}
            />
          ))}

          {/* Individual driver markers */}
          {activeDrivers.map(driver => (
            <Marker
              key={driver.id}
              position={[driver.current_lat, driver.current_lng]}
              icon={truckIcon}
            >
              <Popup className="text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">
                    {driver.first_name} {driver.last_name}
                  </div>
                  <div className="text-slate-700">
                    <span className="text-[10px]">{driver.current_city}, {driver.current_state}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-600">
                    <span className={driver.status === "on_load" ? "text-green-600 font-semibold" : "text-blue-600"}>
                      {driver.status === "on_load" ? "● On Load" : "● Available"}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend & Stats */}
      <div className="p-4 border-t border-white/5 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm font-semibold text-white">
            {activeDrivers.filter(d => d.status === "on_load").length}
          </div>
          <div className="text-xs text-slate-500">On Load</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">
            {activeDrivers.filter(d => d.status === "available").length}
          </div>
          <div className="text-xs text-slate-500">Available</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">
            {activeDrivers.length}
          </div>
          <div className="text-xs text-slate-500">Total Visible</div>
        </div>
      </div>
    </div>
  );
}