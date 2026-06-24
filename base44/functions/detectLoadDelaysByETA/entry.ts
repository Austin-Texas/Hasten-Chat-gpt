/**
 * detectLoadDelaysByETA — scheduled every 15 minutes
 * Monitors active loads and alerts when actual progress significantly deviates from planned ETA.
 * 
 * Logic:
 * 1. For each in-transit load with ETA, calculate expected progress (distance covered by now)
 * 2. Compare against actual driver position
 * 3. If behind schedule by >20%, or ahead/behind >50km, trigger alert
 * 4. Deduplicate alerts within 2-hour window per load
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const ACTIVE_LOAD_STATUSES = ["en_route", "in_transit", "arrived_pickup", "loaded", "arrived_delivery"];
const DELAY_THRESHOLD_PCT = 0.20; // 20% behind schedule
const DELAY_THRESHOLD_KM = 50; // or 50km behind
const AHEAD_THRESHOLD_KM = 50; // or 50km ahead of schedule

function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

// Distance from point P to line segment A→B
function distToSegment(p, a, b) {
  const dx = b.lat - a.lat, dy = b.lng - a.lng;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversine(p, a);
  let t = ((p.lat - a.lat) * dx + (p.lng - a.lng) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return haversine(p, { lat: a.lat + t * dx, lng: a.lng + t * dy });
}

// Calculate progress: distance from origin toward destination (0 = at origin, 1 = at destination)
function getProgressRatio(current, origin, dest, totalDist) {
  if (totalDist === 0) return 0;
  const distFromOrigin = haversine(origin, current);
  return Math.min(1, distFromOrigin / totalDist);
}

// Calculate expected progress based on elapsed time vs total ETA time
function getExpectedProgressRatio(startTime, eta) {
  if (!startTime || !eta) return 0;
  const start = new Date(startTime);
  const etaTime = new Date(eta);
  const now = new Date();
  
  const totalMs = etaTime - start;
  const elapsedMs = now - start;
  
  if (totalMs <= 0) return 1; // ETA is in past
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all active loads
    const loads = await base44.asServiceRole.entities.Load.filter(
      { status: { $in: ACTIVE_LOAD_STATUSES } },
      "-created_date",
      100
    ).catch(() => []);

    let delayAlerts = 0;

    for (const load of loads) {
      // Skip if load lacks critical data
      if (!load.driver_id || !load.origin_lat || !load.origin_lng || !load.destination_lat || !load.destination_lng) continue;
      if (!load.eta && !load.delivery_date) continue;

      // Get driver current position
      const drivers = await base44.asServiceRole.entities.Driver.filter(
        { id: load.driver_id },
        "-created_date",
        1
      ).catch(() => []);
      
      const driver = drivers[0];
      if (!driver?.current_lat || !driver?.current_lng) continue;

      const driverPos = { lat: driver.current_lat, lng: driver.current_lng };
      const origin = { lat: load.origin_lat, lng: load.origin_lng };
      const dest = { lat: load.destination_lat, lng: load.destination_lng };

      // Calculate total route distance
      const totalDist = haversine(origin, dest);
      if (totalDist === 0) continue;

      // Get pickup/load start time (use actual_pickup if available, else created_date)
      const startTime = load.actual_pickup || load.created_date;
      const eta = load.eta || load.delivery_date;

      // Calculate expected vs actual progress
      const actualProgress = getProgressRatio(driverPos, origin, dest, totalDist);
      const expectedProgress = getExpectedProgressRatio(startTime, eta);
      const progressDelta = actualProgress - expectedProgress;
      const behindKm = (expectedProgress - actualProgress) * totalDist / 1000;

      // Determine if delay is significant
      let delayType = null;
      let delayMsg = "";

      if (progressDelta < -DELAY_THRESHOLD_PCT && behindKm > DELAY_THRESHOLD_KM) {
        delayType = "behind_schedule";
        delayMsg = `Running ~${Math.round(behindKm)}km behind schedule (${Math.round((1 - actualProgress / expectedProgress) * 100)}% delay)`;
      } else if (progressDelta < -DELAY_THRESHOLD_KM / totalDist) {
        delayType = "significantly_behind";
        delayMsg = `Significantly behind: only ${Math.round(actualProgress * 100)}% progress vs ${Math.round(expectedProgress * 100)}% expected`;
      }

      if (delayType) {
        // Check for recent duplicate alerts
        const recentAlerts = await base44.asServiceRole.entities.Manifest.filter(
          { load_id: load.id, event_type: "delay_event" },
          "-event_timestamp",
          10
        ).catch(() => []);

        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const alreadyAlerted = recentAlerts.some(m =>
          m.event_title?.includes("ETA Delay") &&
          new Date(m.event_timestamp) > twoHoursAgo
        );

        if (!alreadyAlerted) {
          // Create Manifest entry
          await base44.asServiceRole.entities.Manifest.create({
            load_id: load.id,
            event_type: "delay_event",
            event_title: "ETA Delay Alert",
            event_description: delayMsg,
            event_timestamp: new Date().toISOString(),
            performed_by: driver.id,
            performed_by_role: "system",
            lat: driver.current_lat,
            lng: driver.current_lng,
            is_system_event: true,
          }).catch(e => console.error("[manifest]", e.message));

          // Create Notification for dispatcher
          await base44.asServiceRole.entities.Notification.create({
            user_id: load.dispatcher_id || "system",
            role: "dispatcher",
            title: `Load ${load.load_number || load.id.slice(-6)}: ETA Delay`,
            message: delayMsg,
            type: "delay_alert",
            priority: "high",
            related_entity_type: "Load",
            related_entity_id: load.id,
            delivery_channels: ["in_app", "email"],
            action_url: `/loads/${load.id}`,
            cta_label: "View Load",
          }).catch(e => console.error("[notification]", e.message));

          // Log GPS track point for trip replay
          await base44.asServiceRole.entities.GPSTrackPoint.create({
            driver_id: driver.id,
            load_id: load.id,
            lat: driver.current_lat,
            lng: driver.current_lng,
            timestamp: new Date().toISOString(),
            event_type: "delay",
            notes: `ETA deviation: ${behindKm > 0 ? `-${Math.round(behindKm)}` : `+${Math.round(-behindKm)}`}km`,
          }).catch(e => console.error("[gps]", e.message));

          delayAlerts++;
          console.log(`[ETA delay] Load ${load.id} driver ${driver.id}: ${delayMsg}`);
        }
      }
    }

    return Response.json({
      processed: loads.length,
      delay_alerts: delayAlerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[detectLoadDelaysByETA]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});