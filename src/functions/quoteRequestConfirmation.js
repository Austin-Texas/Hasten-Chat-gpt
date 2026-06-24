import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create' || !data) {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }

    const quoteRequest = data;
    if (!quoteRequest.requester_email) {
      return Response.json({ error: 'No email provided' }, { status: 400 });
    }

    // Format route info
    const route = `${quoteRequest.origin_city}, ${quoteRequest.origin_state} → ${quoteRequest.destination_city}, ${quoteRequest.destination_state}`;
    const pickupDate = quoteRequest.pickup_date ? new Date(quoteRequest.pickup_date).toLocaleDateString() : 'TBD';
    const company = quoteRequest.company_name || quoteRequest.requester_name;

    // Send confirmation email
    await base44.integrations.Core.SendEmail({
      to: quoteRequest.requester_email,
      subject: `Quote Request Received - ${quoteRequest.origin_city} to ${quoteRequest.destination_city}`,
      body: `Hello ${quoteRequest.requester_name},

Thank you for requesting a quote with HASTEN Logistics!

We have received your shipping request and our team is currently reviewing it. Here's a summary of what we received:

**Shipment Details:**
• Route: ${route}
• Equipment: ${quoteRequest.equipment_type || 'Not specified'}
• Pickup Date: ${pickupDate}
${quoteRequest.weight ? `• Weight: ${quoteRequest.weight} lbs\n` : ''}${quoteRequest.commodity ? `• Commodity: ${quoteRequest.commodity}\n` : ''}${quoteRequest.is_hazmat ? '• Special Handling: HAZMAT\n' : ''}

**Your Contact Info:**
• Name: ${quoteRequest.requester_name}
• Phone: ${quoteRequest.requester_phone}
• Company: ${company}

We'll review your request and send you a competitive quote within 24 hours. If we have any questions, we'll reach out at the phone number above.

Thank you for choosing HASTEN Logistics!

Best regards,
HASTEN Logistics Team
support@hastenlogistics.com`,
      from_name: "HASTEN Logistics",
    });

    return Response.json({ success: true, message: `Confirmation email sent to ${quoteRequest.requester_email}` });
  } catch (error) {
    console.error('Error sending quote confirmation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});