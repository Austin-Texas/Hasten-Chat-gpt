import { useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Navigation, NavigationOff, Signal } from "lucide-react";
import useGPS from "@/hooks/useGPS";

const GEOFENCE_RADIUS_M = 300; // trigger geofence within 300m of pickup/delivery

function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

export default function GPSTracker({ driverId, loadId, load, onPositionUpdate }) {
  const [enabled, setEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Track which geofences have been triggered to avoid spamming
  const triggeredGeofences = useRef(new Set());
  // Track point counter — only log every 3rd update to database (≈45s intervals)
  const trackCounter = useRef(0);

  const handleUpdate = useCallback(async (pos) => {
    setLastUpdate(new Date());
    trackCounter.current += 1;

    // 1. Update driver current position
    if (driverId) {
      base44.entities.Driver.update(driverId, {
        current_lat: pos.lat,
        current_lng: pos.lng,
        last_location_update: new Date().toISOString(),
      }).catch(() => {});
    }

    // 2. Log track point every 3rd update (~45s)
    if (driverId && trackCounter.current % 3 === 0) {
      base44.entities.GPSTrackPoint.create({
        driver_id: driverId,
        load_id: loadId || undefined,
        lat: pos.lat,
        lng: pos.lng,
        speed: pos.speed != null ? Math.round(pos.speed * 2.237) : undefined, // m/s → mph
        heading: pos.heading != null ? Math.round(pos.heading) : undefined,
        accuracy: pos.accuracy != null ? Math.round(pos.accuracy) : undefined,
        timestamp: new Date().toISOString(),
        event_type: "track",
      }).catch(() => {});
    }

    // 3. Geofence checks
    if (load && loadId) {
      const checkGeofence = async (markerLat, markerLng, label, eventType) => {
        if (!markerLat || !markerLng) return;
        const dist = haversine({ lat: pos.lat, lng: pos.lng }, { lat: markerLat, lng: markerLng });
        const key = `${eventType}-${loadId}`;
        const isInside = dist < GEOFENCE_RADIUS_M;

        if (isInside && !triggeredGeofences.current.has(key)) {
          triggeredGeofences.current.add(key);
          // Log manifest event
          await base44.entities.Manifest.create({
            load_id: loadId,
            event_type: "note_added",
            event_title: label,
            event_description: `Driver arrived within ${Math.round(dist)}m`,
            event_timestamp: new Date().toISOString(),
            performed_by: driverId,
            performed_by_role: "driver",
            lat: pos.lat,
            lng: pos.lng,
            is_system_event: true,
          }).catch(() => {});
          // Log GPS track point with geofence event type
          base44.entities.GPSTrackPoint.create({
            driver_id: driverId,
            load_id: loadId,
            lat: pos.lat,
            lng: pos.lng,
            timestamp: new Date().toISOString(),
            event_type: "geofence_arrival",
            notes: label,
          }).catch(() => {});
        } else if (!isInside && triggeredGeofences.current.has(key)) {
          // Driver departed the geofence
          triggeredGeofences.current.delete(key);
        }
      };

      checkGeofence(load.origin_lat, load.origin_lng, "Arrived at Pickup", "pickup_arrival");
      checkGeofence(load.destination_lat, load.destination_lng, "Arrived at Delivery", "delivery_arrival");

      // 4. Dynamic ETA recalculation
      if (load.destination_lat && load.destination_lng && trackCounter.current % 6 === 0) {
        const distToDestM = haversine({ lat: pos.lat, lng: pos.lng }, { lat: load.destination_lat, lng: load.destination_lng });
        const distToDestMiles = distToDestM / 1609.34;
        const speedMph = pos.speed != null ? pos.speed * 2.237 : 55; // m/s → mph, default 55
        const avgSpeed = Math.max(speedMph, 20); // floor at 20 mph
        const etaHours = distToDestMiles / avgSpeed;
        const newEta = new Date(Date.now() + etaHours * 3600000).toISOString();
        base44.entities.Load.update(loadId, { eta: newEta }).catch(() => {});
      }
    }

    onPositionUpdate?.(pos);
  }, [driverId, loadId, load, onPositionUpdate]);

  const { position, error, isTracking } = useGPS({ driverId, loadId, onUpdate: handleUpdate, enabled });

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
      isTracking ? "bg-green-500/8 border-green-500/20" : "bg-white/5 border-white/10"
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isTracking ? "bg-green-500/15" : "bg-white/5"
      }`}>
        {isTracking
          ? <Signal className="w-4 h-4 text-green-400 animate-pulse" />
          : <NavigationOff className="w-4 h-4 text-slate-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${isTracking ? "text-green-400" : "text-slate-400"}`}>
          {isTracking ? "GPS Tracking Active" : "GPS Tracking Off"}
        </div>
        {position && lastUpdate && (
          <div className="text-slate-500 text-xs">
            {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
            {position.speed != null && ` · ${Math.round(position.speed * 2.237)} mph`}
            {` · ${lastUpdate.toLocaleTimeString()}`}
          </div>
        )}
        {error && <div className="text-red-400 text-xs">{error}</div>}
      </div>
      <button
        onClick={() => setEnabled(e => !e)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
          isTracking
            ? "bg-red-500/15 border border-red-500/20 text-red-400"
            : "bg-green-500/15 border border-green-500/20 text-green-400"
        }`}
      >
        {isTracking ? "Stop" : "Start"}
      </button>
    </div>
  );
}