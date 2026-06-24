import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { rc_id, signature_base64, action = 'sign', reason, clarification } = body;
    if (!rc_id) return Response.json({ error: 'Missing rc_id' }, { status: 400 });

    // Fetch RC
    const [rcs] = await Promise.all([
      base44.asServiceRole.entities.RateConfirmation.filter({ id: rc_id }, '-created_date', 1),
    ]);
    const rc = rcs[0];
    if (!rc) return Response.json({ error: 'RC not found' }, { status: 404 });

    // Handle different actions
    if (action === 'sign' && signature_base64) {
      // Upload signature (minimal hash for demo)
      const signatureHash = btoa(signature_base64.slice(0, 100));
      
      await base44.asServiceRole.entities.RateConfirmation.update(rc_id, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_hash: signatureHash,
        signature_image_url: signature_base64,
      });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'rc_signed',
        user_id: user.id,
        user_role: 'driver',
        entity_type: 'RateConfirmation',
        entity_id: rc_id,
        action_details: `Driver signed RC for load ${rc.load_id}`,
        result: 'success',
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      // Notify dispatcher
      const [loads] = await base44.asServiceRole.entities.Load.filter({ id: rc.load_id }, '-created_date', 1);
      if (loads && loads.dispatcher_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: loads.dispatcher_id,
          role: 'dispatcher',
          title: 'RC Signed',
          message: `Driver signed the Rate Confirmation for load ${loads.load_number || `#${loads.id?.slice(-6)}`}`,
          type: 'custom',
          priority: 'high',
          related_entity_type: 'Load',
          related_entity_id: rc.load_id,
          delivery_channels: ['in_app'],
        }).catch(() => {});
      }
    } else if (action === 'reject') {
      await base44.asServiceRole.entities.RateConfirmation.update(rc_id, {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || 'No reason provided',
      });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'rc_rejected',
        user_id: user.id,
        user_role: 'driver',
        entity_type: 'RateConfirmation',
        entity_id: rc_id,
        action_details: `Driver rejected RC: ${reason}`,
        result: 'success',
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    } else if (action === 'clarify') {
      await base44.asServiceRole.entities.RateConfirmation.update(rc_id, {
        clarification_request: clarification,
      });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'rc_clarification_requested',
        user_id: user.id,
        user_role: 'driver',
        entity_type: 'RateConfirmation',
        entity_id: rc_id,
        action_details: `Driver requested clarification: ${clarification}`,
        result: 'success',
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    return Response.json({ success: true, status: action });
  } catch (error) {
    console.error('[processRCSignature]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});