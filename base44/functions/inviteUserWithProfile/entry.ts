import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Only admins can invite users
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { fullName, email, businessRole, isActive = true, createBusinessProfile = true, sendInviteEmail = true } = payload;

    if (!fullName?.trim() || !email?.trim() || !businessRole) {
      return Response.json({ error: 'Missing required: fullName, email, businessRole' }, { status: 400 });
    }

    // Map business role to auth role (admin stays admin, all others become user)
    const authRole = businessRole === 'admin' ? 'admin' : 'user';

    console.log(`[inviteUserWithProfile] Inviting ${email} as ${businessRole} (auth: ${authRole})`);

    // 1. Invite auth user
    let authUser;
    try {
      authUser = await base44.users.inviteUser(email, authRole);
    } catch (inviteErr) {
      console.error('[inviteUserWithProfile] Invite failed:', inviteErr.message);
      return Response.json({ error: `User invitation failed: ${inviteErr.message}` }, { status: 400 });
    }

    if (!authUser?.id) {
      return Response.json({ error: 'Failed to create auth user' }, { status: 400 });
    }

    // Note: UserProfile is now the source of truth for users
    // Base44 User entity is separate and doesn't need manual sync

    // 3. Always create UserProfile
    const userProfileData = {
      authUserId: authUser.id,
      email,
      fullName,
      businessRole,
      active: isActive
    };

    let userProfile;
    try {
      userProfile = await base44.asServiceRole.entities.UserProfile.create(userProfileData);
      console.log(`[inviteUserWithProfile] UserProfile created: ${userProfile.id}`);
    } catch (err) {
      console.error('[inviteUserWithProfile] UserProfile creation failed:', err.message);
      return Response.json({ error: `Failed to create user profile: ${err.message}` }, { status: 400 });
    }

    let linkedIds = {
      driverId: null,
      contractorProfileId: null,
      paymentProfileId: null
    };

    // 4. If driver role and createBusinessProfile, create Driver + Contractor hierarchy
    if (businessRole === 'driver' && createBusinessProfile) {
      try {
        // Create Driver
        const driver = await base44.asServiceRole.entities.Driver.create({
          user_id: authUser.id,
          first_name: fullName.split(' ')[0] || fullName,
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          email,
          phone: '',
          status: 'available',
          driver_type: 'contractor',
          employment_type: '1099_contractor'
        });

        linkedIds.driverId = driver.id;
        console.log(`[inviteUserWithProfile] Driver created: ${driver.id}`);

        // Create ContractorProfile
        const contractor = await base44.asServiceRole.entities.ContractorProfile.create({
          driver_id: driver.id,
          user_id: authUser.id,
          first_name: fullName.split(' ')[0] || fullName,
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          email,
          phone: '',
          legal_business_name: fullName,
          role: 'owner_operator',
          status: 'onboarding'
        });

        linkedIds.contractorProfileId = contractor.id;
        console.log(`[inviteUserWithProfile] ContractorProfile created: ${contractor.id}`);

        // Create ContractorChecklist
        await base44.asServiceRole.entities.ContractorChecklist.create({
          contractor_profile_id: contractor.id,
          overall_progress: 0
        });

        // Create ContractorPaymentProfile
        const paymentProfile = await base44.asServiceRole.entities.ContractorPaymentProfile.create({
          driver_id: driver.id,
          legal_business_name: fullName,
          driver_name: fullName,
          w9_uploaded: false,
          ach_authorization_uploaded: false,
          is_active: true
        });

        linkedIds.paymentProfileId = paymentProfile.id;
        console.log(`[inviteUserWithProfile] ContractorPaymentProfile created: ${paymentProfile.id}`);

        // Create required ContractorDocument records (empty placeholders)
        const docTypes = ['w9', 'ach_authorization', 'contractor_agreement', 'cdl', 'medical_card', 'insurance_certificate'];
        for (const docType of docTypes) {
          try {
            await base44.asServiceRole.entities.ContractorDocument.create({
              contractor_profile_id: contractor.id,
              driver_id: driver.id,
              document_type: docType,
              file_url: '',
              file_name: '',
              status: 'pending',
              signature_status: 'pending',
              requires_signature: docType === 'contractor_agreement'
            });
          } catch (docErr) {
            console.warn(`[inviteUserWithProfile] ContractorDocument (${docType}) creation failed:`, docErr.message);
          }
        }

      } catch (contractorErr) {
        console.error('[inviteUserWithProfile] Contractor creation failed:', contractorErr.message);
        // Don't fail the whole invite, but log the error
      }
    }

    // 5. Update UserProfile with all linked IDs
    try {
      await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
        linkedDriverId: linkedIds.driverId,
        linkedContractorId: linkedIds.contractorProfileId,
        linkedPaymentProfileId: linkedIds.paymentProfileId
      });
    } catch (err) {
      console.warn('[inviteUserWithProfile] UserProfile link update failed:', err.message);
    }

    // 6. Log audit event
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'user_invited',
      user_id: user.id,
      user_role: 'admin',
      result: 'success',
      action_details: `User ${email} invited as ${businessRole} with linked profiles`,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json({
      success: true,
      authUserId: authUser.id,
      userProfileId: userProfile.id,
      linkedIds
    }, { status: 200 });

  } catch (error) {
    console.error('[inviteUserWithProfile] Unexpected error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});