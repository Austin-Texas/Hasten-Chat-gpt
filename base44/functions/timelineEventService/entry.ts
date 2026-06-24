import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Timeline Event Service
 * 
 * Universal event logging for all operational events in HASTEN.
 * Called by automations to log every significant action across the system.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const {
      actorId,
      actorRole,
      actorName = 'System',
      entityType,
      entityId,
      entityDisplay,
      action,
      summary,
      details = '',
      metadata = {},
      icon = 'Clock',
      color = 'slate',
      autoFetch = true
    } = payload;

    // Validate required fields
    if (!actorId || !actorRole || !entityType || !entityId || !action || !summary) {
      return Response.json({
        error: 'Missing required fields: actorId, actorRole, entityType, entityId, action, summary'
      }, { status: 400 });
    }

    // Determine icon and color based on action if not provided
    const actionConfig = {
      created: { icon: 'Plus', color: 'green' },
      updated: { icon: 'Edit', color: 'blue' },
      assigned: { icon: 'User', color: 'orange' },
      uploaded: { icon: 'Upload', color: 'cyan' },
      approved: { icon: 'CheckCircle', color: 'green' },
      rejected: { icon: 'XCircle', color: 'red' },
      signed: { icon: 'PenTool', color: 'purple' },
      invoiced: { icon: 'FileText', color: 'amber' },
      paid: { icon: 'DollarSign', color: 'green' },
      completed: { icon: 'CheckSquare', color: 'green' },
      cancelled: { icon: 'XSquare', color: 'red' },
      viewed: { icon: 'Eye', color: 'slate' },
      commented: { icon: 'MessageSquare', color: 'blue' }
    };

    const config = actionConfig[action] || { icon, color };

    // Create timeline event
    const event = await base44.asServiceRole.entities.TimelineEvent.create({
      actorId,
      actorRole,
      actorName,
      entityType,
      entityId,
      entityDisplay: entityDisplay || entityId,
      action,
      summary,
      details,
      metadata,
      icon: config.icon,
      color: config.color,
      timestamp: new Date().toISOString()
    });

    console.log(`Timeline event created: ${action} on ${entityType}(${entityId})`);

    return Response.json({
      success: true,
      eventId: event.id,
      action,
      entityType,
      entityId
    });

  } catch (error) {
    console.error('Timeline event service error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});