import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Wire Critical Notification Events
 * 
 * Maps entity events to notification creation.
 * Called via automations when:
 * - Load assigned to driver
 * - Driver status changed
 * - Message received
 * - Support ticket reply
 * - Document approved/rejected
 * - POD uploaded
 * - Quote accepted/rejected
 * - Invoice paid/overdue
 * - Payroll ready
 * - Settlement ready
 * - Compliance document expiring
 * - Route deviation detected
 * - Idle truck alert
 * - Delay detected
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const {
      event_type,
      entity_name,
      entity_id,
      event_data
    } = payload;

    console.log(`Notification event: ${event_type} for ${entity_name}(${entity_id})`);

    const notifications = [];

    // ─── LOAD EVENTS ────────────────────────────────────────────────────────

    if (event_type === 'load_assigned' && entity_name === 'Load') {
      const load = await base44.asServiceRole.entities.Load.filter({
        id: entity_id
      }, '-created_date', 1).then(l => l[0]);

      if (load?.driver_id) {
        // Notify driver
        notifications.push({
          user_id: load.driver_id,
          title: `New Load: ${load.origin_city} → ${load.destination_city}`,
          message: `Load #${load.load_number || entity_id} assigned. ${load.miles} miles, rate: $${load.rate}`,
          type: 'load_assigned',
          priority: load.priority === 'critical' ? 'critical' : 'normal',
          related_entity_type: 'Load',
          related_entity_id: entity_id,
          action_url: `/driver/loads/${entity_id}`,
          cta_label: 'View Load'
        });

        // Notify dispatcher
        if (load.dispatcher_id) {
          notifications.push({
            user_id: load.dispatcher_id,
            title: `Assignment Confirmed: Load ${load.load_number}`,
            message: `Assigned to ${event_data?.driver_name || 'Driver'}`,
            type: 'load_assigned',
            priority: 'normal',
            related_entity_type: 'Load',
            related_entity_id: entity_id,
            action_url: `/loads/${entity_id}`,
            cta_label: 'View'
          });
        }
      }
    }

    // ─── DRIVER STATUS CHANGE ───────────────────────────────────────────────

    if (event_type === 'driver_status_changed' && entity_name === 'Driver') {
      const driver = await base44.asServiceRole.entities.Driver.filter({
        id: entity_id
      }, '-created_date', 1).then(d => d[0]);

      if (driver) {
        const oldStatus = event_data?.old_status;
        const newStatus = driver.status;

        // Notify dispatcher if driver goes off-duty or available
        if (driver.dispatcher_id) {
          notifications.push({
            user_id: driver.dispatcher_id,
            title: `Driver Status: ${newStatus.replace('_', ' ')}`,
            message: `${driver.first_name} ${driver.last_name} is now ${newStatus}`,
            type: 'driver_status_changed',
            priority: 'normal',
            related_entity_type: 'Driver',
            related_entity_id: entity_id,
            action_url: `/drivers/${entity_id}`,
            cta_label: 'View Driver'
          });
        }

        // Alert if HOS violation
        if (newStatus === 'hos_violation') {
          if (driver.dispatcher_id) {
            notifications.push({
              user_id: driver.dispatcher_id,
              title: `⚠️ HOS Violation: ${driver.first_name}`,
              message: `${driver.first_name} has exceeded HOS limits. Immediate action required.`,
              type: 'driver_status_changed',
              priority: 'critical',
              related_entity_type: 'Driver',
              related_entity_id: entity_id
            });
          }
        }
      }
    }

    // ─── DOCUMENT EVENTS ────────────────────────────────────────────────────

    if (event_type === 'document_approved' && entity_name === 'DriverDocument') {
      const doc = await base44.asServiceRole.entities.DriverDocument.filter({
        id: entity_id
      }, '-created_date', 1).then(d => d[0]);

      if (doc) {
        notifications.push({
          user_id: doc.driver_id,
          title: `Document Approved: ${doc.doc_type}`,
          message: `Your ${doc.category} document has been approved.`,
          type: 'document_approved',
          priority: 'normal',
          related_entity_type: 'DriverDocument',
          related_entity_id: entity_id,
          action_url: `/driver/profile/documents`,
          cta_label: 'View Documents'
        });
      }
    }

    if (event_type === 'document_rejected' && entity_name === 'DriverDocument') {
      const doc = await base44.asServiceRole.entities.DriverDocument.filter({
        id: entity_id
      }, '-created_date', 1).then(d => d[0]);

      if (doc) {
        notifications.push({
          user_id: doc.driver_id,
          title: `Document Rejected: ${doc.doc_type}`,
          message: `Your ${doc.category} document was rejected. Please resubmit.`,
          type: 'document_rejected',
          priority: 'high',
          related_entity_type: 'DriverDocument',
          related_entity_id: entity_id,
          action_url: `/driver/profile/documents`,
          cta_label: 'Resubmit'
        });
      }
    }

    // ─── POD UPLOAD ──────────────────────────────────────────────────────────

    if (event_type === 'pod_uploaded' && entity_name === 'Load') {
      const load = await base44.asServiceRole.entities.Load.filter({
        id: entity_id
      }, '-created_date', 1).then(l => l[0]);

      if (load) {
        // Notify dispatcher
        notifications.push({
          user_id: load.dispatcher_id,
          title: `POD Uploaded: Load ${load.load_number}`,
          message: `Proof of delivery received for ${load.origin_city} → ${load.destination_city}`,
          type: 'pod_uploaded',
          priority: 'normal',
          related_entity_type: 'Load',
          related_entity_id: entity_id,
          action_url: `/loads/${entity_id}`,
          cta_label: 'Review'
        });

        // Notify client
        if (load.client_id) {
          notifications.push({
            user_id: load.client_id,
            title: `Delivery Confirmed: Load ${load.load_number}`,
            message: `Your shipment has been delivered.`,
            type: 'pod_uploaded',
            priority: 'normal',
            related_entity_type: 'Load',
            related_entity_id: entity_id,
            action_url: `/client/tracking`,
            cta_label: 'View Tracking'
          });
        }
      }
    }

    // ─── QUOTE & BOOKING ────────────────────────────────────────────────────

    if (event_type === 'quote_accepted' && entity_name === 'QuoteRequest') {
      const quote = await base44.asServiceRole.entities.QuoteRequest.filter({
        id: entity_id
      }, '-created_date', 1).then(q => q[0]);

      if (quote) {
        notifications.push({
          user_id: quote.requester_email.split('@')[0], // Placeholder; should fetch client user
          title: `Quote Accepted: ${quote.origin_city} → ${quote.destination_city}`,
          message: `Your quote of $${quote.quoted_rate} has been accepted.`,
          type: 'quote_accepted',
          priority: 'normal',
          related_entity_type: 'QuoteRequest',
          related_entity_id: entity_id,
          action_url: `/client/tracking`,
          cta_label: 'View Details'
        });
      }
    }

    // ─── INVOICE & PAYMENT ──────────────────────────────────────────────────

    if (event_type === 'invoice_paid' && entity_name === 'Invoice') {
      const invoice = await base44.asServiceRole.entities.Invoice.filter({
        id: entity_id
      }, '-created_date', 1).then(i => i[0]);

      if (invoice?.client_id) {
        notifications.push({
          user_id: invoice.client_id,
          title: `Invoice Paid: #${invoice.invoice_number}`,
          message: `Invoice for $${invoice.total_amount} has been marked as paid.`,
          type: 'invoice_paid',
          priority: 'normal',
          related_entity_type: 'Invoice',
          related_entity_id: entity_id,
          action_url: `/client/invoices`,
          cta_label: 'View Invoice'
        });
      }
    }

    if (event_type === 'invoice_overdue' && entity_name === 'Invoice') {
      const invoice = await base44.asServiceRole.entities.Invoice.filter({
        id: entity_id
      }, '-created_date', 1).then(i => i[0]);

      if (invoice?.client_id) {
        notifications.push({
          user_id: invoice.client_id,
          title: `Invoice Overdue: #${invoice.invoice_number}`,
          message: `Invoice for $${invoice.total_amount} is now overdue. Payment required.`,
          type: 'invoice_overdue',
          priority: 'high',
          related_entity_type: 'Invoice',
          related_entity_id: entity_id,
          action_url: `/client/invoices`,
          cta_label: 'Pay Now'
        });
      }
    }

    // ─── PAYROLL & SETTLEMENT ───────────────────────────────────────────────

    if (event_type === 'payroll_ready' && entity_name === 'PayrollRecord') {
      const record = await base44.asServiceRole.entities.PayrollRecord.filter({
        id: entity_id
      }, '-created_date', 1).then(r => r[0]);

      if (record?.driver_id) {
        notifications.push({
          user_id: record.driver_id,
          title: `Payroll Ready: ${record.pay_period_start} – ${record.pay_period_end}`,
          message: `Your paycheck of $${record.net_pay} is ready. Net pay: $${record.net_pay}`,
          type: 'payroll_ready',
          priority: 'normal',
          related_entity_type: 'PayrollRecord',
          related_entity_id: entity_id,
          action_url: `/driver/payroll`,
          cta_label: 'View'
        });
      }
    }

    if (event_type === 'settlement_ready' && entity_name === 'SettlementRecord') {
      const record = await base44.asServiceRole.entities.SettlementRecord.filter({
        id: entity_id
      }, '-created_date', 1).then(r => r[0]);

      if (record?.driver_id) {
        notifications.push({
          user_id: record.driver_id,
          title: `Settlement Ready: ${record.period_start} – ${record.period_end}`,
          message: `Your settlement statement is ready. Amount: $${record.net_settlement}`,
          type: 'settlement_ready',
          priority: 'normal',
          related_entity_type: 'SettlementRecord',
          related_entity_id: entity_id,
          action_url: `/driver/payroll`,
          cta_label: 'View Statement'
        });
      }
    }

    // ─── COMPLIANCE ALERTS ──────────────────────────────────────────────────

    if (event_type === 'compliance_expiring' && entity_name === 'Driver') {
      const driver = await base44.asServiceRole.entities.Driver.filter({
        id: entity_id
      }, '-created_date', 1).then(d => d[0]);

      if (driver && driver.dispatcher_id) {
        const expiringItems = [];
        if (driver.license_expiry && new Date(driver.license_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
          expiringItems.push('CDL');
        }
        if (driver.medical_expiry && new Date(driver.medical_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
          expiringItems.push('Medical Card');
        }
        if (driver.twic_expiry && new Date(driver.twic_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
          expiringItems.push('TWIC');
        }

        if (expiringItems.length > 0) {
          notifications.push({
            user_id: driver.dispatcher_id,
            title: `⚠️ Compliance Alert: ${driver.first_name} ${driver.last_name}`,
            message: `${expiringItems.join(', ')} expiring soon.`,
            type: 'compliance_expiring',
            priority: 'high',
            related_entity_type: 'Driver',
            related_entity_id: entity_id,
            action_url: `/drivers/${entity_id}`,
            cta_label: 'Review'
          });
        }
      }
    }

    // ─── ROUTE & FLEET ALERTS ───────────────────────────────────────────────

    if (event_type === 'route_deviation' && entity_name === 'Load') {
      const load = await base44.asServiceRole.entities.Load.filter({
        id: entity_id
      }, '-created_date', 1).then(l => l[0]);

      if (load?.dispatcher_id) {
        notifications.push({
          user_id: load.dispatcher_id,
          title: `Route Deviation: Load ${load.load_number}`,
          message: `Driver has deviated from planned route.`,
          type: 'route_deviation',
          priority: 'high',
          related_entity_type: 'Load',
          related_entity_id: entity_id,
          action_url: `/loads/${entity_id}`,
          cta_label: 'Check Route'
        });
      }
    }

    if (event_type === 'idle_alert' && entity_name === 'Truck') {
      const truck = await base44.asServiceRole.entities.Truck.filter({
        id: entity_id
      }, '-created_date', 1).then(t => t[0]);

      if (truck && truck.driver_id) {
        // Notify driver
        notifications.push({
          user_id: truck.driver_id,
          title: `Alert: Truck #${truck.unit_number} Idle`,
          message: `Your truck has been idle for an extended period.`,
          type: 'idle_truck',
          priority: 'normal',
          related_entity_type: 'Truck',
          related_entity_id: entity_id
        });
      }
    }

    if (event_type === 'delay_alert' && entity_name === 'Load') {
      const load = await base44.asServiceRole.entities.Load.filter({
        id: entity_id
      }, '-created_date', 1).then(l => l[0]);

      if (load?.dispatcher_id) {
        notifications.push({
          user_id: load.dispatcher_id,
          title: `Delay Alert: Load ${load.load_number}`,
          message: `Load is behind schedule. ETA may be delayed.`,
          type: 'delay_alert',
          priority: 'high',
          related_entity_type: 'Load',
          related_entity_id: entity_id,
          action_url: `/loads/${entity_id}`,
          cta_label: 'Details'
        });

        // Notify client
        if (load.client_id) {
          notifications.push({
            user_id: load.client_id,
            title: `Delivery Delay: Load ${load.load_number}`,
            message: `Your shipment may be delayed. We'll notify you when it's back on schedule.`,
            type: 'delay_alert',
            priority: 'normal',
            related_entity_type: 'Load',
            related_entity_id: entity_id,
            action_url: `/client/tracking`,
            cta_label: 'Track'
          });
        }
      }
    }

    // ─── DISPATCHER MESSAGE ──────────────────────────────────────────────────

    if (event_type === 'message_sent' && entity_name === 'Message') {
      const message = await base44.asServiceRole.entities.Message.filter({
        id: entity_id
      }, '-created_date', 1).then(m => m[0]);

      if (message && message.recipient_id) {
        notifications.push({
          user_id: message.recipient_id,
          title: `Message from ${message.sender_name}`,
          message: message.content?.substring(0, 100) || '(attachment)',
          type: 'dispatcher_message',
          priority: 'normal',
          related_entity_type: 'Message',
          related_entity_id: entity_id,
          action_url: `/driver/messages`,
          cta_label: 'Reply'
        });
      }
    }

    // ─── SUPPORT TICKET REPLY ───────────────────────────────────────────────

    if (event_type === 'ticket_reply' && entity_name === 'SupportTicket') {
      const ticket = await base44.asServiceRole.entities.SupportTicket.filter({
        id: entity_id
      }, '-created_date', 1).then(t => t[0]);

      if (ticket?.requester_id) {
        notifications.push({
          user_id: ticket.requester_id,
          title: `Support Reply: ${ticket.subject}`,
          message: `Your support ticket has been updated.`,
          type: 'support_reply',
          priority: 'normal',
          related_entity_type: 'SupportTicket',
          related_entity_id: entity_id,
          action_url: `/driver/support`,
          cta_label: 'View'
        });
      }
    }

    // ─── SEND ALL NOTIFICATIONS ─────────────────────────────────────────────

    let sentCount = 0;
    for (const notif of notifications) {
      try {
        await base44.functions.invoke('notificationService', notif);
        sentCount++;
      } catch (err) {
        console.error(`Failed to send notification for ${notif.type}:`, err);
      }
    }

    return Response.json({
      success: true,
      event_type,
      notifications_created: sentCount,
      total_notifications: notifications.length
    });

  } catch (error) {
    console.error('Notification wiring error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});