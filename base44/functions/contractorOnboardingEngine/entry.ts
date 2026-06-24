import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Contractor Onboarding Engine
 * 
 * Manages contractor onboarding workflow:
 * - Create profile
 * - Track document uploads
 * - Update checklist
 * - Activate contractor
 * - Timeline logging
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, contractor_profile_id, document_type, file_url, expiration_date, user_id } = body;

    if (!action || !contractor_profile_id) {
      return Response.json({
        error: 'Missing action or contractor_profile_id'
      }, { status: 400 });
    }

    // ─── DOCUMENT UPLOAD ──────────────────────────────────────────────
    if (action === 'upload_document') {
      if (!document_type || !file_url) {
        return Response.json({
          error: 'Missing document_type or file_url'
        }, { status: 400 });
      }

      // Determine if signature is required
      const requiresSignature = ['w9', 'ach_authorization', 'contractor_agreement'].includes(document_type);

      // Create document record
      const doc = await base44.asServiceRole.entities.ContractorDocument.create({
        contractor_profile_id,
        document_type,
        file_url,
        uploaded_by: user_id || 'system',
        uploaded_at: new Date().toISOString(),
        expiration_date,
        requires_signature: requiresSignature,
        signature_status: requiresSignature ? 'pending' : 'signed'
      });

      // Update profile status based on document type
      const profile = await base44.asServiceRole.entities.ContractorProfile.filter(
        { id: contractor_profile_id },
        '-created_date',
        1
      );

      if (profile[0]) {
        const updates = {};
        if (document_type === 'w9') {
          updates.w9_status = 'uploaded';
          updates.w9_uploaded_at = new Date().toISOString();
        } else if (document_type === 'ach_authorization') {
          updates.ach_authorization_status = 'uploaded';
          updates.ach_authorization_uploaded_at = new Date().toISOString();
        } else if (document_type === 'contractor_agreement') {
          updates.agreement_signed = true;
          updates.agreement_signed_at = new Date().toISOString();
        } else if (document_type === 'insurance_certificate') {
          updates.insurance_certificate_status = 'uploaded';
          updates.insurance_expiration_date = expiration_date;
        } else if (document_type === 'cdl') {
          updates.cdl_status = 'verified';
          updates.cdl_expiration_date = expiration_date;
        } else if (document_type === 'medical_card') {
          updates.medical_card_status = 'verified';
          updates.medical_card_expiration_date = expiration_date;
        }

        await base44.asServiceRole.entities.ContractorProfile.update(contractor_profile_id, updates);
      }

      // Update checklist
      const checklist = await base44.asServiceRole.entities.ContractorChecklist.filter(
        { contractor_profile_id },
        '-created_date',
        1
      );

      if (checklist[0]) {
        const checklistUpdates = {};
        if (document_type === 'w9') checklistUpdates.w9_uploaded = true;
        if (document_type === 'ach_authorization') checklistUpdates.ach_authorization_uploaded = true;
        if (document_type === 'contractor_agreement') checklistUpdates.agreement_signed = true;
        if (document_type === 'cdl') checklistUpdates.cdl_uploaded = true;
        if (document_type === 'medical_card') checklistUpdates.medical_card_uploaded = true;
        if (document_type === 'insurance_certificate') checklistUpdates.insurance_uploaded = true;

        await base44.asServiceRole.entities.ContractorChecklist.update(checklist[0].id, checklistUpdates);
      }

      // Log timeline event
      try {
        await base44.functions.invoke('timelineEventService', {
          entity_type: 'ContractorProfile',
          entity_id: contractor_profile_id,
          action: 'uploaded',
          actor_id: user_id || 'system',
          actor_role: 'admin',
          summary: `${document_type.replace(/_/g, ' ')} uploaded`,
          metadata: { document_type }
        });
      } catch (err) {
        console.error('Timeline error:', err);
      }

      return Response.json({
        success: true,
        document: doc,
        message: `${document_type} uploaded successfully`
      });
    }

    // ─── ACTIVATE CONTRACTOR ─────────────────────────────────────────
    if (action === 'activate') {
      const profile = await base44.asServiceRole.entities.ContractorProfile.update(
        contractor_profile_id,
        {
          status: 'active',
          onboarding_complete: true,
          onboarding_completed_at: new Date().toISOString(),
          compliance_status: 'compliant'
        }
      );

      // Log timeline
      try {
        await base44.functions.invoke('timelineEventService', {
          entity_type: 'ContractorProfile',
          entity_id: contractor_profile_id,
          action: 'activated',
          actor_id: user_id || 'system',
          actor_role: 'admin',
          summary: `Contractor activated`
        });
      } catch (err) {
        console.error('Timeline error:', err);
      }

      // Send notification
      try {
        await base44.functions.invoke('notificationService', {
          user_id: profile.driver_id,
          title: '✅ Onboarding Complete',
          message: 'Your contractor profile has been activated. You can now accept loads.',
          type: 'contractor_activated',
          priority: 'high',
          related_entity_type: 'ContractorProfile',
          related_entity_id: contractor_profile_id
        });
      } catch (err) {
        console.error('Notification error:', err);
      }

      return Response.json({
        success: true,
        profile
      });
    }

    // ─── SUSPEND CONTRACTOR ──────────────────────────────────────────
    if (action === 'suspend') {
      const profile = await base44.asServiceRole.entities.ContractorProfile.update(
        contractor_profile_id,
        {
          status: 'suspended'
        }
      );

      try {
        await base44.functions.invoke('timelineEventService', {
          entity_type: 'ContractorProfile',
          entity_id: contractor_profile_id,
          action: 'suspended',
          actor_id: user_id || 'system',
          actor_role: 'admin',
          summary: `Contractor suspended`
        });
      } catch (err) {
        console.error('Timeline error:', err);
      }

      return Response.json({
        success: true,
        profile
      });
    }

    // ─── REACTIVATE CONTRACTOR ───────────────────────────────────────
    if (action === 'reactivate') {
      const profile = await base44.asServiceRole.entities.ContractorProfile.update(
        contractor_profile_id,
        {
          status: 'active'
        }
      );

      try {
        await base44.functions.invoke('timelineEventService', {
          entity_type: 'ContractorProfile',
          entity_id: contractor_profile_id,
          action: 'updated',
          actor_id: user_id || 'system',
          actor_role: 'admin',
          summary: `Contractor reactivated`
        });
      } catch (err) {
        console.error('Timeline error:', err);
      }

      return Response.json({
        success: true,
        profile
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Contractor onboarding error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});