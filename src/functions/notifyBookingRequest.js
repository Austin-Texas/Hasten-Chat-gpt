import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();

    // Extract QuoteRequest data
    if (!event.entity?.payload) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    const quoteRequest = event.entity.payload;
    const entityId = event.entity.id;

    // Get all dispatch/admin users
    const users = await base44.asServiceRole.entities.User.list("-created_date", 50);
    const dispatchTeam = users.filter(u => ["admin", "dispatcher"].includes(u.role));

    if (dispatchTeam.length === 0) {
      console.log("No dispatch team members found to notify");
      return Response.json({ success: true, notified: 0 });
    }

    // Format location info
    const originLocation = `${quoteRequest.origin_city}, ${quoteRequest.origin_state} ${quoteRequest.origin_zip || ""}`.trim();
    const destLocation = `${quoteRequest.destination_city}, ${quoteRequest.destination_state} ${quoteRequest.destination_zip || ""}`.trim();
    const pickupDate = quoteRequest.pickup_date ? new Date(quoteRequest.pickup_date).toLocaleDateString() : "Not specified";
    const deliveryDate = quoteRequest.delivery_date ? new Date(quoteRequest.delivery_date).toLocaleDateString() : "Not specified";

    // Build email notification for dispatch team
    const emailBody = `NEW BOOKING REQUEST SUBMITTED

📍 Route: ${originLocation} → ${destLocation}

📦 Shipment Details:
  • Commodity: ${quoteRequest.commodity || "Not specified"}
  • Weight: ${quoteRequest.weight ? quoteRequest.weight.toLocaleString() + " lbs" : "Not specified"}
  • Pieces: ${quoteRequest.pieces || "Not specified"}
  • Equipment: ${quoteRequest.equipment_type || "Not specified"}
  • Hazmat: ${quoteRequest.is_hazmat ? "YES" : "No"}

📅 Dates:
  • Pickup: ${pickupDate}
  • Delivery: ${deliveryDate}
  • Est. Miles: ${quoteRequest.estimated_miles || "Not specified"}

📝 Special Requirements:
${quoteRequest.special_requirements || "None"}

---
REQUEST ID: ${entityId}

Review and respond to this booking in your dispatch dashboard.`;

    let notifiedCount = 0;

    // Send notifications
    for (const user of dispatchTeam) {
      if (user.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject: `📬 New Booking Request: ${originLocation} → ${destLocation}`,
            body: emailBody,
            from_name: "HASTEN Bookings",
          });
          notifiedCount++;
        } catch (err) {
          console.error(`Failed to notify ${user.email}:`, err);
        }
      }
    }

    console.log(`Notified ${notifiedCount} dispatch team members`);

    return Response.json({
      success: true,
      notified: notifiedCount,
      quoteRequestId: entityId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error notifying booking request:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});