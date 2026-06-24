import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find or create UserProfile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter(
      { authUserId: user.id },
      '-created_date',
      1
    ).catch(err => {
      console.error('[handleUserLogin] UserProfile filter failed:', err.message);
      return [];
    });

    let userProfile = profiles?.[0];
    if (!userProfile) {
      console.log('[handleUserLogin] Creating UserProfile for:', user.email);
      // For admin users, default to admin businessRole; otherwise default to user
      const defaultBusinessRole = user.role === 'admin' ? 'admin' : 'user';
      userProfile = await base44.asServiceRole.entities.UserProfile.create({
        authUserId: user.id,
        email: user.email,
        fullName: user.full_name,
        businessRole: defaultBusinessRole,
        active: true,
        lastLogin: new Date().toISOString()
      }).catch(err => {
        console.error('[handleUserLogin] UserProfile creation failed:', err.message);
        return null;
      });
    } else {
      // Update last login time
      await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
        lastLogin: new Date().toISOString(),
        lastLoginStatus: 'available'
      }).catch(err => {
        console.error('[handleUserLogin] UserProfile update failed:', err.message);
      });
    }

    // Use UserProfile.businessRole as source of truth, with fallback for admin users
    let businessRole = userProfile?.businessRole;
    if (!businessRole && user.role === 'admin') {
      businessRole = 'admin';
    }
    if (!businessRole) {
      businessRole = 'user';
    }

    // Driver status automation: Set to "available" on login
    if (businessRole === 'driver' && userProfile?.linkedDriverId) {
      try {
        const driver = await base44.asServiceRole.entities.Driver.get(userProfile.linkedDriverId);
        
        if (driver) {
          // Check if driver has active load
          const activeLiads = await base44.asServiceRole.entities.Load.filter(
            { driver_id: driver.id, status: { $in: ['assigned', 'accepted', 'en_route', 'loaded', 'in_transit'] } },
            '-created_date',
            1
          ).catch(() => []);

          const newStatus = activeLiads && activeLiads.length > 0 ? 'on_load' : 'available';

          await base44.asServiceRole.entities.Driver.update(driver.id, {
            status: newStatus,
            last_location_update: new Date().toISOString()
          }).catch(err => {
            console.error('[handleUserLogin] Driver status update failed:', err.message);
          });

          console.log('[handleUserLogin] Driver status set to:', newStatus);
        }
      } catch (err) {
        console.error('[handleUserLogin] Driver automation failed:', err.message);
      }
    }

    // Routing logic
    const routingMap = {
      admin: '/dashboard',
      system_manager: '/dashboard',
      dispatcher: '/dispatch',
      fleet_manager: '/fleet-manager',
      finance: '/finance',
      driver: '/driver/dashboard',
      client: '/client/dashboard',
      broker: '/crm',
      safety_compliance: '/compliance'
    };

    const redirectUrl = routingMap[businessRole] || '/dashboard';

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        businessRole,
        userProfileId: userProfile?.id
      },
      redirectUrl,
      userProfile
    });
  } catch (error) {
    console.error('[handleUserLogin] Unexpected error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});