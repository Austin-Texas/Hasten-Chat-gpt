import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Audit Log Helper
 * Records sensitive actions for compliance and security monitoring
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      action,
      user_id,
      user_role,
      entity_type,
      entity_id,
      target_user_id,
      action_details,
      result = 'success',
      reason_denied,
      sensitive_fields_accessed = [],
      old_value,
      new_value
    } = await req.json();

    // Get user IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const ip_address = forwardedFor.split(',')[0].trim() || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Create audit log record
    const logEntry = await base44.asServiceRole.entities.AuditLog.create({
      action,
      user_id,
      user_role,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      target_user_id: target_user_id || null,
      action_details: action_details || null,
      ip_address,
      user_agent,
      result,
      reason_denied: reason_denied || null,
      sensitive_fields_accessed,
      old_value: old_value ? JSON.stringify(old_value) : null,
      new_value: new_value ? JSON.stringify(new_value) : null,
      timestamp: new Date().toISOString()
    });

    // Log to console for immediate debugging
    console.log(`[AUDIT] ${action} by ${user_id} (${user_role}): ${result}`);
    if (result === 'denied') {
      console.warn(`[AUDIT-DENIED] ${action} denied: ${reason_denied}`);
    }
    if (sensitive_fields_accessed.length > 0) {
      console.warn(`[AUDIT-SENSITIVE] Sensitive fields accessed: ${sensitive_fields_accessed.join(',')}`);
    }

    return Response.json({
      success: true,
      log_id: logEntry.id
    });

  } catch (error) {
    console.error('Audit log error:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});