/**
 * Role-Based Access Control (RBAC) Configuration
 * HASTEN MVP Roles: super_admin, admin, dispatcher, driver, customer
 */

export const ROLES = {
  super_admin: 'super_admin',
  admin: 'admin',
  dispatcher: 'dispatcher',
  driver: 'driver',
  customer: 'customer'
};

export const ROLE_PERMISSIONS = {
  super_admin: {
    dashboard: true, dispatch: true, loads: true, drivers: true, fleet: true,
    tracking: true, finance: true, payroll: true, compliance: true, crm: true,
    quotes: true, safety: true, maintenance: true, documents: true, messages: true,
    support_tickets: true, expense_approvals: true, help: true, notifications: true,
    security_dashboard: true, audit_logs: true, user_management: true,
    settings: true, api_integrations: true, testing_dashboard: true,
    feature_toggles: true, system_diagnostics: true, cleanup_tools: true
  },

  admin: {
    dashboard: true, dispatch: true, loads: true, drivers: true, fleet: true,
    tracking: true, finance: true, payroll: true, compliance: true, crm: true,
    quotes: true, safety: true, maintenance: true, documents: true, messages: true,
    support_tickets: true, expense_approvals: true, help: true, notifications: true,
    security_dashboard: true, audit_logs: true, user_management: true,
    settings: true, api_integrations: false, testing_dashboard: false,
    feature_toggles: false, system_diagnostics: false, cleanup_tools: false
  },

  dispatcher: {
    dashboard: true, dispatch: true, loads: true, drivers: true, fleet: true,
    tracking: true, documents: true, messages: true, support_tickets: true,
    notifications: true, compliance: true, finance: false, payroll: false,
    safety: false, maintenance: false, crm: false, quotes: false,
    user_management: false, security_dashboard: false
  },

  driver: {
    'driver/dashboard': true, 'driver/loads': true, 'driver/map': true,
    'driver/documents': true, 'driver/messages': true, 'driver/earnings': true,
    'driver/profile': true, 'driver/settings': true, 'driver/support': true,
    'driver/feedback': true, 'driver/settlement-preview': true, 'driver/hos': true,
    dashboard: false, dispatch: false, drivers: false, fleet: false,
    finance: false, payroll: false, compliance: false, user_management: false,
    security_dashboard: false, admin: false, settings: false
  },

  customer: {
    'client': true, 'client/shipments': true, 'client/tracking': true,
    'client/documents': true, 'client/invoices': true,
    dashboard: false, dispatch: false, finance: false, user_management: false
  }
};

/**
 * Sensitive fields redacted by role
 */
export const FIELD_REDACTION = {
  super_admin: {
    Driver: [], TaxProfile: [], PayrollRecord: [], SettlementRecord: [], Invoice: []
  },

  admin: {
    Driver: [], TaxProfile: [], PayrollRecord: [], SettlementRecord: [], Invoice: []
  },

  dispatcher: {
    Driver: ['ein_ssn', 'license_front_url', 'license_back_url'],
    TaxProfile: ['ssn_last_four', 'ein', 'filing_status', 'withholding_allowances', 'extra_withholding'],
    PayrollRecord: ['federal_withholding', 'fica_social_security', 'fica_medicare', 'state_withholding', 'local_withholding', 'health_insurance'],
    SettlementRecord: ['gross_settlement', 'escrow_holdback'],
    Invoice: []
  },

  driver: {
    Driver: ['license_front_url', 'license_back_url', 'medical_card_url', 'insurance_doc_url'],
    TaxProfile: ['ssn_last_four', 'ein', 'withholding_allowances'],
    PayrollRecord: ['federal_withholding', 'fica_social_security', 'fica_medicare', 'state_withholding'],
    SettlementRecord: ['escrow_holdback'],
    Invoice: []
  },

  customer: {
    Driver: ['ein_ssn', 'license_front_url', 'license_back_url', 'medical_card_url', 'email', 'phone'],
    TaxProfile: ['ssn_last_four', 'ein', 'filing_status', 'withholding_allowances'],
    PayrollRecord: ['ssn_last_four', 'federal_withholding', 'fica_social_security', 'fica_medicare'],
    SettlementRecord: ['driver_id'],
    Invoice: []
  }
};

/**
 * Entity access rules
 */
