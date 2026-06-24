import { ENTITY_ACCESS, FIELD_REDACTION } from '@/lib/rolePermissions';

/**
 * Guard for backend function invocation
 * Checks user role against entity access rules before allowing the call
 * Logs denied access to AuditLog
 */
export async function enforceEntityAccess(base44, userRole, userId, entityType, action) {
  const access = ENTITY_ACCESS[entityType]?.[userRole];
  if (!access) {
    // Log failed access attempt
    await base44.asServiceRole.entities.AuditLog.create({
      action: "backend_function_denied",
      user_id: userId,
      user_role: userRole,
      result: "denied",
      entity_type: entityType,
      action_details: `${userRole} attempted ${action} on ${entityType}`,
      timestamp: new Date().toISOString()
    }).catch(() => {});
    
    throw new Error(`Access denied: ${userRole} cannot access ${entityType}`);
  }

  const permission = access[action];
  if (!permission) {
    await base44.asServiceRole.entities.AuditLog.create({
      action: "backend_function_denied",
      user_id: userId,
      user_role: userRole,
      result: "denied",
      entity_type: entityType,
      action_details: `${userRole} attempted restricted action: ${action} on ${entityType}`,
      timestamp: new Date().toISOString()
    }).catch(() => {});
    
    throw new Error(`Access denied: ${action} not allowed on ${entityType} for ${userRole}`);
  }

  return true;
}

/**
 * Guard for sensitive backend operations
 * Used for payroll, tax, compliance, user management, invoice status changes
 */
export async function enforceSensitiveOperation(base44, userRole, userId, operation) {
  const SENSITIVE_OPERATIONS = {
    // Payroll operations
    'payroll_calculate': ['admin', 'finance', 'system_manager'],
    'payroll_approve': ['admin', 'finance', 'system_manager'],
    'payroll_export': ['admin', 'finance', 'system_manager'],
    
    // Tax operations
    'tax_override': ['admin', 'system_manager'],
    'tax_export': ['admin', 'finance', 'system_manager'],
    
    // Compliance operations
    'compliance_override': ['admin', 'system_manager'],
    'compliance_enforce': ['admin', 'fleet_manager', 'system_manager'],
    
    // User management
    'user_role_change': ['admin', 'system_manager'],
    'user_disable': ['admin', 'system_manager'],
    'user_reset_password': ['admin', 'system_manager'],
    
    // Invoice status
    'invoice_status_change': ['admin', 'finance', 'system_manager'],
    'invoice_payment_update': ['admin', 'finance', 'system_manager'],
    
    // Settings/security
    'settings_change': ['admin', 'system_manager'],
    'theme_change': ['admin', 'system_manager'],
    'visibility_change': ['admin', 'system_manager'],
    'permission_change': ['admin', 'system_manager']
  };

  const allowedRoles = SENSITIVE_OPERATIONS[operation];
  if (!allowedRoles) {
    throw new Error(`Unknown operation: ${operation}`);
  }

  if (!allowedRoles.includes(userRole)) {
    // Log denied access
    await base44.asServiceRole.entities.AuditLog.create({
      action: "backend_function_denied",
      user_id: userId,
      user_role: userRole,
      result: "denied",
      action_details: `${userRole} attempted restricted operation: ${operation}`,
      timestamp: new Date().toISOString()
    }).catch(() => {});
    
    throw new Error(`Access denied: ${userRole} cannot perform ${operation}`);
  }

  return true;
}

/**
 * Redact sensitive fields from response based on user role
 */
export function redactResponseData(entityType, data, userRole) {
  if (!Array.isArray(data)) {
    return redactRecord(entityType, data, userRole);
  }
  return data.map(record => redactRecord(entityType, record, userRole));
}

function redactRecord(entityType, record, userRole) {
  const redactionList = FIELD_REDACTION[userRole]?.[entityType] || [];
  if (!redactionList || redactionList.length === 0) {
    return record;
  }

  const redacted = { ...record };
  redactionList.forEach(field => {
    if (field in redacted) {
      redacted[field] = '***REDACTED***';
    }
  });
  return redacted;
}

/**
 * Log sensitive data access
 */
export async function logSensitiveAccess(base44, userId, userRole, entityType, fieldsAccessed = []) {
  if (fieldsAccessed.length === 0) return;

  await base44.asServiceRole.entities.AuditLog.create({
    action: "sensitive_data_accessed",
    user_id: userId,
    user_role: userRole,
    result: "success",
    entity_type: entityType,
    action_details: `${userRole} accessed sensitive fields on ${entityType}`,
    sensitive_fields_accessed: fieldsAccessed,
    timestamp: new Date().toISOString()
  }).catch(() => {});
}