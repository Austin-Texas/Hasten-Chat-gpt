import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ChevronLeft, Play, Pause, SkipBack, SkipForward, Clock,
  Navigation, AlertTriangle, MapPin, Loader2, Package
} from "lucide-react";
import HastenMap from "@/components/maps/HastenMap";

const EVENT_ICONS = {
  track: { color: "text-slate-400", bg: "bg-slate-500/15 border-slate-500/25" },
  geofence_arrival: { color: "text-green-400", bg: "bg-green-500/15 border-green-500/25" },
  geofence_departure: { color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/25" },
  deviation: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/25" },
  idle: { color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/25" },
  stop: { color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/25" },
};

export default function TripReplay() {
  const { id } = useParams();
  const [load, setLoad] = useState(null);
  const [trackPoints, setTrackPoints] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [loadRes, trackRes, manifestRes] = await Promise.all([
          base44.entities.Load.filter({ id }, "-created_date", 1),
          base44.entities.GPSTrackPoint.filter({ load_id: id }, "timestamp", 500),
          base44.entities.Manifest.filter({ load_id: id }, "event_timestamp", 100),
        ]);
        setLoad(loadRes[0] || null);
        setTrackPoints(trackRes);
        setManifests(manifestRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  // Playback
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentIdx(i => {
          if (i >= trackPoints.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }, 200);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, trackPoints.length]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
    </div>
  );

  if (!load) return (
    <div className="text-center py-16">
      <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-400">Load not found</p>
      <Link to="/loads" className="text-orange-400 text-sm mt-2 inline-block">← Back to Loads</Link>
    </div>
  );

  const current = trackPoints[currentIdx];
  const pastPoints = trackPoints.slice(0, currentIdx + 1);

  // Events that happened up to current point
  const currentTime = current ? new Date(current.timestamp) : null;
  const visibleManifests = currentTime
    ? manifests.filter(m => new Date(m.event_timestamp) <= currentTime)
    : manifests;

  // Notable events (non-track) near current time for inline highlight
  const nearbyEvent = current && trackPoints[currentIdx]?.event_type !== "track"
    ? EVENT_ICONS[current.event_type]
    : null;

  const progress = trackPoints.length > 1 ? (currentIdx / (trackPoints.length - 1)) * 100 : 0;

  // Diagnostic panel (admin-only debug info)
  const replayStatus = !load ? "MISSING LOAD" : trackPoints.length < 2 ? "MISSING DATA" : "READY";

  return (
    <div className="space-y-4 animate-slide-up max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/loads/${id}`}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-white font-heading font-bold text-xl">Trip Replay</h1>
          <p className="text-slate-400 text-sm">
            {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
            {" · "}
            {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
          </p>
        </div>
      </div>

      {/* Diagnostic Panel (Admin Debug) */}
      <div className="glass-card rounded-xl border border-white/10 p-4 bg-slate-500/5">
        <div className="text-white font-mono text-xs space-y-1.5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="text-slate-500">Load ID:</span> <span className="text-white font-semibold">{load?.id || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500">Driver ID:</span> <span className="text-white font-semibold">{load?.driver_id || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500">GPS Points:</span> <span className="text-orange-400 font-semibold">{trackPoints.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Status:</span> <span className={`font-semibold ${replayStatus === "READY" ? "text-green-400" : "text-amber-400"}`}>{replayStatus}</span>
            </div>
          </div>
          {trackPoints.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/5">
              <div>
                <span className="text-slate-500">First:</span> <span className="text-slate-400 text-xs">{new Date(trackPoints[0]?.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Last:</span> <span className="text-slate-400 text-xs">{new Date(trackPoints[trackPoints.length - 1]?.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Origin:</span> <span className="text-slate-400 text-xs">{load?.origin_lat?.toFixed(4)}, {load?.origin_lng?.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-slate-500">Destination:</span> <span className="text-slate-400 text-xs">{load?.destination_lat?.toFixed(4)}, {load?.destination_lng?.toFixed(4)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {trackPoints.length === 0 ? (
        <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
          <Navigation className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No GPS track data for this load</p>
          <p className="text-slate-600 text-sm mt-1">Track history is recorded once the driver enables GPS tracking on this load.</p>
          <button
            onClick={async () => {
              if (!load) return;
              // Generate 10 GPS points from origin to destination
              const originLat = load.origin_lat || 39.7392;
              const originLng = load.origin_lng || -104.9903;
              const destLat = load.destination_lat || 34.0522;
              const destLng = load.destination_lng || -118.2437;
              
              const latStep = (destLat - originLat) / 10;
              const lngStep = (destLng - originLng) / 10;
              const now = new Date();
              
              for (let i = 0; i < 10; i++) {
                const lat = originLat + latStep * i;
                const lng = originLng + lngStep * i;
                const timestamp = new Date(now.getTime() + i * 3600000).toISOString();
                const eventType = i === 0 ? "track" : i === 1 ? "geofence_arrival" : i === 9 ? "geofence_departure" : i % 3 === 0 ? "idle" : "track";
                
                await base44.entities.GPSTrackPoint.create({
                  driver_id: load.driver_id || "test-driver",
                  load_id: id,
                  lat,
                  lng,
                  speed: Math.floor(Math.random() * 70) + 20,
                  heading: Math.floor(Math.random() * 360),
                  accuracy: 5 + Math.random() * 5,
                  timestamp,
                  event_type: eventType,
                  notes: eventType === "idle" ? "Driver idle at rest stop" : undefined,
                });
              }
              setLoading(true);
              setTimeout(() => {
                base44.entities.GPSTrackPoint.filter({ load_id: id }, "timestamp", 500)
                  .then(pts => {
                    setTrackPoints(pts);
                    setLoading(false);
                  });
              }, 500);
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Generate Test Track
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden" style={{ height: 420 }}>
              <HastenMap
                center={current ? [current.lat, current.lng] : [39.5, -98.35]}
                zoom={current ? 10 : 4}
                height="420px"
                driverMarkers={current ? [{
                  id: "replay",
                  lat: current.lat,
                  lng: current.lng,
                  label: `Speed: ${current.speed ?? "—"} mph · Heading: ${current.heading ?? "—"}°`,
                  hasGPS: true,
                  isSelected: true,
                  lastUpdate: current.timestamp,
                }] : []}
                pickupMarker={load.origin_lat ? {
                  lat: load.origin_lat,
                  lng: load.origin_lng,
                  label: `${load.origin_city}, ${load.origin_state}`,
                } : null}
                deliveryMarker={load.destination_lat ? {
                  lat: load.destination_lat,
                  lng: load.destination_lng,
                  label: `${load.destination_city}, ${load.destination_state}`,
                } : null}
                trackPoints={pastPoints}
                geofenceRadius={300}
              />
            </div>

            {/* Playback controls */}
            <div className="glass-card rounded-xl border border-white/5 p-4 mt-3 space-y-3">
              {/* Slider */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={trackPoints.length - 1}
                  value={currentIdx}
                  onChange={e => { setPlaying(false); setCurrentIdx(Number(e.target.value)); }}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>{trackPoints[0] ? new Date(trackPoints[0].timestamp).toLocaleString() : "—"}</span>
                  <span>{trackPoints[trackPoints.length - 1] ? new Date(trackPoints[trackPoints.length - 1].timestamp).toLocaleString() : "—"}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => { setPlaying(false); setCurrentIdx(0); }}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button onClick={() => setPlaying(p => !p)}
                  className="px-6 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-all"
                  style={{ background: "linear-gradient(135deg,#EA580C,#F97316)" }}>
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing ? "Pause" : "Play"}
                </button>
                <button onClick={() => { setPlaying(false); setCurrentIdx(trackPoints.length - 1); }}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Current point stats */}
              {current && (
                <div className={`grid grid-cols-4 gap-3 p-3 rounded-lg border ${nearbyEvent ? nearbyEvent.bg : "bg-white/3 border-white/5"}`}>
                  <div className="text-center">
                    <div className="text-slate-500 text-xs mb-0.5">Point</div>
                    <div className="text-white text-sm font-bold">{currentIdx + 1}/{trackPoints.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500 text-xs mb-0.5">Speed</div>
                    <div className="text-white text-sm font-bold">{current.speed ?? "—"} mph</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500 text-xs mb-0.5">Heading</div>
                    <div className="text-white text-sm font-bold">{current.heading != null ? `${current.heading}°` : "—"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500 text-xs mb-0.5">Event</div>
                    <div className={`text-xs font-bold capitalize ${nearbyEvent ? nearbyEvent.color : "text-slate-500"}`}>
                      {current.event_type?.replace(/_/g, " ") || "track"}
                    </div>
                  </div>
                </div>
              )}
              {current && (
                <div className="text-center text-slate-500 text-xs flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(current.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Timeline Panel */}
          <div className="space-y-3">
            {/* Stats */}
            <div className="glass-card rounded-xl border border-white/5 p-4 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-slate-500 text-xs mb-1">Total Points</div>
                <div className="text-white font-bold">{trackPoints.length}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Events</div>
                <div className="text-white font-bold">{trackPoints.filter(p => p.event_type !== "track").length}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Deviations</div>
                <div className={`font-bold ${trackPoints.filter(p => p.event_type === "deviation").length ? "text-red-400" : "text-green-400"}`}>
                  {trackPoints.filter(p => p.event_type === "deviation").length}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Progress</div>
                <div className="text-orange-400 font-bold">{Math.round(progress)}%</div>
              </div>
            </div>

            {/* Manifest events visible up to current time */}
            <div className="glass-card rounded-xl border border-white/5 p-4">
              <div className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                Manifest Events ({visibleManifests.length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {visibleManifests.length === 0 ? (
                  <p className="text-slate-600 text-xs text-center py-4">No events yet at this point</p>
                ) : (
                  visibleManifests.slice().reverse().map(event => (
                    <div key={event.id} className="flex gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-medium">{event.event_title || event.event_type?.replace(/_/g, " ")}</div>
                        <div className="text-slate-600 text-xs">{new Date(event.event_timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notable GPS events */}
            <div className="glass-card rounded-xl border border-white/5 p-4">
              <div className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                GPS Events
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {trackPoints.filter(p => p.event_type !== "track").length === 0 ? (
                  <p className="text-slate-600 text-xs text-center py-3">No notable GPS events</p>
                ) : (
                  trackPoints
                    .filter(p => p.event_type !== "track")
                    .slice(0, 20)
                    .map((p, i) => {
                      const ev = EVENT_ICONS[p.event_type] || EVENT_ICONS.track;
                      const isCurrent = trackPoints.indexOf(p) === currentIdx;
                      return (
                        <button
                          key={i}
                          onClick={() => { setPlaying(false); setCurrentIdx(trackPoints.indexOf(p)); }}
                          className={`w-full flex gap-2 text-left p-2 rounded-lg transition-colors ${isCurrent ? "bg-orange-500/10 border border-orange-500/20" : "hover:bg-white/3"}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${ev.color.replace("text-", "bg-")}`} />
                          <div>
                            <div className={`text-xs font-medium capitalize ${ev.color}`}>{p.event_type?.replace(/_/g, " ")}</div>
                            {p.notes && <div className="text-slate-500 text-xs">{p.notes}</div>}
                            <div className="text-slate-600 text-xs">{new Date(p.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}