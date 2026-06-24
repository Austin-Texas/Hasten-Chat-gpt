import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Equipment compatibility mapping — what driver equipment can fulfill what load requirements
const EQUIPMENT_COMPAT = {
  'Sprinter': ['Sprinter', 'Cargo Van'],
  'Cargo Van': ['Cargo Van', 'Sprinter'],
  'Box Truck': ['Box Truck', 'Dry Van'],
  'Hot Shot': ['Hot Shot', 'Gooseneck', 'Flatbed', 'Power Only'],
  'Gooseneck': ['Gooseneck', 'Hot Shot', 'Flatbed', 'Power Only'],
  'Dry Van': ['Dry Van', 'Box Truck', 'Power Only'],
  'Power Only': ['Power Only', 'Dry Van', 'Flatbed', 'Gooseneck', 'Hot Shot'],
  'Flatbed': ['Flatbed', 'Step Deck', 'Gooseneck', 'Power Only'],
  'Car Hauler': ['Car Hauler'],
  'Reefer': ['Reefer', 'Dry Van'],
  'Step Deck': ['Step Deck', 'Flatbed'],
  'Conestoga': ['Conestoga', 'Flatbed', 'Dry Van']
};

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function canFulfillLoad(driverEquipment, requiredEquipment) {
  if (!driverEquipment || !requiredEquipment) return false;
  const compat = EQUIPMENT_COMPAT[requiredEquipment] || [requiredEquipment];
  return compat.includes(driverEquipment);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { external_load_id, driver_id, radius_miles = 500 } = await req.json().catch(() => ({}));

    // Mode 1: Match a specific external load to all compatible drivers
    if (external_load_id) {
      let extLoad;
      try {
        extLoad = await base44.asServiceRole.entities.ExternalLoad.get(external_load_id);
      } catch {
        return Response.json({ error: 'External load not found' }, { status: 404 });
      }

      const drivers = await base44.asServiceRole.entities.Driver
        .filter({ status: 'available' }, '-created_date', 200)
        .catch(() => []);

      const matches = [];
      for (const driver of drivers) {
        // Check equipment compatibility
        const driverEquipment = driver.driver_type === 'owner_operator' ? driver.vehicle_type : driver.equipment_type;
        // Try multiple equipment fields
        const equipType = driver.vehicle_type || driver.trailer_type || driver.driver_type;
        
        let equipmentMatch = false;
        // Check against all possible equipment fields
        const driverEquipments = [
          driver.vehicle_type,
          driver.trailer_type,
          driver.driver_type
        ].filter(Boolean);
        
        for (const eq of driverEquipments) {
          if (canFulfillLoad(eq, extLoad.required_equipment)) {
            equipmentMatch = true;
            break;
          }
        }

        if (!equipmentMatch) continue;

        // Calculate distance if driver has location
        let deadheadMiles = null;
        let locationScore = 50; // default neutral
        if (driver.current_lat && driver.current_lng && extLoad.pickup_city) {
          // Use driver's current city/state to estimate — would need geocoding in production
          deadheadMiles = 0; // Placeholder — would use geocoding service
          locationScore = 80;
        }

        // Check hazmat capability
        if (extLoad.hazmat && !driver.hazmat_cert) continue;

        // Check team requirement
        if (extLoad.team_required && !driver.endorsements?.includes('team')) continue;

        // Calculate match score
        let score = 50;
        if (equipmentMatch) score += 30;
        if (driver.compliance_status === 'compliant' || driver.cdl_status === 'verified') score += 10;
        if (driver.status === 'available') score += 10;
        score = Math.min(score, 100);

        matches.push({
          driver_id: driver.id,
          driver_name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
          equipment: driverEquipments.join(', '),
          match_score: score,
          deadhead_miles: deadheadMiles,
          available: driver.status === 'available',
          hazmat_cert: driver.hazmat_cert,
          home_city: driver.home_city,
          home_state: driver.home_state
        });
      }

      matches.sort((a, b) => b.match_score - a.match_score);

      return Response.json({
        success: true,
        external_load_id,
        required_equipment: extLoad.required_equipment,
        total_drivers_checked: drivers.length,
        matched_count: matches.length,
        matches: matches.slice(0, 50)
      });
    }

    // Mode 2: Match all available external loads to a specific driver
    if (driver_id) {
      const driver = await base44.asServiceRole.entities.Driver.get(driver_id).catch(() => null);
      if (!driver) return Response.json({ error: 'Driver not found' }, { status: 404 });

      const extLoads = await base44.asServiceRole.entities.ExternalLoad
        .filter({ normalized_status: 'available' }, '-imported_at', 200)
        .catch(() => []);

      const driverEquipments = [
        driver.vehicle_type,
        driver.trailer_type,
        driver.driver_type
      ].filter(Boolean);

      const matches = [];
      for (const load of extLoads) {
        let equipmentMatch = false;
        for (const eq of driverEquipments) {
          if (canFulfillLoad(eq, load.required_equipment)) {
            equipmentMatch = true;
            break;
          }
        }
        if (!equipmentMatch) continue;
        if (load.hazmat && !driver.hazmat_cert) continue;
        if (load.team_required && !driver.endorsements?.includes('team')) continue;

        const ratePerMile = load.miles_total > 0 ? load.rate_available / load.miles_total : 0;
        
        matches.push({
          external_load_id: load.id,
          source: load.source_provider,
          broker: load.broker_name,
          route: `${load.pickup_city}, ${load.pickup_state} → ${load.delivery_city}, ${load.delivery_state}`,
          equipment: load.required_equipment,
          rate: load.rate_available,
          rate_per_mile: ratePerMile.toFixed(2),
          miles: load.miles_total,
          hazmat: load.hazmat,
          expires_at: load.expires_at
        });
      }

      matches.sort((a, b) => (b.rate_per_mile || 0) - (a.rate_per_mile || 0));

      return Response.json({
        success: true,
        driver_id,
        driver_name: `${driver.first_name} ${driver.last_name}`,
        driver_equipment: driverEquipments.join(', '),
        total_loads_checked: extLoads.length,
        matched_count: matches.length,
        matches: matches.slice(0, 50)
      });
    }

    // Mode 3: Global match summary
    const [extLoads, drivers] = await Promise.all([
      base44.asServiceRole.entities.ExternalLoad.filter({ normalized_status: 'available' }, '-imported_at', 100).catch(() => []),
      base44.asServiceRole.entities.Driver.filter({ status: 'available' }, '-created_date', 100).catch(() => [])
    ]);

    return Response.json({
      success: true,
      available_external_loads: extLoads.length,
      available_drivers: drivers.length,
      message: 'Pass external_load_id or driver_id for specific matching'
    });
  } catch (error) {
    console.error('[matchExternalLoadsToDrivers]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});