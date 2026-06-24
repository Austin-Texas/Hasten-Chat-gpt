import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch loads in transit or at delivery point
    const inTransitLoads = await base44.asServiceRole.entities.Load.filter({
      status: ["en_route", "in_transit", "arrived_delivery"]
    }, "-created_date", 300);

    const drivers = await base44.asServiceRole.entities.Driver.list("-created_date", 100);
    const users = await base44.asServiceRole.entities.User.list("-created_date", 50);
    const clients = await base44.asServiceRole.entities.Client.list("-created_date", 100);

    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

    const now = new Date();
    const delayedLoads = [];

    for (const load of inTransitLoads) {
      // Skip if no ETA
      if (!load.eta || load.status === "arrived_delivery") continue;

      const eta = new Date(load.eta);
      const timeDiff = now - eta;
      const delayMinutes = Math.round(timeDiff / (1000 * 60));

      // Flag loads more than 30 minutes behind schedule
      if (delayMinutes > 30) {
        const driver = driverMap[load.driver_id];
        const client = clientMap[load.client_id];

        delayedLoads.push({
          loadId: load.id,
          loadNumber: load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`,
          originCity: load.origin_city,
          originState: load.origin_state,
          destinationCity: load.destination_city,
          destinationState: load.destination_state,
          eta: eta.toLocaleString('en-US', { timeZone: 'America/New_York' }),
          delayMinutes,
          driverName: driver ? `${driver.first_name} ${driver.last_name}` : "Unknown Driver",
          driverPhone: driver?.phone || "",
          clientName: client?.company_name || "Unknown",
          clientEmail: client?.email || "",
          currentLat: load.current_lat,
          currentLng: load.current_lng,
          currentCity: load.current_city,
          currentState: load.current_state,
        });

        // Notify customer about significant delay
        if (client?.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: client.email,
              subject: `⚠️ Shipment Delay Alert - Load ${load.load_number}`,
              body: `Your shipment is running behind schedule.

Load: ${load.load_number}
Route: ${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}
Scheduled Arrival: ${eta.toLocaleString('en-US', { timeZone: 'America/New_York' })}
Current Delay: ${delayMinutes} minutes
Driver: ${driver ? `${driver.first_name} ${driver.last_name}` : "Assigned Driver"}
Last Known Location: ${load.current_city || "Unknown"}, ${load.current_state || "Unknown"}

Our dispatch team is actively monitoring this shipment and has been notified. We appreciate your patience.

For updates, visit your client portal or contact our support team.`,
              from_name: "HASTEN Dispatch",
            });
          } catch (err) {
            console.error(`Failed to notify customer for load ${load.load_number}:`, err);
          }
        }
      }
    }

    // Alert dispatch team about critical delays
    if (delayedLoads.length > 0) {
      const dispatchTeam = users.filter(u => ["admin", "dispatcher"].includes(u.role));
      
      const delayReport = delayedLoads
        .map(d => `• Load ${d.loadNumber}: ${d.delayMinutes}min late | Driver: ${d.driverName}${d.driverPhone ? ` (${d.driverPhone})` : ''} | Customer: ${d.clientName} | Route: ${d.originCity} → ${d.destinationCity}`)
        .join("\n");

      const dispatchEmails = dispatchTeam.filter(u => u.email).map(u => u.email);

      if (dispatchEmails.length > 0) {
        try {
          for (const email of dispatchEmails) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: email,
              subject: `🚨 URGENT: ${delayedLoads.length} Load(s) >30min Behind Schedule`,
              body: `CRITICAL ALERT: ${delayedLoads.length} active load(s) are more than 30 minutes behind their scheduled arrival time:\n\n${delayReport}\n\nIMEDIATE ACTION REQUIRED:\n• Review dispatch dashboard for full details\n• Contact drivers to assess situation\n• Update affected customers with new ETAs\n• Consider load reassignment if necessary\n\nTimestamp: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })}`,
              from_name: "HASTEN Dispatch System",
            });
          }
        } catch (err) {
          console.error('Failed to send dispatch alerts:', err);
        }
      }
    }

    console.log(`Delay detection completed: ${delayedLoads.length} critical delays detected`);

    return Response.json({
      success: true,
      criticalDelaysDetected: delayedLoads.length,
      delayedLoads: delayedLoads.map(d => ({
        loadNumber: d.loadNumber,
        delayMinutes: d.delayMinutes,
        driver: d.driverName,
        customer: d.clientName,
      })),
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error in load delay detection:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});