import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const drivers = await base44.asServiceRole.entities.Driver.list("-created_date", 200);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const alertsSent = [];
    const expiringSoon = [];

    for (const driver of drivers) {
      const alerts = [];
      let shouldNotify = false;

      // Check CDL expiration
      if (driver.license_expiry) {
        const cdlDate = new Date(driver.license_expiry);
        if (cdlDate > now && cdlDate <= thirtyDaysFromNow) {
          const daysLeft = Math.round((cdlDate - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            type: "CDL License",
            expiryDate: cdlDate.toLocaleDateString(),
            daysLeft,
          });
          shouldNotify = true;
        }
      }

      // Check Medical Card expiration
      if (driver.medical_expiry) {
        const medicalDate = new Date(driver.medical_expiry);
        if (medicalDate > now && medicalDate <= thirtyDaysFromNow) {
          const daysLeft = Math.round((medicalDate - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            type: "Medical Certificate",
            expiryDate: medicalDate.toLocaleDateString(),
            daysLeft,
          });
          shouldNotify = true;
        }
      }

      // Check TWIC Card expiration (if used for DOT purposes)
      if (driver.twic_expiry) {
        const twicDate = new Date(driver.twic_expiry);
        if (twicDate > now && twicDate <= thirtyDaysFromNow) {
          const daysLeft = Math.round((twicDate - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            type: "TWIC Card",
            expiryDate: twicDate.toLocaleDateString(),
            daysLeft,
          });
          shouldNotify = true;
        }
      }

      // Send notification if any certification is expiring soon
      if (shouldNotify && driver.email) {
        try {
          const alertList = alerts
            .map(a => `• ${a.type}: Expires ${a.expiryDate} (${a.daysLeft} days left)`)
            .join("\n");

          const emailBody = `Hello ${driver.first_name},

This is a reminder that one or more of your required certifications will expire soon:

${alertList}

ACTION REQUIRED:
Please renew your certifications before the expiration date to maintain compliance and continue operations. Contact your dispatcher or HR department if you need assistance with renewal.

Renewal Instructions:
- CDL License: Renew at your state DMV
- Medical Certificate: Schedule an exam with a DOT-certified medical examiner
- TWIC Card: Renew online at www.tsa.gov/twic

HASTEN Compliance Team
Dispatch: dispatch@hasten.local`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: driver.email,
            subject: `⏰ URGENT: Certification Expiring Soon - ${driver.first_name} ${driver.last_name}`,
            body: emailBody,
            from_name: "HASTEN Compliance",
          });

          alertsSent.push({
            driverId: driver.id,
            driverName: `${driver.first_name} ${driver.last_name}`,
            email: driver.email,
            alerts,
          });

          expiringSoon.push({
            driverId: driver.id,
            driverName: `${driver.first_name} ${driver.last_name}`,
            alerts,
          });

          console.log(`Compliance alert sent to ${driver.first_name} ${driver.last_name}`);
        } catch (err) {
          console.error(`Failed to email ${driver.email}:`, err);
        }
      }
    }

    // Notify dispatch team of drivers with expiring certifications
    if (expiringSoon.length > 0) {
      const users = await base44.asServiceRole.entities.User.list("-created_date", 50);
      const dispatchTeam = users.filter(u => ["admin", "dispatcher"].includes(u.role));

      const summaryList = expiringSoon
        .map(d => `• ${d.driverName}: ${d.alerts.map(a => `${a.type} (${a.daysLeft} days)`).join(", ")}`)
        .join("\n");

      for (const user of dispatchTeam) {
        if (user.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user.email,
              subject: `📋 Compliance Alert: ${expiringSoon.length} Driver(s) Have Expiring Certifications`,
              body: `${expiringSoon.length} driver(s) have certifications expiring within 30 days:\n\n${summaryList}\n\nMonitor these drivers in the Compliance Center and ensure timely renewal.`,
              from_name: "HASTEN Compliance",
            });
          } catch (err) {
            console.error(`Failed to notify dispatch at ${user.email}:`, err);
          }
        }
      }
    }

    console.log(`Sent ${alertsSent.length} compliance alerts`);

    return Response.json({
      success: true,
      alertsSent: alertsSent.length,
      driversAffected: expiringSoon,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error sending compliance alerts:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});