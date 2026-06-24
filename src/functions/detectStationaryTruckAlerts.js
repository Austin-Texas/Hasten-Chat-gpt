import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STATIONARY_THRESHOLD_HOURS = 3;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch trucks with active loads
    const trucks = await base44.asServiceRole.entities.Truck.filter({
      status: "active"
    }, "-created_date", 100);

    const loads = await base44.asServiceRole.entities.Load.filter({
      status: ["arrived_pickup", "loaded", "arrived_delivery"]
    }, "-created_date", 200);

    const drivers = await base44.asServiceRole.entities.Driver.list("-created_date", 100);
    const users = await base44.asServiceRole.entities.User.list("-created_date", 50);

    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));
    const loadMap = Object.fromEntries(loads.map(l => [l.truck_id, l]));

    const now = new Date();
    const thresholdTime = new Date(now.getTime() - STATIONARY_THRESHOLD_HOURS * 60 * 60 * 1000);

    const stationaryTrucks = [];

    for (const truck of trucks) {
      // Only check trucks with active loads
      const load = loadMap[truck.id];
      if (!load) continue;

      // Check if truck has GPS data
      if (!truck.current_lat || !truck.current_lng || !truck.last_location_update) continue;

      // Check if truck location hasn't updated in 3+ hours
      const lastUpdate = new Date(truck.last_location_update);
      if (lastUpdate >= thresholdTime) continue; // Not stationary yet

      const stationaryMinutes = Math.round((now - lastUpdate) / (1000 * 60));
      const driver = truck.driver_id ? driverMap[truck.driver_id] : null;

      stationaryTrucks.push({
        truckId: truck.id,
        unitNumber: truck.unit_number,
        driverId: truck.driver_id,
        driverName: driver ? `${driver.first_name} ${driver.last_name}` : "Unassigned",
        driverPhone: driver?.phone || "N/A",
        loadNumber: load.load_number,
        loadStatus: load.status,
        origin: `${load.origin_city}, ${load.origin_state}`,
        destination: `${load.destination_city}, ${load.destination_state}`,
        currentLocation: `${truck.current_city || "Unknown"}, ${truck.current_state || "Unknown"}`,
        latitude: truck.current_lat,
        longitude: truck.current_lng,
        stationaryMinutes,
        lastUpdateTime: lastUpdate.toLocaleString('en-US', { timeZone: 'America/New_York' }),
        facilityType: load.status === "arrived_pickup" ? "PICKUP" : load.status === "arrived_delivery" ? "DELIVERY" : "LOADING",
      });
    }

    // Sort by stationary time (longest first)
    stationaryTrucks.sort((a, b) => b.stationaryMinutes - a.stationaryMinutes);

    // Send alert emails to dispatch team
    if (stationaryTrucks.length > 0) {
      const dispatchTeam = users.filter(u => ["admin"].includes(u.role));

      if (dispatchTeam.length > 0) {
        const truckList = stationaryTrucks
          .map(t => `• Unit #${t.unitNumber} | Driver: ${t.driverName} (${t.driverPhone})
    Load: #${t.loadNumber} (${t.facilityType})
    Route: ${t.origin} → ${t.destination}
    Stationary: ${t.stationaryMinutes} minutes at ${t.currentLocation}
    Last Update: ${t.lastUpdateTime}`)
          .join("\n\n");

        const emailContent = `ALERT: Stationary Trucks Detected

${stationaryTrucks.length} truck(s) have been stationary at pickup/delivery locations for more than ${STATIONARY_THRESHOLD_HOURS} hours:

${truckList}

ACTION REQUIRED:
• Contact drivers to check facility status and loading/unloading progress
• Verify if there are unexpected delays
• Update load status if situation changes
• Consider reassigning loads if stuck too long

Report generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;

        for (const user of dispatchTeam) {
          if (user.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user.email,
              subject: `⚠️ ALERT: ${stationaryTrucks.length} Truck(s) Stationary for ${STATIONARY_THRESHOLD_HOURS}+ Hours`,
              body: emailContent,
              from_name: "HASTEN Logistics - Dispatch Alert",
            }).catch(err => console.error(`Failed to send email to ${user.email}:`, err));
          }
        }
      }
    }

    return Response.json({
      success: true,
      stationaryTrucksDetected: stationaryTrucks.length,
      trucks: stationaryTrucks,
      threshold: `${STATIONARY_THRESHOLD_HOURS} hours`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error detecting stationary trucks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});