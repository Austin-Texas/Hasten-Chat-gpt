import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    // Only admin can run this
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    console.log('[backfillMissingBusinessRoles] Starting backfill...');

    // Get all auth users
    const authUsers = await base44.asServiceRole.entities.User.list('-created_date', 500).catch(() => []);
    console.log(`[backfillMissingBusinessRoles] Found ${authUsers.length} auth users`);

    let backfilledCount = 0;
    const results = [];

    for (const authUser of authUsers) {
      try {
        // Check if UserProfile exists
        const profiles = await base44.asServiceRole.entities.UserProfile.filter(
          { authUserId: authUser.id },
          '-created_date',
          1
        ).catch(() => []);

        if (!profiles?.[0]) {
          // Missing profile — create one
          const defaultRole = authUser.role === 'admin' ? 'admin' : 'user';
          
          await base44.asServiceRole.entities.UserProfile.create({
            authUserId: authUser.id,
            email: authUser.email,
            fullName: authUser.full_name,
            businessRole: defaultRole,
            active: true
          });

          results.push({
            email: authUser.email,
            action: 'created_profile',
            businessRole: defaultRole
          });
          backfilledCount++;
          console.log(`[backfillMissingBusinessRoles] Created profile for ${authUser.email} (${defaultRole})`);
        } else if (!profiles[0].businessRole) {
          // Profile exists but missing businessRole — fix it
          const fixedRole = authUser.role === 'admin' ? 'admin' : 'user';
          
          await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
            businessRole: fixedRole
          });

          results.push({
            email: authUser.email,
            action: 'fixed_business_role',
            businessRole: fixedRole
          });
          backfilledCount++;
          console.log(`[backfillMissingBusinessRoles] Fixed businessRole for ${authUser.email} (${fixedRole})`);
        }
      } catch (err) {
        console.error(`[backfillMissingBusinessRoles] Error processing ${authUser.email}:`, err.message);
        results.push({
          email: authUser.email,
          action: 'error',
          error: err.message
        });
      }
    }

    console.log(`[backfillMissingBusinessRoles] Backfill complete. Updated ${backfilledCount} users`);

    return Response.json({
      success: true,
      backfilledCount,
      totalUsers: authUsers.length,
      results
    });
  } catch (error) {
    console.error('[backfillMissingBusinessRoles]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});