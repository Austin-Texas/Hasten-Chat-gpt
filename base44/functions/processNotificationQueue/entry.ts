import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Process Notification Queue
 * 
 * Runs on schedule to process pending notifications:
 * - Send emails
 * - Send push notifications
 * - Send SMS
 * - Retry failed deliveries
 * - Mark as delivered
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all pending queue items
    const pendingQueue = await base44.asServiceRole.entities.NotificationQueue.filter({
      status: 'pending'
    }, 'scheduled_for', 1000);

    console.log(`Processing ${pendingQueue.length} pending notifications`);

    const now = new Date();
    const results = { sent: 0, failed: 0, skipped: 0 };

    for (const queueItem of pendingQueue) {
      try {
        // Check if scheduled time has passed
        const scheduledFor = new Date(queueItem.scheduled_for);
        if (scheduledFor > now) {
          results.skipped++;
          continue;
        }

        // Fetch notification details
        const notification = await base44.asServiceRole.entities.Notification.filter({
          id: queueItem.notification_id
        }, '-created_date', 1).then(n => n[0]);

        if (!notification) {
          await base44.asServiceRole.entities.NotificationQueue.update(queueItem.id, {
            status: 'failed',
            failure_reason: 'Notification record not found',
            last_attempt_at: now.toISOString()
          });
          results.failed++;
          continue;
        }

        // Get user preferences for quiet hours
        const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
          user_id: notification.user_id
        }, '-created_date', 1).then(p => p[0]);

        let respectedQuietHours = false;
        if (prefs?.quiet_hours_enabled && queueItem.delivery_channel !== 'in_app') {
          const start = new Date(`1970-01-01T${prefs.quiet_hours_start}`);
          const end = new Date(`1970-01-01T${prefs.quiet_hours_end}`);
          const currentTime = new Date();
          const currentTimeOnly = new Date(`1970-01-01T${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}`);

          if (currentTimeOnly >= start && currentTimeOnly <= end) {
            // In quiet hours; reschedule for end of quiet hours
            const nextAttempt = new Date(end);
            nextAttempt.setFullYear(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
            if (nextAttempt < now) nextAttempt.setDate(nextAttempt.getDate() + 1);

            await base44.asServiceRole.entities.NotificationQueue.update(queueItem.id, {
              scheduled_for: nextAttempt.toISOString(),
              quiet_hours_respected: true
            });
            results.skipped++;
            continue;
          }
        }

        // Process by channel
        let success = false;
        let failureReason = null;

        switch (queueItem.delivery_channel) {
          case 'email':
            // Send email via integration
            success = await sendEmailNotification(base44, notification, queueItem);
            if (!success) failureReason = 'Email delivery failed';
            break;

          case 'push':
            // Send push notification (queued for later when FCM/APNs configured)
            // For now, mark as pending
            failureReason = 'Push not yet configured (awaiting FCM/APNs setup)';
            success = false;
            break;

          case 'sms':
            // Send SMS via integration (requires Twilio/similar)
            // Critical alerts only
            if (notification.priority === 'critical') {
              // Placeholder; integrate when SMS provider added
              failureReason = 'SMS not yet configured';
            }
            success = false;
            break;

          case 'in_app':
            // In-app already created in database
            success = true;
            break;
        }

        if (success) {
          await base44.asServiceRole.entities.NotificationQueue.update(queueItem.id, {
            status: 'sent',
            last_attempt_at: now.toISOString()
          });
          results.sent++;
        } else {
          // Increment retry count
          const newRetryCount = (queueItem.retry_count || 0) + 1;
          if (newRetryCount >= queueItem.max_retries) {
            // Max retries exceeded
            await base44.asServiceRole.entities.NotificationQueue.update(queueItem.id, {
              status: 'failed',
              retry_count: newRetryCount,
              failure_reason: failureReason,
              last_attempt_at: now.toISOString()
            });
            results.failed++;
          } else {
            // Schedule retry (exponential backoff: 5 min, 15 min, 45 min)
            const backoffMs = [5, 15, 45][newRetryCount - 1] * 60 * 1000;
            const nextAttempt = new Date(now.getTime() + backoffMs);

            await base44.asServiceRole.entities.NotificationQueue.update(queueItem.id, {
              retry_count: newRetryCount,
              failure_reason: failureReason,
              scheduled_for: nextAttempt.toISOString(),
              last_attempt_at: now.toISOString()
            });
            results.skipped++;
          }
        }

      } catch (err) {
        console.error(`Error processing queue item ${queueItem.id}:`, err);
        results.failed++;
      }
    }

    return Response.json({
      success: true,
      results,
      message: `Processed ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped/rescheduled`
    });

  } catch (error) {
    console.error('Notification queue processor error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});

async function sendEmailNotification(base44, notification, queueItem) {
  try {
    // Get user email
    const users = await base44.asServiceRole.entities.User.filter({
      id: notification.user_id
    }, '-created_date', 1);

    const user = users?.[0];
    if (!user || !user.email) {
      return false;
    }

    // Build email body
    const body = `
${notification.message}

${notification.action_url ? `View: ${notification.action_url}` : ''}

---
HASTEN Notification
Type: ${notification.type}
Priority: ${notification.priority}
`.trim();

    // Send via email integration
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: notification.title,
      body: body,
      from_name: 'HASTEN'
    });

    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}