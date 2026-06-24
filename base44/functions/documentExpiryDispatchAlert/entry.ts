import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Document Expiry Dispatch Alert
 * 
 * Checks contractor documents for upcoming expiry dates
 * and creates calendar alerts on dispatch calendar to ensure compliance
 * Scheduled to run daily
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ─── CHECK FOR EXPIRING DOCUMENTS ────────────────────────────
    const contractors = await base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let alertsCreated = 0;
    const expiredDocuments = [];

    for (const contractor of contractors) {
      // Check CDL expiration
      if (contractor.cdl_expiration_date) {
        const cdlDate = new Date(contractor.cdl_expiration_date);
        if (cdlDate >= today && cdlDate <= thirtyDaysFromNow) {
          expiredDocuments.push({
            contractor_id: contractor.id,
            contractor_name: `${contractor.first_name} ${contractor.last_name}`,
            doc_type: 'CDL License',
            expiry_date: contractor.cdl_expiration_date,
            days_until: Math.ceil((cdlDate - today) / (1000 * 60 * 60 * 24))
          });
        }
      }

      // Check Medical Card expiration
      if (contractor.medical_card_expiration_date) {
        const medicalDate = new Date(contractor.medical_card_expiration_date);
        if (medicalDate >= today && medicalDate <= thirtyDaysFromNow) {
          expiredDocuments.push({
            contractor_id: contractor.id,
            contractor_name: `${contractor.first_name} ${contractor.last_name}`,
            doc_type: 'Medical Card',
            expiry_date: contractor.medical_card_expiration_date,
            days_until: Math.ceil((medicalDate - today) / (1000 * 60 * 60 * 24))
          });
        }
      }

      // Check Insurance expiration
      if (contractor.insurance_expiration_date) {
        const insuranceDate = new Date(contractor.insurance_expiration_date);
        if (insuranceDate >= today && insuranceDate <= thirtyDaysFromNow) {
          expiredDocuments.push({
            contractor_id: contractor.id,
            contractor_name: `${contractor.first_name} ${contractor.last_name}`,
            doc_type: 'Insurance Certificate',
            expiry_date: contractor.insurance_expiration_date,
            days_until: Math.ceil((insuranceDate - today) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }

    // ─── CREATE DISPATCH CALENDAR ALERTS ────────────────────────
    for (const doc of expiredDocuments) {
      try {
        // Create a notification for dispatchers
        await base44.functions.invoke('notificationService', {
          user_id: null, // Broadcast to all dispatchers
          title: `⚠️ Document Expiring Soon`,
          message: `${doc.contractor_name}'s ${doc.doc_type} expires in ${doc.days_until} days (${new Date(doc.expiry_date).toLocaleDateString()})`,
          type: 'compliance_expiring',
          priority: doc.days_until <= 7 ? 'high' : 'normal',
          related_entity_type: 'ContractorProfile',
          related_entity_id: doc.contractor_id
        });

        // Log to audit for tracking
        await base44.functions.invoke('auditLog', {
          action: 'document_expiry_alert_created',
          entity_type: 'ContractorProfile',
          entity_id: doc.contractor_id,
          details: `${doc.doc_type} expires on ${doc.expiry_date}`,
          severity: 'warning'
        });

        alertsCreated++;
      } catch (err) {
        console.error(`Failed to create alert for ${doc.contractor_name}:`, err);
      }
    }

    console.log(`Document expiry alerts created: ${alertsCreated}`);

    return Response.json({
      success: true,
      alerts_created: alertsCreated,
      expiring_documents: expiredDocuments
    });

  } catch (error) {
    console.error('Document expiry dispatch alert error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});