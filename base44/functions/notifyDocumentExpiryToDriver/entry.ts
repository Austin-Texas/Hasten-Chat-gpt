import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Notify Driver Document Expiry
 * 
 * Checks contractor documents for upcoming expiry (<30 days)
 * and sends notifications to drivers with link to onboarding portal
 * Scheduled to run daily
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ─── FETCH ALL CONTRACTORS WITH EXPIRING DOCS ────────────
    const contractors = await base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let notificationsCreated = 0;
    const expiringDocs = [];

    for (const contractor of contractors) {
      // Get related user/driver
      let driverId = contractor.user_id;
      if (!driverId && contractor.driver_id) {
        driverId = contractor.driver_id;
      }

      // Check tax documents (W-9)
      const w9Docs = await base44.asServiceRole.entities.ContractorDocument.filter(
        {
          contractor_profile_id: contractor.id,
          document_type: 'w9'
        },
        '-created_date',
        1
      );

      if (w9Docs[0]) {
        const doc = w9Docs[0];
        if (doc.expiration_date) {
          const expDate = new Date(doc.expiration_date);
          if (expDate >= today && expDate <= thirtyDaysFromNow) {
            const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            expiringDocs.push({
              contractor_id: contractor.id,
              driver_id: driverId,
              contractor_name: `${contractor.first_name} ${contractor.last_name}`,
              doc_type: 'W-9 Tax Form',
              expiry_date: doc.expiration_date,
              days_until: daysUntil,
              priority: daysUntil <= 7 ? 'high' : 'normal'
            });
          }
        }
      }

      // Check agreement signature
      if (!contractor.agreement_signed) {
        const contractorDocs = await base44.asServiceRole.entities.ContractorDocument.filter(
          {
            contractor_profile_id: contractor.id,
            document_type: 'contractor_agreement'
          },
          '-created_date',
          1
        );

        if (contractorDocs[0]) {
          const doc = contractorDocs[0];
          if (doc.signature_status === 'pending') {
            expiringDocs.push({
              contractor_id: contractor.id,
              driver_id: driverId,
              contractor_name: `${contractor.first_name} ${contractor.last_name}`,
              doc_type: 'Contractor Agreement',
              expiry_date: null,
              days_until: 0,
              priority: 'high',
              needs_signature: true
            });
          }
        }
      }

      // Check medical card
      if (contractor.medical_card_expiration_date) {
        const medDate = new Date(contractor.medical_card_expiration_date);
        if (medDate >= today && medDate <= thirtyDaysFromNow) {
          const daysUntil = Math.ceil((medDate - today) / (1000 * 60 * 60 * 24));
          expiringDocs.push({
            contractor_id: contractor.id,
            driver_id: driverId,
            contractor_name: `${contractor.first_name} ${contractor.last_name}`,
            doc_type: 'Medical Card',
            expiry_date: contractor.medical_card_expiration_date,
            days_until: daysUntil,
            priority: daysUntil <= 7 ? 'high' : 'normal'
          });
        }
      }

      // Check CDL
      if (contractor.cdl_expiration_date) {
        const cdlDate = new Date(contractor.cdl_expiration_date);
        if (cdlDate >= today && cdlDate <= thirtyDaysFromNow) {
          const daysUntil = Math.ceil((cdlDate - today) / (1000 * 60 * 60 * 24));
          expiringDocs.push({
            contractor_id: contractor.id,
            driver_id: driverId,
            contractor_name: `${contractor.first_name} ${contractor.last_name}`,
            doc_type: 'CDL License',
            expiry_date: contractor.cdl_expiration_date,
            days_until: daysUntil,
            priority: daysUntil <= 7 ? 'high' : 'normal'
          });
        }
      }
    }

    // ─── SEND DRIVER NOTIFICATIONS ──────────────────────────
    const uniqueDrivers = [...new Map(expiringDocs.map(d => [d.driver_id, d])).values()];

    for (const doc of uniqueDrivers) {
      try {
        if (doc.driver_id) {
          // Determine message
          let title, message;
          if (doc.needs_signature) {
            title = '⚠️ Agreement Signature Required';
            message = `Your contractor agreement needs signature. Please complete this in your onboarding portal to stay active.`;
          } else {
            title = `⏰ ${doc.doc_type} Expiring Soon`;
            message = `Your ${doc.doc_type} expires in ${doc.days_until} days. Renew it now in your onboarding portal to avoid service suspension.`;
          }

          // Create notification
          await base44.asServiceRole.entities.Notification.create({
            user_id: doc.driver_id,
            role: 'driver',
            title,
            message,
            type: 'compliance_expiring',
            priority: doc.priority,
            related_entity_type: 'ContractorProfile',
            related_entity_id: doc.contractor_id,
            action_url: '/driver/profile/documents',
            cta_label: 'Go to Onboarding',
            delivery_channels: ['in_app', 'email']
          });

          notificationsCreated++;
        }
      } catch (err) {
        console.error(`Failed to notify ${doc.contractor_name}:`, err);
      }
    }

    console.log(`Driver document expiry notifications sent: ${notificationsCreated}`);

    return Response.json({
      success: true,
      notifications_sent: notificationsCreated,
      expiring_documents: expiringDocs
    });

  } catch (error) {
    console.error('Driver document expiry notification error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});