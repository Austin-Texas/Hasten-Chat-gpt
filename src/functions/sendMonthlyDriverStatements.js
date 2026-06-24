import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active drivers
    const drivers = await base44.asServiceRole.entities.Driver.list("-created_date", 200);
    const loads = await base44.asServiceRole.entities.Load.filter({
      status: "completed"
    }, "-created_date", 500);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const sentEmails = [];
    const failedEmails = [];

    // Process each driver
    for (const driver of drivers) {
      if (!driver.email) continue;

      // Filter loads for this driver completed in current month
      const driverLoads = loads.filter(load => {
        if (load.driver_id !== driver.id) return false;
        const deliveryDate = new Date(load.actual_delivery || load.delivery_date || load.created_date);
        return deliveryDate.getMonth() === currentMonth && deliveryDate.getFullYear() === currentYear;
      });

      if (driverLoads.length === 0) continue; // Skip drivers with no loads this month

      // Calculate metrics
      const totalLoads = driverLoads.length;
      const totalMiles = driverLoads.reduce((s, l) => s + (l.miles || 0), 0);
      const totalWeight = driverLoads.reduce((s, l) => s + (l.weight || 0), 0);
      const totalRevenue = driverLoads.reduce((s, l) => s + (l.rate || 0), 0);

      // Calculate driver pay based on pay type
      let driverPay = 0;
      switch (driver.pay_type) {
        case "per_mile":
          driverPay = totalMiles * (driver.pay_rate || 0);
          break;
        case "percentage":
          driverPay = totalRevenue * ((driver.pay_rate || 0) / 100);
          break;
        case "flat_rate":
          driverPay = (driver.pay_rate || 0) * totalLoads;
          break;
        case "hourly":
          // Estimate 8 hours per load as default
          driverPay = (driver.pay_rate || 0) * 8 * totalLoads;
          break;
        default:
          driverPay = 0;
      }

      const avgMilesPerLoad = Math.round((totalMiles / totalLoads) * 10) / 10;
      const avgWeightPerLoad = Math.round((totalWeight / totalLoads) * 10) / 10;
      const avgPayPerLoad = Math.round((driverPay / totalLoads) * 100) / 100;

      const driverName = `${driver.first_name} ${driver.last_name}`;
      const driverPayFormatted = Math.round(driverPay * 100) / 100;

      // Build load details table
      const loadDetails = driverLoads
        .sort((a, b) => new Date(b.actual_delivery || b.delivery_date) - new Date(a.actual_delivery || a.delivery_date))
        .slice(0, 20) // Show top 20 loads
        .map(l => {
          const delivDate = (l.actual_delivery || l.delivery_date || l.created_date);
          return `• ${l.load_number || `#${l.id.slice(-6)}`} | ${l.origin_city}, ${l.origin_state} → ${l.destination_city}, ${l.destination_state}
    Distance: ${l.miles || 0} mi | Weight: ${l.weight || 0} lbs | Rate: $${(l.rate || 0).toLocaleString()}
    Delivered: ${new Date(delivDate).toLocaleDateString('en-US')}`;
        })
        .join("\n\n");

      const emailContent = `MONTHLY DRIVER STATEMENT

Driver: ${driverName}
Period: ${monthYear}
License: ${driver.license_number || 'N/A'} (${driver.license_state || 'N/A'})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERFORMANCE SUMMARY

Total Loads Completed: ${totalLoads}
Total Miles Driven: ${totalMiles.toLocaleString()} mi
Total Weight: ${totalWeight.toLocaleString()} lbs

Average per Load:
• Distance: ${avgMilesPerLoad} miles
• Weight: ${avgWeightPerLoad} lbs
• Pay: $${avgPayPerLoad}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FINANCIAL SUMMARY

Company Revenue from Your Loads: $${totalRevenue.toLocaleString()}
Your Calculated Pay: $${driverPayFormatted.toLocaleString()}
Pay Type: ${driver.pay_type ? driver.pay_type.replace(/_/g, ' ').toUpperCase() : 'PER MILE'} @ $${driver.pay_rate || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPLETED LOADS (${totalLoads} total)

${loadDetails}

${driverLoads.length > 20 ? `\n... and ${driverLoads.length - 20} more loads` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOS & COMPLIANCE STATUS

Driving Hours (This Month): ${Math.round((totalMiles / 65) * 10) / 10} hours (estimated)
Current Status: ${driver.hos_status || 'off_duty'}
Safety Score: ${driver.safety_score || 100}/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Contact dispatch or visit the driver portal.

Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;

      // Send email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: driver.email,
          subject: `📋 Your ${monthYear} Driver Statement - ${totalLoads} Loads, ${totalMiles.toLocaleString()} Miles`,
          body: emailContent,
          from_name: "HASTEN Logistics - Driver Payroll",
        });
        sentEmails.push({ driverId: driver.id, driverName, email: driver.email });
      } catch (err) {
        console.error(`Failed to send email to ${driver.email}:`, err);
        failedEmails.push({ driverId: driver.id, driverName, email: driver.email, error: err.message });
      }
    }

    return Response.json({
      success: true,
      month: monthYear,
      emailsSent: sentEmails.length,
      emailsFailed: failedEmails.length,
      sentEmails,
      failedEmails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending monthly statements:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});