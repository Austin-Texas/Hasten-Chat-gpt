import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, detention_id } = body;

    if (action === 'submit_for_approval') {
      return await submitForApproval(base44, detention_id, user.id);
    } else if (action === 'review_detention') {
      const { billable_minutes_reviewed, review_notes } = body;
      return await reviewDetention(base44, detention_id, billable_minutes_reviewed, review_notes, user.id);
    } else if (action === 'approve_detention') {
      return await approveDetention(base44, detention_id, user.id);
    } else if (action === 'reject_detention') {
      const { rejection_reason } = body;
      return await rejectDetention(base44, detention_id, rejection_reason, user.id);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Approval workflow error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function submitForApproval(base44, detention_id, user_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter(
      { id: detention_id },
      '-created_date',
      1
    );
    if (detentions.length === 0) {
      return Response.json({ error: 'Detention record not found' }, { status: 404 });
    }

    const detention = detentions[0];
    if (detention.status !== 'resolved') {
      return Response.json({ error: 'Only resolved detentions can be submitted' }, { status: 400 });
    }

    // Move to pending_approval
    await base44.asServiceRole.entities.DetentionRecord.update(detention_id, {
      status: 'pending_approval',
      billable_minutes_reviewed: detention.billable_minutes,
      billable_amount_reviewed: detention.billable_amount,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_submitted_for_approval',
      user_id,
      user_role: 'dispatcher',
      entity_type: 'DetentionRecord',
      entity_id: detention_id,
      action_details: `Detention submitted for manager approval: ${detention.billable_minutes} min @ $${detention.billable_amount}`,
      result: 'success',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    // Manifest event
    const load = (await base44.asServiceRole.entities.Load.filter({ id: detention.load_id }, '-created_date', 1))[0];
    if (load) {
      await base44.asServiceRole.entities.Manifest.create({
        load_id: detention.load_id,
        event_type: 'detention_submitted_for_approval',
        event_title: 'Detention Submitted for Approval',
        event_description: `Stop ${detention.stop_number}: ${detention.billable_minutes} billable min, $${detention.billable_amount.toFixed(2)} pending review`,
        event_timestamp: new Date().toISOString(),
        performed_by: user_id,
        performed_by_role: 'dispatcher',
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      detention_id,
      status: 'pending_approval',
    });
  } catch (error) {
    console.error('submitForApproval error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function reviewDetention(base44, detention_id, billable_minutes_reviewed, review_notes, user_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter(
      { id: detention_id },
      '-created_date',
      1
    );
    if (detentions.length === 0) {
      return Response.json({ error: 'Detention record not found' }, { status: 404 });
    }

    const detention = detentions[0];
    const billable_amount_reviewed = (billable_minutes_reviewed / 60) * detention.rate_per_hour;

    // Update with reviewed amounts
    await base44.asServiceRole.entities.DetentionRecord.update(detention_id, {
      billable_minutes_reviewed,
      billable_amount_reviewed,
      review_notes,
      reviewed_by: user_id,
      reviewed_at: new Date().toISOString(),
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_reviewed',
      user_id,
      user_role: 'manager',
      entity_type: 'DetentionRecord',
      entity_id: detention_id,
      action_details: `Detention reviewed: Original ${detention.billable_minutes}min → ${billable_minutes_reviewed}min. Notes: ${review_notes}`,
      result: 'success',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      success: true,
      detention_id,
      billable_minutes_reviewed,
      billable_amount_reviewed: parseFloat(billable_amount_reviewed.toFixed(2)),
      review_notes,
    });
  } catch (error) {
    console.error('reviewDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function approveDetention(base44, detention_id, user_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter(
      { id: detention_id },
      '-created_date',
      1
    );
    if (detentions.length === 0) {
      return Response.json({ error: 'Detention record not found' }, { status: 404 });
    }

    const detention = detentions[0];
    if (detention.status !== 'pending_approval') {
      return Response.json({ error: 'Only pending_approval records can be approved' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const finalBillableMinutes = detention.billable_minutes_reviewed || detention.billable_minutes;
    const finalBillableAmount = detention.billable_amount_reviewed || detention.billable_amount;

    // Move to approved
    await base44.asServiceRole.entities.DetentionRecord.update(detention_id, {
      status: 'approved',
      approved_by: user_id,
      approved_at: now,
      billable_minutes: finalBillableMinutes,
      billable_amount: finalBillableAmount,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_approved',
      user_id,
      user_role: 'manager',
      entity_type: 'DetentionRecord',
      entity_id: detention_id,
      action_details: `Detention approved for billing: ${finalBillableMinutes} min @ $${finalBillableAmount.toFixed(2)}`,
      result: 'success',
      timestamp: now,
    }).catch(() => {});

    // Manifest event
    const load = (await base44.asServiceRole.entities.Load.filter({ id: detention.load_id }, '-created_date', 1))[0];
    if (load) {
      await base44.asServiceRole.entities.Manifest.create({
        load_id: detention.load_id,
        event_type: 'detention_approved',
        event_title: 'Detention Approved for Billing',
        event_description: `Stop ${detention.stop_number}: $${finalBillableAmount.toFixed(2)} approved by manager`,
        event_timestamp: now,
        performed_by: user_id,
        performed_by_role: 'manager',
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      detention_id,
      status: 'approved',
      billable_amount: finalBillableAmount,
    });
  } catch (error) {
    console.error('approveDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function rejectDetention(base44, detention_id, rejection_reason, user_id) {
  try {
    const detentions = await base44.asServiceRole.entities.DetentionRecord.filter(
      { id: detention_id },
      '-created_date',
      1
    );
    if (detentions.length === 0) {
      return Response.json({ error: 'Detention record not found' }, { status: 404 });
    }

    const detention = detentions[0];
    const now = new Date().toISOString();

    // Move back to resolved with dispute
    await base44.asServiceRole.entities.DetentionRecord.update(detention_id, {
      status: 'disputed',
      dispute_notes: rejection_reason,
      disputed_by: user_id,
      disputed_at: now,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'detention_approval_rejected',
      user_id,
      user_role: 'manager',
      entity_type: 'DetentionRecord',
      entity_id: detention_id,
      action_details: `Detention approval rejected: ${rejection_reason}`,
      result: 'success',
      timestamp: now,
    }).catch(() => {});

    return Response.json({
      success: true,
      detention_id,
      status: 'disputed',
      rejection_reason,
    });
  } catch (error) {
    console.error('rejectDetention error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}