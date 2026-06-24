import { useState, useEffect, useRef, useCallback } from "react";

const MIN_UPDATE_INTERVAL_MS = 15000; // send at most one update every 15s
const MIN_DISTANCE_METERS = 20;       // skip update if moved less than 20m

function haversineDistance(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

export default function useGPS({ driverId, loadId, onUpdate, enabled = false }) {
  const [position, setPosition]   = useState(null);
  const [error, setError]         = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchId      = useRef(null);
  const queue        = useRef([]);
  const isOnline     = useRef(navigator.onLine);
  const lastSentPos  = useRef(null);
  const lastSentTime = useRef(0);

  const maybeSend = useCallback(async (loc) => {
    const now = Date.now();
    const timeSinceLast = now - lastSentTime.current;
    const distMoved = lastSentPos.current ? haversineDistance(lastSentPos.current, loc) : Infinity;

    // Skip if too recent AND hasn't moved enough
    if (timeSinceLast < MIN_UPDATE_INTERVAL_MS && distMoved < MIN_DISTANCE_METERS) return;

    lastSentTime.current = now;
    lastSentPos.current  = loc;

    if (isOnline.current) {
      await onUpdate?.(loc);
    } else {
      // Keep only the latest position in the queue (no point replaying stale positions)
      queue.current = [loc];
    }
  }, [onUpdate]);

  const flushQueue = useCallback(async () => {
    if (!isOnline.current || queue.current.length === 0) return;
    const last = queue.current[queue.current.length - 1];
    queue.current = [];
    try { await onUpdate?.(last); } catch { queue.current = [last]; }
  }, [onUpdate]);

  useEffect(() => {
    const online  = () => { isOnline.current = true;  flushQueue(); };
    const offline = () => { isOnline.current = false; };
    window.addEventListener("online",  online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online",  online);
      window.removeEventListener("offline", offline);
    };
  }, [flushQueue]);

  const start = useCallback(() => {
    if (!navigator.geolocation) { setError("Geolocation not supported on this device"); return; }
    setIsTracking(true);
    setError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          lat:       pos.coords.latitude,
          lng:       pos.coords.longitude,
          accuracy:  pos.coords.accuracy,
          speed:     pos.coords.speed,    // m/s, may be null
          heading:   pos.coords.heading,  // degrees, may be null
          timestamp: pos.timestamp,
        };
        setPosition(loc);
        maybeSend(loc);
      },
      (err) => {
        setError(
          err.code === 1 ? "Location permission denied" :
          err.code === 2 ? "Location unavailable" :
          "Location timeout — retrying…"
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [maybeSend]);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (enabled) start(); else stop();
    return stop;
  }, [enabled]);  // intentionally omit start/stop from deps to avoid restart loops

  return { position, error, isTracking };
}