import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rc_id, load_id, driver_id, pdf_url } = await req.json();
    if (!rc_id || !driver_id) return Response.json({ error: 'Missing required fields' }, { status: 400 });

    // Update RC status to 'sent'
    await base44.asServiceRole.entities.RateConfirmation.update(rc_id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // Create notification for driver
    await base44.asServiceRole.entities.Notification.create({
      user_id: driver_id,
      role: 'driver',
      title: 'Rate Confirmation Sent',
      message: `A new Rate Confirmation has been sent for your load. Please review and sign.`,
      type: 'custom',
      priority: 'high',
      related_entity_type: 'Load',
      related_entity_id: load_id,
      delivery_channels: ['in_app', 'push'],
      action_url: `/driver/loads/${load_id}/rc`,
      cta_label: 'Review RC',
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'rc_sent',
      user_id: user.id,
      user_role: user.role,
      entity_type: 'RateConfirmation',
      entity_id: rc_id,
      target_user_id: driver_id,
      action_details: `RC sent to driver for load ${load_id}`,
      result: 'success',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ success: true, rc_id });
  } catch (error) {
    console.error('[sendRCToDriver]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});