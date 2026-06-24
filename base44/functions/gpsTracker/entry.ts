import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const { driver_id, load_id, lat, lng, speed, heading, accuracy } = await req.json();
    if (!driver_id || !load_id || lat === undefined || lng === undefined) {
      return Response.json({ error: 'Missing required fields: driver_id, load_id, lat, lng' }, { status: 400 });
    }

    // Create GPS track point
    const gpsPoint = await base44.asServiceRole.entities.GPSTrackPoint.create({
      driver_id,
      load_id,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: speed ? parseFloat(speed) : 0,
      heading: heading ? parseFloat(heading) : 0,
      accuracy: accuracy ? parseFloat(accuracy) : 0,
      timestamp: new Date().toISOString()
    });

    // Check if driver is late via delay detection
    try {
      await base44.functions.invoke('detectLoadDelaysByETA', { load_id });
    } catch (e) {
      console.error('[gpsTracker] Delay detection failed:', e.message);
    }

    return Response.json({
      success: true,
      gpsPointId: gpsPoint.id,
      lat,
      lng,
      timestamp: gpsPoint.timestamp
    });
  } catch (error) {
    console.error('[gpsTracker]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});