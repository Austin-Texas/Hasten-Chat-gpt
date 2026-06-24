import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { quarter, startDate, endDate } = await req.json();

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch data
    const loads = await base44.asServiceRole.entities.Load.filter(
      { status: "completed" },
      "-created_date",
      1000
    );

    const expenses = await base44.asServiceRole.entities.Expense.filter(
      { category: "fuel" },
      "-created_date",
      500
    );

    const stateReports = {};
    let totalMiles = 0;
    let totalGallons = 0;
    let totalFuelCost = 0;

    // Process loads for mileage by state
    loads.forEach(load => {
      const loadDate = new Date(load.actual_delivery || load.delivery_date || load.created_date);
      if (loadDate >= start && loadDate <= end) {
        const state = load.destination_state || "Unknown";

        if (!stateReports[state]) {
          stateReports[state] = {
            state,
            miles: 0,
            gallons: 0,
            fuelCost: 0,
            loads: 0,
            taxRate: 0.243, // Default IFTA tax rate
          };
        }

        stateReports[state].miles += load.miles || 0;
        stateReports[state].loads += 1;
        totalMiles += load.miles || 0;
      }
    });

    // Process fuel expenses
    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      if (expDate >= start && expDate <= end) {
        const state = exp.location_state || "Unknown";

        if (!stateReports[state]) {
          stateReports[state] = {
            state,
            miles: 0,
            gallons: 0,
            fuelCost: 0,
            loads: 0,
            taxRate: 0.243,
          };
        }

        stateReports[state].gallons += exp.gallons || 0;
        stateReports[state].fuelCost += exp.amount || 0;
        totalGallons += exp.gallons || 0;
        totalFuelCost += exp.amount || 0;
      }
    });

    // Calculate tax liability per state
    const statesReported = Object.keys(stateReports).length;
    Object.values(stateReports).forEach(report => {
      report.taxLiability = report.gallons * report.taxRate;
      report.mpg = report.gallons > 0 ? (report.miles / report.gallons).toFixed(2) : 0;
    });

    console.log(
      `IFTA report generated for ${quarter}: ${statesReported} states, ${totalMiles} miles, ${totalGallons.toFixed(1)} gallons`
    );

    return Response.json({
      success: true,
      quarter,
      statesReported,
      totalMiles: totalMiles.toFixed(0),
      totalGallons: totalGallons.toFixed(1),
      totalFuelCost: totalFuelCost.toFixed(2),
      stateReports,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating IFTA quarterly report:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});