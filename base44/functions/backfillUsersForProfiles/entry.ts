import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const stats = {
      drivers_without_user: 0,
      contractors_without_user: 0,
      created_users: 0,
      linked_drivers: 0,
      linked_contractors: 0,
      failed: 0
    };

    // Find drivers without user_id
    const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 500).catch(() => []);
    const driversWithoutUser = allDrivers.filter(d => !d.user_id);
    
    console.log(`Found ${driversWithoutUser.length} drivers without user_id`);
    stats.drivers_without_user = driversWithoutUser.length;

    // Link drivers to contractors (identify existing relationships)
    for (const driver of driversWithoutUser) {
      try {
        const contractors = await base44.asServiceRole.entities.ContractorProfile.filter(
          { driver_id: driver.id },
          '-created_date',
          1
        ).catch(() => []);
        if (contractors[0] && contractors[0].user_id) {
          // Contractor already has a user, link driver to same user
          await base44.asServiceRole.entities.Driver.update(driver.id, {
            user_id: contractors[0].user_id
          });
          stats.linked_drivers++;
          console.log(`Linked driver ${driver.id} to existing contractor user ${contractors[0].user_id}`);
        }
      } catch (err) {
        console.error(`Failed to process driver ${driver.id}:`, err.message);
      }
    }

    // Find contractors without user_id after first pass
    const allContractors = await base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500).catch(() => []);
    const contractorsWithoutUser = allContractors.filter(c => !c.user_id);
    
    console.log(`Found ${contractorsWithoutUser.length} contractors without user_id`);
    stats.contractors_without_user = contractorsWithoutUser.length;

    // Link contractors to drivers' users
    for (const contractor of contractorsWithoutUser) {
      try {
        if (contractor.driver_id) {
          const driver = await base44.asServiceRole.entities.Driver.get(contractor.driver_id);
          if (driver?.user_id) {
            await base44.asServiceRole.entities.ContractorProfile.update(contractor.id, {
              user_id: driver.user_id
            });
            stats.linked_contractors++;
            console.log(`Linked contractor ${contractor.id} to driver user ${driver.user_id}`);
          }
        }
      } catch (err) {
        console.error(`Failed to link contractor ${contractor.id}:`, err.message);
        stats.failed++;
      }
    }

    console.log('Backfill complete:', stats);
    return Response.json({ success: true, stats });
  } catch (error) {
    console.error('Backfill error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});