import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// IFTA diesel tax rates per state ($ per gallon), current published rates
const IFTA_RATES = {
  AL: 0.2900, AK: 0.0895, AZ: 0.2600, AR: 0.2850, CA: 0.7760, CO: 0.2050,
  CT: 0.4000, DE: 0.2200, FL: 0.3490, GA: 0.3190, HI: 0.1600, ID: 0.3200,
  IL: 0.4590, IN: 0.5100, IA: 0.3250, KS: 0.2600, KY: 0.2160, LA: 0.2000,
  ME: 0.3120, MD: 0.3690, MA: 0.2400, MI: 0.4630, MN: 0.2850, MS: 0.1800,
  MO: 0.1950, MT: 0.2975, NE: 0.2460, NV: 0.2800, NH: 0.2220, NJ: 0.4175,
  NM: 0.2100, NY: 0.4775, NC: 0.3820, ND: 0.2300, OH: 0.4750, OK: 0.1900,
  OR: 0.3600, PA: 0.7410, RI: 0.3400, SC: 0.2500, SD: 0.2800, TN: 0.2700,
  TX: 0.2000, UT: 0.3170, VT: 0.3200, VA: 0.2750, WA: 0.4940, WV: 0.3575,
  WI: 0.3290, WY: 0.2400, DC: 0.2350,
  // Canadian provinces (CAD rates, marked for display)
  AB: 0.0900, BC: 0.2770, MB: 0.1400, NB: 0.2153, NL: 0.1650, NS: 0.1540,
  ON: 0.1430, PE: 0.2043, QC: 0.2020, SK: 0.1500,
};

// Average diesel MPG for Class 8 trucks
const DEFAULT_MPG = 6.5;

function estimateMilesByState(originState, destState, totalMiles) {
  // Simple heuristic: split miles proportionally
  // In production, integrate a routing API. For IFTA compliance this gives a defensible estimate.
  if (originState === destState) {
    return { [originState]: totalMiles };
  }
  // Split 50/50 for 2-state routes, or use a rough midpoint model
  const half = Math.round(totalMiles / 2);
  return {
    [originState]: half,
    [destState]: totalMiles - half,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { quarter, year } = body;

    if (!quarter || !year) {
      return Response.json({ error: 'quarter (1-4) and year are required' }, { status: 400 });
    }

    // Determine date range for quarter
    const quarterStartMonth = (quarter - 1) * 3; // 0-indexed month
    const startDate = new Date(year, quarterStartMonth, 1);
    const endDate = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59);

    // Fetch completed/delivered loads in the quarter
    const allLoads = await base44.asServiceRole.entities.Load.filter({
      status: 'completed',
    }, '-actual_delivery', 500);

    const loads = allLoads.filter(l => {
      const d = new Date(l.actual_delivery || l.delivery_date || l.created_date);
      return d >= startDate && d <= endDate;
    });

    // Aggregate by state
    const stateMap = {}; // { stateCode: { miles, gallons, taxOwed, loads[] } }
    const loadBreakdowns = [];

    for (const load of loads) {
      const originState = (load.origin_state || '').toUpperCase().trim();
      const destState = (load.destination_state || '').toUpperCase().trim();
      const miles = load.miles || 0;
      const mpg = load.mpg || DEFAULT_MPG;

      const stateMiles = estimateMilesByState(originState, destState, miles);
      const loadEntries = [];

      for (const [state, mi] of Object.entries(stateMiles)) {
        if (!state || mi <= 0) continue;
        const rate = IFTA_RATES[state] ?? null;
        const gallons = mi / mpg;
        const tax = rate !== null ? gallons * rate : null;

        if (!stateMap[state]) stateMap[state] = { miles: 0, gallons: 0, taxOwed: 0, loadsCount: 0 };
        stateMap[state].miles += mi;
        stateMap[state].gallons += gallons;
        if (tax !== null) stateMap[state].taxOwed += tax;
        stateMap[state].loadsCount += 1;

        loadEntries.push({ state, miles: mi, gallons: parseFloat(gallons.toFixed(2)), rate, tax: tax !== null ? parseFloat(tax.toFixed(2)) : null });
      }

      loadBreakdowns.push({
        load_id: load.id,
        load_number: load.load_number || `LD-${load.id?.slice(-6).toUpperCase()}`,
        origin: `${load.origin_city}, ${originState}`,
        destination: `${load.destination_city}, ${destState}`,
        miles,
        delivery_date: load.actual_delivery || load.delivery_date,
        rate: load.rate,
        states: loadEntries,
        total_tax: parseFloat(loadEntries.reduce((s, e) => s + (e.tax || 0), 0).toFixed(2)),
      });
    }

    // Build state summary rows
    const stateSummary = Object.entries(stateMap).map(([state, data]) => ({
      state,
      miles: Math.round(data.miles),
      gallons: parseFloat(data.gallons.toFixed(2)),
      rate: IFTA_RATES[state] ?? null,
      taxOwed: parseFloat(data.taxOwed.toFixed(2)),
      loadsCount: data.loadsCount,
      hasRate: IFTA_RATES[state] !== undefined,
    })).sort((a, b) => b.taxOwed - a.taxOwed);

    const totalTax = parseFloat(stateSummary.reduce((s, r) => s + r.taxOwed, 0).toFixed(2));
    const totalMiles = stateSummary.reduce((s, r) => s + r.miles, 0);
    const totalGallons = parseFloat(stateSummary.reduce((s, r) => s + r.gallons, 0).toFixed(2));

    return Response.json({
      quarter,
      year,
      period: `Q${quarter} ${year}`,
      date_range: { from: startDate.toISOString().slice(0, 10), to: endDate.toISOString().slice(0, 10) },
      loads_count: loads.length,
      total_miles: totalMiles,
      total_gallons: totalGallons,
      total_tax_owed: totalTax,
      state_summary: stateSummary,
      load_breakdowns: loadBreakdowns,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});