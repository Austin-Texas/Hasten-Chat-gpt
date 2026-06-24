import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { client_id, old_data, data } = await req.json();

    if (!client_id || !data) {
      return Response.json({ error: 'client_id and data required' }, { status: 400 });
    }

    const broker = data;
    const oldBroker = old_data || {};
    
    // Only alert for brokers/shippers with payment issues
    if (broker.type !== 'broker' && broker.type !== 'shipper') {
      return Response.json({ success: true, message: 'Not a broker/shipper, skipping' });
    }

    let alertReason = '';
    let alertLevel = 'warning'; // warning or critical

    // Check credit rating drop (threshold: 70)
    const oldRating = oldBroker.credit_limit || 100;
    const newRating = broker.credit_limit || 100;
    if (newRating < oldRating && newRating < 70) {
      alertReason = `Credit limit dropped from $${oldRating.toLocaleString()} to $${newRating.toLocaleString()} — RISK THRESHOLD TRIGGERED`;
      alertLevel = 'critical';
    } else if (newRating < 50) {
      alertReason = `Critical credit limit: $${newRating.toLocaleString()} — Recommend pausing new loads`;
      alertLevel = 'critical';
    }

    // Check payment status (if stored on Client entity)
    // Status field typically: active, inactive, prospect, suspended
    if (broker.status === 'suspended' && oldBroker.status !== 'suspended') {
      alertReason = `Broker status changed to SUSPENDED — DO NOT accept new loads`;
      alertLevel = 'critical';
    }

    // If no alert needed, return
    if (!alertReason) {
      return Response.json({ success: true, message: 'No alert triggered' });
    }

    // Get dispatcher to notify (for now, notify all admins)
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 50);

    // Send alert emails to all dispatchers
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
    .header { background: ${alertLevel === 'critical' ? '#DC2626' : '#F59E0B'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .alert-box { background: ${alertLevel === 'critical' ? '#FEE2E2' : '#FEF3C7'}; border: 2px solid ${alertLevel === 'critical' ? '#DC2626' : '#F59E0B'}; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .alert-text { color: ${alertLevel === 'critical' ? '#DC2626' : '#D97706'}; font-weight: 600; font-size: 16px; }
    .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${alertLevel === 'critical' ? '#DC2626' : '#F59E0B'}; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: 600; color: #666; }
    .value { color: #333; }
    .action-btn { display: inline-block; margin-top: 15px; padding: 10px 20px; background: ${alertLevel === 'critical' ? '#DC2626' : '#F59E0B'}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">⚠️ Broker Credit Alert</h2>
    <p style="margin: 5px 0 0 0; font-size: 14px;">ACTION REQUIRED</p>
  </div>
  <div class="content">
    <p>Hello Dispatcher,</p>
    
    <div class="alert-box">
      <div class="alert-text">${alertReason}</div>
    </div>

    <div class="details">
      <div class="row">
        <span class="label">Broker/Shipper:</span>
        <span class="value">${broker.company_name}</span>
      </div>
      <div class="row">
        <span class="label">Contact:</span>
        <span class="value">${broker.contact_name || 'N/A'}</span>
      </div>
      <div class="row">
        <span class="label">Type:</span>
        <span class="value">${broker.type}</span>
      </div>
      <div class="row">
        <span class="label">Current Status:</span>
        <span class="value" style="color: ${broker.status === 'suspended' ? '#DC2626' : broker.status === 'inactive' ? '#F59E0B' : '#22C55E'}; font-weight: 600;">
          ${broker.status}
        </span>
      </div>
      <div class="row">
        <span class="label">Credit Limit:</span>
        <span class="value">$${(broker.credit_limit || 0).toLocaleString()}</span>
      </div>
      <div class="row">
        <span class="label">Payment Terms:</span>
        <span class="value">${broker.payment_terms || 'N/A'}</span>
      </div>
    </div>

    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <p style="margin: 0; color: #1E40AF; font-weight: 600;">Recommended Actions:</p>
      <ul style="margin: 10px 0 0 20px; color: #1E40AF;">
        <li>Review broker's payment history and outstanding invoices</li>
        <li>Consider pausing new load assignments to this broker</li>
        <li>Follow up on outstanding payments</li>
        <li>Mark broker status as "suspended" if necessary to block new loads</li>
      </ul>
    </div>

    <a href="https://app.hasten.local/crm/${client_id}" class="action-btn">Review Broker Profile</a>

    <div class="footer">
      <p>This is an automated alert from HASTEN CRM.</p>
      <p>© 2026 HASTEN. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send to all admin dispatchers
    await Promise.all(
      admins.map(admin =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `⚠️ URGENT: Broker Credit Alert - ${broker.company_name}`,
          body: emailBody,
          from_name: 'HASTEN CRM',
        }).catch(e => console.error(`Failed to send to ${admin.email}:`, e.message))
      )
    );

    return Response.json({ 
      success: true, 
      message: `Broker credit alert sent to ${admins.length} dispatcher(s)`,
      alertLevel,
      alertReason
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});