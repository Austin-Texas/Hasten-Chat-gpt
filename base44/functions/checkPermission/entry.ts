import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { businessRole, module, action } = await req.json();

    // Validate inputs
    if (!businessRole || !module || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get permission from RolePermission entity
    const permissions = await base44.asServiceRole.entities.RolePermission.filter(
      {
        role: businessRole,
        module,
        action
      },
      '-created_date',
      1
    );

    // If explicit permission record exists, use it
    if (permissions?.[0]) {
      const permission = permissions[0];
      return Response.json({
        allowed: permission.allowed,
        source: 'explicit'
      });
    }

    // Otherwise use hardcoded defaults (fallback to rolePermissions.js logic)
    const defaultPermissions = getDefaultPermission(businessRole, module, action);

    return Response.json({
      allowed: defaultPermissions,
      source: 'default'
    });
  } catch (error) {
    console.error('[checkPermission]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getDefaultPermission(businessRole, module, action) {
  // Default permission matrix (matches rolePermissions.js)
  const defaults = {
    admin: true,
    system_manager: true,
    dispatcher: {
      dashboard: true,
      dispatch: true,
      loads: true,
      drivers: true,
      tracking: true,
      documents: true,
      messages: true,
      support: true,
      compliance: true,
      fleet: true,
      finance: false,
      payroll: false,
      safety: false,
      maintenance: false,
      crm: false,
      quotes: false,
      user_management: false,
      security_dashboard: false,
      admin: false,
      settings: false,
      testing_dashboard: false,
      contractors: false,
      settlements: false,
      payment_profiles: false,
      invoices: false,
      signatures: false,
      brokers: false,
      clients: false
    },
    finance: {
      finance: true,
      payroll: true,
      invoices: true,
      settlements: true,
      payment_profiles: true,
      documents: true,
      crm: false,
      compliance: false,
      dispatch: false,
      drivers: false,
      fleet: false,
      user_management: false,
      security_dashboard: false,
      admin: false,
      settings: false,
      testing_dashboard: false,
      dashboard: true,
      loads: false,
      tracking: false,
      contractors: false,
      safety: false,
      maintenance: false,
      support: false,
      quotes: false,
      signatures: false,
      brokers: false,
      clients: false
    },
    fleet_manager: {
      fleet: true,
      maintenance: true,
      compliance: true,
      tracking: true,
      drivers: true,
      safety: true,
      documents: true,
      finance: false,
      payroll: false,
      dispatch: false,
      user_management: false,
      security_dashboard: false,
      admin: false,
      settings: false,
      testing_dashboard: false,
      dashboard: true,
      loads: false,
      contractors: false,
      settlements: false,
      payment_profiles: false,
      invoices: false,
      crm: false,
      messages: false,
      support: false,
      quotes: false,
      signatures: false,
      brokers: false,
      clients: false
    },
    driver: {
      'driver/dashboard': true,
      'driver/loads': true,
      'driver/map': true,
      'driver/documents': true,
      'driver/messages': true,
      'driver/earnings': true,
      'driver/profile': true,
      'driver/settings': true,
      'driver/support': true,
      'driver/feedback': true,
      'driver/settlement-preview': true,
      dashboard: false,
      dispatch: false,
      drivers: false,
      fleet: false,
      finance: false,
      payroll: false,
      compliance: false,
      user_management: false,
      security_dashboard: false,
      admin: false,
      settings: false,
      testing_dashboard: false,
      loads: false,
      tracking: false,
      contractors: false,
      settlements: false,
      payment_profiles: false,
      invoices: false,
      crm: false,
      documents: false,
      signatures: false,
      brokers: false,
      clients: false,
      support: false,
      quotes: false,
      maintenance: false,
      safety: false
    },
    client: {
      'client/portal': true,
      'client/tracking': true,
      'client/invoices': true,
      dashboard: false,
      dispatch: false,
      finance: false,
      user_management: false,
      admin: false,
      settings: false,
      testing_dashboard: false,
      loads: false,
      tracking: false,
      drivers: false,
      contractors: false,
      fleet: false,
      compliance: false,
      settlements: false,
      payment_profiles: false,
      invoices: false,
      crm: false,
      documents: false,
      signatures: false,
      brokers: false,
      messages: false,
      support: false,
      quotes: false,
      maintenance: false,
      safety: false,
      payroll: false
    },
    broker: {
      'client/portal': true,
      'client/tracking': true,
      'client/invoices': true,
      quotes: true,
      crm: true,
      dashboard: false,
      dispatch: false,
      finance: false,
      user_management: false,
      admin: false,
      settings: false,
      testing_dashboard: false,
      loads: false,
      tracking: false,
      drivers: false,
      contractors: false,
      fleet: false,
      compliance: false,
      settlements: false,
      payment_profiles: false,
      invoices: false,
      documents: false,
      signatures: false,
      brokers: false,
      clients: false,
      messages: false,
      support: false,
      maintenance: false,
      safety: false,
      payroll: false
    },
    safety_compliance: {
      compliance: true,
      documents: true,
      signatures: true,
      drivers: true,
      contractors: true,
      dispatch: false,
      loads: false,
      tracking: false,
      fleet: false,
      finance: false,
      payroll: false,
      user_management: false,
      security_dashboard: false,
      admin: false,
      settings: false,
      testing_dashboard: false,
      dashboard: true,
      settlements: false,
      payment_profiles: false,
      invoices: false,
      crm: false,
      messages: false,
      support: false,
      quotes: false,
      maintenance: false,
      safety: true,
      brokers: false,
      clients: false
    }
  };

  const roleDefaults = defaults[businessRole];
  if (!roleDefaults) return false;

  // If role has true for all (admin/system_manager), allow everything
  if (roleDefaults === true) return true;

  // Otherwise check module permission
  return roleDefaults[module] === true;
}