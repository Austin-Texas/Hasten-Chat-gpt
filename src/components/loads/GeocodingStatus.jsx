/**
 * GeocodingStatus — shows map-ready status and triggers geocoding via Nominatim (OSM, free).
 * Props: originAddress, destinationAddress, coords {origin_lat, origin_lng, destination_lat, destination_lng}, onCoordsResolved(coords)
 */
import { useState } from "react";
import { MapPin, CheckCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "HASTEN-TMS/1.0" } });
  const data = await res.json();
  if (!data?.length) throw new Error(`No results for "${address}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export default function GeocodingStatus({ originAddress, destinationAddress, coords, onCoordsResolved }) {
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState("");

  const hasOrigin = coords.origin_lat && coords.origin_lng &&
    isFinite(Number(coords.origin_lat)) && isFinite(Number(coords.origin_lng));
  const hasDest = coords.destination_lat && coords.destination_lng &&
    isFinite(Number(coords.destination_lat)) && isFinite(Number(coords.destination_lng));
  const mapReady = hasOrigin && hasDest;

  const handleGeocode = async () => {
    setGeocoding(true);
    setGeoError("");
    const results = {};
    const errors = [];

    if (!hasOrigin && originAddress) {
      try { const r = await geocodeAddress(originAddress); results.origin_lat = r.lat; results.origin_lng = r.lng; }
      catch { errors.push(`Origin: "${originAddress}"`); }
    }
    if (!hasDest && destinationAddress) {
      try { const r = await geocodeAddress(destinationAddress); results.destination_lat = r.lat; results.destination_lng = r.lng; }
      catch { errors.push(`Destination: "${destinationAddress}"`); }
    }

    if (Object.keys(results).length) onCoordsResolved(results);
    if (errors.length) setGeoError(`Could not geocode: ${errors.join(", ")}. Enter coordinates manually.`);
    setGeocoding(false);
  };

  if (mapReady) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/8 border border-green-500/20">
        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
        <span className="text-green-400 text-xs font-semibold">Map Ready</span>
        <span className="text-green-400/60 text-xs">
          O: {Number(coords.origin_lat).toFixed(3)}, {Number(coords.origin_lng).toFixed(3)}
          {" · "}
          D: {Number(coords.destination_lat).toFixed(3)}, {Number(coords.destination_lng).toFixed(3)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span className="text-amber-400 text-xs font-semibold">Missing Coordinates</span>
        <span className="text-amber-400/60 text-xs">
          {!hasOrigin && !hasDest ? "Both origin & destination" : !hasOrigin ? "Origin missing" : "Destination missing"}
        </span>
        <button
          type="button"
          onClick={handleGeocode}
          disabled={geocoding || (!originAddress && !destinationAddress)}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold disabled:opacity-50 hover:bg-amber-500/25 transition-colors"
        >
          {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {geocoding ? "Geocoding…" : "Auto-geocode"}
        </button>
      </div>
      {geoError && (
        <div className="px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400 text-xs">
          {geoError}
          <div className="mt-1 text-red-400/70">Enter lat/lng manually in the fields below.</div>
        </div>
      )}
    </div>
  );
}