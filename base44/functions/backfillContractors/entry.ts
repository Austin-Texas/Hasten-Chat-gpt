import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin only
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const drivers = await base44.asServiceRole.entities.Driver.list('-created_date', 500);
    const contractors = await base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500);
    
    const contractorDriverIds = new Set(contractors.map(c => c.driver_id));
    const missingDrivers = drivers.filter(d => !contractorDriverIds.has(d.id));

    console.log(`Found ${drivers.length} drivers, ${contractors.length} contractors, ${missingDrivers.length} missing`);

    const created = [];
    for (const driver of missingDrivers) {
      try {
        const contractor = await base44.asServiceRole.entities.ContractorProfile.create({
          driver_id: driver.id,
          user_id: driver.user_id || '',
          first_name: driver.first_name,
          last_name: driver.last_name,
          email: driver.email,
          phone: driver.phone,
          legal_business_name: driver.first_name + ' ' + driver.last_name,
          role: 'owner_operator',
          status: 'prospect',
          start_date: driver.hire_date || new Date().toISOString().split('T')[0],
          w9_status: 'pending',
          ach_authorization_status: 'pending',
          agreement_signed: false,
          insurance_certificate_status: 'pending',
          cdl_status: 'pending',
          medical_card_status: 'pending',
          onboarding_complete: false,
          compliance_status: 'at_risk'
        });

        // Create checklist
        await base44.asServiceRole.entities.ContractorChecklist.create({
          contractor_profile_id: contractor.id,
          profile_complete: true,
          w9_uploaded: false,
          ach_authorization_uploaded: false,
          agreement_signed: false,
          overall_progress: 0
        });

        // Create payment profile placeholder
        await base44.asServiceRole.entities.ContractorPaymentProfile.create({
          driver_id: driver.id,
          legal_business_name: contractor.legal_business_name,
          driver_name: driver.first_name + ' ' + driver.last_name,
          w9_uploaded: false,
          ach_authorization_uploaded: false,
          is_active: true
        });

        // Create required docs
        const docTypes = ['w9', 'contractor_agreement', 'ach_authorization', 'cdl', 'medical_card', 'insurance_certificate'];
        for (const docType of docTypes) {
          await base44.asServiceRole.entities.ContractorDocument.create({
            contractor_profile_id: contractor.id,
            driver_id: driver.id,
            document_type: docType,
            file_url: '',
            requires_signature: docType === 'contractor_agreement',
            signature_status: docType === 'contractor_agreement' ? 'pending' : undefined,
            status: 'pending'
          });
        }

        created.push(contractor.id);
      } catch (err) {
        console.error(`Failed to create contractor for driver ${driver.id}:`, err.message);
      }
    }

    console.log(`Backfilled ${created.length} contractors`);
    return Response.json({ 
      success: true,
      total_drivers: drivers.length,
      total_contractors: contractors.length,
      missing_drivers: missingDrivers.length,
      created_contractors: created.length,
      created_ids: created
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});