import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, load_id, stop_id, driver_id } = body;

    if (action === 'start_detention') {
      return await startDetention(base44, load_id, stop_id, driver_id);
    } else if (action === 'check_detention') {
      return await checkDetention(base44, load_id, stop_id);
    } else if (action === 'end_detention') {
      return await endDetention(base44, load_id, stop_id);
    } else if (action === 'waive_detention') {
      const { reason, user_id } = body;
      return await waiveDetention(base44, load_id, stop_id, reason, user_id);
    } else if (action === 'dispute_detention') {
      const { notes, user_id } = body;
      return await disputeDetention(base44, load_id, stop_id, notes, user_id);
    } else if (action === 'approve_detention') {
      const { user_id } = body;
      return await approveDetention(base44, load_id, stop_id, user_id);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Detention engine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function startDetention(base44, load_id, stop_id, driver_id) {
  try {
    // Get stop details
    const stops = await base44.asServiceRole.entities.LoadStop.filter({ id: stop_id }, '-created_date', 1);
    const stop = stops[0];
    if (!stop) return Response.json({ error: 'Stop not found' }, { status: 404 });

    // Calculate free period
    const arrived_at = new Date();
    const free_minutes = stop.detention_free_minutes || 120;
    const free_until = new Date(arrived_at.getTime() + free_minutes * 60000);

    // Create detention record
    const detentionRecord = await base44.asServiceRole.entities.DetentionRecord.create({
      load_id,
      stop_id,
      driver_id,
      stop_number: stop.stop_number,
      facility_name: stop.facility_name,
      arrived_at: arrived_at.toISOString(),
      free_until: free_until.toISOString(),
      status: 'free_wait',
      rate_per_hour: stop.detention_rate_per_hour || 50,
    });

    // Update LoadStop
    await base44.asServiceRole.entities.LoadStop.update(stop_id, {
      detention_started_at: arrived_at.toISOString(),
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_started',
      user_id: driver_id,
      user_role: 'driver',
      entity_type: 'DetentionRecord',
      entity_id: detentionRecord.id,
      action_details: `Detention started at stop ${stop.stop_number}: ${stop.facility_name}. Free time: ${free_minutes} minutes.`,
      result: 'success',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    // Manifest event
    await base44.asServiceRole.entities.Manifest.create({
      load_id,
      event_type: 'detention_started',
      event_title: 'Detention Timer Started',
      event_description: `Stop ${stop.stop_number}: ${stop.facility_name}. Free time ${free_minutes} min, then $${stop.detention_rate_per_hour}/hr.`,
      event_timestamp: arrived_at.toISOString(),
      performed_by: driver_id,
      performed_by_role: 'driver',
    }).catch(() => {});

    return Response.json({ 
      success: true, 
      detention_id: detentionRecord.id,
      free_until: free_until.toISOString(),
      free_minutes,
    });
  } catch (error) {
    console.error('startDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function checkDetention(base44, load_id, stop_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter({ 
      load_id, 
      stop_id,
      status: { $in: ['free_wait', 'active'] }
    }, '-created_date', 1);

    if (detentions.length === 0) {
      return Response.json({ status: 'none' });
    }

    const detention = detentions[0];
    const now = new Date();
    const free_until = new Date(detention.free_until);
    const arrived_at = new Date(detention.arrived_at);

    // Calculate time elapsed
    const elapsed_ms = now.getTime() - arrived_at.getTime();
    const total_minutes = Math.floor(elapsed_ms / 60000);

    let currentStatus = detention.status;
    let billable_minutes = 0;
    let billable_amount = 0;

    if (now >= free_until && !detention.detention_ended_at) {
      // Move to active if free period expired
      currentStatus = 'active';
      const detention_start = free_until;
      const billable_ms = now.getTime() - detention_start.getTime();
      billable_minutes = Math.ceil(billable_ms / 60000);
      billable_amount = (billable_minutes / 60) * detention.rate_per_hour;

      // Update detention record
      await base44.asServiceRole.entities.DetentionRecord.update(detention.id, {
        status: 'active',
        detention_started_at: detention_start.toISOString(),
        total_minutes,
        billable_minutes,
        billable_amount,
      });
    } else if (detention.detention_ended_at) {
      currentStatus = 'resolved';
      billable_minutes = detention.billable_minutes || 0;
      billable_amount = detention.billable_amount || 0;
    } else if (currentStatus === 'active') {
      billable_minutes = detention.billable_minutes || 0;
      billable_amount = detention.billable_amount || 0;
    }

    // Check if should alert dispatcher (30 min before free time ends)
    const minutesUntilBillable = Math.floor((free_until.getTime() - now.getTime()) / 60000);
    const shouldAlert = minutesUntilBillable <= 30 && minutesUntilBillable > 0 && detention.status === 'free_wait';

    if (shouldAlert) {
      const load = (await base44.asServiceRole.entities.Load.filter({ id: load_id }, '-created_date', 1))[0];
      if (load?.dispatcher_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: load.dispatcher_id,
          role: 'dispatcher',
          title: 'Detention Alert',
          message: `Free time ending in ${minutesUntilBillable} minutes at Stop ${detention.stop_number}: ${detention.facility_name}`,
          type: 'custom',
          priority: 'high',
          related_entity_type: 'DetentionRecord',
          related_entity_id: detention.id,
          delivery_channels: ['in_app'],
        }).catch(() => {});
      }
    }

    return Response.json({
      detention_id: detention.id,
      status: currentStatus,
      total_minutes,
      billable_minutes,
      billable_amount: parseFloat(billable_amount.toFixed(2)),
      free_until: detention.free_until,
      rate_per_hour: detention.rate_per_hour,
      alert_dispatcher: shouldAlert,
    });
  } catch (error) {
    console.error('checkDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function endDetention(base44, load_id, stop_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter({ 
      load_id, 
      stop_id,
      status: { $in: ['free_wait', 'active'] }
    }, '-created_date', 1);

    if (detentions.length === 0) {
      return Response.json({ error: 'No active detention' }, { status: 404 });
    }

    const detention = detentions[0];
    const now = new Date();
    const arrived_at = new Date(detention.arrived_at);
    const free_until = new Date(detention.free_until);
    
    const total_minutes = Math.floor((now.getTime() - arrived_at.getTime()) / 60000);
    let billable_minutes = 0;
    let billable_amount = 0;

    if (now > free_until) {
      const billable_ms = now.getTime() - free_until.getTime();
      billable_minutes = Math.ceil(billable_ms / 60000);
      billable_amount = (billable_minutes / 60) * detention.rate_per_hour;
    }

    // Update detention record
    await base44.asServiceRole.entities.DetentionRecord.update(detention.id, {
      status: billable_minutes > 0 ? 'resolved' : 'free_wait',
      detention_ended_at: now.toISOString(),
      total_minutes,
      billable_minutes,
      billable_amount,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_ended',
      user_id: detention.driver_id,
      user_role: 'driver',
      entity_type: 'DetentionRecord',
      entity_id: detention.id,
      action_details: `Detention ended at stop ${detention.stop_number}. Total: ${total_minutes} min, Billable: ${billable_minutes} min, Amount: $${billable_amount.toFixed(2)}`,
      result: 'success',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    // Manifest event
    await base44.asServiceRole.entities.Manifest.create({
      load_id,
      event_type: 'detention_ended',
      event_title: 'Detention Completed',
      event_description: `Stop ${detention.stop_number}: ${total_minutes}min total, $${billable_amount.toFixed(2)} billable.`,
      event_timestamp: now.toISOString(),
      performed_by: detention.driver_id,
      performed_by_role: 'driver',
    }).catch(() => {});

    return Response.json({
      detention_id: detention.id,
      total_minutes,
      billable_minutes,
      billable_amount: parseFloat(billable_amount.toFixed(2)),
      status: billable_minutes > 0 ? 'resolved' : 'free_wait',
    });
  } catch (error) {
    console.error('endDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function waiveDetention(base44, load_id, stop_id, reason, user_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter({ 
      load_id, 
      stop_id,
      status: 'resolved'
    }, '-created_date', 1);

    if (detentions.length === 0) {
      return Response.json({ error: 'No detention record found' }, { status: 404 });
    }

    const detention = detentions[0];
    const now = new Date();

    await base44.asServiceRole.entities.DetentionRecord.update(detention.id, {
      status: 'waived',
      waived: true,
      waived_reason: reason,
      waived_by: user_id,
      waived_at: now.toISOString(),
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_waived',
      user_id,
      user_role: 'dispatcher',
      entity_type: 'DetentionRecord',
      entity_id: detention.id,
      action_details: `Detention waived: ${reason}`,
      result: 'success',
      timestamp: now.toISOString(),
    }).catch(() => {});

    // Manifest event
    await base44.asServiceRole.entities.Manifest.create({
      load_id,
      event_type: 'detention_waived',
      event_title: 'Detention Waived',
      event_description: `Stop ${detention.stop_number}: $${detention.billable_amount} waived. Reason: ${reason}`,
      event_timestamp: now.toISOString(),
      performed_by: user_id,
      performed_by_role: 'dispatcher',
    }).catch(() => {});

    return Response.json({ 
      success: true,
      detention_id: detention.id,
      status: 'waived',
    });
  } catch (error) {
    console.error('waiveDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function disputeDetention(base44, load_id, stop_id, notes, user_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter({ 
      load_id, 
      stop_id,
      status: 'resolved'
    }, '-created_date', 1);

    if (detentions.length === 0) {
      return Response.json({ error: 'No detention record found' }, { status: 404 });
    }

    const detention = detentions[0];
    const now = new Date();

    await base44.asServiceRole.entities.DetentionRecord.update(detention.id, {
      status: 'disputed',
      dispute_notes: notes,
      disputed_by: user_id,
      disputed_at: now.toISOString(),
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_disputed',
      user_id,
      user_role: 'driver',
      entity_type: 'DetentionRecord',
      entity_id: detention.id,
      action_details: `Detention disputed: ${notes}`,
      result: 'success',
      timestamp: now.toISOString(),
    }).catch(() => {});

    return Response.json({ 
      success: true,
      detention_id: detention.id,
      status: 'disputed',
    });
  } catch (error) {
    console.error('disputeDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function approveDetention(base44, load_id, stop_id, user_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter({ 
      load_id, 
      stop_id
    }, '-created_date', 1);

    if (detentions.length === 0) {
      return Response.json({ error: 'No detention record found' }, { status: 404 });
    }

    const detention = detentions[0];
    const now = new Date();

    await base44.asServiceRole.entities.DetentionRecord.update(detention.id, {
      approved_by: user_id,
      approved_at: now.toISOString(),
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_approved',
      user_id,
      user_role: 'dispatcher',
      entity_type: 'DetentionRecord',
      entity_id: detention.id,
      action_details: `Detention approved for billing: $${detention.billable_amount}`,
      result: 'success',
      timestamp: now.toISOString(),
    }).catch(() => {});

    return Response.json({ 
      success: true,
      detention_id: detention.id,
      billable_amount: detention.billable_amount,
    });
  } catch (error) {
    console.error('approveDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}