import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch available loads and drivers
    const availableLoads = await base44.asServiceRole.entities.Load.filter({
      status: "available"
    }, "-created_date", 200);

    const availableDrivers = await base44.asServiceRole.entities.Driver.filter({
      status: "available"
    }, "-created_date", 100);

    const trucks = await base44.asServiceRole.entities.Truck.list("-created_date", 100);
    const truckMap = Object.fromEntries(trucks.map(t => [t.id, t]));

    const assignments = [];
    const unassignedLoads = [];

    // Sort loads by priority (critical > express > standard)
    const priorityOrder = { critical: 0, express: 1, standard: 2 };
    availableLoads.sort((a, b) => 
      (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    );

    // Try to assign each load to a suitable driver
    for (const load of availableLoads) {
      let bestMatch = null;
      let bestScore = -1;

      for (const driver of availableDrivers) {
        // Check equipment compatibility
        if (load.equipment_type && driver.truck_id) {
          const truck = truckMap[driver.truck_id];
          if (truck?.status !== "active" && truck?.status !== "idle") continue;
        }

        // Check hazmat certification
        if (load.is_hazmat && !driver.hazmat_cert) continue;

        // Calculate match score (proximity + experience)
        let score = 0;

        // Proximity score: drivers closer to origin get higher score
        if (driver.current_city === load.origin_city && driver.current_state === load.origin_state) {
          score += 100;
        } else if (driver.current_state === load.origin_state) {
          score += 50;
        }

        // Experience score: drivers with similar routes
        score += Math.min(driver.loads_completed || 0, 50);

        // Safety score: drivers with high safety ratings
        score += (driver.safety_score || 80) / 2;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = driver;
        }
      }

      if (bestMatch) {
        // Assign load to driver
        await base44.asServiceRole.entities.Load.update(load.id, {
          driver_id: bestMatch.id,
          truck_id: bestMatch.truck_id,
          status: "assigned",
        });

        // Update driver status
        await base44.asServiceRole.entities.Driver.update(bestMatch.id, {
          status: "on_load",
          current_load_id: load.id,
        });

        // Send notification to driver
        if (bestMatch.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: bestMatch.email,
            subject: `📦 Load Assigned: ${load.load_number}`,
            body: `New load assigned:\n\n${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}\nDistance: ${load.miles} miles\nRate: $${load.rate}\n\nAccess your loads in the driver app.`,
            from_name: "HASTEN Dispatch",
          }).catch(err => console.error(`Failed to email driver:`, err));
        }

        // Remove from available list
        availableDrivers.splice(availableDrivers.indexOf(bestMatch), 1);

        assignments.push({
          loadId: load.id,
          loadNumber: load.load_number,
          driverId: bestMatch.id,
          driverName: `${bestMatch.first_name} ${bestMatch.last_name}`,
          matchScore: bestScore,
        });
      } else {
        unassignedLoads.push({
          loadId: load.id,
          loadNumber: load.load_number,
          origin: `${load.origin_city}, ${load.origin_state}`,
          destination: `${load.destination_city}, ${load.destination_state}`,
          miles: load.miles,
        });
      }
    }

    return Response.json({
      success: true,
      assignmentsMade: assignments.length,
      unassignedLoads: unassignedLoads.length,
      assignments,
      unassignedLoads,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error auto-assigning loads:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});