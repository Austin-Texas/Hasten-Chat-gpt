function num(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildFleetTelemetryProfile(asset = {}) {
  const rawFaults = asset.fault_codes || asset.dtc_codes || [];
  const faultCodes = Array.isArray(rawFaults) ? rawFaults : String(rawFaults).split(",").map((item) => item.trim()).filter(Boolean);
  const idleMinutes = num(asset.idle_minutes || asset.idle_time_minutes);
  return {
    asset_id: asset.id,
    gps: asset.current_location || { lat: asset.current_lat || null, lng: asset.current_lng || null },
    speed: num(asset.speed),
    engine_hours: num(asset.engine_hours),
    engine_temp: num(asset.engine_temp),
    idle_minutes: idleMinutes,
    fuel_burn: num(asset.fuel_burn || asset.fuel_burn_gallons),
    fault_codes: faultCodes,
    alert_level: faultCodes.length ? "fault" : idleMinutes >= 120 ? "idle" : "normal",
  };
}

export function buildFleetSafetyProfile(asset = {}) {
  const speeding = num(asset.speeding_events);
  const harsh = num(asset.harsh_braking_events || asset.harsh_events);
  const camera = num(asset.camera_events);
  const incidents = num(asset.incidents_count || asset.accidents_count);
  const hos = num(asset.hos_violations);
  const score = Math.max(0, 100 - speeding * 3 - harsh * 4 - camera * 5 - incidents * 18 - hos * 10);
  return {
    asset_id: asset.id,
    safety_score: score,
    risk_level: score >= 85 ? "low" : score >= 70 ? "medium" : score >= 55 ? "high" : "critical",
    metrics: { speeding, harsh_braking: harsh, camera_events: camera, incidents, hos_violations: hos },
  };
}

export function buildFleetUtilizationProfile(asset = {}, loads = []) {
  const assetLoads = loads.filter((load) => load.truck_id === asset.id || load.asset_id === asset.id);
  const revenue = assetLoads.reduce((sum, load) => sum + num(load.rate || load.total_revenue), 0);
  const miles = assetLoads.reduce((sum, load) => sum + num(load.miles || load.miles_total), 0);
  const maintenanceCost = num(asset.maintenance_cost_ytd || asset.maintenance_cost);
  const fuelCost = num(asset.fuel_cost_ytd || asset.fuel_cost);
  const totalCost = maintenanceCost + fuelCost;
  return {
    asset_id: asset.id,
    active_loads: assetLoads.filter((load) => !["delivered", "completed", "cancelled"].includes(load.status)).length,
    completed_loads: assetLoads.filter((load) => ["delivered", "completed"].includes(load.status)).length,
    miles,
    revenue,
    maintenance_cost: maintenanceCost,
    fuel_cost: fuelCost,
    total_cost: totalCost,
    profit: revenue - totalCost,
    revenue_per_mile: miles > 0 ? Number((revenue / miles).toFixed(2)) : 0,
    cost_per_mile: miles > 0 ? Number((totalCost / miles).toFixed(2)) : 0,
    idle_days: num(asset.idle_days),
  };
}

export function buildFleetTelemetryUtilizationDashboard({ trucks = [], loads = [] } = {}) {
  const telemetry = trucks.map(buildFleetTelemetryProfile);
  const safety = trucks.map(buildFleetSafetyProfile);
  const utilization = trucks.map((truck) => buildFleetUtilizationProfile(truck, loads));
  return {
    telemetry,
    safety,
    utilization,
    fault_assets: telemetry.filter((item) => item.alert_level === "fault").length,
    prolonged_idle_assets: telemetry.filter((item) => item.alert_level === "idle").length,
    high_risk_assets: safety.filter((item) => ["high", "critical"].includes(item.risk_level)).length,
    total_revenue: utilization.reduce((sum, item) => sum + item.revenue, 0),
    total_profit: utilization.reduce((sum, item) => sum + item.profit, 0),
    total_miles: utilization.reduce((sum, item) => sum + item.miles, 0),
  };
}
