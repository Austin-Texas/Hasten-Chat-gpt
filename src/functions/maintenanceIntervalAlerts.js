import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active trucks
    const trucks = await base44.asServiceRole.entities.Truck.filter(
      { status: "active" },
      "-created_date",
      500
    );

    if (!trucks || trucks.length === 0) {
      return Response.json({ processed: 0, alerts: 0, message: "No active trucks found" });
    }

    const ALERT_THRESHOLD = 500; // miles before service
    const alertsTriggered = [];
    const maintenanceEmails = []; // Collect unique maintenance team emails

    // Check each truck
    for (const truck of trucks) {
      const nextServiceMiles = truck.next_service_miles;
      const currentOdometer = truck.odometer || 0;

      // Skip if no service interval defined
      if (!nextServiceMiles || nextServiceMiles <= 0) continue;

      // Calculate miles until service
      const milesUntilService = nextServiceMiles - currentOdometer;

      // Alert if within threshold and not yet at service
      if (milesUntilService > 0 && milesUntilService <= ALERT_THRESHOLD) {
        alertsTriggered.push({
          truckId: truck.id,
          unitNumber: truck.unit_number,
          currentOdometer,
          nextServiceMiles,
          milesUntilService,
          lastServiceDate: truck.last_service_date,
          lastServiceOdometer: truck.last_service_odometer,
        });
      }
    }

    // If no alerts, return early
    if (alertsTriggered.length === 0) {
      console.log("No trucks requiring maintenance alerts at this time");
      return Response.json({
        processed: trucks.length,
        alerts: 0,
        message: "No vehicles within 500-mile service threshold",
      });
    }

    // Fetch maintenance team (users with admin or dispatcher role who manage fleet)
    const users = await base44.asServiceRole.entities.User.list("-created_date", 100);
    const maintenanceContacts = users.filter(u => ["admin", "dispatcher"].includes(u.role));

    if (maintenanceContacts.length === 0) {
      console.log("No maintenance team contacts found");
      return Response.json({
        processed: trucks.length,
        alerts: alertsTriggered.length,
        message: "Alerts triggered but no team contacts configured",
        alertedTrucks: alertsTriggered.length,
      });
    }

    // Build alert email
    const alertLines = alertsTriggered
      .sort((a, b) => a.milesUntilService - b.milesUntilService)
      .map(
        (alert) =>
          `  • Unit #${alert.unitNumber}: ${alert.milesUntilService} miles remaining ` +
          `(Odometer: ${alert.currentOdometer.toLocaleString()} mi) ` +
          `[Next service: ${alert.nextServiceMiles.toLocaleString()} mi]`
      )
      .join("\n");

    const emailBody = `MAINTENANCE ALERT - SERVICE INTERVALS APPROACHING

${alertsTriggered.length} vehicle${alertsTriggered.length !== 1 ? "s" : ""} require${alertsTriggered.length !== 1 ? "" : "s"} scheduled maintenance within the next 500 miles:

${alertLines}

ACTION REQUIRED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review the fleet maintenance schedule
2. Schedule maintenance appointments for affected vehicles
3. Coordinate with drivers for vehicle availability
4. Log work orders in the maintenance system once service is completed

Last Generated: ${new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
    })}

HASTEN Fleet Management
Proactive Maintenance System`;

    // Send email to all maintenance contacts
    const emailPromises = maintenanceContacts
      .filter(u => u.email) // Only send to users with email
      .map((user) =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: `⚠️ Maintenance Alert: ${alertsTriggered.length} Vehicle${
            alertsTriggered.length !== 1 ? "s" : ""
          } Require Service`,
          body: emailBody,
          from_name: "HASTEN Maintenance System",
        }).catch((err) => {
          console.error(`Failed to send alert to ${user.email}:`, err);
          return null;
        })
      );

    await Promise.all(emailPromises);

    console.log(
      `Maintenance alerts sent: ${alertsTriggered.length} trucks, ` +
      `${maintenanceContacts.length} team members notified`
    );

    return Response.json({
      success: true,
      processed: trucks.length,
      alerts: alertsTriggered.length,
      teamNotified: maintenanceContacts.length,
      alertedTrucks: alertsTriggered.map((a) => ({
        unit: a.unitNumber,
        milesRemaining: a.milesUntilService,
      })),
    });
  } catch (error) {
    console.error("Error in maintenance interval alerts:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});