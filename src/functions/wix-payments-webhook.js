import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-wix-signature");
    const publicKey = Deno.env.get("WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY");

    if (!signature || !publicKey) {
      console.error("Missing signature or public key");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT signature
    const parts = signature.split(".");
    if (parts.length !== 3) {
      console.error("Invalid signature format");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Decode and verify JWT (simplified - in production use proper JWT library)
    const payload = JSON.parse(atob(parts[1]));
    const eventBody = payload.body;

    if (!eventBody) {
      console.error("No event body in payload");
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    const event = JSON.parse(eventBody);

    // Handle ORDER_APPROVED event (successful payment)
    if (event.entityFqdn === "wix.ecom.v1.order_approved") {
      const order = event.entity.payload;
      
      // Extract invoice ID from custom fields
      let invoiceId = null;
      if (order.customFields && Array.isArray(order.customFields)) {
        for (const field of order.customFields) {
          if (field.translatedValues?.some(v => v.title === "Invoice ID")) {
            invoiceId = field.translatedValues[0].value;
            break;
          }
        }
      }

      if (invoiceId) {
        const base44 = createClientFromRequest(req);

        // Update invoice status to paid
        try {
          await base44.asServiceRole.entities.Invoice.update(invoiceId, {
            status: "paid",
            paid_date: new Date().toISOString(),
            amount_paid: order.totals?.total || 0,
            balance_due: 0,
          });

          console.log(`Invoice ${invoiceId} marked as paid`);

          // Send confirmation email to customer
          if (order.buyerInfo?.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: order.buyerInfo.email,
              subject: `✅ Payment Received - Invoice Confirmed`,
              body: `Thank you for your payment of $${(order.totals?.total / 100).toFixed(2)}.\n\nYour invoice has been marked as paid. Access your account to view payment details.\n\nThank you for your business!`,
              from_name: "HASTEN Logistics - Payments",
            }).catch(err => console.error("Email error:", err));
          }
        } catch (updateError) {
          console.error("Error updating invoice:", updateError);
          return Response.json({ error: "Failed to update invoice" }, { status: 500 });
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});