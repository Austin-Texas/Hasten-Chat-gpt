import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const todayStr = today.toISOString().split('T')[0];
    const in30Str = in30Days.toISOString().split('T')[0];

    const trucks = await base44.asServiceRole.entities.Truck.list();
    const users = await base44.asServiceRole.entities.User.list();
    const managers = users.filter(u => u.role === 'admin');

    if (managers.length === 0) {
      return Response.json({ skipped: true, reason: 'No admin users found' });
    }

    const alerts = [];

    for (const truck of trucks) {
      if (truck.status === 'sold') continue;

      const truckLabel = `Unit #${truck.unit_number} — ${truck.year} ${truck.make} ${truck.model}`;

      // Service mileage alert — 500-mile threshold (urgent) and 2500-mile threshold (warning)
      if (truck.next_service_miles && truck.odometer) {
        const milesUntilService = truck.next_service_miles - truck.odometer;
        if (milesUntilService <= 0) {
          alerts.push({
            truck: truckLabel, truckId: truck.unit_number, type: 'SERVICE_OVERDUE',
            detail: `Overdue by ${Math.abs(milesUntilService).toLocaleString()} miles`,
            serviceInfo: `Odometer: ${truck.odometer.toLocaleString()} mi | Service due at: ${truck.next_service_miles.toLocaleString()} mi | Last service: ${truck.last_service_date || 'N/A'} (at ${truck.last_service_odometer?.toLocaleString() || 'N/A'} mi)`,
          });
        } else if (milesUntilService <= 500) {
          alerts.push({
            truck: truckLabel, truckId: truck.unit_number, type: 'SERVICE_CRITICAL',
            detail: `Only ${milesUntilService.toLocaleString()} miles until scheduled maintenance`,
            serviceInfo: `Odometer: ${truck.odometer.toLocaleString()} mi | Service due at: ${truck.next_service_miles.toLocaleString()} mi | Last service: ${truck.last_service_date || 'N/A'} (at ${truck.last_service_odometer?.toLocaleString() || 'N/A'} mi)`,
          });
        } else if (milesUntilService <= 2500) {
          alerts.push({
            truck: truckLabel, truckId: truck.unit_number, type: 'SERVICE_DUE_SOON',
            detail: `${milesUntilService.toLocaleString()} miles until service`,
            serviceInfo: `Odometer: ${truck.odometer.toLocaleString()} mi | Service due at: ${truck.next_service_miles.toLocaleString()} mi | Last service: ${truck.last_service_date || 'N/A'}`,
          });
        }
      }

      // Insurance expiry alert
      if (truck.insurance_expiry) {
        if (truck.insurance_expiry < todayStr) {
          alerts.push({ truck: truckLabel, type: 'INSURANCE_EXPIRED', detail: `Expired on ${truck.insurance_expiry}` });
        } else if (truck.insurance_expiry <= in30Str) {
          const daysLeft = Math.ceil((new Date(truck.insurance_expiry) - today) / (1000 * 60 * 60 * 24));
          alerts.push({ truck: truckLabel, type: 'INSURANCE_EXPIRING', detail: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${truck.insurance_expiry}` });
        }
      }

      // Registration expiry alert
      if (truck.registration_expiry) {
        if (truck.registration_expiry < todayStr) {
          alerts.push({ truck: truckLabel, type: 'REGISTRATION_EXPIRED', detail: `Expired on ${truck.registration_expiry}` });
        } else if (truck.registration_expiry <= in30Str) {
          const daysLeft = Math.ceil((new Date(truck.registration_expiry) - today) / (1000 * 60 * 60 * 24));
          alerts.push({ truck: truckLabel, type: 'REGISTRATION_EXPIRING', detail: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${truck.registration_expiry}` });
        }
      }

      // Annual inspection expiry alert
      if (truck.annual_inspection_expiry) {
        if (truck.annual_inspection_expiry < todayStr) {
          alerts.push({ truck: truckLabel, type: 'INSPECTION_EXPIRED', detail: `Expired on ${truck.annual_inspection_expiry}` });
        } else if (truck.annual_inspection_expiry <= in30Str) {
          const daysLeft = Math.ceil((new Date(truck.annual_inspection_expiry) - today) / (1000 * 60 * 60 * 24));
          alerts.push({ truck: truckLabel, type: 'INSPECTION_EXPIRING', detail: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${truck.annual_inspection_expiry}` });
        }
      }
    }

    if (alerts.length === 0) {
      return Response.json({ success: true, alerts: 0, message: 'No alerts today' });
    }

    const ICON = {
      SERVICE_OVERDUE:       '🔴 SERVICE OVERDUE',
      SERVICE_CRITICAL:      '🚨 MAINTENANCE ALERT — WITHIN 500 MILES',
      SERVICE_DUE_SOON:      '🟡 SERVICE DUE SOON',
      INSURANCE_EXPIRED:     '🔴 INSURANCE EXPIRED',
      INSURANCE_EXPIRING:    '🟡 INSURANCE EXPIRING',
      REGISTRATION_EXPIRED:  '🔴 REGISTRATION EXPIRED',
      REGISTRATION_EXPIRING: '🟡 REGISTRATION EXPIRING',
      INSPECTION_EXPIRED:    '🔴 INSPECTION EXPIRED',
      INSPECTION_EXPIRING:   '🟡 INSPECTION EXPIRING',
    };

    // Separate 500-mile maintenance alerts for a dedicated section
    const maintenanceAlerts = alerts.filter(a => a.type === 'SERVICE_CRITICAL' || a.type === 'SERVICE_OVERDUE');
    const otherAlerts = alerts.filter(a => a.type !== 'SERVICE_CRITICAL' && a.type !== 'SERVICE_OVERDUE');

    const maintenanceSection = maintenanceAlerts.length > 0
      ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  MAINTENANCE THRESHOLD ALERTS (${maintenanceAlerts.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${maintenanceAlerts.map(a => `  ${ICON[a.type]}
  Truck ID: ${a.truckId || 'N/A'} — ${a.truck}
  Status: ${a.detail}
  Details: ${a.serviceInfo || ''}
`).join('\n')}` : '';

    const otherSection = otherAlerts.length > 0
      ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋  COMPLIANCE ALERTS (${otherAlerts.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${otherAlerts.map(a => `  ${ICON[a.type] || a.type}\n  ${a.truck}\n  ${a.detail}`).join('\n\n')}` : '';

    const criticalCount = alerts.filter(a => ['SERVICE_OVERDUE','SERVICE_CRITICAL','INSURANCE_EXPIRED','REGISTRATION_EXPIRED','INSPECTION_EXPIRED'].includes(a.type)).length;
    const warningCount = alerts.length - criticalCount;

    const subject = maintenanceAlerts.some(a => a.type === 'SERVICE_CRITICAL')
      ? `🚨 Maintenance Alert: ${maintenanceAlerts.length} Truck${maintenanceAlerts.length !== 1 ? 's' : ''} Within 500 Miles of Service Threshold`
      : criticalCount > 0
        ? `🚨 Fleet Alert: ${criticalCount} Critical Issue${criticalCount !== 1 ? 's' : ''} Require Immediate Attention`
        : `⚠️ Fleet Alert: ${warningCount} Item${warningCount !== 1 ? 's' : ''} Expiring in 30 Days`;

    await Promise.all(managers.map(manager =>
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'HASTEN Fleet Alerts',
        to: manager.email,
        subject,
        body: `
Hi ${manager.full_name || 'Fleet Manager'},

Your fleet alert report for ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}:

Total Alerts: ${alerts.length}  |  🔴 Critical: ${criticalCount}  |  🟡 Warnings: ${warningCount}
${maintenanceSection}
${otherSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please log into the HASTEN portal to review and schedule maintenance or renewals.

— HASTEN Fleet Monitoring
        `.trim(),
      })
    ));

    return Response.json({ success: true, alerts: alerts.length, critical: criticalCount, warnings: warningCount, notified: managers.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});