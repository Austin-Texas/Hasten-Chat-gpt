import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Navigation, ChevronUp, ChevronDown } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import GPSTracker from "@/components/driver/GPSTracker";
import RouteOptimizer from "@/components/driver/RouteOptimizer";
import HastenMap from "@/components/maps/HastenMap";

const STATUS_SEQUENCE = [
  "assigned", "accepted", "en_route", "arrived_pickup",
  "loaded", "in_transit", "arrived_delivery", "delivered", "pod_uploaded", "completed"
];

const STATUS_ACTIONS = {
  assigned: { next: "accepted", label: "Accept Load" },
  accepted: { next: "en_route", label: "Start Driving" },
  en_route: { next: "arrived_pickup", label: "Arrived at Pickup" },
  arrived_pickup: { next: "loaded", label: "Confirm Loaded" },
  loaded: { next: "in_transit", label: "Start Transit" },
  in_transit: { next: "arrived_delivery", label: "Arrived at Delivery" },
  arrived_delivery: { next: "delivered", label: "Confirm Delivered" },
  delivered: { next: "pod_uploaded", label: "Upload POD" },
};

export default function DriverMap({ user }) {
  const [currentLoad, setCurrentLoad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [driverRecord, setDriverRecord] = useState(null);

  useEffect(() => {
    if (user?.id) {
      base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1)
        .then(res => setDriverRecord(res[0] || null)).catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCurrentLoad();
  }, []);

  const fetchCurrentLoad = async () => {
    try {
      const loads = await base44.entities.Load.filter({ driver_id: user?.id }, "-created_date", 20);
      const active = loads.find(l =>
        ["assigned", "accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery", "delivered"].includes(l.status)
      );
      setCurrentLoad(active || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!currentLoad) return;
    const action = STATUS_ACTIONS[currentLoad.status];
    if (!action) return;
    setUpdating(true);
    try {
      await base44.functions.invoke('updateLoadStatus', { load_id: currentLoad.id, new_status: action.next });
      setCurrentLoad(prev => ({ ...prev, status: action.next }));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const currentIdx = currentLoad ? STATUS_SEQUENCE.indexOf(currentLoad.status) : -1;
  const action = currentLoad ? STATUS_ACTIONS[currentLoad.status] : null;

  if (loading) {
    return <div className="skeleton h-screen rounded-xl" />;
  }

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-6 relative">
      {/* Real Leaflet map */}
      <div className="flex-1 relative" style={{ minHeight: "300px" }}>
        <HastenMap
          center={
            driverRecord?.current_lat
              ? [driverRecord.current_lat, driverRecord.current_lng]
              : [39.5, -98.35]
          }
          zoom={driverRecord?.current_lat ? 10 : 4}
          height="100%"
          driverMarkers={driverRecord?.current_lat ? [{
            id: driverRecord.id,
            lat: driverRecord.current_lat,
            lng: driverRecord.current_lng,
            label: `${driverRecord.first_name || ""} ${driverRecord.last_name || ""}`.trim() || "You",
            hasGPS: true,
            isSelected: true,
            lastUpdate: driverRecord.last_location_update,
          }] : []}
          pickupMarker={currentLoad?.origin_lat ? {
            lat: currentLoad.origin_lat,
            lng: currentLoad.origin_lng,
            label: `${currentLoad.origin_address || ""} ${currentLoad.origin_city}, ${currentLoad.origin_state}`,
          } : null}
          deliveryMarker={currentLoad?.destination_lat ? {
            lat: currentLoad.destination_lat,
            lng: currentLoad.destination_lng,
            label: `${currentLoad.destination_address || ""} ${currentLoad.destination_city}, ${currentLoad.destination_state}`,
          } : null}
          geofenceRadius={300}
        />

        {/* Load info overlay */}
        {currentLoad && (
          <div className="absolute top-3 left-3 right-3 z-[1000]">
            <div className="glass-card rounded-xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs">Current Load</div>
                <div className="text-orange-400 font-mono font-bold text-sm">
                  {currentLoad.load_number || `#LD${currentLoad.id?.slice(-6).toUpperCase()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={currentLoad.status} />
                {currentLoad.eta && (
                  <div className="text-right">
                    <div className="text-slate-500 text-[10px]">ETA</div>
                    <div className="text-orange-400 text-xs font-bold">
                      {new Date(currentLoad.eta).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!currentLoad && (
          <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
            <div className="text-center glass-card rounded-2xl p-6 border border-white/10">
              <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 font-medium text-sm">No active load</p>
              <p className="text-slate-600 text-xs mt-1">Accept a load to see navigation</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      {currentLoad && (
        <div className="border-t border-white/5 p-4" style={{ background: "hsl(var(--card))" }}>
          {/* GPS Tracker */}
          <div className="mb-3">
            <GPSTracker driverId={driverRecord?.id} loadId={currentLoad?.id} load={currentLoad} />
          </div>

          {/* Route Optimizer */}
          <div className="mb-3">
            <RouteOptimizer load={currentLoad} />
          </div>

          {/* Collapsible details */}
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex items-center justify-between w-full mb-3 text-slate-300 hover:text-white transition-colors"
          >
            <span className="text-sm font-medium">
              {currentLoad.origin_city}, {currentLoad.origin_state} → {currentLoad.destination_city}, {currentLoad.destination_state}
            </span>
            {detailsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {detailsOpen && (
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm animate-slide-up">
              <div>
                <span className="text-slate-500 text-xs block">Equipment</span>
                <span className="text-white">{currentLoad.equipment_type || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Miles</span>
                <span className="text-white">{currentLoad.miles || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Rate</span>
                <span className="text-green-400 font-bold">${(currentLoad.rate || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Weight</span>
                <span className="text-white">{currentLoad.weight ? `${currentLoad.weight.toLocaleString()} lbs` : "—"}</span>
              </div>
            </div>
          )}

          {/* Status Progress */}
          <div className="mb-4">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-700"
                style={{ width: currentIdx >= 0 ? `${((currentIdx + 1) / STATUS_SEQUENCE.length) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* Action Button */}
          {action && (
            <button
              onClick={handleStatusUpdate}
              disabled={updating}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #EA580C, #F97316)",
                boxShadow: "0 4px 20px rgba(234,88,12,0.3)"
              }}
            >
              {updating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  {action.label}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}