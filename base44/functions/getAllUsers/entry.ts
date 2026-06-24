import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Use UserProfile as source of truth (all users should have a UserProfile)
    const allProfiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 500);
    
    console.log('getAllUsers: fetched', allProfiles.length, 'userprofiles');

    // Enrich each profile with linked entity info
    const enriched = await Promise.all(
      allProfiles.map(async (profile) => {
        const enrichment = {
          id: profile.authUserId,
          email: profile.email,
          full_name: profile.fullName,
          role: profile.businessRole === 'admin' ? 'admin' : 'user',
          businessRole: profile.businessRole,
          active: profile.active,
          userProfileId: profile.id,
          linked_profile: null
        };

        try {
          // Determine linked entity type
          if (profile.linkedDriverId) {
            enrichment.linked_profile = { type: 'driver', id: profile.linkedDriverId };
          } else if (profile.linkedContractorId) {
            enrichment.linked_profile = { type: 'contractor', id: profile.linkedContractorId };
          } else if (profile.linkedDispatcherId) {
            enrichment.linked_profile = { type: 'dispatcher', id: profile.linkedDispatcherId };
          } else if (profile.linkedBrokerId) {
            enrichment.linked_profile = { type: 'broker', id: profile.linkedBrokerId };
          } else if (profile.linkedClientId) {
            enrichment.linked_profile = { type: 'client', id: profile.linkedClientId };
          }
        } catch (err) {
          console.warn('Error enriching profile', profile.id, ':', err.message);
        }
        return enrichment;
      })
    );

    return Response.json({ success: true, users: enriched });
  } catch (error) {
    console.error('getAllUsers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});