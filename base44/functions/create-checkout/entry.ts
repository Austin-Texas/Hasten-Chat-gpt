/**
 * create-checkout — Creates a Wix Payments checkout session for an invoice.
 * Accepts invoiceId, optional customerInfo, and payment success/cancel URLs.
 * Returns the checkout redirect URL.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const WIX_API_KEY = Deno.env.get("WIX_PAYMENTS_API_KEY");
const WIX_SITE_ID = Deno.env.get("WIX_PAYMENTS_SITE_ID");

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const origin = req.headers.get("origin");
    if (!origin) {
      return Response.json({ error: "Origin header required" }, { status: 400 });
    }

    const { invoiceId, successUrl, cancelUrl } = await req.json();
    if (!invoiceId) {
      return Response.json({ error: "invoiceId required" }, { status: 400 });
    }

    // Fetch invoice to build cart item
    const base44 = createClientFromRequest(req);
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    const balanceDue = (invoice.balance_due || invoice.total_amount || 0).toString();
    if (parseFloat(balanceDue) <= 0) {
      return Response.json({ error: "Invoice already paid" }, { status: 400 });
    }

    // Create checkout session via Wix Payments API
    const checkoutUrl = "https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct";
    const thankYouUrl = successUrl || `${origin}/client/payment-success`;
    const postFlowUrl = cancelUrl || `${origin}/client/invoices`;

    const checkoutPayload = {
      cart: {
        items: [
          {
            name: `Invoice ${invoice.invoice_number || invoiceId.slice(-6)}`,
            quantity: 1,
            price: balanceDue,
          },
        ],
        // Pre-fill customer info if available
        ...(invoice.customer_email && {
          customerInfo: {
            email: invoice.customer_email,
          },
        }),
      },
      callbackUrls: {
        postFlowUrl,
        thankYouPageUrl: thankYouUrl,
      },
    };

    const checkoutRes = await fetch(checkoutUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID,
      },
      body: JSON.stringify(checkoutPayload),
    });

    if (!checkoutRes.ok) {
      const errData = await checkoutRes.json();
      console.error("[create-checkout] Wix API error:", errData);
      return Response.json(
        { error: errData.message || "Checkout creation failed" },
        { status: checkoutRes.status }
      );
    }

    const { checkoutSession } = await checkoutRes.json();
    
    // Log payment intent to manifest
    await base44.asServiceRole.entities.Manifest.create({
      load_id: invoice.load_id,
      event_type: "note_added",
      event_title: "Payment Initiated",
      event_description: `Payment initiated for invoice ${invoice.invoice_number || invoiceId.slice(-6)} (${balanceDue})`,
      event_timestamp: new Date().toISOString(),
      is_system_event: true,
    }).catch(() => {});

    return Response.json({ redirectUrl: checkoutSession.redirectUrl });
  } catch (error) {
    console.error("[create-checkout]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});