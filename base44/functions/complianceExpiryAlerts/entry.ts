import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Compliance Expiry Alerts
 * 
 * Scheduled function (runs daily or via automation) to check for:
 * - 30 days before expiry
 * - 14 days before expiry
 * - 7 days before expiry
 * - 3 days before expiry
 * - 1 day before expiry
 * - On expiry
 * 
 * Sends notifications to admin and relevant users
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const alertThresholds = [30, 14, 7, 3, 1, 0]; // days before expiry

    let alertsSent = 0;
    let errors = 0;

    // ─── DRIVER COMPLIANCE ALERTS ───────────────────────────────────────

    const drivers = await base44.asServiceRole.entities.Driver.list('-created_date', 1000);

    for (const driver of drivers) {
      const alerts = [];

      // Check each expiry date
      const checkDates = [
        { field: 'license_expiry', name: 'CDL License' },
        { field: 'medical_expiry', name: 'Medical Card' },
        { field: 'twic_expiry', name: 'TWIC Card' }
      ];

      for (const check of checkDates) {
        if (!driver[check.field]) continue;

        const expiry = new Date(driver[check.field]);
        const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        // Find matching threshold
        for (const threshold of alertThresholds) {
          if (daysUntil === threshold) {
            alerts.push({
              item: check.name,
              daysUntil,
              expiryDate: driver[check.field]
            });
          }
        }
      }

      // Send alerts for this driver
      for (const alert of alerts) {
        try {
          let priority = 'normal';
          let title = '';
          let message = '';

          if (alert.daysUntil === 0) {
            priority = 'critical';
            title = `⚠️ CRITICAL: ${alert.item} EXPIRED`;
            message = `${driver.first_name} ${driver.last_name}'s ${alert.item} expired today. Driver must be removed from active assignment.`;
          } else if (alert.daysUntil <= 3) {
            priority = 'high';
            title = `🚨 ${alert.item} Expiring in ${alert.daysUntil} Day${alert.daysUntil === 1 ? '' : 's'}`;
            message = `${driver.first_name} ${driver.last_name}'s ${alert.item} expires on ${new Date(alert.expiryDate).toLocaleDateString()}. Immediate action required.`;
          } else {
            title = `⏰ ${alert.item} Expires in ${alert.daysUntil} Days`;
            message = `${driver.first_name} ${driver.last_name}'s ${alert.item} expires on ${new Date(alert.expiryDate).toLocaleDateString()}.`;
          }

          // Notify dispatcher
          if (driver.dispatcher_id) {
            await base44.functions.invoke('notificationService', {
              user_id: driver.dispatcher_id,
              title,
              message,
              type: 'compliance_expiring',
              priority,
              related_entity_type: 'Driver',
              related_entity_id: driver.id,
              action_url: `/drivers/${driver.id}`,
              cta_label: 'View Driver',
              force_channels: ['in_app', 'email']
            });
            alertsSent++;
          }

          // Notify safety_compliance managers (3+ days before expiry)
          if (alert.daysUntil <= 3) {
            try {
              const safetyManagers = await base44.asServiceRole.entities.User.filter({
                role: 'safety_compliance'
              }, '-created_date', 100).catch(() => []);

              for (const manager of safetyManagers) {
                try {
                  await base44.functions.invoke('notificationService', {
                    user_id: manager.id,
                    title,
                    message,
                    type: 'compliance_expiring',
                    priority,
                    related_entity_type: 'Driver',
                    related_entity_id: driver.id,
                    action_url: `/drivers/${driver.id}`,
                    cta_label: 'Review Driver',
                    force_channels: ['in_app', 'email']
                  });
                  alertsSent++;
                } catch (err) {
                  console.error(`Failed to notify safety manager:`, err);
                }
              }
            } catch (err) {
              console.error(`Failed to fetch safety managers:`, err);
            }
          }

          // Notify driver of critical/high
          if (priority === 'critical' || priority === 'high') {
            await base44.functions.invoke('notificationService', {
              user_id: driver.id,
              title,
              message,
              type: 'compliance_expiring',
              priority,
              related_entity_type: 'Driver',
              related_entity_id: driver.id,
              action_url: `/driver/profile/documents`,
              cta_label: 'Renew',
              force_channels: ['in_app', 'email']
            });
          }
        } catch (err) {
          console.error(`Failed to send alert for ${driver.first_name} ${alert.item}:`, err);
          errors++;
        }
      }

      // If expired, run compliance status engine to lock driver
      if (alerts.some(a => a.daysUntil === 0)) {
        try {
          await base44.functions.invoke('complianceStatusEngine', {
            entity_type: 'driver',
            entity_id: driver.id
          });
        } catch (err) {
          console.error(`Failed to update compliance status for ${driver.first_name}:`, err);
        }
      }
    }

    // ─── TRUCK COMPLIANCE ALERTS ────────────────────────────────────────

    const trucks = await base44.asServiceRole.entities.Truck.list('-created_date', 1000);

    for (const truck of trucks) {
      const alerts = [];

      const checkDates = [
        { field: 'registration_expiry', name: 'Registration' },
        { field: 'insurance_expiry', name: 'Insurance' },
        { field: 'annual_inspection_expiry', name: 'Annual Inspection' }
      ];

      for (const check of checkDates) {
        if (!truck[check.field]) continue;

        const expiry = new Date(truck[check.field]);
        const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        for (const threshold of alertThresholds) {
          if (daysUntil === threshold) {
            alerts.push({
              item: check.name,
              daysUntil,
              expiryDate: truck[check.field]
            });
          }
        }
      }

      // Send alerts for this truck
      for (const alert of alerts) {
        try {
          let priority = 'normal';
          let title = '';
          let message = '';

          if (alert.daysUntil === 0) {
            priority = 'critical';
            title = `⚠️ CRITICAL: Truck #${truck.unit_number} ${alert.item} EXPIRED`;
            message = `Truck #${truck.unit_number}'s ${alert.item} expired today. Remove from active service immediately.`;
          } else if (alert.daysUntil <= 3) {
            priority = 'high';
            title = `🚨 Truck #${truck.unit_number} ${alert.item} Expiring in ${alert.daysUntil} Day${alert.daysUntil === 1 ? '' : 's'}`;
            message = `Truck #${truck.unit_number}'s ${alert.item} expires on ${new Date(alert.expiryDate).toLocaleDateString()}.`;
          } else {
            title = `⏰ Truck #${truck.unit_number} ${alert.item} Expires in ${alert.daysUntil} Days`;
            message = `Truck #${truck.unit_number}'s ${alert.item} expires on ${new Date(alert.expiryDate).toLocaleDateString()}.`;
          }

          // Notify dispatcher/fleet manager (admin)
          // Find all admins
          const admins = await base44.asServiceRole.entities.User.filter({
            role: 'admin'
          }, '-created_date', 100).catch(() => []);

          for (const admin of admins) {
            try {
              await base44.functions.invoke('notificationService', {
                user_id: admin.id,
                title,
                message,
                type: 'compliance_expiring',
                priority,
                related_entity_type: 'Truck',
                related_entity_id: truck.id,
                action_url: `/fleet/${truck.id}`,
                cta_label: 'View Truck',
                force_channels: ['in_app', 'email']
              });
              alertsSent++;
            } catch (err) {
              console.error(`Failed to notify admin about truck:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to send alert for truck #${truck.unit_number}:`, err);
          errors++;
        }
      }

      // If expired, run compliance status engine
      if (alerts.some(a => a.daysUntil === 0)) {
        try {
          await base44.functions.invoke('complianceStatusEngine', {
            entity_type: 'truck',
            entity_id: truck.id
          });
        } catch (err) {
          console.error(`Failed to update compliance status for truck:`, err);
        }
      }
    }

    return Response.json({
      success: true,
      alerts_sent: alertsSent,
      errors,
      message: `Sent ${alertsSent} compliance alerts, ${errors} errors`
    });

  } catch (error) {
    console.error('Compliance expiry alerts error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});