import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch drivers with active loads at loading/unloading locations
    const drivers = await base44.asServiceRole.entities.Driver.filter({
      status: "on_load",
    }, "-created_date", 100);

    const loads = await base44.asServiceRole.entities.Load.list("-updated_date", 200);
    const users = await base44.asServiceRole.entities.User.list("-created_date", 50);

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const stuckDrivers = [];

    for (const driver of drivers) {
      if (!driver.current_load_id) continue;

      const load = loads.find(l => l.id === driver.current_load_id);
      if (!load) continue;

      // Check if driver is at pickup or delivery location
      const atLoadingDock = ["arrived_pickup", "loaded", "arrived_delivery"].includes(load.status);
      if (!atLoadingDock) continue;

      // Check if driver has been stationary for more than 2 hours
      const lastUpdate = driver.last_location_update ? new Date(driver.last_location_update) : null;
      if (!lastUpdate) continue;

      const isStuck = lastUpdate < twoHoursAgo;
      if (isStuck) {
        const stuckMinutes = Math.round((now - lastUpdate) / (1000 * 60));
        stuckDrivers.push({
          driverId: driver.id,
          driverName: `${driver.first_name} ${driver.last_name}`,
          driverPhone: driver.phone,
          loadNumber: load.load_number,
          loadStatus: load.status,
          origin: `${load.origin_city}, ${load.origin_state}`,
          destination: `${load.destination_city}, ${load.destination_state}`,
          stuckMinutes,
          lastUpdateTime: lastUpdate.toLocaleString('en-US', { timeZone: 'America/New_York' }),
        });
      }
    }

    // Send emails to dispatch team if there are stuck drivers
    if (stuckDrivers.length > 0) {
      // Get dispatch team members (users with admin or dispatcher role)
      const dispatchTeam = users.filter(u => ["admin"].includes(u.role));

      if (dispatchTeam.length > 0) {
        const driverList = stuckDrivers
          .map(d => `• ${d.driverName} (${d.driverPhone}) - Load #${d.loadNumber} - Stuck ${d.stuckMinutes} minutes at ${d.loadStatus === "arrived_pickup" ? "PICKUP" : "DELIVERY"}`)
          .join("\n");

        const emailContent = `ALERT: Loading Dock Delays Detected

${stuckDrivers.length} driver(s) are stuck at loading docks:

${driverList}

Action Required:
- Contact drivers to check on status
- Investigate loading/unloading delays
- Update load status if situation changes

This report was generated automatically at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;

        // Send to each dispatch team member
        for (const user of dispatchTeam) {
          if (user.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user.email,
              subject: `⚠️ ALERT: ${stuckDrivers.length} Driver(s) Stuck at Loading Dock`,
              body: emailContent,
              from_name: "HASTEN Logistics - Dispatch Alert",
            }).catch(err => console.error(`Failed to send email to ${user.email}:`, err));
          }
        }
      }
    }

    return Response.json({
      success: true,
      stuckDriversDetected: stuckDrivers.length,
      drivers: stuckDrivers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error detecting loading dock delays:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});