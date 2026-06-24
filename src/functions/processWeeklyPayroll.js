import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log("[Weekly Payroll] Starting automated payroll processing");

    // Get all active drivers
    const drivers = await base44.asServiceRole.entities.Driver.filter(
      { status: { $ne: "inactive" } },
      "-created_date",
      500
    );

    console.log(`[Weekly Payroll] Processing ${drivers.length} active drivers`);

    // Calculate pay period (previous week: Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Calculate last Monday
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - dayOfWeek + 1 - 7);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const payPeriodStart = lastMonday.toISOString().split("T")[0];
    const payPeriodEnd = lastSunday.toISOString().split("T")[0];

    console.log(`[Weekly Payroll] Pay period: ${payPeriodStart} to ${payPeriodEnd}`);

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    // Process each driver
    for (const driver of drivers) {
      try {
        const res = await base44.functions.invoke("calculatePayroll", {
          driver_id: driver.id,
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
        });

        if (res.data.success) {
          successCount++;
          results.push({
            driver: `${driver.first_name} ${driver.last_name}`,
            status: "success",
            net_pay: res.data.payroll_record.net_pay,
          });
          console.log(`[Weekly Payroll] ✓ ${driver.first_name} ${driver.last_name}: $${res.data.payroll_record.net_pay}`);
        } else {
          failureCount++;
          results.push({
            driver: `${driver.first_name} ${driver.last_name}`,
            status: "skipped",
            reason: res.data.message,
          });
          console.log(`[Weekly Payroll] ⊘ ${driver.first_name} ${driver.last_name}: ${res.data.message}`);
        }
      } catch (err) {
        failureCount++;
        results.push({
          driver: `${driver.first_name} ${driver.last_name}`,
          status: "error",
          error: err.message,
        });
        console.error(`[Weekly Payroll] ✗ ${driver.first_name} ${driver.last_name}: ${err.message}`);
      }
    }

    const totalAmount = results
      .filter(r => r.status === "success")
      .reduce((sum, r) => sum + (r.net_pay || 0), 0);

    console.log(`[Weekly Payroll] Complete - Processed: ${successCount}, Skipped/Failed: ${failureCount}, Total: $${totalAmount.toFixed(2)}`);

    // Send summary notification
    try {
      const adminUsers = await base44.asServiceRole.entities.User.filter(
        { role: "admin" },
        "-created_date",
        10
      );

      if (adminUsers.length > 0) {
        const adminEmail = adminUsers[0].email;
        const summaryBody = `
Weekly Payroll Processing Summary
Date: ${new Date().toLocaleDateString()}
Pay Period: ${payPeriodStart} to ${payPeriodEnd}

Processed: ${successCount} drivers
Skipped/Failed: ${failureCount} drivers
Total Payroll: $${totalAmount.toFixed(2)}

Drivers Processed:
${results
  .filter(r => r.status === "success")
  .map(r => `- ${r.driver}: $${r.net_pay.toFixed(2)}`)
  .join("\n")}

${failureCount > 0 ? `\nSkipped/Failed:\n${results
  .filter(r => r.status !== "success")
  .map(r => `- ${r.driver}: ${r.reason || r.error}`)
  .join("\n")}` : ""}

All payroll records have been calculated and are ready for review and approval.
        `;

        await base44.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `Weekly Payroll Report - ${payPeriodStart}`,
          body: summaryBody,
          from_name: "HASTEN Payroll System"
        });

        console.log(`[Weekly Payroll] Summary email sent to ${adminEmail}`);
      }
    } catch (err) {
      console.log("[Weekly Payroll] Email notification failed:", err.message);
    }

    return Response.json({
      success: true,
      message: `Payroll processing complete: ${successCount} processed, ${failureCount} failed`,
      processed: successCount,
      failed: failureCount,
      total_amount: Math.round(totalAmount * 100) / 100,
      results,
    });

  } catch (error) {
    console.error("[Weekly Payroll Error]:", error.message);
    return Response.json({
      error: error.message,
      success: false,
    }, { status: 500 });
  }
});