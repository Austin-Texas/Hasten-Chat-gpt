/**
 * HastenMap — reusable real Leaflet map component.
 * Uses react-leaflet + OpenStreetMap (free, no API key).
 *
 * Props:
 *  center         [lat, lng]   default map center
 *  zoom           number       default zoom level
 *  driverMarkers  [{id, lat, lng, label, hasGPS, speed, heading, isSelected}]
 *  pickupMarker   {lat, lng, label}
 *  deliveryMarker {lat, lng, label}
 *  trackPoints    [{lat, lng}]  polyline of past GPS points
 *  geofenceRadius number (meters) shown around pickup/delivery
 *  height         string css height, default "100%"
 *  onDriverClick  fn(id)
 */
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom truck icon for GPS-active drivers
function makeTruckIcon(color = "#EA580C", isSelected = false) {
  const size = isSelected ? 44 : 36;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="19" fill="${color}" fill-opacity="${isSelected ? 0.9 : 0.75}" stroke="white" stroke-width="2"/>
      <text x="20" y="26" font-size="18" text-anchor="middle" fill="white">🚛</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function makePin(color = "#22C55E", label = "A") {
  return L.divIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;display:flex;align-items:center;justify-content:center;">
             <span style="transform:rotate(45deg);font-size:11px;font-weight:bold;color:white;">${label}</span>
           </div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

// Recenter map when center prop changes
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom, { animate: true });
  }, [center?.[0], center?.[1]]);
  return null;
}

export default function HastenMap({
  center = [39.5, -98.35],
  zoom = 4,
  driverMarkers = [],
  pickupMarker = null,
  deliveryMarker = null,
  trackPoints = [],
  geofenceRadius = 500,
  height = "100%",
  onDriverClick,
}) {
  // Build bounds to fit all markers if center isn't explicitly useful
  const allPoints = [
    ...driverMarkers.filter(d => d.lat && d.lng).map(d => [d.lat, d.lng]),
    pickupMarker ? [pickupMarker.lat, pickupMarker.lng] : null,
    deliveryMarker ? [deliveryMarker.lat, deliveryMarker.lng] : null,
  ].filter(Boolean);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: "100%", background: "#0a1628" }}
      className="rounded-none"
      zoomControl={true}
      attributionControl={false}
    >
      {/* OpenStreetMap tiles — free, no key needed */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        className="map-tiles-dark"
      />

      <MapRecenter center={center} zoom={zoom} />

      {/* GPS Track polyline — completed path */}
      {trackPoints.length > 1 && (
        <Polyline
          positions={trackPoints.map(p => [p.lat, p.lng])}
          color="#EA580C"
          weight={3}
          opacity={0.7}
          dashArray="8 4"
        />
      )}

      {/* Route line: pickup → delivery (straight line when no track) */}
      {pickupMarker && deliveryMarker && trackPoints.length < 2 && (
        <Polyline
          positions={[
            [pickupMarker.lat, pickupMarker.lng],
            [deliveryMarker.lat, deliveryMarker.lng],
          ]}
          color="#94a3b8"
          weight={2}
          opacity={0.4}
          dashArray="6 4"
        />
      )}

      {/* Pickup marker */}
      {pickupMarker && (
        <>
          <Marker position={[pickupMarker.lat, pickupMarker.lng]} icon={makePin("#22C55E", "P")}>
            <Popup>
              <div style={{ fontFamily: "Inter, sans-serif", minWidth: 140 }}>
                <div style={{ fontWeight: 700, color: "#22C55E", marginBottom: 2 }}>📦 Pickup</div>
                <div style={{ fontSize: 12 }}>{pickupMarker.label}</div>
              </div>
            </Popup>
          </Marker>
          {geofenceRadius > 0 && (
            <Circle
              center={[pickupMarker.lat, pickupMarker.lng]}
              radius={geofenceRadius}
              color="#22C55E"
              fillColor="#22C55E"
              fillOpacity={0.06}
              weight={1.5}
              dashArray="5 5"
            />
          )}
        </>
      )}

      {/* Delivery marker */}
      {deliveryMarker && (
        <>
          <Marker position={[deliveryMarker.lat, deliveryMarker.lng]} icon={makePin("#EA580C", "D")}>
            <Popup>
              <div style={{ fontFamily: "Inter, sans-serif", minWidth: 140 }}>
                <div style={{ fontWeight: 700, color: "#EA580C", marginBottom: 2 }}>🏁 Delivery</div>
                <div style={{ fontSize: 12 }}>{deliveryMarker.label}</div>
              </div>
            </Popup>
          </Marker>
          {geofenceRadius > 0 && (
            <Circle
              center={[deliveryMarker.lat, deliveryMarker.lng]}
              radius={geofenceRadius}
              color="#EA580C"
              fillColor="#EA580C"
              fillOpacity={0.06}
              weight={1.5}
              dashArray="5 5"
            />
          )}
        </>
      )}

      {/* Driver markers */}
      {driverMarkers.map(driver => {
        if (!driver.lat || !driver.lng) return null;
        const color = driver.isSelected ? "#EA580C" : driver.hasGPS ? "#22C55E" : "#3B82F6";
        return (
          <Marker
            key={driver.id}
            position={[driver.lat, driver.lng]}
            icon={makeTruckIcon(color, driver.isSelected)}
            eventHandlers={{ click: () => onDriverClick?.(driver.id) }}
          >
            <Popup>
              <div style={{ fontFamily: "Inter, sans-serif", minWidth: 160 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{driver.label || "Driver"}</div>
                {driver.speed != null && (
                  <div style={{ fontSize: 11, color: "#64748b" }}>Speed: {Math.round(driver.speed || 0)} mph</div>
                )}
                {driver.hasGPS ? (
                  <div style={{ fontSize: 11, color: "#22C55E", marginTop: 2 }}>● GPS Live</div>
                ) : (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>○ Last known position</div>
                )}
                {driver.lastUpdate && (
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                    {new Date(driver.lastUpdate).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}