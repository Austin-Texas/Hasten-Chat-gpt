import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Triggered by Load entity automation when status changes to Picked Up or Delivered
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    // Pickup: arrived_pickup or loaded (first time entering these statuses)
    const PICKUP_STATUSES = ['arrived_pickup', 'loaded'];
    // Delivery: delivered or pod_uploaded (first time entering these statuses)
    const DELIVERY_STATUSES = ['delivered', 'pod_uploaded'];

    const isPickup = PICKUP_STATUSES.includes(newStatus) && !PICKUP_STATUSES.includes(oldStatus);
    const isDelivery = DELIVERY_STATUSES.includes(newStatus) && !DELIVERY_STATUSES.includes(oldStatus);

    if (!isPickup && !isDelivery) {
      return Response.json({ skipped: true, reason: `Status '${newStatus}' not a monitored transition` });
    }

    const loadId = data?.id || event?.entity_id;
    if (!loadId) return Response.json({ error: 'No load ID found' }, { status: 400 });

    // Fetch full load if data is incomplete
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
      return Response.json({ success: true, notified: false, reason: 'No client email found' });
    }

    // Pull most recent manifest event for this load to get location context
    const manifestEvents = await base44.asServiceRole.entities.Manifest.filter(
      { load_id: loadId },
      '-event_timestamp',
      5
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

    // Build tailored email for pickup vs delivery
    let subject, headline, statusLabel, statusDetails;

    if (isPickup) {
      subject = `📦 Shipment Picked Up — Load ${load.load_number || loadId.slice(-6).toUpperCase()}`;
      statusLabel = 'Picked Up';
      headline = "Great news — your freight is on its way!";
      statusDetails = `Your shipment was picked up${eventLocation ? ` in ${eventLocation}` : ''} and is now in transit toward its destination.`;
    } else {
      subject = `✅ Delivery Confirmed — Load ${load.load_number || loadId.slice(-6).toUpperCase()}`;
      statusLabel = 'Delivered';
      headline = "Your shipment has been successfully delivered!";
      statusDetails = `Your freight has arrived${eventLocation ? ` in ${eventLocation}` : ''} and delivery is confirmed.`;
    }

    const etaLine = load.eta
      ? `Scheduled Delivery:  ${new Date(load.eta).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`
      : '';

    const emailBody = `Hello ${client.contact_name || client.company_name},

${headline}

${statusDetails}

────────────────────────────────────────────
SHIPMENT SUMMARY
────────────────────────────────────────────
Load #:              ${load.load_number || `LD${loadId.slice(-6).toUpperCase()}`}
Status:              ${statusLabel}
Updated:             ${eventTime} EST
Origin:              ${load.origin_city}, ${load.origin_state}
Destination:         ${load.destination_city}, ${load.destination_state}
Distance:            ${load.miles ? `${load.miles} miles` : '—'}
Equipment:           ${load.equipment_type || '—'}
Commodity:           ${load.commodity || '—'}
${etaLine}${load.po_number ? `PO #:                ${load.po_number}\n` : ''}${load.bol_number ? `BOL #:               ${load.bol_number}\n` : ''}${load.special_instructions ? `\nNotes: ${load.special_instructions}\n` : ''}
────────────────────────────────────────────

Track your shipment and access documents anytime in your HASTEN client portal.

Questions? Our dispatch team is here to help:
  dispatch@hasten.io

Thank you for choosing HASTEN Logistics.

— HASTEN Logistics Team`;

    // Send to client
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: client.email,
      subject,
      body: emailBody,
      from_name: 'HASTEN Logistics',
    });
    console.log(`✓ Client notified: ${client.company_name} <${client.email}> — [${statusLabel}] Load ${load.load_number}`);

    // Also notify broker if one is assigned
    if (load.broker_id) {
      const broker = (await base44.asServiceRole.entities.Client.filter(
        { id: load.broker_id }, '-created_date', 1
      ))[0];
      if (broker?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: broker.email,
          subject: `[Load Update] ${statusLabel} — ${load.load_number || `LD${loadId.slice(-6).toUpperCase()}`}`,
          body: `Load ${load.load_number} has been marked as ${statusLabel}.\n\nRoute: ${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}\nUpdated: ${eventTime} EST${eventLocation ? `\nLocation: ${eventLocation}` : ''}`,
          from_name: 'HASTEN Logistics',
        }).catch(err => console.error(`Failed to notify broker ${broker.company_name}:`, err));
        console.log(`✓ Broker notified: ${broker.company_name} <${broker.email}>`);
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