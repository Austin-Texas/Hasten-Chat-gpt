import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Notification Service
 * 
 * Centralized service for creating, queuing, and tracking notifications.
 * Handles user preferences, delivery channels, and retry logic.
 */

Deno.serve(async (req) => {
  try {
    if (req.method === 'POST') {
      const base44 = createClientFromRequest(req);
      const payload = await req.json();

      const {
        user_id,
        title,
        message,
        type,
        priority = 'normal',
        related_entity_type,
        related_entity_id,
        action_url,
        cta_label,
        metadata,
        force_channels // override user preferences
      } = payload;

      if (!user_id || !title || !message || !type) {
        return Response.json({
          error: 'Missing required fields: user_id, title, message, type'
        }, { status: 400 });
      }

      // Get user role
      let user, role = 'admin';
      try {
        user = await base44.auth.me();
        if (user) {
          role = user.role || 'admin';
        }
      } catch {
        // Service role call, get role from payload or default to admin
        role = 'admin';
      }

      // Fetch user preferences
      const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
        user_id
      }, '-created_date', 1).catch(() => null);

      const userPrefs = prefs?.[0] || {
        in_app_enabled: true,
        email_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        [type]: true // Check specific notification type
      };

      // Determine delivery channels
      const channels = force_channels || [];
      if (!force_channels) {
        if (userPrefs.in_app_enabled !== false) channels.push('in_app');
        if (userPrefs.email_enabled && userPrefs[type] !== false) channels.push('email');
        if (userPrefs.push_enabled && userPrefs[type] !== false) channels.push('push');
        if (userPrefs.sms_enabled && userPrefs[type] !== false && priority === 'critical') channels.push('sms');
      }

      // Create notification record
      const notification = await base44.asServiceRole.entities.Notification.create({
        user_id,
        role,
        title,
        message,
        type,
        priority,
        related_entity_type,
        related_entity_id,
        action_url,
        cta_label,
        metadata: metadata ? JSON.stringify(metadata) : null,
        delivery_channels: channels,
        read: false,
        delivered: false,
        failed: false
      });

      // Queue for each channel
      const queueItems = [];
      for (const channel of channels) {
        const queueItem = await base44.asServiceRole.entities.NotificationQueue.create({
          notification_id: notification.id,
          user_id,
          delivery_channel: channel,
          status: 'pending',
          retry_count: 0,
          max_retries: channel === 'sms' ? 2 : 3,
          scheduled_for: new Date().toISOString(),
          quiet_hours_respected: false
        });
        queueItems.push(queueItem);
      }

      // Immediately process in_app notifications
      if (channels.includes('in_app')) {
        // No additional processing needed; already in database
      }

      // Queue email/push/sms for async processing via scheduled function
      // This allows fast response and handles retries separately

      return Response.json({
        success: true,
        notification_id: notification.id,
        queued_channels: channels,
        queue_items: queueItems.length
      });

    } else if (req.method === 'GET') {
      // Get notifications for current user
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { limit = 50, unread_only = false } = Object.fromEntries(new URL(req.url).searchParams);

      let query = { user_id: user.id };
      if (unread_only === 'true') {
        query.read = false;
      }

      const notifications = await base44.asServiceRole.entities.Notification.filter(
        query,
        '-created_date',
        parseInt(limit)
      );

      return Response.json({
        notifications,
        count: notifications.length
      });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('Notification service error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});