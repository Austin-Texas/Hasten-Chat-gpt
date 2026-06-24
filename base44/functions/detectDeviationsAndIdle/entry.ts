/**
 * detectDeviationsAndIdle — scheduled every 5 min.
 * Checks active loads with assigned drivers for:
 *  1. Route deviation (driver far from origin→destination corridor)
 *  2. Idle / unexpected stop (driver hasn't moved in 30+ minutes while load is active)
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const ACTIVE_STATUSES = ["en_route", "in_transit", "loaded"];
const DEVIATION_THRESHOLD_M = 50000;  // 50km off corridor
const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const IDLE_RADIUS_M = 200; // still within 200m = idle

function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

// Closest distance from point P to line segment A→B
function distToSegment(p, a, b) {
  const dx = b.lat - a.lat, dy = b.lng - a.lng;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversine(p, a);
  let t = ((p.lat - a.lat) * dx + (p.lng - a.lng) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return haversine(p, { lat: a.lat + t * dx, lng: a.lng + t * dy });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch active loads
    const activeLoads = await base44.asServiceRole.entities.Load.filter({ status: "en_route" }, "-created_date", 100);
    const transitLoads = await base44.asServiceRole.entities.Load.filter({ status: "in_transit" }, "-created_date", 100);
    const loads = [...activeLoads, ...transitLoads];

    let deviations = 0, idles = 0;

    for (const load of loads) {
      if (!load.driver_id) continue;

      const drivers = await base44.asServiceRole.entities.Driver.filter({ id: load.driver_id }, "-created_date", 1);
      const driver = drivers[0];
      if (!driver?.current_lat || !driver?.current_lng) continue;

      const driverPos = { lat: driver.current_lat, lng: driver.current_lng };

      // ── 1. Route Deviation ──────────────────────────────────────────────────
      if (load.origin_lat && load.origin_lng && load.destination_lat && load.destination_lng) {
        const origin = { lat: load.origin_lat, lng: load.origin_lng };
        const dest = { lat: load.destination_lat, lng: load.destination_lng };
        const dist = distToSegment(driverPos, origin, dest);

        if (dist > DEVIATION_THRESHOLD_M) {
          // Check we haven't logged this in the last 2 hours
          const recentDeviations = await base44.asServiceRole.entities.Manifest.filter(
            { load_id: load.id, event_type: "delay_event" },
            "-event_timestamp",
            5
          );
          const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
          const alreadyAlerted = recentDeviations.some(m =>
            m.event_title?.includes("Route Deviation") &&
            new Date(m.event_timestamp) > new Date(twoHoursAgo)
          );

          if (!alreadyAlerted) {
            await base44.asServiceRole.entities.Manifest.create({
              load_id: load.id,
              event_type: "delay_event",
              event_title: "Route Deviation Detected",
              event_description: `Driver is ~${Math.round(dist / 1000)}km off the planned route corridor.`,
              event_timestamp: new Date().toISOString(),
              performed_by: driver.id,
              performed_by_role: "system",
              lat: driver.current_lat,
              lng: driver.current_lng,
              is_system_event: true,
            });
            await base44.asServiceRole.entities.GPSTrackPoint.create({
              driver_id: driver.id,
              load_id: load.id,
              lat: driver.current_lat,
              lng: driver.current_lng,
              timestamp: new Date().toISOString(),
              event_type: "deviation",
              notes: `${Math.round(dist / 1000)}km off corridor`,
            });
            deviations++;
            console.log(`[deviation] Load ${load.id} driver ${driver.id} off route by ${Math.round(dist / 1000)}km`);
          }
        }
      }

      // ── 2. Idle / Unexpected Stop ───────────────────────────────────────────
      const lastUpdate = driver.last_location_update ? new Date(driver.last_location_update) : null;
      if (!lastUpdate) continue;

      const idleMs = Date.now() - lastUpdate.getTime();
      if (idleMs < IDLE_THRESHOLD_MS) continue;

      // Compare last 2 GPS track points to check movement
      const recentPoints = await base44.asServiceRole.entities.GPSTrackPoint.filter(
        { driver_id: driver.id, load_id: load.id },
        "-timestamp",
        2
      );

      if (recentPoints.length >= 2) {
        const distMoved = haversine(
          { lat: recentPoints[0].lat, lng: recentPoints[0].lng },
          { lat: recentPoints[1].lat, lng: recentPoints[1].lng }
        );

        if (distMoved < IDLE_RADIUS_M) {
          // Truly idle — check we haven't alerted recently
          const recentIdles = await base44.asServiceRole.entities.Manifest.filter(
            { load_id: load.id },
            "-event_timestamp",
            5
          );
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          const idleAlerted = recentIdles.some(m =>
            m.event_title?.includes("Idle") &&
            new Date(m.event_timestamp) > new Date(oneHourAgo)
          );

          if (!idleAlerted) {
            const idleMinutes = Math.round(idleMs / 60000);
            await base44.asServiceRole.entities.Manifest.create({
              load_id: load.id,
              event_type: "delay_event",
              event_title: "Excessive Idle Time",
              event_description: `Driver has been stationary for ~${idleMinutes} minutes.`,
              event_timestamp: new Date().toISOString(),
              performed_by: driver.id,
              performed_by_role: "system",
              lat: driver.current_lat,
              lng: driver.current_lng,
              is_system_event: true,
            });
            await base44.asServiceRole.entities.GPSTrackPoint.create({
              driver_id: driver.id,
              load_id: load.id,
              lat: driver.current_lat,
              lng: driver.current_lng,
              timestamp: new Date().toISOString(),
              event_type: "idle",
              notes: `Idle for ${idleMinutes} min`,
            });
            idles++;
            console.log(`[idle] Load ${load.id} driver ${driver.id} idle ${idleMinutes}min`);
          }
        }
      }
    }

    return Response.json({ processed: loads.length, deviations, idles });
  } catch (error) {
    console.error("[detectDeviationsAndIdle]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});