import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { driver_id, pay_period_start, pay_period_end, bonus = 0, deductions = 0 } = payload;

    console.log(`[Payroll] Processing driver ${driver_id} for ${pay_period_start} to ${pay_period_end}`);

    // Fetch driver record
    const driver = await base44.asServiceRole.entities.Driver.get(driver_id);
    if (!driver) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    console.log(`[Payroll] Driver: ${driver.first_name} ${driver.last_name}, Pay Type: ${driver.pay_type}`);

    // Get completed loads in the pay period
    const allLoads = await base44.asServiceRole.entities.Load.filter(
      { driver_id, status: "completed" },
      "-completed_date",
      500
    );

    const periodStart = new Date(pay_period_start);
    const periodEnd = new Date(pay_period_end);
    periodEnd.setHours(23, 59, 59, 999);

    const periodLoads = allLoads.filter(load => {
      const deliveryDate = load.actual_delivery || load.delivery_date || load.created_date;
      const loadDate = new Date(deliveryDate);
      return loadDate >= periodStart && loadDate <= periodEnd;
    });

    console.log(`[Payroll] Found ${periodLoads.length} completed loads in period`);

    if (periodLoads.length === 0) {
      return Response.json({
        success: false,
        message: 'No completed loads in pay period',
        payroll_record: null,
      });
    }

    // Calculate totals
    let totalMiles = 0;
    let totalRevenue = 0;
    let basePay = 0;
    const loadDetails = [];

    periodLoads.forEach(load => {
      const miles = load.miles || 0;
      const revenue = load.rate || 0;
      let loadPay = 0;

      // Calculate pay based on driver's pay type
      if (driver.pay_type === "per_mile") {
        loadPay = miles * (driver.pay_rate || 0.50);
      } else if (driver.pay_type === "percentage") {
        loadPay = revenue * ((driver.pay_rate || 30) / 100);
      } else if (driver.pay_type === "flat_rate") {
        loadPay = driver.pay_rate || 50;
      } else if (driver.pay_type === "hourly") {
        // Estimate hours based on miles (avg 60 mph)
        const estimatedHours = miles / 60;
        loadPay = estimatedHours * (driver.pay_rate || 25);
      }

      totalMiles += miles;
      totalRevenue += revenue;
      basePay += loadPay;

      loadDetails.push({
        load_id: load.id,
        load_number: load.load_number || `#${load.id.slice(-6)}`,
        miles,
        revenue,
        pay_amount: Math.round(loadPay * 100) / 100,
      });
    });

    // Apply bonuses and deductions
    const totalBonus = bonus || 0;
    const totalDeductions = deductions || 0;
    const netPay = basePay + totalBonus - totalDeductions;

    console.log(`[Payroll] Calculated - Base: $${basePay.toFixed(2)}, Miles: ${totalMiles}, Revenue: $${totalRevenue.toFixed(2)}`);

    // Create payroll record
    const payrollRecord = await base44.asServiceRole.entities.PayrollRecord.create({
      driver_id,
      driver_name: `${driver.first_name} ${driver.last_name}`,
      pay_period_start,
      pay_period_end,
      pay_type: driver.pay_type,
      pay_rate: driver.pay_rate,
      loads_completed: periodLoads.length,
      total_miles: Math.round(totalMiles),
      total_revenue: Math.round(totalRevenue * 100) / 100,
      base_pay: Math.round(basePay * 100) / 100,
      bonuses: totalBonus,
      deductions: totalDeductions,
      net_pay: Math.round(netPay * 100) / 100,
      loads: loadDetails,
      status: "calculated",
    });

    console.log(`[Payroll] Record created: ${payrollRecord.id} - Net Pay: $${netPay.toFixed(2)}`);

    // Update driver YTD earnings
    const driverUpdates = {
      earnings_ytd: (driver.earnings_ytd || 0) + netPay,
    };
    await base44.asServiceRole.entities.Driver.update(driver_id, driverUpdates);

    // Create manifest event for audit trail
    try {
      await base44.asServiceRole.entities.Manifest.create({
        event_type: "note_added",
        event_title: `Payroll Calculated: ${periodLoads.length} loads - $${netPay.toFixed(2)}`,
        event_description: `Pay Period: ${pay_period_start} to ${pay_period_end}\nBase Pay: $${basePay.toFixed(2)}\nBonuses: $${totalBonus.toFixed(2)}\nDeductions: $${totalDeductions.toFixed(2)}\nNet: $${netPay.toFixed(2)}`,
        event_timestamp: new Date().toISOString(),
        performed_by: driver_id,
        performed_by_role: "driver",
        is_system_event: true,
      });
    } catch (err) {
      console.log("[Payroll] Manifest event creation failed:", err.message);
    }

    return Response.json({
      success: true,
      payroll_record: {
        id: payrollRecord.id,
        driver_name: payrollRecord.driver_name,
        loads_completed: periodLoads.length,
        total_miles: Math.round(totalMiles),
        base_pay: Math.round(basePay * 100) / 100,
        bonuses: totalBonus,
        deductions: totalDeductions,
        net_pay: Math.round(netPay * 100) / 100,
      },
      message: `Payroll processed for ${driver.first_name} ${driver.last_name}: $${netPay.toFixed(2)}`,
    });

  } catch (error) {
    console.error("[Payroll Error]:", error.message);
    return Response.json({
      error: error.message,
      success: false,
    }, { status: 500 });
  }
});