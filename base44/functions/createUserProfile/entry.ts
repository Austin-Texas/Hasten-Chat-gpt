import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { user_id, email, role, full_name } = await req.json();

    if (!user_id || !email || !role) {
      return Response.json({ error: 'user_id, email, role required' }, { status: 400 });
    }

    // Create linked profile based on role
    const created = { user_id, email, role, full_name };

    // Always create UserProfile bridge
    const userProfile = await base44.asServiceRole.entities.UserProfile.create({
      authUserId: user_id,
      email,
      fullName: full_name,
      businessRole: role,
      active: true
    }).catch(err => {
      console.error('[createUserProfile] UserProfile creation failed:', err.message);
      throw err;
    });
    created.userProfileId = userProfile.id;

    switch (role) {
      case 'driver':
        const driver = await base44.asServiceRole.entities.Driver.create({
          user_id,
          first_name: full_name?.split(' ')[0] || 'Driver',
          last_name: full_name?.split(' ')[1] || 'User',
          email,
          phone: '',
          status: 'available'
        }).catch(err => {
          console.error('[createUserProfile] Driver creation failed:', err.message);
          throw err;
        });
        created.driver_id = driver.id;

        // Auto-create contractor profile
        const contractor = await base44.asServiceRole.entities.ContractorProfile.create({
          driver_id: driver.id,
          user_id,
          first_name: driver.first_name,
          last_name: driver.last_name,
          email,
          phone: '',
          legal_business_name: full_name || 'Driver Business',
          role: 'owner_operator',
          status: 'prospect',
          start_date: new Date().toISOString().split('T')[0],
          w9_status: 'pending',
          ach_authorization_status: 'pending',
          agreement_signed: false,
          insurance_certificate_status: 'pending',
          cdl_status: 'pending',
          medical_card_status: 'pending',
          onboarding_complete: false,
          compliance_status: 'at_risk'
        }).catch(err => {
          console.error('[createUserProfile] ContractorProfile creation failed:', err.message);
          throw err;
        });
        created.contractor_id = contractor.id;

        // Auto-create contractor checklist
        const checklist = await base44.asServiceRole.entities.ContractorChecklist.create({
          contractor_profile_id: contractor.id,
          profile_complete: false,
          overall_progress: 0
        }).catch(err => {
          console.error('[createUserProfile] ContractorChecklist creation failed:', err.message);
          throw err;
        });
        created.checklist_id = checklist.id;

        // Auto-create payment profile
        const paymentProfile = await base44.asServiceRole.entities.ContractorPaymentProfile.create({
          driver_id: driver.id,
          legal_business_name: full_name || 'Driver Business',
          driver_name: full_name || 'Driver',
          is_active: true
        }).catch(err => {
          console.error('[createUserProfile] ContractorPaymentProfile creation failed:', err.message);
          throw err;
        });
        created.payment_profile_id = paymentProfile.id;

        // Link all IDs to UserProfile
        await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
          linkedDriverId: driver.id,
          linkedContractorId: contractor.id,
          linkedPaymentProfileId: paymentProfile.id
        }).catch(err => {
          console.error('[createUserProfile] UserProfile linking failed:', err.message);
          throw err;
        });

        console.log('[createUserProfile] Driver + Contractor + Checklist + PaymentProfile created:', {
          driver_id: driver.id,
          contractor_id: contractor.id,
          checklist_id: checklist.id,
          payment_profile_id: paymentProfile.id
        });
        break;

      case 'dispatcher':
        // Create dispatcher profile if Dispatcher entity exists
        try {
          const dispatcher = await base44.asServiceRole.entities.Dispatcher?.create?.({
            user_id,
            first_name: full_name?.split(' ')[0] || 'Dispatcher',
            last_name: full_name?.split(' ')[1] || 'User',
            email,
            phone: '',
            status: 'active'
          });
          if (dispatcher) {
            created.dispatcher_id = dispatcher.id;
            await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
              linkedDispatcherId: dispatcher.id
            }).catch(err => console.warn('Could not link dispatcher:', err.message));
          }
        } catch (err) {
          console.warn('Dispatcher entity not available:', err.message);
        }
        break;

      case 'broker':
        try {
          const broker = await base44.asServiceRole.entities.Broker?.create?.({
            user_id,
            company_name: full_name || 'Broker Company',
            contact_name: full_name || '',
            email,
            phone: '',
            status: 'active'
          });
          if (broker) {
            created.broker_id = broker.id;
            await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
              linkedBrokerId: broker.id
            }).catch(err => console.warn('Could not link broker:', err.message));
          }
        } catch (err) {
          console.warn('Broker entity not available:', err.message);
        }
        break;

      case 'client':
        try {
          const client = await base44.asServiceRole.entities.Client?.create?.({
            user_id,
            company_name: full_name || 'Client Company',
            contact_name: full_name || '',
            email,
            phone: '',
            status: 'active'
          });
          if (client) {
            created.client_id = client.id;
            await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
              linkedClientId: client.id
            }).catch(err => console.warn('Could not link client:', err.message));
          }
        } catch (err) {
          console.warn('Client entity not available:', err.message);
        }
        break;
    }

    return Response.json({ success: true, created });
  } catch (error) {
    console.error('Error creating user profile:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});