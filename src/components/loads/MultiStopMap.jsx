import { useMemo } from "react";
import HastenMap from "@/components/maps/HastenMap";
import { MapPin } from "lucide-react";

export default function MultiStopMap({ stops = [], selectedStopIdx = null, onStopClick = () => {} }) {
  // Calculate map center from all stops
  const mapCenter = useMemo(() => {
    if (stops.length === 0) return [39.5, -98.35]; // USA center
    const lats = stops.filter(s => s.latitude).map(s => s.latitude);
    const lngs = stops.filter(s => s.longitude).map(s => s.longitude);
    if (lats.length === 0) return [39.5, -98.35];
    const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
    return [centerLat, centerLng];
  }, [stops]);

  // Convert stops to map markers
  const markers = useMemo(() => {
    return stops
      .filter(s => s.latitude && s.longitude)
      .map((stop, idx) => ({
        id: stop.id || `stop-${idx}`,
        lat: stop.latitude,
        lng: stop.longitude,
        label: `Stop ${stop.stop_number}: ${stop.facility_name || `${stop.city}, ${stop.state}`}`,
        isPickup: stop.stop_type === "pickup",
        isDelivery: stop.stop_type === "delivery",
        stopNumber: stop.stop_number,
        isSelected: idx === selectedStopIdx,
        onClick: () => onStopClick(idx),
      }));
  }, [stops, selectedStopIdx, onStopClick]);

  // Separate pickup and delivery markers for rendering
  const pickupMarkers = markers.filter(m => m.isPickup);
  const deliveryMarkers = markers.filter(m => m.isDelivery);

  // Create a polyline-compatible path for route visualization
  const routePath = stops
    .filter(s => s.latitude && s.longitude)
    .map(s => [s.latitude, s.longitude]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold text-sm">Route Map</h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-slate-400">Pickups ({pickupMarkers.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-slate-400">Deliveries ({deliveryMarkers.length})</span>
          </div>
        </div>
      </div>

      {stops.length === 0 ? (
        <div className="glass-card rounded-lg border border-white/5 p-8 text-center">
          <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Add stops to see route map</p>
        </div>
      ) : (
        <div className="glass-card rounded-lg border border-white/5 overflow-hidden" style={{ height: 400 }}>
          <HastenMap
            center={mapCenter}
            zoom={6}
            height="400px"
            pickupMarkers={pickupMarkers.map(m => ({
              id: m.id,
              lat: m.lat,
              lng: m.lng,
              label: `${m.stopNumber}. ${m.label}`,
              isPickup: true,
            }))}
            deliveryMarkers={deliveryMarkers.map(m => ({
              id: m.id,
              lat: m.lat,
              lng: m.lng,
              label: `${m.stopNumber}. ${m.label}`,
              isDelivery: true,
            }))}
            routePath={routePath}
          />
        </div>
      )}

      {/* Stop Summary Below Map */}
      {stops.length > 0 && (
        <div className="glass-card rounded-lg border border-white/5 p-3 space-y-2 max-h-40 overflow-y-auto">
          <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Route Sequence</div>
          {stops.map((stop, idx) => (
            <button
              key={stop.id || idx}
              onClick={() => onStopClick(idx)}
              className={`w-full text-left flex items-start gap-2 p-2 rounded-lg transition-colors ${
                idx === selectedStopIdx
                  ? "bg-orange-500/15 border border-orange-500/30"
                  : "hover:bg-white/3 border border-transparent"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${
                stop.stop_type === "pickup" ? "bg-blue-500/30 border border-blue-500/50" : "bg-green-500/30 border border-green-500/50"
              }`}>
                {stop.stop_number}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate">{stop.facility_name || "—"}</p>
                <p className="text-slate-500 text-xs truncate">{stop.city}, {stop.state} {stop.zip}</p>
              </div>
              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                stop.stop_type === "pickup" ? "bg-blue-400" : "bg-green-400"
              }`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}