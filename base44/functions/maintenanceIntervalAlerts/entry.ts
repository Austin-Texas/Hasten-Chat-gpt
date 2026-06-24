/**
 * maintenanceIntervalAlerts — runs every 6 hours
 * Checks all trucks and alerts when approaching maintenance service intervals (500 miles away)
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all trucks
    const trucks = await base44.asServiceRole.entities.Truck.list("-created_date", 100).catch(() => []);

    let alerts = 0;

    for (const truck of trucks) {
      if (!truck.next_service_miles || !truck.odometer) continue;

      const milesRemaining = truck.next_service_miles - truck.odometer;

      // Alert if within 500 miles and not yet alerted in last 24 hours
      if (milesRemaining > 0 && milesRemaining <= 500) {
        const recentAlerts = await base44.asServiceRole.entities.Notification.filter(
          { 
            related_entity_type: "Truck",
            related_entity_id: truck.id,
            type: "maintenance_alert"
          },
          "-created_date",
          5
        ).catch(() => []);

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const alreadyAlerted = recentAlerts.some(n => new Date(n.created_date) > oneDayAgo);

        if (!alreadyAlerted) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: "system",
            role: "fleet_manager",
            title: `Unit #${truck.unit_number}: Maintenance Due Soon`,
            message: `Truck #${truck.unit_number} has ${milesRemaining} miles remaining until service (next service at ${truck.next_service_miles} miles).`,
            type: "maintenance_alert",
            priority: milesRemaining <= 250 ? "high" : "normal",
            related_entity_type: "Truck",
            related_entity_id: truck.id,
            delivery_channels: ["in_app", "email"],
            action_url: `/fleet/${truck.id}`,
            cta_label: "Schedule Service",
          }).catch(e => console.error("[maintenance alert]", e.message));

          alerts++;
          console.log(`[maintenance] Truck ${truck.unit_number} - ${milesRemaining} miles until service`);
        }
      }
    }

    return Response.json({ processed: trucks.length, alerts });
  } catch (error) {
    console.error("[maintenanceIntervalAlerts]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});