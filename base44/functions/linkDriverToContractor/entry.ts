import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { driver_id, create_contractor } = await req.json();

    if (!driver_id) {
      return Response.json({ error: 'driver_id required' }, { status: 400 });
    }

    const driver = await base44.entities.Driver.get(driver_id);
    if (!driver) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (!create_contractor) {
      return Response.json({ success: true, driver });
    }

    // Create ContractorProfile
    const contractor = await base44.asServiceRole.entities.ContractorProfile.create({
      driver_id: driver.id,
      user_id: driver.user_id || '',
      first_name: driver.first_name,
      last_name: driver.last_name,
      email: driver.email,
      phone: driver.phone,
      legal_business_name: driver.first_name + ' ' + driver.last_name,
      role: 'owner_operator',
      status: 'onboarding',
      start_date: new Date().toISOString().split('T')[0],
      w9_status: 'pending',
      ach_authorization_status: 'pending',
      agreement_signed: false,
      insurance_certificate_status: 'pending',
      cdl_status: 'pending',
      medical_card_status: 'pending',
      onboarding_complete: false,
      compliance_status: 'at_risk'
    });

    // Create ContractorChecklist
    await base44.asServiceRole.entities.ContractorChecklist.create({
      contractor_profile_id: contractor.id,
      profile_complete: true,
      w9_uploaded: false,
      ach_authorization_uploaded: false,
      agreement_signed: false,
      cdl_uploaded: false,
      medical_card_uploaded: false,
      insurance_uploaded: false,
      payment_profile_complete: false,
      settlement_rule_assigned: false,
      overall_progress: 15
    });

    // Create ContractorPaymentProfile placeholder
    await base44.asServiceRole.entities.ContractorPaymentProfile.create({
      driver_id: driver.id,
      legal_business_name: contractor.legal_business_name,
      driver_name: driver.first_name + ' ' + driver.last_name,
      w9_uploaded: false,
      ach_authorization_uploaded: false,
      is_active: true
    });

    // Create required ContractorDocument records
    const requiredDocs = [
      { type: 'w9', label: 'W-9' },
      { type: 'contractor_agreement', label: 'Contractor Agreement' },
      { type: 'ach_authorization', label: 'ACH Authorization' },
      { type: 'cdl', label: 'CDL' },
      { type: 'medical_card', label: 'Medical Card' },
      { type: 'insurance_certificate', label: 'Insurance Certificate' }
    ];

    for (const doc of requiredDocs) {
      await base44.asServiceRole.entities.ContractorDocument.create({
        contractor_profile_id: contractor.id,
        driver_id: driver.id,
        document_type: doc.type,
        file_url: '',
        file_name: doc.label,
        requires_signature: doc.type === 'contractor_agreement',
        signature_status: doc.type === 'contractor_agreement' ? 'pending' : undefined,
        status: 'pending'
      });
    }

    console.log('Contractor profile linked:', contractor.id);
    return Response.json({ 
      success: true, 
      driver, 
      contractor,
      message: 'Driver linked to contractor profile'
    });
  } catch (error) {
    console.error('Error linking driver to contractor:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});