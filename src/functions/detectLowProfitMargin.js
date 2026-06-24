import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULT_MARGIN_THRESHOLD = 20; // 20% minimum target margin
const FUEL_PRICE_PER_GALLON = 3.50; // Default fuel price
const AVERAGE_MPG = 6; // Average truck MPG

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch active and assigned loads
    const loads = await base44.asServiceRole.entities.Load.filter({
      status: ["available", "assigned", "accepted", "en_route"]
    }, "-created_date", 200);

    const drivers = await base44.asServiceRole.entities.Driver.list("-created_date", 100);
    const trucks = await base44.asServiceRole.entities.Truck.list("-created_date", 100);
    const expenses = await base44.asServiceRole.entities.Expense.list("-created_date", 200);
    const user = await base44.auth.me();

    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));
    const truckMap = Object.fromEntries(trucks.map(t => [t.id, t]));

    const lowMarginLoads = [];

    for (const load of loads) {
      // Calculate revenue
      const revenue = load.rate || 0;
      if (revenue === 0) continue;

      let totalCost = 0;

      // 1. Driver pay cost
      if (load.driver_id) {
        const driver = driverMap[load.driver_id];
        if (driver) {
          let driverPay = 0;
          switch (driver.pay_type) {
            case "per_mile":
              driverPay = (load.miles || 0) * (driver.pay_rate || 0);
              break;
            case "percentage":
              driverPay = revenue * ((driver.pay_rate || 0) / 100);
              break;
            case "flat_rate":
              driverPay = driver.pay_rate || 0;
              break;
            case "hourly":
              driverPay = (driver.pay_rate || 0) * 8; // assume 8 hours
              break;
          }
          totalCost += driverPay;
        }
      }

      // 2. Fuel cost
      const miles = load.miles || 0;
      const mpg = (load.truck_id && truckMap[load.truck_id]?.mpg) || AVERAGE_MPG;
      const fuelNeeded = miles / mpg;
      const fuelCost = fuelNeeded * FUEL_PRICE_PER_GALLON;
      totalCost += fuelCost;

      // 3. Accessorial charges and deductions
      if (load.fuel_surcharge) totalCost += load.fuel_surcharge;
      if (load.accessorial_charges) totalCost += load.accessorial_charges;

      // 4. Load-specific expenses (scales, permits, etc.)
      const loadExpenses = expenses
        .filter(e => e.load_id === load.id)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      totalCost += loadExpenses;

      // Calculate profit and margin
      const profit = revenue - totalCost;
      const marginPercent = revenue > 0 ? Math.round(((profit / revenue) * 100) * 10) / 10 : 0;

      // Alert if below threshold
      if (marginPercent < DEFAULT_MARGIN_THRESHOLD) {
        lowMarginLoads.push({
          loadId: load.id,
          loadNumber: load.load_number,
          status: load.status,
          origin: `${load.origin_city}, ${load.origin_state}`,
          destination: `${load.destination_city}, ${load.destination_state}`,
          revenue: Math.round(revenue * 100) / 100,
          driverPay: load.driver_id ? (driverMap[load.driver_id]?.pay_rate || 0) : 0,
          fuelCost: Math.round(fuelCost * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          marginPercent,
          miles,
          severity: marginPercent < 5 ? "critical" : marginPercent < 10 ? "warning" : "notice",
        });
      }
    }

    // Sort by most critical first
    lowMarginLoads.sort((a, b) => a.marginPercent - b.marginPercent);

    // Send alert email if there are low-margin loads
    if (lowMarginLoads.length > 0 && user?.email) {
      const criticalCount = lowMarginLoads.filter(l => l.severity === "critical").length;
      const warningCount = lowMarginLoads.filter(l => l.severity === "warning").length;

      const loadDetails = lowMarginLoads
        .slice(0, 10) // Show top 10 most critical
        .map(l => `
Load #${l.loadNumber}
  Route: ${l.origin} → ${l.destination}
  Status: ${l.status}
  Revenue: $${l.revenue.toLocaleString()}
  Expenses: $${l.totalCost.toLocaleString()}
  Profit: $${l.profit.toLocaleString()}
  Margin: ${l.marginPercent}% (Target: ${DEFAULT_MARGIN_THRESHOLD}%)
`)
        .join("\n");

      const emailBody = `⚠️ PROFIT MARGIN ALERT

${lowMarginLoads.length} load(s) are projected below your ${DEFAULT_MARGIN_THRESHOLD}% profit margin target.

CRITICAL (< 5%): ${criticalCount}
WARNING (5-10%): ${warningCount}
NOTICE (10-20%): ${lowMarginLoads.filter(l => l.severity === "notice").length}

TOP CRITICAL LOADS:
${loadDetails}

ACTION ITEMS:
• Review driver/fuel costs for efficiency improvements
• Consider repricing underperforming lanes
• Negotiate better rates with brokers or clients
• Check for additional expense allocations

Report generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `⚠️ ALERT: ${lowMarginLoads.length} Low-Margin Load(s) Detected`,
        body: emailBody,
        from_name: "HASTEN Logistics - Profit Alert",
      }).catch(err => console.error("Failed to send email:", err));
    }

    return Response.json({
      success: true,
      lowMarginLoadsDetected: lowMarginLoads.length,
      loads: lowMarginLoads.slice(0, 20),
      threshold: DEFAULT_MARGIN_THRESHOLD,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error detecting low profit margins:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});