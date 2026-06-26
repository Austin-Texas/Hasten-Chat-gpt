function num(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Number(num(value).toFixed(2));
}

export function calculateDispatchLoadProfit(load = {}) {
  const brokerRate = num(load.rate || load.total_revenue || load.broker_rate);
  const driverPay = num(load.driver_pay || load.carrier_pay || load.linehaul_pay);
  const fuel = num(load.fuel_cost || load.estimated_fuel_cost);
  const tolls = num(load.toll_cost || load.estimated_tolls);
  const factoring = num(load.factoring_fee || brokerRate * 0.025);
  const detention = num(load.detention_pay);
  const layover = num(load.layover_pay);
  const tonu = num(load.tonu_pay);
  const accessorial = detention + layover + tonu;
  const totalCost = driverPay + fuel + tolls + factoring + accessorial;
  const margin = brokerRate - totalCost;
  const marginPct = brokerRate > 0 ? Number(((margin / brokerRate) * 100).toFixed(1)) : 0;
  return {
    load_id: load.id,
    load_number: load.load_number,
    broker_rate: money(brokerRate),
    driver_pay: money(driverPay),
    fuel: money(fuel),
    tolls: money(tolls),
    factoring: money(factoring),
    accessorial: money(accessorial),
    total_cost: money(totalCost),
    margin: money(margin),
    margin_pct: marginPct,
    risk: marginPct < 0 ? "negative" : marginPct < 8 ? "low_margin" : marginPct < 15 ? "watch" : "healthy",
  };
}

export function buildDispatchProfitabilityDashboard(loads = []) {
  const rows = loads.map(calculateDispatchLoadProfit);
  const brokerRate = rows.reduce((sum, row) => sum + row.broker_rate, 0);
  const cost = rows.reduce((sum, row) => sum + row.total_cost, 0);
  const margin = rows.reduce((sum, row) => sum + row.margin, 0);
  return {
    rows,
    total_revenue: money(brokerRate),
    total_cost: money(cost),
    total_margin: money(margin),
    margin_pct: brokerRate > 0 ? Number(((margin / brokerRate) * 100).toFixed(1)) : 0,
    negative_loads: rows.filter((row) => row.risk === "negative").length,
    low_margin_loads: rows.filter((row) => row.risk === "low_margin").length,
    healthy_loads: rows.filter((row) => row.risk === "healthy").length,
  };
}
