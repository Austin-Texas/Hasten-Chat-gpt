import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Process Document Signature
 * 
 * Handles digital signature capture and storage for contractor documents.
 * Computes signature hash for verification and auditing.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      contractor_profile_id,
      document_id,
      document_type,
      signature_image,
      user_id
    } = body;

    if (!contractor_profile_id || !document_type || !signature_image) {
      return Response.json({
        error: 'Missing required fields: contractor_profile_id, document_type, signature_image'
      }, { status: 400 });
    }

    // ─── COMPUTE SIGNATURE HASH ──────────────────────────────────────
    const encoder = new TextEncoder();
    const data = encoder.encode(signature_image);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signatureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // ─── UPLOAD SIGNATURE IMAGE ──────────────────────────────────────
    let signatureUrl = '';
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({
        file: signature_image // base64 string
      });
      signatureUrl = uploadRes.file_url;
    } catch (err) {
      console.error('Failed to upload signature image:', err);
      return Response.json({
        error: 'Failed to upload signature'
      }, { status: 500 });
    }

    // ─── UPDATE DOCUMENT WITH SIGNATURE ──────────────────────────────
    const updates = {
      signature_status: 'signed',
      signature_image_url: signatureUrl,
      signature_hash: signatureHash,
      signed_by: user_id || 'contractor',
      signed_at: new Date().toISOString()
    };

    const document = await base44.asServiceRole.entities.ContractorDocument.update(
      document_id,
      updates
    );

    // ─── UPDATE CONTRACTOR PROFILE STATUS ────────────────────────────
    const profile = await base44.asServiceRole.entities.ContractorProfile.filter(
      { id: contractor_profile_id },
      '-created_date',
      1
    );

    if (profile[0]) {
      const profileUpdates = {};
      
      // Mark specific document status as signed
      if (document_type === 'w9') {
        profileUpdates.w9_status = 'verified';
      } else if (document_type === 'ach_authorization') {
        profileUpdates.ach_authorization_status = 'verified';
      } else if (document_type === 'contractor_agreement') {
        profileUpdates.agreement_signed = true;
        profileUpdates.agreement_signed_at = new Date().toISOString();
      }

      if (Object.keys(profileUpdates).length > 0) {
        await base44.asServiceRole.entities.ContractorProfile.update(
          contractor_profile_id,
          profileUpdates
        );
      }
    }

    // ─── UPDATE CHECKLIST ────────────────────────────────────────────
    const checklists = await base44.asServiceRole.entities.ContractorChecklist.filter(
      { contractor_profile_id },
      '-created_date',
      1
    );

    if (checklists[0]) {
      const checklistUpdates = {};
      
      if (document_type === 'w9') {
        checklistUpdates.w9_uploaded = true;
      } else if (document_type === 'ach_authorization') {
        checklistUpdates.ach_authorization_uploaded = true;
      } else if (document_type === 'contractor_agreement') {
        checklistUpdates.agreement_signed = true;
      }

      if (Object.keys(checklistUpdates).length > 0) {
        await base44.asServiceRole.entities.ContractorChecklist.update(
          checklists[0].id,
          checklistUpdates
        );
      }
    }

    // ─── LOG TIMELINE EVENT ──────────────────────────────────────────
    try {
      await base44.functions.invoke('timelineEventService', {
        entity_type: 'ContractorProfile',
        entity_id: contractor_profile_id,
        action: 'signed',
        actor_id: user_id || 'system',
        actor_role: 'driver',
        summary: `${document_type.replace(/_/g, ' ')} signed digitally`,
        metadata: { document_type, signature_hash: signatureHash }
      });
    } catch (err) {
      console.error('Timeline error:', err);
    }

    // ─── SEND NOTIFICATION ───────────────────────────────────────────
    try {
      await base44.functions.invoke('notificationService', {
        user_id: profile[0]?.driver_id,
        title: '✅ Document Signed',
        message: `Your ${document_type.replace(/_/g, ' ')} has been signed and verified.`,
        type: 'document_signed',
        priority: 'normal',
        related_entity_type: 'ContractorDocument',
        related_entity_id: document_id
      });
    } catch (err) {
      console.error('Notification error:', err);
    }

    return Response.json({
      success: true,
      document,
      signature_hash: signatureHash,
      message: 'Document signed successfully'
    });

  } catch (error) {
    console.error('Signature processing error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});