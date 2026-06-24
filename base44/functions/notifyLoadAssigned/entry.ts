import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { entity_id, data, event } = body;

    // Only act on load assignments (when driver_id is set and status becomes assigned)
    if (!data?.driver_id) {
      return Response.json({ skipped: true, reason: "No driver assigned" });
    }

    // Fetch driver record to get their email
    const drivers = await base44.asServiceRole.entities.Driver.filter({ id: data.driver_id });
    const driver = drivers[0];
    if (!driver?.email) {
      return Response.json({ skipped: true, reason: "Driver email not found" });
    }

    const loadNumber = data.load_number || `#LD${entity_id?.slice(-6).toUpperCase()}`;
    const pickup = data.pickup_date ? new Date(data.pickup_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "TBD";
    const delivery = data.delivery_date ? new Date(data.delivery_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "TBD";

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: "HASTEN Dispatch",
      to: driver.email,
      subject: `🚛 New Load Assigned: ${loadNumber}`,
      body: `
Hi ${driver.first_name},

You have been assigned a new load. Here are the details:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOAD: ${loadNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 ORIGIN
${data.origin_address || ""}
${data.origin_city}, ${data.origin_state} ${data.origin_zip || ""}

📍 DESTINATION
${data.destination_address || ""}
${data.destination_city}, ${data.destination_state} ${data.destination_zip || ""}

🗓 PICKUP:   ${pickup}
🗓 DELIVERY: ${delivery}

🚚 Equipment: ${data.equipment_type || "—"}
⚖️  Weight:    ${data.weight ? data.weight.toLocaleString() + " lbs" : "—"}
📦 Commodity: ${data.commodity || "—"}
💰 Rate:      $${(data.rate || 0).toLocaleString()}

${data.special_instructions ? `⚠️ Special Instructions:\n${data.special_instructions}\n` : ""}
Please log into the HASTEN Driver App to accept and manage this load.

— HASTEN Dispatch Team
      `.trim(),
    });

    return Response.json({ success: true, notified: driver.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});