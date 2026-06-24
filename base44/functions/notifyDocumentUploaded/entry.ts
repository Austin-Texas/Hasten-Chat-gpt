import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!event || !data) {
      console.log('Missing event or data in payload');
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    const { entity_id, entity_name } = event;

    // Fetch the document to get driver/contractor info
    let document;
    try {
      if (entity_name === 'DriverDocument') {
        document = await base44.asServiceRole.entities.DriverDocument.get(entity_id);
      } else if (entity_name === 'ContractorDocument') {
        document = await base44.asServiceRole.entities.ContractorDocument.get(entity_id);
      }
    } catch (err) {
      console.log('Failed to fetch document:', err);
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const driver_id = document.driver_id || document.contractor_profile_id;
    let driverName = 'Unknown Driver';

    // Get driver name
    if (driver_id) {
      try {
        const driver = await base44.asServiceRole.entities.Driver.get(driver_id);
        driverName = `${driver.first_name} ${driver.last_name}`;
      } catch (err) {
        console.log('Failed to fetch driver:', err);
      }
    }

    // Get all dispatcher users (admin & dispatcher roles)
    let dispatchers = [];
    try {
      const users = await base44.asServiceRole.entities.UserProfile.filter(
        { businessRole: { $in: ['admin', 'dispatcher'] }, active: true },
        '-created_date',
        100
      );
      dispatchers = users;
    } catch (err) {
      console.log('Failed to fetch dispatchers:', err);
    }

    // Create notifications for each dispatcher
    if (dispatchers.length > 0) {
      const docType = document.document_type || 'document';
      const message = `${driverName} uploaded a ${docType.replace(/_/g, ' ')} for verification.`;

      await Promise.all(
        dispatchers.map(dispatcher =>
          base44.asServiceRole.entities.Notification.create({
            user_id: dispatcher.authUserId,
            role: dispatcher.businessRole,
            title: 'Document Uploaded',
            message,
            type: 'document_approved',
            related_entity_type: entity_name,
            related_entity_id: entity_id,
            priority: 'high',
            delivery_channels: ['in_app'],
          }).catch(err => console.log(`Failed to notify dispatcher ${dispatcher.authUserId}:`, err))
        )
      );

      console.log(`Notified ${dispatchers.length} dispatcher(s) about document upload from ${driverName}`);
    }

    return Response.json({ success: true, message: `Notified ${dispatchers.length} dispatcher(s)` });
  } catch (error) {
    console.error('Error in notifyDocumentUploaded:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});