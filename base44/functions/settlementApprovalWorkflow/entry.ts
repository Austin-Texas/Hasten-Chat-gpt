import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Settlement Approval Workflow
 * 
 * Handles settlement status transitions and notifications
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { settlement_id, action, approved_by, payment_proof_url, dispute_reason, void_reason } = body;

    if (!settlement_id || !action) {
      return Response.json({
        error: 'Missing settlement_id or action'
      }, { status: 400 });
    }

    // Fetch settlement
    const settlements = await base44.asServiceRole.entities.Settlement.filter(
      { id: settlement_id },
      '-created_date',
      1
    );

    if (!settlements[0]) {
      return Response.json({ error: 'Settlement not found' }, { status: 404 });
    }

    const settlement = settlements[0];
    let updated = { updated_date: new Date().toISOString() };
    let notification_title = '';
    let notification_message = '';
    let timeline_action = '';

    // ─── APPROVAL WORKFLOW ────────────────────────────────────────────
    if (action === 'approve') {
      if (settlement.status !== 'pending_review') {
        return Response.json({
          error: 'Can only approve settlements in pending_review status'
        }, { status: 400 });
      }

      updated.status = 'approved';
      updated.approved_by = approved_by;
      updated.approved_at = new Date().toISOString();
      notification_title = `✅ Settlement Approved`;
      notification_message = `Settlement for load #${settlement.load_id} has been approved. Amount: $${settlement.driver_net_pay.toFixed(2)}`;
      timeline_action = 'approved';
    }

    // ─── PAYMENT MARKING WORKFLOW ─────────────────────────────────────
    else if (action === 'mark_paid') {
      if (settlement.status !== 'pending_payment' && settlement.status !== 'approved') {
        return Response.json({
          error: 'Can only mark paid settlements in approved or pending_payment status'
        }, { status: 400 });
      }

      updated.status = 'paid';
      updated.paid_at = new Date().toISOString();
      updated.payment_status = 'completed';
      updated.payment_proof_url = payment_proof_url || null;
      notification_title = `💰 Payment Sent`;
      notification_message = `Payment of $${settlement.driver_net_pay.toFixed(2)} has been sent to ${settlement.payout_recipient}`;
      timeline_action = 'paid';
    }

    // ─── DISPUTE WORKFLOW ─────────────────────────────────────────────
    else if (action === 'dispute') {
      updated.status = 'disputed';
      updated.disputed_by = approved_by;
      updated.disputed_at = new Date().toISOString();
      updated.dispute_reason = dispute_reason;
      notification_title = `⚠️ Settlement Disputed`;
      notification_message = `Settlement for load #${settlement.load_id} has been disputed. Reason: ${dispute_reason}`;
      timeline_action = 'disputed';
    }

    // ─── VOID WORKFLOW ───────────────────────────────────────────────
    else if (action === 'void') {
      updated.status = 'voided';
      updated.voided_by = approved_by;
      updated.voided_at = new Date().toISOString();
      updated.void_reason = void_reason;
      notification_title = `❌ Settlement Voided`;
      notification_message = `Settlement for load #${settlement.load_id} has been voided. Reason: ${void_reason}`;
      timeline_action = 'voided';
    }

    else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ─── UPDATE SETTLEMENT ────────────────────────────────────────────
    const updated_settlement = await base44.asServiceRole.entities.Settlement.update(settlement_id, updated);

    // ─── SEND NOTIFICATIONS ──────────────────────────────────────────
    try {
      // Notify driver
      await base44.functions.invoke('notificationService', {
        user_id: settlement.driver_id,
        title: notification_title,
        message: notification_message,
        type: `settlement_${timeline_action}`,
        priority: timeline_action === 'disputed' ? 'high' : 'normal',
        related_entity_type: 'Settlement',
        related_entity_id: settlement_id,
        action_url: `/finance/settlements/${settlement_id}`,
        cta_label: 'View Settlement',
        force_channels: ['in_app', 'email']
      });
    } catch (err) {
      console.error('Failed to notify driver:', err);
    }

    // ─── LOG TIMELINE EVENT ──────────────────────────────────────────
    try {
      await base44.functions.invoke('timelineEventService', {
        entity_type: 'Settlement',
        entity_id: settlement_id,
        action: timeline_action,
        actor_id: approved_by || 'system',
        actor_role: 'admin',
        summary: `Settlement ${timeline_action}`,
        metadata: {
          settlement_amount: settlement.driver_net_pay,
          driver_id: settlement.driver_id,
          load_id: settlement.load_id
        }
      });
    } catch (err) {
      console.error('Failed to log timeline:', err);
    }

    // ─── UPDATE SEARCH INDEX ─────────────────────────────────────────
    try {
      await base44.functions.invoke('indexEntity', {
        entity_type: 'Settlement',
        entity_id: settlement_id
      });
    } catch (err) {
      console.error('Failed to update search index:', err);
    }

    return Response.json({
      success: true,
      settlement: updated_settlement,
      action_taken: action,
      new_status: updated.status
    });

  } catch (error) {
    console.error('Settlement approval error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});