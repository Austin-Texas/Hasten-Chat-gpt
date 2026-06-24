import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Compliance Status Engine
 * 
 * Centralized engine for computing compliance status (compliant/warning/expired/blocked)
 * Called on demand or via automation when driver/truck documents change.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { entity_type, entity_id } = body;
    
    // Service role function - logs all operations
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // If entity_type and entity_id provided, process single entity
    // Otherwise, scan all drivers and trucks (scheduled automation mode)
    if (entity_type && entity_id) {
      await base44.functions.invoke('auditLog', {
        action: 'compliance_override',
        user_id: 'system',
        user_role: 'admin',
        action_details: `Compliance status recalculated for ${entity_type}:${entity_id}`,
        result: 'success',
        ip_address: ip
      }).catch(() => {});
    }

    let processedCount = 0;
    let blockedCount = 0;
    let warningCount = 0;

    // Helper function to process driver compliance
    const processDriver = async (driver) => {
      let status = 'compliant';
      let blockingReasons = [];
      let warningItems = [];

      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Check CDL
      if (driver.license_expiry) {
        const expiry = new Date(driver.license_expiry);
        if (expiry < today) {
          blockingReasons.push('CDL License Expired');
          status = 'blocked';
        } else if (expiry <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          warningItems.push({
            item: 'CDL License',
            expiry_date: driver.license_expiry,
            days_remaining: daysLeft
          });
          if (status !== 'blocked') status = 'warning';
        }
      }

      // Check Medical Card
      if (driver.medical_expiry) {
        const expiry = new Date(driver.medical_expiry);
        if (expiry < today) {
          blockingReasons.push('Medical Card Expired');
          status = 'blocked';
        } else if (expiry <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          warningItems.push({
            item: 'Medical Card',
            expiry_date: driver.medical_expiry,
            days_remaining: daysLeft
          });
          if (status !== 'blocked') status = 'warning';
        }
      }

      // Check TWIC
      if (driver.twic_expiry) {
        const expiry = new Date(driver.twic_expiry);
        if (expiry < today) {
          blockingReasons.push('TWIC Card Expired');
          status = 'blocked';
        } else if (expiry <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          warningItems.push({
            item: 'TWIC Card',
            expiry_date: driver.twic_expiry,
            days_remaining: daysLeft
          });
          if (status !== 'blocked') status = 'warning';
        }
      }

      // Update or create ComplianceStatus record
      const existing = await base44.asServiceRole.entities.ComplianceStatus.filter({
        entity_type: 'driver',
        entity_id: driver.id
      }, '-created_date', 1).then(c => c?.[0]);

      await (existing ? 
        base44.asServiceRole.entities.ComplianceStatus.update(existing.id, {
          status,
          blocking_reasons: blockingReasons,
          warning_items: warningItems,
          last_checked: new Date().toISOString(),
          locked_reason: blockingReasons.length > 0 ? blockingReasons.join('; ') : null,
          locked_at: status === 'blocked' && !existing.locked_at ? new Date().toISOString() : existing.locked_at,
          unlocked_at: status !== 'blocked' && existing.locked_at ? new Date().toISOString() : null
        }) :
        base44.asServiceRole.entities.ComplianceStatus.create({
          entity_type: 'driver',
          entity_id: driver.id,
          status,
          blocking_reasons: blockingReasons,
          warning_items: warningItems,
          last_checked: new Date().toISOString(),
          locked_reason: blockingReasons.length > 0 ? blockingReasons.join('; ') : null,
          locked_at: status === 'blocked' ? new Date().toISOString() : null
        })
      ).catch(err => console.error(`Failed to update compliance for driver ${driver.id}:`, err));

      // If driver is newly blocked, mark as unavailable
      if (status === 'blocked' && driver.status !== 'inactive') {
        await base44.asServiceRole.entities.Driver.update(driver.id, {
          status: 'inactive'
        }).catch(err => console.error('Failed to mark driver inactive:', err));

        if (driver.dispatcher_id) {
          await base44.functions.invoke('notificationService', {
            user_id: driver.dispatcher_id,
            title: `🚨 Driver Unavailable: ${driver.first_name} ${driver.last_name}`,
            message: `${blockingReasons.join(', ')}. Driver automatically blocked from assignments.`,
            type: 'compliance_expiring',
            priority: 'critical',
            related_entity_type: 'Driver',
            related_entity_id: driver.id
          }).catch(err => console.error('Failed to send notification:', err));
        }

        blockedCount++;
      }

      // If driver is unlocked (was blocked, now compliant), mark available
      if (status === 'compliant' && existing?.status === 'blocked' && driver.status === 'inactive') {
        await base44.asServiceRole.entities.Driver.update(driver.id, {
          status: 'available'
        }).catch(err => console.error('Failed to restore driver status:', err));

        if (driver.dispatcher_id) {
          await base44.functions.invoke('notificationService', {
            user_id: driver.dispatcher_id,
            title: `✅ Driver Restored: ${driver.first_name} ${driver.last_name}`,
            message: `All compliance documents are now valid. Driver available for assignment.`,
            type: 'compliance_expiring',
            priority: 'normal',
            related_entity_type: 'Driver',
            related_entity_id: driver.id
          }).catch(err => console.error('Failed to send notification:', err));
        }
      }

      if (status === 'warning') warningCount++;
      return { status, blockingReasons, warningItems };
    };

    // Helper function to process truck compliance
    const processTruck = async (truck) => {
      let status = 'compliant';
      let blockingReasons = [];
      let warningItems = [];

      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Check Registration
      if (truck.registration_expiry) {
        const expiry = new Date(truck.registration_expiry);
        if (expiry < today) {
          blockingReasons.push('Registration Expired');
          status = 'blocked';
        } else if (expiry <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          warningItems.push({
            item: 'Registration',
            expiry_date: truck.registration_expiry,
            days_remaining: daysLeft
          });
          if (status !== 'blocked') status = 'warning';
        }
      }

      // Check Insurance
      if (truck.insurance_expiry) {
        const expiry = new Date(truck.insurance_expiry);
        if (expiry < today) {
          blockingReasons.push('Insurance Expired');
          status = 'blocked';
        } else if (expiry <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          warningItems.push({
            item: 'Insurance',
            expiry_date: truck.insurance_expiry,
            days_remaining: daysLeft
          });
          if (status !== 'blocked') status = 'warning';
        }
      }

      // Check Inspection
      if (truck.annual_inspection_expiry) {
        const expiry = new Date(truck.annual_inspection_expiry);
        if (expiry < today) {
          blockingReasons.push('Annual Inspection Expired');
          status = 'blocked';
        } else if (expiry <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          warningItems.push({
            item: 'Annual Inspection',
            expiry_date: truck.annual_inspection_expiry,
            days_remaining: daysLeft
          });
          if (status !== 'blocked') status = 'warning';
        }
      }

      // Check maintenance status
      if (truck.status === 'maintenance' || truck.status === 'out_of_service') {
        blockingReasons.push(`Truck Status: ${truck.status.replace('_', ' ')}`);
        status = 'blocked';
      }

      // Update or create ComplianceStatus record
      const existing = await base44.asServiceRole.entities.ComplianceStatus.filter({
        entity_type: 'truck',
        entity_id: truck.id
      }, '-created_date', 1).then(c => c?.[0]);

      await (existing ?
        base44.asServiceRole.entities.ComplianceStatus.update(existing.id, {
          status,
          blocking_reasons: blockingReasons,
          warning_items: warningItems,
          last_checked: new Date().toISOString(),
          locked_reason: blockingReasons.length > 0 ? blockingReasons.join('; ') : null,
          locked_at: status === 'blocked' && !existing.locked_at ? new Date().toISOString() : existing.locked_at,
          unlocked_at: status !== 'blocked' && existing.locked_at ? new Date().toISOString() : null
        }) :
        base44.asServiceRole.entities.ComplianceStatus.create({
          entity_type: 'truck',
          entity_id: truck.id,
          status,
          blocking_reasons: blockingReasons,
          warning_items: warningItems,
          last_checked: new Date().toISOString(),
          locked_reason: blockingReasons.length > 0 ? blockingReasons.join('; ') : null,
          locked_at: status === 'blocked' ? new Date().toISOString() : null
        })
      ).catch(err => console.error(`Failed to update compliance for truck ${truck.id}:`, err));

      if (status === 'blocked') blockedCount++;
      if (status === 'warning') warningCount++;
      return { status, blockingReasons, warningItems };
    };

    // Single entity mode (on-demand call)
    if (entity_type === 'driver' && entity_id) {
      const driver = await base44.asServiceRole.entities.Driver.get(entity_id);
      if (!driver) {
        return Response.json({ error: 'Driver not found' }, { status: 404 });
      }
      const result = await processDriver(driver);
      return Response.json({
        success: true,
        entity_type: 'driver',
        entity_id,
        ...result
      });
    } else if (entity_type === 'truck' && entity_id) {
      const truck = await base44.asServiceRole.entities.Truck.get(entity_id);
      if (!truck) {
        return Response.json({ error: 'Truck not found' }, { status: 404 });
      }
      const result = await processTruck(truck);
      return Response.json({
        success: true,
        entity_type: 'truck',
        entity_id,
        ...result
      });
    }

    // Bulk scan mode (scheduled automation) - scan all drivers and trucks
    console.log('[complianceStatusEngine] Starting bulk compliance scan at', new Date().toISOString());

    // Process all drivers in batches
    let skip = 0;
    const batchSize = 50;
    let hasMore = true;
    while (hasMore) {
      const drivers = await base44.asServiceRole.entities.Driver.list('-created_date', batchSize, skip).catch(() => []);
      if (!drivers || drivers.length === 0) {
        hasMore = false;
        break;
      }
      for (const driver of drivers) {
        await processDriver(driver);
        processedCount++;
      }
      skip += batchSize;
    }

    // Process all trucks in batches
    skip = 0;
    hasMore = true;
    while (hasMore) {
      const trucks = await base44.asServiceRole.entities.Truck.list('-created_date', batchSize, skip).catch(() => []);
      if (!trucks || trucks.length === 0) {
        hasMore = false;
        break;
      }
      for (const truck of trucks) {
        await processTruck(truck);
        processedCount++;
      }
      skip += batchSize;
    }

    console.log('[complianceStatusEngine] Bulk scan complete. Processed:', processedCount, 'Blocked:', blockedCount, 'Warnings:', warningCount);

    return Response.json({
      success: true,
      mode: 'bulk_scan',
      processedCount,
      blockedCount,
      warningCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Compliance status engine error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});