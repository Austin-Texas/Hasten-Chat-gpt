/**
 * Default visibility configuration for roles/portals
 * Defines what each role can see in the UI
 * Can be overridden by admin in AdminSettingsPanel
 */

export const DEFAULT_VISIBILITY = {
  admin: {
    admin_sidebar: [
      { section: 'dashboard', visible: true, order: 0, label: 'Dashboard' },
      { section: 'dispatch', visible: true, order: 1, label: 'Dispatch Board' },
      { section: 'loads', visible: true, order: 2, label: 'Loads' },
      { section: 'drivers', visible: true, order: 3, label: 'Drivers' },
      { section: 'fleet', visible: true, order: 4, label: 'Fleet' },
      { section: 'tracking', visible: true, order: 5, label: 'Tracking' },
      { section: 'finance', visible: true, order: 6, label: 'Finance' },
      { section: 'payroll', visible: true, order: 7, label: 'Payroll' },
      { section: 'compliance', visible: true, order: 8, label: 'Compliance' },
      { section: 'crm', visible: true, order: 9, label: 'CRM' },
      { section: 'messages', visible: true, order: 10, label: 'Messages' },
      { section: 'support_tickets', visible: true, order: 11, label: 'Support' },
      { section: 'notifications', visible: true, order: 12, label: 'Notifications' },
      { section: 'settings', visible: true, order: 13, label: 'Settings' }
    ],
    dashboard_cards: [
      { card: 'active_loads', visible: true },
      { card: 'completed_today', visible: true },
      { card: 'revenue_mtd', visible: true },
      { card: 'active_drivers', visible: true },
      { card: 'available_drivers', visible: true },
      { card: 'active_trucks', visible: true },
      { card: 'unpaid_invoices', visible: true },
      { card: 'overdue_invoices', visible: true },
      { card: 'blockers_alerts', visible: true }
    ],
    data_visibility: {
      drivers: { ssn: false, pay_rate: true, license: true, medical: true },
      loads: { all_fields: true },
      invoices: { all_fields: true },
      payroll: { all_fields: true },
      expenses: { all_fields: true }
    }
  },

  system_manager: {
    admin_sidebar: [
      { section: 'dispatch', visible: true, order: 0, label: 'Dispatch Board' },
      { section: 'loads', visible: true, order: 1, label: 'Loads' },
      { section: 'drivers', visible: true, order: 2, label: 'Drivers' },
      { section: 'fleet', visible: true, order: 3, label: 'Fleet' },
      { section: 'tracking', visible: true, order: 4, label: 'Tracking' },
      { section: 'finance', visible: true, order: 5, label: 'Finance' },
      { section: 'payroll', visible: true, order: 6, label: 'Payroll' },
      { section: 'compliance', visible: true, order: 7, label: 'Compliance' },
      { section: 'crm', visible: true, order: 8, label: 'CRM' },
      { section: 'messages', visible: true, order: 9, label: 'Messages' },
      { section: 'support_tickets', visible: true, order: 10, label: 'Support' },
      { section: 'notifications', visible: true, order: 11, label: 'Notifications' }
    ],
    dashboard_cards: [
      { card: 'active_loads', visible: true },
      { card: 'completed_today', visible: true },
      { card: 'revenue_mtd', visible: true },
      { card: 'active_drivers', visible: true },
      { card: 'available_drivers', visible: true },
      { card: 'active_trucks', visible: true },
      { card: 'unpaid_invoices', visible: true },
      { card: 'overdue_invoices', visible: true }
    ],
    data_visibility: {
      drivers: { ssn: false, pay_rate: true, license: true, medical: true },
      loads: { all_fields: true },
      invoices: { all_fields: true },
      payroll: { all_fields: true },
      expenses: { all_fields: true }
    }
  },

  dispatcher: {
    dispatcher_sidebar: [
      { section: 'dashboard', visible: true, order: 0, label: 'Dashboard' },
      { section: 'dispatch', visible: true, order: 1, label: 'Dispatch Board' },
      { section: 'loads', visible: true, order: 2, label: 'Loads' },
      { section: 'drivers', visible: true, order: 3, label: 'Drivers' },
      { section: 'tracking', visible: true, order: 4, label: 'Live Tracking' },
      { section: 'messages', visible: true, order: 5, label: 'Messages' },
      { section: 'support_tickets', visible: true, order: 6, label: 'Support' },
      { section: 'notifications', visible: true, order: 7, label: 'Notifications' }
    ],
    dashboard_cards: [
      { card: 'active_loads', visible: true },
      { card: 'completed_today', visible: true },
      { card: 'active_drivers', visible: true },
      { card: 'available_drivers', visible: true }
    ],
    data_visibility: {
      drivers: { ssn: false, pay_rate: false, license: false, medical: false, status: true, location: true, current_load: true },
      loads: { rate: false, revenue: false, client_contact: true, pickup: true, delivery: true, status: true, driver: true },
      invoices: { visible: false },
      payroll: { visible: false },
      expenses: { visible: false }
    }
  },

  fleet_manager: {
    fleet_sidebar: [
      { section: 'fleet', visible: true, order: 0, label: 'Fleet' },
      { section: 'maintenance', visible: true, order: 1, label: 'Maintenance' },
      { section: 'compliance', visible: true, order: 2, label: 'Compliance' },
      { section: 'tracking', visible: true, order: 3, label: 'GPS Tracking' },
      { section: 'drivers', visible: true, order: 4, label: 'Drivers' },
      { section: 'safety', visible: true, order: 5, label: 'Safety' },
      { section: 'documents', visible: true, order: 6, label: 'Documents' },
      { section: 'notifications', visible: true, order: 7, label: 'Notifications' }
    ],
    dashboard_cards: [
      { card: 'active_trucks', visible: true },
      { card: 'idle_trucks', visible: true },
      { card: 'maintenance_needed', visible: true },
      { card: 'compliance_alerts', visible: true }
    ],
    data_visibility: {
      drivers: { compliance: true, license: true, medical: true, ssn: false, pay_rate: false },
      trucks: { all_fields: true },
      loads: { assigned_truck: true, status: true, but_not: ['rate', 'revenue', 'client_contact'] },
      maintenance: { all_fields: true },
      compliance: { all_fields: true }
    }
  },

  finance: {
    finance_sidebar: [
      { section: 'finance', visible: true, order: 0, label: 'Finance' },
      { section: 'payroll', visible: true, order: 1, label: 'Payroll' },
      { section: 'invoices', visible: true, order: 2, label: 'Invoices' },
      { section: 'expenses', visible: true, order: 3, label: 'Expenses' },
      { section: 'crm', visible: true, order: 4, label: 'Clients' },
      { section: 'documents', visible: true, order: 5, label: 'Documents' },
      { section: 'notifications', visible: true, order: 6, label: 'Notifications' }
    ],
    dashboard_cards: [
      { card: 'revenue_mtd', visible: true },
      { card: 'unpaid_invoices', visible: true },
      { card: 'overdue_invoices', visible: true },
      { card: 'total_expenses', visible: true }
    ],
    data_visibility: {
      drivers: { pay_rate: true, pay_type: true, tax_info: true, ssn_last4: true, but_not: ['license', 'medical'] },
      loads: { rate: true, revenue: true, expenses: true, profit: true, but_not: ['driver_personal', 'vehicle_details'] },
      invoices: { all_fields: true },
      payroll: { all_fields: true },
      expenses: { all_fields: true },
      clients: { credit_limit: true, balance: true, payment_terms: true }
    }
  },

  driver: {
    driver_mobile_tabs: [
      { section: 'driver_dashboard', visible: true, order: 0, label: 'Dashboard' },
      { section: 'driver_loads', visible: true, order: 1, label: 'My Loads' },
      { section: 'driver_map', visible: true, order: 2, label: 'Map' },
      { section: 'driver_documents', visible: true, order: 3, label: 'Documents' },
      { section: 'driver_messages', visible: true, order: 4, label: 'Messages' },
      { section: 'driver_earnings', visible: true, order: 5, label: 'Earnings' },
      { section: 'driver_profile', visible: true, order: 6, label: 'Profile' },
      { section: 'driver_support', visible: true, order: 7, label: 'Support' }
    ],
    driver_profile_menu: [
      { section: 'profile_edit', visible: true, order: 0, label: 'Edit Profile' },
      { section: 'profile_documents', visible: true, order: 1, label: 'My Documents' },
      { section: 'profile_about_me', visible: true, order: 2, label: 'About Me' },
      { section: 'profile_about_vehicle', visible: true, order: 3, label: 'About Vehicle' },
      { section: 'profile_companies', visible: true, order: 4, label: 'Companies' },
      { section: 'profile_feedback', visible: true, order: 5, label: 'Feedback' },
      { section: 'profile_support', visible: true, order: 6, label: 'Support' },
      { section: 'profile_settings', visible: true, order: 7, label: 'Settings' }
    ],
    data_visibility: {
      loads: { only_assigned: true, fields: ['status', 'pickup', 'delivery', 'commodity', 'instructions', 'pod_status'] },
      earnings: { own_only: true, fields: ['gross', 'deductions', 'net', 'payment_method'] },
      payroll: { own_only: true, fields: ['pay_period', 'gross', 'deductions', 'net'] },
      other_drivers: { visible: false },
      financial_details: { visible: false }
    }
  },

  client: {
    client_portal_tabs: [
      { section: 'client_tracking', visible: true, order: 0, label: 'Track Shipments' },
      { section: 'client_invoices', visible: true, order: 1, label: 'Invoices' },
      { section: 'client_documents', visible: true, order: 2, label: 'Documents' },
      { section: 'client_messages', visible: true, order: 3, label: 'Messages' }
    ],
    data_visibility: {
      loads: { own_loads_only: true, fields: ['status', 'pickup', 'delivery', 'commodity', 'eta', 'pod'] },
      invoices: { own_invoices_only: true, fields: ['amount', 'status', 'due_date', 'items'] },
      drivers: { visible: false },
      pricing: { visible: false }
    }
  },

  broker: {
    client_portal_tabs: [
      { section: 'client_tracking', visible: true, order: 0, label: 'Track Loads' },
      { section: 'client_invoices', visible: true, order: 1, label: 'Invoices' },
      { section: 'quotes', visible: true, order: 2, label: 'Quotes' },
      { section: 'client_messages', visible: true, order: 3, label: 'Messages' }
    ],
    data_visibility: {
      loads: { assigned_loads_only: true, fields: ['status', 'pickup', 'delivery', 'equipment', 'weight', 'rate_agreed'] },
      invoices: { own_invoices_only: true, fields: ['amount', 'status', 'due_date', 'payment_terms'] },
      quotes: { own_quotes_only: true, all_fields: true },
      drivers: { visible: false },
      internal_pricing: { visible: false }
    }
  }
};

/**
 * Get visibility config for a role/portal
 * Falls back to default if not in PortalVisibility DB
 */
export function getVisibilityForRole(role, portalType) {
  const config = DEFAULT_VISIBILITY[role];
  if (!config) return [];
  return config[portalType] || [];
}