/**
 * wix-payments-webhook — handles Base44 Payments webhooks (order approved).
 * Verifies JWT signature, then updates invoice payment status + logs to manifest.
 * Only handles ORDER_APPROVED (payment successful) — subscription webhooks are optional.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { verifySignature } from "npm:jsonwebtoken";

const PUBLIC_KEY = Deno.env.get("WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY");
if (!PUBLIC_KEY) {
  console.warn("[wix-payments-webhook] WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY not set");
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-wix-signature");
    if (!signature) {
      console.error("[wix-payments-webhook] Missing signature");
      return Response.json({ error: "Missing signature" }, { status: 401 });
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = verifySignature(signature, PUBLIC_KEY, { algorithms: ["RS256"] });
    } catch (err) {
      console.error("[wix-payments-webhook] Signature verification failed:", err.message);
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse event — only care about ORDER_APPROVED
    const event = decoded.event;
    if (!event) {
      return Response.json({ error: "No event in payload" }, { status: 400 });
    }

    const eventType = event.type || event.entityFqdn?.split("/")?.pop();
    if (eventType !== "ORDER_APPROVED" && !eventType?.includes("order_approved")) {
      // Ignore non-order-approved events
      return Response.json({ status: "ignored" });
    }

    // Extract order data from event
    const order = event.data?.entity || event.data?.order;
    if (!order) {
      console.warn("[wix-payments-webhook] No order in event data");
      return Response.json({ status: "no_order_data" });
    }

    const base44 = createClientFromRequest(req);

    // Try to match invoice by cart line item or checkout session ID
    // Wix passes back items with original names; we set invoice# as item name
    const lineItems = order.lineItems || [];
    let invoiceId = null;

    // Pattern: item.name = "Invoice <invoice_id>" or just invoice number
    for (const item of lineItems) {
      if (item.name?.includes("Invoice")) {
        // Extract invoice_id from "Invoice <invoice_number>" or similar
        const match = item.name.match(/Invoice\s+(\S+)/);
        if (match) {
          // Try to fetch invoice by invoice_number first
          const invoices = await base44.asServiceRole.entities.Invoice.filter(
            { invoice_number: match[1] },
            "-created_date",
            1
          ).catch(() => []);
          if (invoices.length > 0) {
            invoiceId = invoices[0].id;
            break;
          }
        }
      }
    }

    if (!invoiceId) {
      console.warn("[wix-payments-webhook] Could not find invoice from order", order);
      return Response.json({ status: "invoice_not_found" }, { status: 404 });
    }

    // Fetch invoice to get load_id for manifest logging
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
    if (!invoice) {
      console.warn("[wix-payments-webhook] Invoice deleted or not found:", invoiceId);
      return Response.json({ status: "invoice_deleted" }, { status: 404 });
    }

    // Update invoice payment status
    const totalPrice = order.total?.amount || order.totals?.total?.amount || "0";
    const amountPaid = parseFloat(totalPrice) || invoice.total_amount || 0;
    const newStatus = amountPaid >= (invoice.total_amount || 0) ? "paid" : "partial";

    await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      status: newStatus,
      amount_paid: amountPaid,
      paid_date: new Date().toISOString(),
    });

    // Log to manifest
    if (invoice.load_id) {
      await base44.asServiceRole.entities.Manifest.create({
        load_id: invoice.load_id,
        event_type: "note_added",
        event_title: "Invoice Payment Received",
        event_description: `Payment of $${amountPaid} received for invoice ${invoice.invoice_number}`,
        event_timestamp: new Date().toISOString(),
        is_system_event: true,
      }).catch(() => {});
    }

    // Audit log: payment received
    await base44.asServiceRole.entities.AuditLog.create({
      action: "invoice_payment_status_changed",
      user_id: "system",
      user_role: "system",
      result: "success",
      entity_type: "Invoice",
      entity_id: invoiceId,
      action_details: `Invoice payment received: $${amountPaid}, status changed to ${newStatus}`,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    // Notify client via email
    base44.asServiceRole.integrations.Core.SendEmail({
      to: order.buyerEmail || invoice.client_email,
      subject: `Payment Confirmed — Invoice ${invoice.invoice_number}`,
      body: `Dear Customer,\n\nThank you! We've received your payment of $${amountPaid} for invoice ${invoice.invoice_number}.\n\nYour shipment details:\n- Load: ${invoice.load_id || "—"}\n- Amount: $${amountPaid}\n\nHASTEN Freight`,
    }).catch(() => {});

    console.log(`[wix-payments-webhook] Invoice ${invoiceId} marked as ${newStatus} ($${amountPaid})`);
    return Response.json({ status: "success", invoiceId, newStatus, amountPaid });
  } catch (error) {
    console.error("[wix-payments-webhook]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});