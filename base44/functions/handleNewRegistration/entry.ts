import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const regRequest = body.data || body;
    
    if (!regRequest) return Response.json({ error: 'No data' }, { status: 400 });

    const roleLabel = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      dispatcher: 'Dispatcher',
      driver: 'Driver',
      customer: 'Customer',
    }[regRequest.requested_role] || regRequest.requested_role;

    // Notify all admin users
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const superAdmins = await base44.asServiceRole.entities.User.filter({ role: 'super_admin' });
    const allAdmins = [...admins, ...superAdmins];

    for (const admin of allAdmins) {
      try {
        await base44.integrations.Core.SendEmail({
          to: admin.email,
          subject: `🚛 New ${roleLabel} Registration — Action Required`,
          body: `
Hello ${admin.full_name || 'Admin'},

A new user has registered and is requesting access to the HASTEN CARGO platform.

Details:
• Name: ${regRequest.user_name || 'Unknown'}
• Email: ${regRequest.user_email}
• Requested Role: ${roleLabel}

Please log in to the Admin panel → Settings → User Management to review and approve or reject this request.

Once approved, the user will receive an email and be granted access to their portal.

— HASTEN CARGO System
          `.trim(),
        });

        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          role: 'admin',
          title: `New ${roleLabel} Registration Pending`,
          message: `${regRequest.user_name || regRequest.user_email} has requested ${roleLabel} access. Review in User Management.`,
          type: 'system_alert',
          priority: 'high',
          read: false,
        });
      } catch (e) {
        console.error(`Failed to notify admin ${admin.email}:`, e.message);
      }
    }

    return Response.json({ success: true, admins_notified: allAdmins.length });
  } catch (error) {
    console.error('handleNewRegistration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});