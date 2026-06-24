import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch loads in transit
    const inTransitLoads = await base44.asServiceRole.entities.Load.filter({
      status: ["in_transit", "arrived_delivery"]
    }, "-created_date", 300);

    const drivers = await base44.asServiceRole.entities.Driver.list("-created_date", 100);
    const clients = await base44.asServiceRole.entities.Client.list("-created_date", 100);
    const users = await base44.asServiceRole.entities.User.list("-created_date", 50);

    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const now = new Date();
    const delayedLoads = [];
    const onTimeLoads = [];

    for (const load of inTransitLoads) {
      // Skip if no ETA
      if (!load.eta) continue;

      const eta = new Date(load.eta);
      const timeDiff = now - eta;
      const delayMinutes = Math.round(timeDiff / (1000 * 60));

      // Check for delay (more than 30 minutes late for dispatch alert)
      if (delayMinutes > 30 && load.status !== "arrived_delivery") {
        const driver = driverMap[load.driver_id];
        const client = clientMap[load.client_id];

        delayedLoads.push({
          loadId: load.id,
          loadNumber: load.load_number,
          originCity: load.origin_city,
          destinationCity: load.destination_city,
          eta: eta.toLocaleString(),
          delayMinutes,
          driverName: driver ? `${driver.first_name} ${driver.last_name}` : "Unknown",
          clientName: client?.company_name || "Unknown",
          clientEmail: client?.email || "",
        });

        // Notify customer if delay is significant (>30 mins)
        if (delayMinutes > 30 && client?.email) {
          const emailContent = `SHIPMENT DELAY NOTIFICATION

Load Number: ${load.load_number}
Route: ${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}

Original ETA: ${eta.toLocaleString('en-US', { timeZone: 'America/New_York' })}
Current Delay: ${delayMinutes} minutes
Driver: ${driver ? `${driver.first_name} ${driver.last_name}` : "Assigned driver"}
Current Location: ${load.current_city || "Unknown"}, ${load.current_state || ""}

We are monitoring this shipment closely. Our dispatch team is in contact with the driver to minimize further delays.

For more information, visit your client portal or contact us directly.`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: client.email,
            subject: `⚠️ Shipment Delay Alert - Load ${load.load_number}`,
            body: emailContent,
            from_name: "HASTEN Dispatch",
          }).catch(err => console.error(`Failed to notify customer:`, err));
        }
      } else if (delayMinutes <= 30) {
        onTimeLoads.push({
          loadId: load.id,
          loadNumber: load.load_number,
          eta: eta.toLocaleString(),
          minutesEarly: Math.abs(delayMinutes),
        });
      }
    }

    // Alert dispatch team about critical delays
    if (delayedLoads.length > 0) {
      const dispatchTeam = users.filter(u => ["admin", "dispatcher"].includes(u.role));
       const delayReport = delayedLoads
         .map(d => `• ${d.loadNumber}: ${d.delayMinutes}min late | ${d.driverName} | ${d.clientName} | ${d.originCity} → ${d.destinationCity}`)
         .join("\n");

       for (const user of dispatchTeam) {
         if (user.email) {
           await base44.asServiceRole.integrations.Core.SendEmail({
             to: user.email,
             subject: `🚨 URGENT: ${delayedLoads.length} Load(s) >30min Behind Schedule`,
             body: `${delayedLoads.length} load(s) are more than 30 minutes behind their scheduled arrival time:\n\n${delayReport}\n\n⚠️ Immediate action may be required. Check your dispatch dashboard for details and contact affected drivers.`,
             from_name: "HASTEN Dispatch Alerts",
           }).catch(err => console.error(`Failed to alert dispatch:`, err));
         }
       }
    }

    return Response.json({
      success: true,
      delayedLoadsDetected: delayedLoads.length,
      onTimeLoads: onTimeLoads.length,
      delayedLoads,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error detecting delays:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});