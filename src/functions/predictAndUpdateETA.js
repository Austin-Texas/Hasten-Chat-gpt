import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AVG_HIGHWAY_SPEED = 65; // mph
const SPEED_ADJUSTMENT = 0.85; // Account for stops, traffic

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch active loads without ETA
    const activeLogs = await base44.asServiceRole.entities.Load.filter({
      status: ["assigned", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery"]
    }, "-created_date", 300);

    const drivers = await base44.asServiceRole.entities.Driver.list("-created_date", 100);
    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));

    const etasUpdated = [];
    const now = new Date();

    for (const load of activeLogs) {
      // Skip if already has ETA
      if (load.eta) continue;

      // Skip if no pickup or delivery date
      if (!load.pickup_date && !load.delivery_date) continue;

      let predictedETA = null;

      // Method 1: Use provided delivery date
      if (load.delivery_date) {
        predictedETA = new Date(load.delivery_date);
      }

      // Method 2: Calculate based on distance and speed
      if (!predictedETA && load.miles && load.pickup_date) {
        const pickupTime = new Date(load.pickup_date);
        // Assume pickup takes 1 hour, then add driving time
        const drivingHours = (load.miles / AVG_HIGHWAY_SPEED) / SPEED_ADJUSTMENT;
        const travelTimeMs = (1 + drivingHours) * 60 * 60 * 1000; // 1 hour + driving
        predictedETA = new Date(pickupTime.getTime() + travelTimeMs);
      }

      // Method 3: If currently in transit, estimate from current position
      if (!predictedETA && load.status === "in_transit" && load.miles) {
        // Estimate based on how far they've come
        const remainingMiles = load.miles * 0.6; // Assume 40% complete
        const remainingHours = (remainingMiles / AVG_HIGHWAY_SPEED) / SPEED_ADJUSTMENT;
        const remainingMs = remainingHours * 60 * 60 * 1000;
        predictedETA = new Date(now.getTime() + remainingMs);
      }

      if (predictedETA) {
        // Update load with predicted ETA
        await base44.asServiceRole.entities.Load.update(load.id, {
          eta: predictedETA.toISOString(),
        });

        etasUpdated.push({
          loadId: load.id,
          loadNumber: load.load_number,
          predictedETA: predictedETA.toLocaleString(),
          method: load.delivery_date ? "delivery_date" : load.miles ? "distance_based" : "in_transit",
        });
      }
    }

    return Response.json({
      success: true,
      etasPredicted: etasUpdated.length,
      etasUpdated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error predicting ETAs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});