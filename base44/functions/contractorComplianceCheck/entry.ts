import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Contractor Compliance Check
 * 
 * Evaluates contractor compliance status and sends alerts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { contractor_profile_id } = body;

    if (!contractor_profile_id) {
      return Response.json({ error: 'Missing contractor_profile_id' }, { status: 400 });
    }

    const profile = await base44.asServiceRole.entities.ContractorProfile.filter(
      { id: contractor_profile_id },
      '-created_date',
      1
    );

    if (!profile[0]) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const contractor = profile[0];
    const alerts = [];
    let complianceStatus = 'compliant';

    // ─── CHECK COMPLIANCE ──────────────────────────────────────────
    if (contractor.w9_status !== 'uploaded' && contractor.w9_status !== 'verified') {
      alerts.push({ type: 'missing_w9', severity: 'high' });
      complianceStatus = 'at_risk';
    }

    if (contractor.ach_authorization_status !== 'uploaded' && contractor.ach_authorization_status !== 'verified') {
      alerts.push({ type: 'missing_ach', severity: 'high' });
      complianceStatus = 'at_risk';
    }

    if (contractor.insurance_certificate_status !== 'uploaded' && contractor.insurance_certificate_status !== 'verified') {
      alerts.push({ type: 'missing_insurance', severity: 'medium' });
      complianceStatus = 'at_risk';
    }

    if (contractor.cdl_status === 'expired') {
      alerts.push({ type: 'expired_cdl', severity: 'critical' });
      complianceStatus = 'non_compliant';
    }

    if (contractor.medical_card_status === 'expired') {
      alerts.push({ type: 'expired_medical_card', severity: 'critical' });
      complianceStatus = 'non_compliant';
    }

    if (contractor.insurance_expiration_date) {
      const expirationDate = new Date(contractor.insurance_expiration_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        alerts.push({ type: 'expired_insurance', severity: 'critical' });
        complianceStatus = 'non_compliant';
      } else if (daysUntilExpiry < 30) {
        alerts.push({ type: 'insurance_expiring_soon', severity: 'medium', days: daysUntilExpiry });
        if (complianceStatus === 'compliant') complianceStatus = 'at_risk';
      }
    }

    // ─── UPDATE COMPLIANCE STATUS ─────────────────────────────────
    await base44.asServiceRole.entities.ContractorProfile.update(contractor_profile_id, {
      compliance_status: complianceStatus
    });

    // ─── SEND ALERTS ──────────────────────────────────────────────
    for (const alert of alerts) {
      try {
        let title = '';
        let message = '';

        if (alert.type === 'missing_w9') {
          title = '⚠️ W-9 Required';
          message = 'Please upload your W-9 form to continue.';
        } else if (alert.type === 'missing_ach') {
          title = '⚠️ ACH Authorization Required';
          message = 'Please upload your ACH authorization form for payment processing.';
        } else if (alert.type === 'missing_insurance') {
          title = '⚠️ Insurance Certificate Required';
          message = 'Please upload your insurance certificate.';
        } else if (alert.type === 'expired_cdl') {
          title = '❌ CDL Expired';
          message = 'Your commercial driver\'s license has expired. You cannot accept new loads.';
        } else if (alert.type === 'expired_medical_card') {
          title = '❌ Medical Card Expired';
          message = 'Your DOT medical card has expired. You cannot drive until renewed.';
        } else if (alert.type === 'expired_insurance') {
          title = '❌ Insurance Expired';
          message = 'Your insurance has expired. You cannot accept new loads.';
        } else if (alert.type === 'insurance_expiring_soon') {
          title = '⚠️ Insurance Expiring Soon';
          message = `Your insurance expires in ${alert.days} days. Please renew.`;
        }

        await base44.functions.invoke('notificationService', {
          user_id: contractor.driver_id,
          title,
          message,
          type: `contractor_${alert.type}`,
          priority: alert.severity === 'critical' ? 'high' : 'normal',
          related_entity_type: 'ContractorProfile',
          related_entity_id: contractor_profile_id
        });
      } catch (err) {
        console.error(`Failed to send ${alert.type} alert:`, err);
      }
    }

    return Response.json({
      success: true,
      contractor_id: contractor_profile_id,
      compliance_status: complianceStatus,
      alerts
    });

  } catch (error) {
    console.error('Compliance check error:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});