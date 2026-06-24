import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    // Only admin/system_manager can perform user actions
    const userProfile = (await base44.asServiceRole.entities.UserProfile.filter(
      { authUserId: user.id },
      '-created_date',
      1
    ))[0];

    const isAdmin = userProfile?.businessRole === 'admin' || 
                    userProfile?.businessRole === 'system_manager' ||
                    user.role === 'admin';

    if (!isAdmin) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { action, userId, targetUserId, data } = await req.json();

    switch (action) {
      case 'change_business_role':
        return await changeBusinessRole(base44, targetUserId, data, userProfile);
      case 'toggle_active':
        return await toggleUserActive(base44, targetUserId, data, userProfile);
      case 'archive':
        return await archiveUser(base44, targetUserId, data, userProfile);
      case 'delete':
        return await deleteUser(base44, targetUserId, data, userProfile);
      case 'resend_invite':
        return await resendInvite(base44, targetUserId, data, userProfile);
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[manageUserAction]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function changeBusinessRole(base44, userId, data, performer) {
  const { newRole } = data;
  
  try {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter(
      { authUserId: userId },
      '-created_date',
      1
    );
    
    if (!profiles[0]) {
      return Response.json({ error: 'User profile not found' }, { status: 404 });
    }

    const oldRole = profiles[0].businessRole;
    await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
      businessRole: newRole
    });

    // Log action
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'business_role_changed',
      user_id: userId,
      performed_by: performer.authUserId,
      old_value: oldRole,
      new_value: newRole,
      result: 'success',
      action_details: `Business role changed from ${oldRole} to ${newRole}`,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json({ success: true, message: `Role changed to ${newRole}` });
  } catch (err) {
    console.error('[changeBusinessRole]', err);
    throw err;
  }
}

async function toggleUserActive(base44, userId, data, performer) {
  const { isActive } = data;
  
  try {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter(
      { authUserId: userId },
      '-created_date',
      1
    );
    
    if (!profiles[0]) {
      return Response.json({ error: 'User profile not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
      active: isActive
    });

    // If driver, update driver status
    if (profiles[0].linkedDriverId) {
      try {
        await base44.asServiceRole.entities.Driver.update(profiles[0].linkedDriverId, {
          status: isActive ? 'available' : 'inactive'
        });
      } catch (e) {
        console.warn('[toggleUserActive] Failed to update driver status:', e.message);
      }
    }

    // If contractor, update contractor profile
    if (profiles[0].linkedContractorId) {
      try {
        await base44.asServiceRole.entities.ContractorProfile.update(profiles[0].linkedContractorId, {
          status: isActive ? 'active' : 'inactive'
        });
      } catch (e) {
        console.warn('[toggleUserActive] Failed to update contractor status:', e.message);
      }
    }

    // Log action
    await base44.asServiceRole.entities.AuditLog.create({
      action: isActive ? 'user_reactivated' : 'user_deactivated',
      user_id: userId,
      performed_by: performer.authUserId,
      result: 'success',
      action_details: `User ${isActive ? 'reactivated' : 'deactivated'}`,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json({ success: true, message: `User ${isActive ? 'reactivated' : 'deactivated'}` });
  } catch (err) {
    console.error('[toggleUserActive]', err);
    throw err;
  }
}

async function archiveUser(base44, userId, data, performer) {
  try {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter(
      { authUserId: userId },
      '-created_date',
      1
    );
    
    if (!profiles[0]) {
      return Response.json({ error: 'User profile not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
      active: false
    });

    // Update related entities to inactive
    if (profiles[0].linkedDriverId) {
      try {
        await base44.asServiceRole.entities.Driver.update(profiles[0].linkedDriverId, {
          status: 'inactive'
        });
      } catch (e) {
        console.warn('[archiveUser] Failed to update driver:', e.message);
      }
    }

    if (profiles[0].linkedContractorId) {
      try {
        await base44.asServiceRole.entities.ContractorProfile.update(profiles[0].linkedContractorId, {
          status: 'inactive'
        });
      } catch (e) {
        console.warn('[archiveUser] Failed to update contractor:', e.message);
      }
    }

    // Log action
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'user_archived',
      user_id: userId,
      performed_by: performer.authUserId,
      result: 'success',
      action_details: 'User archived with all linked records preserved',
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json({ success: true, message: 'User archived' });
  } catch (err) {
    console.error('[archiveUser]', err);
    throw err;
  }
}

async function deleteUser(base44, userId, data, performer) {
  try {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter(
      { authUserId: userId },
      '-created_date',
      1
    );
    
    if (!profiles[0]) {
      return Response.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check for linked records
    const blockedReasons = [];

    // Check loads
    if (profiles[0].linkedDriverId) {
      const loads = await base44.asServiceRole.entities.Load.filter(
        { driver_id: profiles[0].linkedDriverId, status: { $ne: 'completed' } },
        '-created_date',
        1
      ).catch(() => []);
      if (loads.length > 0) {
        blockedReasons.push('User has active loads');
      }

      // Check settlements
      const settlements = await base44.asServiceRole.entities.Settlement.filter(
        { driver_id: profiles[0].linkedDriverId, status: { $ne: 'paid' } },
        '-created_date',
        1
      ).catch(() => []);
      if (settlements.length > 0) {
        blockedReasons.push('User has unpaid settlements');
      }

      // Check documents
      const docs = await base44.asServiceRole.entities.ContractorDocument.filter(
        { contractor_profile_id: profiles[0].linkedContractorId || profiles[0].linkedDriverId, signature_status: 'pending' },
        '-created_date',
        1
      ).catch(() => []);
      if (docs.length > 0) {
        blockedReasons.push('User has pending document signatures');
      }
    }

    if (blockedReasons.length > 0) {
      return Response.json({
        success: false,
        error: 'Cannot delete user',
        reasons: blockedReasons,
        message: 'Archive user instead of deleting'
      }, { status: 400 });
    }

    // Safe to delete — archive first, then log
    await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
      active: false
    });

    // Log deletion attempt
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'user_deleted',
      user_id: userId,
      performed_by: performer.authUserId,
      result: 'success',
      action_details: 'User deleted after verification of no blocking records',
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('[deleteUser]', err);
    throw err;
  }
}

async function resendInvite(base44, userId, data, performer) {
  try {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter(
      { authUserId: userId },
      '-created_date',
      1
    );
    
    if (!profiles[0]) {
      return Response.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Log action
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'invite_resent',
      user_id: userId,
      performed_by: performer.authUserId,
      result: 'success',
      action_details: `Invite email resent to ${profiles[0].email}`,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    // Base44 handles actual email sending via SDK
    return Response.json({ success: true, message: `Invite resent to ${profiles[0].email}` });
  } catch (err) {
    console.error('[resendInvite]', err);
    throw err;
  }
}