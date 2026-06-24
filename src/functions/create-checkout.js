Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const { invoiceId, invoiceNumber, amount, customerEmail, customerName } = await req.json();

    if (!invoiceId || !amount || !customerEmail) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://hasten.app";
    const backUrl = `${origin}/client/invoices`;
    const successUrl = `${origin}/client/payment-success?invoiceId=${invoiceId}`;

    const payload = {
      currency: "USD",
      lineItems: [
        {
          name: `Invoice ${invoiceNumber}`,
          description: `Payment for invoice ${invoiceNumber}`,
          quantity: 1,
          price: Math.round(amount * 100), // Convert to cents
          catalogId: "INVOICE_PAYMENT",
        },
      ],
      buyerInfo: {
        email: customerEmail,
        firstName: customerName?.split(" ")[0] || "Customer",
        lastName: customerName?.split(" ")[1] || "",
      },
      checkoutInfo: {
        termsAndConditionsUrl: `${origin}/terms`,
        privacyPolicyUrl: `${origin}/privacy`,
      },
      order: {
        customFields: [
          {
            translatedValues: [
              {
                locale: "en",
                value: invoiceId,
              },
            ],
            title: "Invoice ID",
          },
        ],
      },
      redirects: {
        backButtonUrl: backUrl,
        returnUrl: successUrl,
      },
    };

    const apiKey = Deno.env.get("WIX_PAYMENTS_API_KEY");
    const siteId = Deno.env.get("WIX_PAYMENTS_SITE_ID");

    if (!apiKey || !siteId) {
      console.error("Missing Wix Payments credentials");
      return Response.json({ error: "Payment service not configured" }, { status: 500 });
    }

    const response = await fetch("https://www.wixapis.com/v1/payments/checkout-sessions", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "wix-site-id": siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Wix API error:", error);
      return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    const data = await response.json();
    const checkoutUrl = data.checkoutSession?.redirectUrl;

    if (!checkoutUrl) {
      console.error("No redirect URL in response:", data);
      return Response.json({ error: "No checkout URL returned" }, { status: 500 });
    }

    return Response.json({ checkoutUrl, sessionId: data.checkoutSession?.id });
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});