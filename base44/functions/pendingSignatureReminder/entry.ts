import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Pending Signature Reminder
 * 
 * Automated reminder system for contractors with pending document signatures.
 * Sends notifications for W-9, ACH, and agreement documents awaiting signature.
 * Scheduled to run daily.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ─── FETCH ALL CONTRACTORS WITH PENDING SIGNATURES ──────────────
    const contractors = await base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500);

    let remindersCount = 0;
    const reminderResults = [];

    for (const contractor of contractors) {
      // Skip inactive/terminated contractors
      if (['inactive', 'terminated'].includes(contractor.status)) {
        continue;
      }

      const pendingDocs = [];

      // Check W-9
      if (contractor.w9_status === 'pending' || contractor.w9_status === 'uploaded') {
        const w9Docs = await base44.asServiceRole.entities.ContractorDocument.filter(
          { contractor_profile_id: contractor.id, document_type: 'w9' },
          '-created_date',
          1
        );

        if (w9Docs[0] && w9Docs[0].signature_status !== 'signed') {
          pendingDocs.push({
            type: 'W-9',
            label: 'IRS Form W-9',
            doc: w9Docs[0]
          });
        }
      }

      // Check ACH Authorization
      if (contractor.ach_authorization_status === 'pending' || contractor.ach_authorization_status === 'uploaded') {
        const achDocs = await base44.asServiceRole.entities.ContractorDocument.filter(
          { contractor_profile_id: contractor.id, document_type: 'ach_authorization' },
          '-created_date',
          1
        );

        if (achDocs[0] && achDocs[0].signature_status !== 'signed') {
          pendingDocs.push({
            type: 'ACH',
            label: 'ACH Authorization Form',
            doc: achDocs[0]
          });
        }
      }

      // Check Contractor Agreement
      if (!contractor.agreement_signed) {
        const agreementDocs = await base44.asServiceRole.entities.ContractorDocument.filter(
          { contractor_profile_id: contractor.id, document_type: 'contractor_agreement' },
          '-created_date',
          1
        );

        if (agreementDocs[0] && agreementDocs[0].signature_status !== 'signed') {
          pendingDocs.push({
            type: 'Agreement',
            label: 'Contractor Agreement',
            doc: agreementDocs[0]
          });
        }
      }

      // ─── SEND NOTIFICATIONS FOR PENDING DOCUMENTS ──────────────────
      if (pendingDocs.length > 0) {
        try {
          const docList = pendingDocs.map(d => d.label).join(', ');
          
          // Notify driver
          await base44.functions.invoke('notificationService', {
            user_id: contractor.driver_id,
            title: '📋 Documents Awaiting Your Signature',
            message: `You have ${pendingDocs.length} document(s) waiting for your digital signature: ${docList}. Complete your onboarding by signing these documents.`,
            type: 'pending_signature_reminder',
            priority: 'high',
            related_entity_type: 'ContractorProfile',
            related_entity_id: contractor.id
          });

          // Notify dispatcher (if assigned)
          if (contractor.assigned_dispatcher_id) {
            await base44.functions.invoke('notificationService', {
              user_id: contractor.assigned_dispatcher_id,
              title: `📋 ${contractor.first_name} ${contractor.last_name} - Documents Pending Signature`,
              message: `Contractor still needs to sign: ${docList}. You may follow up to expedite onboarding.`,
              type: 'pending_signature_alert',
              priority: 'normal',
              related_entity_type: 'ContractorProfile',
              related_entity_id: contractor.id
            });
          }

          remindersCount++;
          reminderResults.push({
            contractor_id: contractor.id,
            name: `${contractor.first_name} ${contractor.last_name}`,
            pending_docs: pendingDocs.length,
            status: 'reminded'
          });

        } catch (err) {
          console.error(`Failed to send reminders for contractor ${contractor.id}:`, err);
          reminderResults.push({
            contractor_id: contractor.id,
            name: `${contractor.first_name} ${contractor.last_name}`,
            status: 'failed',
            error: err.message
          });
        }
      }
    }

    // ─── LOG SUMMARY ──────────────────────────────────────────────────
    console.log(`Pending signature reminders sent: ${remindersCount}`);

    return Response.json({
      success: true,
      reminders_sent: remindersCount,
      results: reminderResults
    });

  } catch (error) {
    console.error('Pending signature reminder error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});