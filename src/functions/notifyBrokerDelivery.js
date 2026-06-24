import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { load_id } = await req.json();

    if (!load_id) {
      return Response.json({ error: 'load_id required' }, { status: 400 });
    }

    // Fetch load and broker details
    const load = await base44.asServiceRole.entities.Load.get(load_id);
    if (!load) {
      return Response.json({ error: 'Load not found' }, { status: 404 });
    }

    const broker = await base44.asServiceRole.entities.Client.get(load.broker_id || load.client_id);
    if (!broker || !broker.email) {
      return Response.json({ success: true, message: 'No broker email found, skipping notification' });
    }

    // Format delivery summary
    const deliveryDate = load.actual_delivery ? new Date(load.actual_delivery).toLocaleDateString() : 'N/A';
    const pickupDate = load.actual_pickup ? new Date(load.actual_pickup).toLocaleDateString() : 'N/A';
    
    const daysInTransit = load.actual_pickup && load.actual_delivery 
      ? Math.round((new Date(load.actual_delivery) - new Date(load.actual_pickup)) / (1000 * 60 * 60 * 24))
      : 0;

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
    .header { background: linear-gradient(135deg, #EA580C, #F97316); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #EA580C; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: 600; color: #666; }
    .value { color: #333; }
    .highlight { color: #EA580C; font-weight: 600; }
    .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">Load Delivered ✓</h2>
    <p style="margin: 5px 0 0 0; font-size: 14px;">HASTEN Freight Management</p>
  </div>
  <div class="content">
    <p>Hello ${broker.contact_name || broker.company_name},</p>
    <p>Your load has been successfully delivered. Here's the delivery summary:</p>
    
    <div class="details">
      <div class="row">
        <span class="label">Load Number:</span>
        <span class="value highlight">${load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}</span>
      </div>
      <div class="row">
        <span class="label">Route:</span>
        <span class="value">${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}</span>
      </div>
      <div class="row">
        <span class="label">Distance:</span>
        <span class="value">${load.miles || 'N/A'} miles</span>
      </div>
      <div class="row">
        <span class="label">Equipment:</span>
        <span class="value">${load.equipment_type || 'N/A'}</span>
      </div>
      <div class="row">
        <span class="label">Commodity:</span>
        <span class="value">${load.commodity || 'N/A'}</span>
      </div>
    </div>

    <div class="details">
      <div class="row">
        <span class="label">Picked Up:</span>
        <span class="value">${pickupDate}</span>
      </div>
      <div class="row">
        <span class="label">Delivered:</span>
        <span class="value highlight">${deliveryDate}</span>
      </div>
      <div class="row">
        <span class="label">Transit Time:</span>
        <span class="value">${daysInTransit} day${daysInTransit !== 1 ? 's' : ''}</span>
      </div>
      <div class="row">
        <span class="label">Revenue:</span>
        <span class="value highlight">$${(load.rate || 0).toLocaleString()}</span>
      </div>
    </div>

    <p style="margin-top: 20px; color: #666;">
      POD status: <strong>${load.pod_status || 'pending'}</strong>
      ${load.pod_url ? ' — <a href="' + load.pod_url + '" style="color: #EA580C; text-decoration: none;">View POD</a>' : ''}
    </p>

    <p style="margin-top: 20px; color: #666;">
      If you have any questions about this delivery, please contact your dispatcher or reply to this email.
    </p>

    <div class="footer">
      <p>This is an automated notification from HASTEN Freight Management.</p>
      <p>© 2026 HASTEN. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email using integrations
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: broker.email,
      subject: `Load ${load.load_number || load.id?.slice(-6)} Delivered - ${load.destination_city}, ${load.destination_state}`,
      body: emailBody,
      from_name: 'HASTEN Dispatch',
    });

    return Response.json({ success: true, message: 'Broker notification sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});