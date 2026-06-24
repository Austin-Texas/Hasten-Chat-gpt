import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    if (action === 'upload_document') {
      return await uploadDocument(base44, body);
    } else if (action === 'approve_document') {
      return await approveDocument(base44, body);
    } else if (action === 'reject_document') {
      return await rejectDocument(base44, body);
    } else if (action === 'request_reupload') {
      return await requestReupload(base44, body);
    } else if (action === 'check_mandatory_documents') {
      return await checkMandatoryDocuments(base44, body);
    } else if (action === 'archive_document') {
      return await archiveDocument(base44, body);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Document lifecycle error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function uploadDocument(base44, { load_id, stop_id, driver_id, document_type, file_url, file_name, notes }) {
  try {
    const user = await base44.auth.me();
    const uploadedBy = user?.id || driver_id || 'unknown';

    const doc = await base44.asServiceRole.entities.LoadDocument.create({
      load_id,
      stop_id,
      driver_id,
      document_type,
      file_url,
      file_name,
      notes,
      uploaded_by: uploadedBy,
      uploaded_at: new Date().toISOString(),
      status: 'uploaded',
      version: 1,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'document_uploaded',
      user_id: uploadedBy,
      user_role: user?.role || 'driver',
      entity_type: 'LoadDocument',
      entity_id: doc.id,
      action_details: `${document_type} uploaded for load ${load_id}`,
      result: 'success',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    // Manifest event
    if (load_id) {
      await base44.asServiceRole.entities.Manifest.create({
        load_id,
        event_type: 'document_uploaded',
        event_title: `Document Uploaded: ${document_type}`,
        event_description: file_name,
        event_timestamp: new Date().toISOString(),
        performed_by: uploadedBy,
        performed_by_role: user?.role || 'driver',
        attachment_url: file_url,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      document_id: doc.id,
      status: 'uploaded',
      version: 1,
    });
  } catch (error) {
    console.error('uploadDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function approveDocument(base44, { document_id, load_id, notes }) {
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const docs = await base44.asServiceRole.entities.LoadDocument.filter({ id: document_id }, '-created_date', 1);
    if (docs.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];
    const now = new Date().toISOString();

    await base44.asServiceRole.entities.LoadDocument.update(document_id, {
      status: 'approved',
      approved_by: user.id,
      approved_at: now,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'document_approved',
      user_id: user.id,
      user_role: user.role,
      entity_type: 'LoadDocument',
      entity_id: document_id,
      action_details: `${doc.document_type} approved. ${notes || ''}`,
      result: 'success',
      timestamp: now,
    }).catch(() => {});

    // Manifest event
    if (load_id) {
      await base44.asServiceRole.entities.Manifest.create({
        load_id,
        event_type: 'document_approved',
        event_title: `Document Approved: ${doc.document_type}`,
        event_description: notes || doc.file_name,
        event_timestamp: now,
        performed_by: user.id,
        performed_by_role: user.role,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      document_id,
      status: 'approved',
    });
  } catch (error) {
    console.error('approveDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function rejectDocument(base44, { document_id, load_id, rejection_reason }) {
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const docs = await base44.asServiceRole.entities.LoadDocument.filter({ id: document_id }, '-created_date', 1);
    if (docs.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];
    const now = new Date().toISOString();

    await base44.asServiceRole.entities.LoadDocument.update(document_id, {
      status: 'rejected',
      rejected_by: user.id,
      rejected_at: now,
      rejection_reason,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'document_rejected',
      user_id: user.id,
      user_role: user.role,
      entity_type: 'LoadDocument',
      entity_id: document_id,
      action_details: `${doc.document_type} rejected: ${rejection_reason}`,
      result: 'success',
      timestamp: now,
    }).catch(() => {});

    // Notification to driver
    if (doc.driver_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: doc.driver_id,
        role: 'driver',
        title: 'Document Rejected',
        message: `Your ${doc.document_type} was rejected. Reason: ${rejection_reason}. Please review and resubmit.`,
        type: 'custom',
        priority: 'high',
        related_entity_type: 'LoadDocument',
        related_entity_id: document_id,
        delivery_channels: ['in_app', 'push'],
      }).catch(err => console.error('Failed to create rejection notification:', err));
    }

    // Manifest event
    if (load_id) {
      await base44.asServiceRole.entities.Manifest.create({
        load_id,
        event_type: 'document_rejected',
        event_title: `Document Rejected: ${doc.document_type}`,
        event_description: rejection_reason,
        event_timestamp: now,
        performed_by: user.id,
        performed_by_role: user.role,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      document_id,
      status: 'rejected',
      rejection_reason,
    });
  } catch (error) {
    console.error('rejectDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function requestReupload(base44, { document_id, load_id, reupload_reason }) {
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const docs = await base44.asServiceRole.entities.LoadDocument.filter({ id: document_id }, '-created_date', 1);
    if (docs.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];
    const now = new Date().toISOString();

    await base44.asServiceRole.entities.LoadDocument.update(document_id, {
      status: 'reupload_requested',
      reupload_requested_by: user.id,
      reupload_requested_at: now,
      reupload_reason,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'document_reupload_requested',
      user_id: user.id,
      user_role: user.role,
      entity_type: 'LoadDocument',
      entity_id: document_id,
      action_details: `Reupload requested for ${doc.document_type}: ${reupload_reason}`,
      result: 'success',
      timestamp: now,
    }).catch(() => {});

    // Notification to driver
    if (doc.driver_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: doc.driver_id,
        role: 'driver',
        title: 'Document Reupload Requested',
        message: `Your ${doc.document_type} upload was rejected. Reason: ${reupload_reason}. Please reupload.`,
        type: 'custom',
        priority: 'high',
        related_entity_type: 'LoadDocument',
        related_entity_id: document_id,
        delivery_channels: ['in_app'],
      }).catch(() => {});
    }

    // Manifest event
    if (load_id) {
      await base44.asServiceRole.entities.Manifest.create({
        load_id,
        event_type: 'document_reupload_requested',
        event_title: `Reupload Requested: ${doc.document_type}`,
        event_description: reupload_reason,
        event_timestamp: now,
        performed_by: user.id,
        performed_by_role: user.role,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      document_id,
      status: 'reupload_requested',
      reupload_reason,
    });
  } catch (error) {
    console.error('requestReupload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function checkMandatoryDocuments(base44, { load_id }) {
  try {
    // Get mandate config
    const configs = await base44.asServiceRole.entities.DocumentMandateConfig.filter(
      { enabled: true },
      '-created_date',
      1
    );
    const config = configs[0];
    if (!config) {
      return Response.json({
        ready_for_invoicing: true,
        missing_documents: [],
      });
    }

    // Check which required docs are approved for this load
    const loadDocs = await base44.asServiceRole.entities.LoadDocument.filter(
      { load_id, status: 'approved' },
      '-created_date',
      100
    );

    const approvedTypes = loadDocs.map(d => d.document_type);
    const missing = config.required_load_documents.filter(docType => !approvedTypes.includes(docType));

    const readyForInvoicing = missing.length === 0;

    return Response.json({
      success: true,
      ready_for_invoicing: readyForInvoicing,
      missing_documents: missing,
      approved_documents: approvedTypes,
      required_documents: config.required_load_documents,
    });
  } catch (error) {
    console.error('checkMandatoryDocuments error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function archiveDocument(base44, { document_id, load_id }) {
  try {
    const user = await base44.auth.me();
    const now = new Date().toISOString();

    await base44.asServiceRole.entities.LoadDocument.update(document_id, {
      status: 'archived',
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'document_archived',
      user_id: user?.id || 'system',
      user_role: user?.role || 'system',
      entity_type: 'LoadDocument',
      entity_id: document_id,
      action_details: 'Document archived',
      result: 'success',
      timestamp: now,
    }).catch(() => {});

    return Response.json({
      success: true,
      document_id,
      status: 'archived',
    });
  } catch (error) {
    console.error('archiveDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}