import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Earth radius in miles
const EARTH_RADIUS_MILES = 3959;

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Calculate distance between two lat/lng points (haversine formula) in miles
function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

// Check if driver has been idle (not moved > 0.1 miles in N minutes)
function isIdle(recentGpsPoints, idleThresholdMins = 15) {
  if (recentGpsPoints.length < 2) return false;

  const now = Date.now();
  const threshold = now - idleThresholdMins * 60 * 1000;
  const recentPoints = recentGpsPoints.filter(p => new Date(p.created_date).getTime() > threshold);

  if (recentPoints.length < 2) return false;

  const oldest = recentPoints[0];
  const newest = recentPoints[recentPoints.length - 1];
  const distance = haversineDistance(oldest.latitude, oldest.longitude, newest.latitude, newest.longitude);

  return distance < 0.1; // Less than 0.1 miles = idle
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active loads assigned to drivers
    const activeLoads = await base44.asServiceRole.entities.Load.filter(
      { status: { $in: ['assigned', 'accepted', 'en_route', 'arrived_pickup', 'loaded', 'in_transit', 'arrived_delivery'] } },
      '-created_date',
      200
    );

    if (!activeLoads || activeLoads.length === 0) {
      console.log('No active loads to check for deviations');
      return Response.json({ checked: 0, alerts: 0 });
    }

    let alertCount = 0;
    const deviations = [];

    // Check each active load
    for (const load of activeLoads) {
      if (!load.driver_id || !load.destination_lat || !load.destination_lng) continue;

      // Fetch driver current position
      let driver;
      try {
        driver = await base44.asServiceRole.entities.Driver.get(load.driver_id);
      } catch {
        continue;
      }

      if (!driver?.current_lat || !driver?.current_lng) continue;

      // Calculate distance from destination
      const distToDestination = haversineDistance(
        driver.current_lat,
        driver.current_lng,
        load.destination_lat,
        load.destination_lng
      );

      // Check for off-route (if destination is known, driver should be within ~50 miles)
      const offRoute = distToDestination > 50;

      // Check for idle (no movement in 15 mins)
      let idle = false;
      try {
        const recentGps = await base44.asServiceRole.entities.GPSTrackPoint.filter(
          { driver_id: load.driver_id },
          '-created_date',
          20
        ).catch(() => []);
        idle = isIdle(recentGps, 15);
      } catch (err) {
        console.log('Failed to fetch GPS points:', err);
      }

      if (offRoute || idle) {
        deviations.push({
          loadId: load.id,
          loadNumber: load.load_number,
          driverId: load.driver_id,
          driverName: `${driver.first_name} ${driver.last_name}`,
          currentCity: driver.current_city,
          currentState: driver.current_state,
          distToDestination: Math.round(distToDestination),
          offRoute,
          idle,
        });
      }
    }

    // Send alerts to dispatchers for deviations
    if (deviations.length > 0) {
      let dispatchers = [];
      try {
        dispatchers = await base44.asServiceRole.entities.UserProfile.filter(
          { businessRole: { $in: ['admin', 'dispatcher'] }, active: true },
          '-created_date',
          100
        );
      } catch (err) {
        console.log('Failed to fetch dispatchers:', err);
      }

      // Create notifications for each deviation
      for (const dev of deviations) {
        const issues = [];
        if (dev.offRoute) issues.push(`${dev.distToDestination} miles off-route`);
        if (dev.idle) issues.push('idle 15+ mins');
        const message = `${dev.driverName} (Load ${dev.loadNumber}): ${issues.join(', ')}`;

        await Promise.all(
          dispatchers.map(dispatcher =>
            base44.asServiceRole.entities.Notification.create({
              user_id: dispatcher.authUserId,
              role: dispatcher.businessRole,
              title: 'Route Deviation Alert',
              message,
              type: 'route_deviation',
              priority: dev.offRoute ? 'high' : 'normal',
              related_entity_type: 'Load',
              related_entity_id: dev.loadId,
              delivery_channels: ['in_app'],
            }).catch(err => console.log('Failed to notify dispatcher:', err))
          )
        );

        alertCount++;
      }

      console.log(`Sent ${alertCount} route deviation alerts to dispatchers`);
    }

    return Response.json({ checked: activeLoads.length, alerts: alertCount, deviations });
  } catch (error) {
    console.error('Error in gpsDeviationAlert:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});