export const ENTITY_ACCESS = {
  Driver: {
    super_admin: { create: true, read: true, update: true, delete: true },
    admin: { create: true, read: true, update: true, delete: true },
    dispatcher: { create: true, read: true, update: true, delete: false },
    driver: { create: false, read: 'own', update: 'own', delete: false },
    customer: { create: false, read: false, update: false, delete: false }
  },

  PayrollRecord: {
    super_admin: { create: true, read: true, update: true, delete: true },
    admin: { create: true, read: true, update: true, delete: true },
    dispatcher: { create: false, read: false, update: false, delete: false },
    driver: { create: false, read: 'own', update: false, delete: false },
    customer: { create: false, read: false, update: false, delete: false }
  },

  SettlementRecord: {
    super_admin: { create: true, read: true, update: true, delete: true },
    admin: { create: true, read: true, update: true, delete: true },
    dispatcher: { create: false, read: false, update: false, delete: false },
    driver: { create: false, read: 'own', update: false, delete: false },
    customer: { create: false, read: false, update: false, delete: false }
  },

  Load: {
    super_admin: { create: true, read: true, update: true, delete: true },
    admin: { create: true, read: true, update: true, delete: true },
    dispatcher: { create: true, read: true, update: true, delete: false },
    driver: { create: false, read: 'assigned', update: false, delete: false },
    customer: { create: false, read: 'own_loads', update: false, delete: false }
  },

  Invoice: {
    super_admin: { create: true, read: true, update: true, delete: true },
    admin: { create: true, read: true, update: true, delete: true },
    dispatcher: { create: false, read: false, update: false, delete: false },
    driver: { create: false, read: false, update: false, delete: false },
    customer: { create: false, read: 'own_invoices', update: false, delete: false }
  },

  Client: {
    super_admin: { create: true, read: true, update: true, delete: true },
    admin: { create: true, read: true, update: true, delete: true },
    dispatcher: { create: false, read: true, update: false, delete: false },
    driver: { create: false, read: false, update: false, delete: false },
    customer: { create: false, read: 'own', update: 'own', delete: false }
  },

  Message: {
    super_admin: { create: true, read: true, update: true, delete: false },
    admin: { create: true, read: true, update: true, delete: false },
    dispatcher: { create: true, read: true, update: true, delete: false },
    driver: { create: true, read: true, update: true, delete: false },
    customer: { create: true, read: 'own_conversations', update: true, delete: false }
  }
};

/**
 * Check if user has permission for a route based on businessRole
 */
export const canAccessRoute = (businessRole, routePath, userEmail = '') => {
  if (!businessRole) return false;

  // super_admin and admin have full access
  if (['super_admin', 'admin'].includes(businessRole)) return true;

  // Dispatcher routes
  if (businessRole === 'dispatcher') {
    const dispatcherRoutes = ['dispatch', 'loads', 'drivers', 'fleet', 'tracking', 'documents', 'messages', 'compliance', 'timeline', 'notifications', 'dashboard', 'driver-scorecards', 'contractors', 'help', 'support-tickets', 'feedback'];
    return dispatcherRoutes.some(r => routePath?.includes(r));
  }

  // Driver routes
  if (businessRole === 'driver') {
    const driverRoutes = ['driver/dashboard', 'driver/loads', 'driver/map', 'driver/documents', 'driver/messages', 'driver/earnings', 'driver/profile', 'driver/settings', 'driver/support', 'driver/feedback', 'driver/settlement-preview', 'driver/hos', 'driver/payroll'];
    return driverRoutes.some(r => routePath?.includes(r));
  }

  // Customer routes
  if (businessRole === 'customer') {
    return routePath?.includes('client') || routePath?.includes('messages') || routePath?.includes('support-tickets') || routePath?.includes('help') || routePath?.includes('notifications');
  }

  return false;
};

/**
 * Filter sensitive fields from entity data
 */
export const redactSensitiveFields = (entityType, data, userRole) => {
  const redactionList = FIELD_REDACTION[userRole]?.[entityType] || [];
  if (!redactionList || redactionList.length === 0) {
    return data;
  }

  const redacted = { ...data };
  redactionList.forEach(field => {
    if (field in redacted) {
      redacted[field] = '***REDACTED***';
    }
  });
  return redacted;
};

/**
 * Check entity-level access
 */
export const checkEntityAccess = (userRole, entityType, action, entityOwnerId, currentUserId) => {
  const access = ENTITY_ACCESS[entityType]?.[userRole];
  if (!access) return false;

  const permission = access[action];
  if (!permission) return false;
  if (permission === true) return true;
  if (permission === 'own') return entityOwnerId === currentUserId;
  if (permission === 'assigned') return entityOwnerId === currentUserId;
  if (permission === 'own_loads') return entityOwnerId === currentUserId;
  if (permission === 'own_invoices') return entityOwnerId === currentUserId;
  if (permission === 'own_conversations') return entityOwnerId === currentUserId;

  return false;
};