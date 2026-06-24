import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Validate Assignment Compliance
 * 
 * Called before assigning driver or truck to a load.
 * Returns:
 * - allowed: true/false
 * - driver_blocked: true/false + reason
 * - truck_blocked: true/false + reason
 * - can_assign_driver: boolean
 * - can_assign_truck: boolean
 * - warnings: array of warning messages
 */

Deno.serve(async (req) => {
  try {
    const { driver_id, truck_id } = await req.json();

    const result = {
      allowed: true,
      driver_blocked: false,
      driver_block_reason: null,
      truck_blocked: false,
      truck_block_reason: null,
      can_assign_driver: true,
      can_assign_truck: true,
      warnings: []
    };

    const base44 = createClientFromRequest(req);

    // ─── CHECK DRIVER ────────────────────────────────────────────────────

    if (driver_id) {
      const complianceStatus = await base44.asServiceRole.entities.ComplianceStatus.filter({
        entity_type: 'driver',
        entity_id: driver_id
      }, '-created_date', 1).then(c => c?.[0]);

      if (complianceStatus?.status === 'blocked') {
        result.driver_blocked = true;
        result.driver_block_reason = complianceStatus.blocking_reasons?.join('; ') || 'Driver compliance blocked';
        result.can_assign_driver = false;
        result.allowed = false;
      } else if (complianceStatus?.status === 'warning') {
        result.warnings.push(`Driver has upcoming compliance issues: ${complianceStatus.warning_items?.map(w => `${w.item} (${w.days_remaining} days)`).join(', ')}`);
      }

      // Also check driver entity for status
      const driver = await base44.asServiceRole.entities.Driver.filter({
        id: driver_id
      }, '-created_date', 1).then(d => d?.[0]);

      if (driver?.status === 'inactive' || driver?.status === 'hos_violation') {
        result.driver_blocked = true;
        result.driver_block_reason = `Driver status: ${driver.status}`;
        result.can_assign_driver = false;
        result.allowed = false;
      }
    }

    // ─── CHECK TRUCK ─────────────────────────────────────────────────────

    if (truck_id) {
      const complianceStatus = await base44.asServiceRole.entities.ComplianceStatus.filter({
        entity_type: 'truck',
        entity_id: truck_id
      }, '-created_date', 1).then(c => c?.[0]);

      if (complianceStatus?.status === 'blocked') {
        result.truck_blocked = true;
        result.truck_block_reason = complianceStatus.blocking_reasons?.join('; ') || 'Truck compliance blocked';
        result.can_assign_truck = false;
        result.allowed = false;
      } else if (complianceStatus?.status === 'warning') {
        result.warnings.push(`Truck has upcoming compliance issues: ${complianceStatus.warning_items?.map(w => `${w.item} (${w.days_remaining} days)`).join(', ')}`);
      }

      // Also check truck entity for status
      const truck = await base44.asServiceRole.entities.Truck.filter({
        id: truck_id
      }, '-created_date', 1).then(t => t?.[0]);

      if (truck?.status !== 'active' && truck?.status !== 'idle') {
        result.truck_blocked = true;
        result.truck_block_reason = `Truck status: ${truck.status}`;
        result.can_assign_truck = false;
        result.allowed = false;
      }
    }

    return Response.json(result);

  } catch (error) {
    console.error('Assignment compliance validation error:', error);
    return Response.json({
      error: error.message,
      allowed: false
    }, { status: 500 });
  }
});