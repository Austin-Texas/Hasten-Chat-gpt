import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { driver_id, driver_name, driving_hours, violation, break_needed } = payload;

    console.log(`[HOS Alert] Driver: ${driver_name}, Hours: ${driving_hours}, Violation: ${violation}, Break Needed: ${break_needed}`);

    // Fetch driver to get dispatcher
    const driver = await base44.asServiceRole.entities.Driver.get(driver_id);
    if (!driver) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    const dispatcher_id = driver.dispatcher_id;
    if (!dispatcher_id) {
      return Response.json({ success: true, message: 'No dispatcher assigned' });
    }

    // Create alert message
    let subject = "HOS Alert: Approaching Limit";
    let body = `Driver ${driver_name} is approaching their daily HOS limit.\n\nDriving Hours: ${driving_hours}h / 11h\n`;

    if (violation) {
      subject = "🚨 CRITICAL: HOS Violation";
      body = `ALERT: Driver ${driver_name} has EXCEEDED their 11-hour daily driving limit!\n\nDriving Hours: ${driving_hours}h\n\nImmediate Action Required:\n- Contact driver to stop driving immediately\n- Arrange safe rest location\n- Document violation for compliance records`;
    } else if (break_needed) {
      subject = "⚠️ HOS Alert: Break Required";
      body = `Driver ${driver_name} has driven ${driving_hours} hours and must take a 30-minute break before continuing.\n\nAction: Confirm driver takes required break immediately.`;
    }

    // Send email notification to dispatch
    const dispatcherEmails = await base44.asServiceRole.entities.User.filter(
      { id: dispatcher_id },
      "",
      1
    );

    if (dispatcherEmails.length > 0) {
      const dispatchEmail = dispatcherEmails[0].email;
      
      await base44.integrations.Core.SendEmail({
        to: dispatchEmail,
        subject: subject,
        body: body,
        from_name: "HASTEN HOS Monitor"
      });

      console.log(`[HOS Alert] Email sent to dispatcher: ${dispatchEmail}`);
    }

    // Create manifest event for audit trail
    try {
      await base44.asServiceRole.entities.Manifest.create({
        event_type: "alert",
        event_title: violation ? "HOS Violation Alert" : break_needed ? "Break Required Alert" : "HOS Approaching Limit",
        event_description: body,
        event_timestamp: new Date().toISOString(),
        performed_by: driver_id,
        performed_by_role: "driver",
        is_system_event: true,
      });
    } catch (err) {
      console.log("[HOS Alert] Manifest creation skipped:", err.message);
    }

    return Response.json({
      success: true,
      message: `HOS alert sent to dispatcher`,
      violation_type: violation ? "violation" : break_needed ? "break_required" : "approaching_limit"
    });

  } catch (error) {
    console.error("[HOS Alert Error]:", error.message);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});