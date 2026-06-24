import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Valid status transitions
const VALID_TRANSITIONS = {
  'available': ['assigned', 'cancelled'],
  'assigned': ['accepted', 'rejected', 'cancelled'],
  'accepted': ['en_route', 'rejected', 'cancelled'],
  'en_route': ['arrived_pickup', 'cancelled'],
  'arrived_pickup': ['loaded', 'cancelled'],
  'loaded': ['in_transit', 'cancelled'],
  'in_transit': ['arrived_delivery', 'cancelled'],
  'arrived_delivery': ['delivered', 'cancelled'],
  'delivered': ['pod_uploaded', 'cancelled'],
  'pod_uploaded': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': []
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { load_id, new_status, notes = '', metadata = {}, driver_id = null } = await req.json();
    if (!load_id || !new_status) {
      return Response.json({ error: 'Missing load_id or new_status' }, { status: 400 });
    }

    // Get current load
    let load;
    try {
      load = await base44.asServiceRole.entities.Load.get(load_id);
    } catch (e) {
      return Response.json({ error: 'Load not found' }, { status: 404 });
    }

    // Assign driver if provided and status is 'assigned'
    if (driver_id && new_status === 'assigned' && !load.driver_id) {
      load = { ...load, driver_id };
      await base44.asServiceRole.entities.Load.update(load_id, { driver_id }).catch(() => {});
    }

    const oldStatus = load.status;
    console.log(`[updateLoadStatus] Transitioning load ${load.load_number} from ${oldStatus} to ${new_status}`);

    // Validate transition
    if (!VALID_TRANSITIONS[oldStatus]?.includes(new_status)) {
      return Response.json({
        error: `Invalid status transition: ${oldStatus} cannot move to ${new_status}`,
        currentStatus: oldStatus,
        allowedTransitions: VALID_TRANSITIONS[oldStatus] || []
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const timestamp = new Date();

    // Update load
    const updateData = { status: new_status };
    if (new_status === 'completed') {
      updateData.completed_at = now;
    }

    await base44.asServiceRole.entities.Load.update(load_id, updateData);

    // Get fresh load data
    const updatedLoad = await base44.asServiceRole.entities.Load.get(load_id);

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: Accepted (driver accepted load)
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'accepted') {
      console.log(`[updateLoadStatus] ACCEPTED workflow triggered for ${load.load_number}`);
      
      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'driver',
        actorName: user.full_name || 'Driver',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'updated',
        summary: `Load accepted by driver`,
        timestamp: now,
        icon: 'check',
        color: 'green'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));

      // Notify dispatcher
      if (load.dispatcher_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: load.dispatcher_id,
          role: 'dispatcher',
          title: 'Load Accepted',
          message: `Load ${load.load_number} accepted by driver`,
          type: 'load_status_changed',
          priority: 'normal',
          related_entity_type: 'Load',
          related_entity_id: load_id,
          delivery_channels: ['in_app']
        }).catch(() => {});
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: En Route
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'en_route') {
      console.log(`[updateLoadStatus] EN_ROUTE workflow triggered for ${load.load_number}`);
      
      // Enable tracking
      if (load.driver_id) {
        await base44.asServiceRole.entities.Driver.update(load.driver_id, {
          last_location_update: now
        }).catch(() => {});
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'driver',
        actorName: user.full_name || 'Driver',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'updated',
        summary: `En route to pickup`,
        timestamp: now,
        icon: 'navigation',
        color: 'blue'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: Arrived at Pickup
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'arrived_pickup') {
      console.log(`[updateLoadStatus] ARRIVED_PICKUP workflow triggered for ${load.load_number}`);
      
      // Start detention timer (backend function ready)
      try {
        await base44.functions.invoke('detentionTimerEngine', { load_id, stop_type: 'pickup' });
      } catch (e) {
        console.error('[updateLoadStatus] Detention timer failed:', e.message);
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'driver',
        actorName: user.full_name || 'Driver',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'updated',
        summary: `Arrived at pickup location`,
        timestamp: now,
        icon: 'location-on',
        color: 'orange'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: Loaded
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'loaded') {
      console.log(`[updateLoadStatus] LOADED workflow triggered for ${load.load_number}`);
      
      // Update load with pickup timestamp
      if (!load.actual_pickup) {
        await base44.asServiceRole.entities.Load.update(load_id, {
          actual_pickup: now
        }).catch(() => {});
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'driver',
        actorName: user.full_name || 'Driver',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'updated',
        summary: `Cargo loaded`,
        timestamp: now,
        icon: 'package',
        color: 'green'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: In Transit
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'in_transit') {
      console.log(`[updateLoadStatus] IN_TRANSIT workflow triggered for ${load.load_number}`);
      
      // Enable ETA tracking
      try {
        await base44.functions.invoke('detectLoadDelaysByETA', { load_id });
      } catch (e) {
        console.error('[updateLoadStatus] ETA tracking failed:', e.message);
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'driver',
        actorName: user.full_name || 'Driver',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'updated',
        summary: `In transit to delivery`,
        timestamp: now,
        icon: 'navigation',
        color: 'blue'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: Arrived at Delivery
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'arrived_delivery') {
      console.log(`[updateLoadStatus] ARRIVED_DELIVERY workflow triggered for ${load.load_number}`);
      
      // Start detention timer at delivery stop
      try {
        await base44.functions.invoke('detentionTimerEngine', { load_id, stop_type: 'delivery' });
      } catch (e) {
        console.error('[updateLoadStatus] Detention timer failed:', e.message);
      }

      // Notify client
      if (load.client_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: load.client_id,
          role: 'client',
          title: 'Shipment Arriving',
          message: `Load ${load.load_number} has arrived at delivery location`,
          type: 'load_status_changed',
          priority: 'normal',
          related_entity_type: 'Load',
          related_entity_id: load_id,
          delivery_channels: ['in_app']
        }).catch(() => {});
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'driver',
        actorName: user.full_name || 'Driver',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'updated',
        summary: `Arrived at delivery location`,
        timestamp: now,
        icon: 'location-on',
        color: 'orange'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: Delivered
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'delivered') {
      console.log(`[updateLoadStatus] DELIVERED workflow triggered for ${load.load_number}`);
      
      // Update load with delivery timestamp
      if (!load.actual_delivery) {
        await base44.asServiceRole.entities.Load.update(load_id, {
          actual_delivery: now
        }).catch(() => {});
      }

      // Notify client
      if (load.client_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: load.client_id,
          role: 'client',
          title: 'Shipment Delivered',
          message: `Load ${load.load_number} has been delivered`,
          type: 'load_status_changed',
          priority: 'normal',
          related_entity_type: 'Load',
          related_entity_id: load_id,
          delivery_channels: ['in_app']
        }).catch(() => {});
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'driver',
        actorName: user.full_name || 'Driver',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'updated',
        summary: `Cargo delivered`,
        timestamp: now,
        icon: 'check-circle',
        color: 'green'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: POD Uploaded
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'pod_uploaded') {
      console.log(`[updateLoadStatus] POD_UPLOADED workflow triggered for ${load.load_number}`);
      
      // Run document lifecycle engine
      try {
        await base44.functions.invoke('documentLifecycleEngine', { load_id });
        console.log(`[updateLoadStatus] Document lifecycle processed for ${load.load_number}`);
      } catch (e) {
        console.error('[updateLoadStatus] documentLifecycleEngine failed:', e.message);
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'driver',
        actorName: user.full_name || 'Driver',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'updated',
        summary: `Proof of delivery uploaded`,
        timestamp: now,
        icon: 'file-check',
        color: 'green'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: Load Assigned
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'assigned' && load.driver_id) {
      console.log(`[updateLoadStatus] ASSIGNED workflow triggered for ${load.load_number}`);

      // Update driver status
      await base44.asServiceRole.entities.Driver.update(load.driver_id, {
        status: 'on_load',
        current_load_id: load_id
      }).catch(e => console.error('[updateLoadStatus] Driver update failed:', e.message));

      // Update truck status if exists
      if (load.truck_id) {
        await base44.asServiceRole.entities.Truck.update(load.truck_id, {
          status: 'active',
          current_load_id: load_id
        }).catch(e => console.error('[updateLoadStatus] Truck update failed:', e.message));
      }

      // Check if RC exists
      const rcs = await base44.asServiceRole.entities.RateConfirmation
        .filter({ load_id }, '-created_date', 1)
        .catch(() => []);

      if (!rcs?.[0]) {
        // Generate RC
        try {
          await base44.functions.invoke('generateRCPDF', { load_id });
          await base44.asServiceRole.entities.Load.update(load_id, { rc_status: 'pending_signature' });
          console.log(`[updateLoadStatus] RC generated for ${load.load_number}`);
        } catch (e) {
          console.error('[updateLoadStatus] RC generation failed:', e.message);
        }

        // Send RC to driver
        try {
          await base44.functions.invoke('sendRCToDriver', { load_id });
          console.log(`[updateLoadStatus] RC sent to driver for ${load.load_number}`);
        } catch (e) {
          console.error('[updateLoadStatus] sendRCToDriver failed:', e.message);
        }
      }

      // Create notification
      const driver = load.driver_id ? await base44.asServiceRole.entities.Driver.get(load.driver_id).catch(() => null) : null;
      const driverName = driver?.first_name || 'Driver';
      await base44.asServiceRole.entities.Notification.create({
        user_id: load.driver_id,
        role: 'driver',
        title: 'New Load Assigned',
        message: `Load ${load.load_number}: ${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}`,
        type: 'load_assigned',
        priority: 'normal',
        related_entity_type: 'Load',
        related_entity_id: load_id,
        action_url: `/driver/loads/${load_id}`,
        delivery_channels: ['in_app']
      }).catch(e => console.error('[updateLoadStatus] Notification failed:', e.message));

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'system',
        actorName: user.full_name || 'System',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'assigned',
        summary: `Load assigned to driver`,
        timestamp: now,
        icon: 'package',
        color: 'orange'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));

      // Create message
      await base44.asServiceRole.entities.Message.create({
        load_id,
        sender_id: user.id,
        sender_role: 'system',
        message_type: 'status_update',
        content: `Load assigned to driver`,
        is_read: false
      }).catch(e => console.error('[updateLoadStatus] Message failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: Completed
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'completed') {
      console.log(`[updateLoadStatus] COMPLETED workflow triggered for ${load.load_number}`);

      // Auto-generate invoice if missing
      if (!load.invoice_id) {
        try {
          await base44.functions.invoke('autoGenerateInvoices', { load_id });
          console.log(`[updateLoadStatus] Invoice generated for ${load.load_number}`);
        } catch (e) {
          console.error('[updateLoadStatus] autoGenerateInvoices failed:', e.message);
        }
      }

      // Calculate settlement
      try {
        await base44.functions.invoke('settlementCalculationEngine', { load_id });
        console.log(`[updateLoadStatus] Settlement calculated for ${load.load_number}`);
      } catch (e) {
        console.error('[updateLoadStatus] settlementCalculationEngine failed:', e.message);
      }

      // Release driver if no active loads
      if (load.driver_id) {
        const activeLd = await base44.asServiceRole.entities.Load
          .filter({
            driver_id: load.driver_id,
            status: { $in: ['assigned', 'accepted', 'en_route', 'arrived_pickup', 'loaded', 'in_transit', 'arrived_delivery', 'delivered', 'pod_uploaded'] }
          }, '-created_date', 1)
          .catch(() => []);

        if (!activeLd?.length) {
          await base44.asServiceRole.entities.Driver.update(load.driver_id, {
            status: 'available',
            current_load_id: null
          }).catch(e => console.error('[updateLoadStatus] Driver release failed:', e.message));
        }
      }

      // Release truck if no active loads
      if (load.truck_id) {
        const activeTr = await base44.asServiceRole.entities.Load
          .filter({
            truck_id: load.truck_id,
            status: { $in: ['assigned', 'accepted', 'en_route', 'arrived_pickup', 'loaded', 'in_transit', 'arrived_delivery', 'delivered', 'pod_uploaded'] }
          }, '-created_date', 1)
          .catch(() => []);

        if (!activeTr?.length) {
          await base44.asServiceRole.entities.Truck.update(load.truck_id, {
            status: 'idle',
            current_load_id: null
          }).catch(e => console.error('[updateLoadStatus] Truck release failed:', e.message));
        }
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'system',
        actorName: user.full_name || 'System',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'completed',
        summary: `Load completed`,
        timestamp: now,
        icon: 'check-circle',
        color: 'green'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));

      // Create notification to finance
      if (load.dispatcher_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: load.dispatcher_id,
          role: 'dispatcher',
          title: 'Load Completed',
          message: `Load ${load.load_number} completed. Invoice and settlement processing.`,
          type: 'load_completed',
          priority: 'normal',
          related_entity_type: 'Load',
          related_entity_id: load_id,
          delivery_channels: ['in_app']
        }).catch(() => {});
      }

      // Create message
      await base44.asServiceRole.entities.Message.create({
        load_id,
        sender_id: user.id,
        sender_role: 'system',
        message_type: 'status_update',
        content: `Load completed. Invoice and settlement processing.`,
        is_read: false
      }).catch(e => console.error('[updateLoadStatus] Message failed:', e.message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKFLOW: Cancelled
    // ─────────────────────────────────────────────────────────────────────────
    if (new_status === 'cancelled') {
      console.log(`[updateLoadStatus] CANCELLED workflow triggered for ${load.load_number}`);

      // Release driver
      if (load.driver_id) {
        await base44.asServiceRole.entities.Driver.update(load.driver_id, {
          status: 'available',
          current_load_id: null
        }).catch(e => console.error('[updateLoadStatus] Driver cancel update failed:', e.message));
      }

      // Release truck
      if (load.truck_id) {
        await base44.asServiceRole.entities.Truck.update(load.truck_id, {
          status: 'idle',
          current_load_id: null
        }).catch(e => console.error('[updateLoadStatus] Truck cancel update failed:', e.message));
      }

      // Create timeline
      await base44.asServiceRole.entities.TimelineEvent.create({
        actorId: user.id,
        actorRole: user.role || 'system',
        actorName: user.full_name || 'System',
        entityType: 'Load',
        entityId: load_id,
        entityDisplay: load.load_number,
        action: 'cancelled',
        summary: `Load cancelled`,
        details: notes || 'No reason provided',
        timestamp: now,
        icon: 'x-circle',
        color: 'red'
      }).catch(e => console.error('[updateLoadStatus] TimelineEvent failed:', e.message));

      // Notify driver
      if (load.driver_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: load.driver_id,
          role: 'driver',
          title: 'Load Cancelled',
          message: `Load ${load.load_number} has been cancelled.`,
          type: 'load_cancelled',
          priority: 'normal',
          related_entity_type: 'Load',
          related_entity_id: load_id,
          delivery_channels: ['in_app']
        }).catch(() => {});
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Create audit log
    // ─────────────────────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'load_status_changed',
      user_id: user.id,
      user_role: user.role || 'system',
      result: 'success',
      action_details: `Load ${load.load_number} status changed from ${oldStatus} to ${new_status}`,
      timestamp: now
    }).catch(e => console.error('[updateLoadStatus] AuditLog failed:', e.message));

    console.log(`[updateLoadStatus] Completed: ${load.load_number} ${oldStatus} → ${new_status}`);

    return Response.json({
      success: true,
      loadId: load_id,
      loadNumber: load.load_number,
      oldStatus,
      newStatus: new_status,
      driverId: load.driver_id,
      truckId: load.truck_id,
      timestamp: now
    });
  } catch (error) {
    console.error('[updateLoadStatus]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});