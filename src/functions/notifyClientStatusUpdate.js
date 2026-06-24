import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Triggered by Load entity automation when status changes to 'loaded' (Picked Up) or 'delivered'
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    // Only fire on meaningful status transitions
    const PICKUP_STATUSES = ['arrived_pickup', 'loaded'];
    const DELIVERY_STATUSES = ['delivered', 'pod_uploaded'];

    const isPickup = PICKUP_STATUSES.includes(newStatus) && !PICKUP_STATUSES.includes(oldStatus);
    const isDelivery = DELIVERY_STATUSES.includes(newStatus) && !DELIVERY_STATUSES.includes(oldStatus);

    if (!isPickup && !isDelivery) {
      return Response.json({ skipped: true, reason: `Status ${newStatus} not monitored or already notified` });
    }

    const loadId = data?.id || event?.entity_id;
    if (!loadId) return Response.json({ error: 'No load ID found' }, { status: 400 });

    // Fetch full load data (in case payload_too_large was set)
    let load = data;
    if (!load?.origin_city) {
      const loads = await base44.asServiceRole.entities.Load.filter({ id: loadId }, '-created_date', 1);
      load = loads[0];
    }
    if (!load) return Response.json({ error: 'Load not found' }, { status: 404 });

    // Fetch client
    const client = load.client_id
      ? (await base44.asServiceRole.entities.Client.filter({ id: load.client_id }, '-created_date', 1))[0]
      : null;

    if (!client?.email) {
      console.log(`No client email for load ${load.load_number || loadId}`);
      return Response.json({ success: true, notified: false, reason: 'No client email' });
    }

    // Fetch recent manifest events for this load
    const manifestEvents = await base44.asServiceRole.entities.Manifest.filter(
      { load_id: loadId },
      '-event_timestamp',
      10
    );

    const latestEvent = manifestEvents[0];
    const eventLocation = latestEvent?.location_city
      ? `${latestEvent.location_city}, ${latestEvent.location_state}`
      : null;

    const eventTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Build email content
    let subject, statusLabel, headline, statusDetails;

    if (isPickup) {
      subject = `📦 Your Shipment Has Been Picked Up — Load ${load.load_number || loadId.slice(-6).toUpperCase()}`;
      statusLabel = 'Picked Up';
      headline = 'Great news — your freight is on its way!';
      statusDetails = `Your shipment was picked up${eventLocation ? ` in ${eventLocation}` : ''} and is now in transit toward its destination.`;
    } else {
      subject = `✅ Delivery Confirmed — Load ${load.load_number || loadId.slice(-6).toUpperCase()}`;
      statusLabel = 'Delivered';
      headline = 'Your shipment has been successfully delivered!';
      statusDetails = `Your freight has arrived${eventLocation ? ` in ${eventLocation}` : ''} and delivery is confirmed.`;
    }

    const etaLine = load.eta
      ? `Scheduled Delivery:  ${new Date(load.eta).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`
      : '';

    const specialInstructions = load.special_instructions
      ? `\nSpecial Instructions:\n${load.special_instructions}\n`
      : '';

    const poLine = load.po_number ? `PO #:                ${load.po_number}\n` : '';
    const bolLine = load.bol_number ? `BOL #:               ${load.bol_number}\n` : '';

    const emailBody = `Hello ${client.contact_name || client.company_name},

${headline}

${statusDetails}

────────────────────────────────────────────
SHIPMENT SUMMARY
────────────────────────────────────────────
Load #:              ${load.load_number || `LD${loadId.slice(-6).toUpperCase()}`}
Status:              ${statusLabel}
Updated:             ${eventTime} (EST)
Origin:              ${load.origin_city}, ${load.origin_state}
Destination:         ${load.destination_city}, ${load.destination_state}
Distance:            ${load.miles ? `${load.miles} miles` : '—'}
Equipment:           ${load.equipment_type || '—'}
Commodity:           ${load.commodity || '—'}
${etaLine}${poLine}${bolLine}${specialInstructions}
────────────────────────────────────────────

You can view live tracking, documents, and your full shipment history in your HASTEN client portal.

For urgent questions, contact our dispatch team directly:
• Email: dispatch@hasten.io
• Support: support@hasten.io

Thank you for choosing HASTEN Logistics.

HASTEN Logistics
Real-time Freight & Transport Solutions`;

    // Notify client
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: client.email,
      subject,
      body: emailBody,
      from_name: 'HASTEN Logistics',
    });
    console.log(`✓ Client notified: ${client.company_name} (${client.email}) — ${statusLabel} for load ${load.load_number}`);

    // Notify broker if assigned
    if (load.broker_id) {
      const broker = (await base44.asServiceRole.entities.Client.filter({ id: load.broker_id }, '-created_date', 1))[0];
      if (broker?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: broker.email,
          subject: `Load Status Update: ${statusLabel} — ${load.load_number || `LD${loadId.slice(-6).toUpperCase()}`}`,
          body: `Load ${load.load_number} status updated to: ${statusLabel}\n\nRoute: ${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}\nUpdated: ${eventTime} (EST)${eventLocation ? `\nLocation: ${eventLocation}` : ''}`,
          from_name: 'HASTEN Logistics',
        }).catch(err => console.error(`Failed to notify broker ${broker.company_name}:`, err));
        console.log(`✓ Broker notified: ${broker.company_name} — ${statusLabel}`);
      }
    }

    return Response.json({
      success: true,
      notified: true,
      statusLabel,
      clientEmail: client.email,
      loadNumber: load.load_number,
    });
  } catch (error) {
    console.error('Error in notifyClientStatusUpdate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});