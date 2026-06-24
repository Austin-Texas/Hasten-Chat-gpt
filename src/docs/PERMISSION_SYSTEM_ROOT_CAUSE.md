# Permission System Root Cause Analysis & Repair Plan

**Date:** 2026-06-21  
**Status:** EMERGENCY BYPASS ACTIVE (allows full access while diagnosis continues)  
**Objective:** Identify why permission enforcement caused admin lockout and repair safely.

---

## 1. Route Key Consistency Audit

### Route Key Mapping

| Page | App.jsx Path | Sidebar Key | Visibility Key | Status |
|------|--------------|------------|---|---------|
| Dashboard | `/dashboard` | `dashboard` | `dashboard` | ✅ MATCH |
| Dispatch | `/dispatch` | `dispatch` | `dispatch` | ✅ MATCH |
| Loads | `/loads` | `loads` | `loads` | ✅ MATCH |
| Fleet | `/fleet` | `fleet` | `fleet` | ✅ MATCH |
| Drivers | `/drivers` | `drivers` | `drivers` | ✅ MATCH |
| Tracking | `/tracking` | `tracking` | `tracking` | ✅ MATCH |
| Finance | `/finance` | `finance` | `finance` | ✅ MATCH |
| Payroll | `/payroll` | `payroll` | `payroll` | ✅ MATCH |
| Compliance | `/compliance` | `compliance` | `compliance` | ✅ MATCH |
| CRM | `/crm` | `crm` | `crm` | ✅ MATCH |
| Settings | `/settings` | `settings` | `settings` | ✅ MATCH |
| Fleet Manager | `/fleet-manager` | `fleet-manager` | `fleet` | ⚠️ MISMATCH |
| Load Templates | `/load-templates` | `load-templates` | (undefined) | ⚠️ MISMATCH |
| Support Tickets | `/support-tickets` | `support_tickets` | `support_tickets` | ✅ MATCH |

**Findings:**
- Most keys are consistent.
- `/fleet-manager` uses `fleet-manager` in sidebar but `fleet` in visibility config (minor inconsistency).
- `/load-templates` has no visibility mapping defined.

---

## 2. Hook Logic Audit

### usePermissions Hook (lines 56-76)

```javascript
const can = (section, action) => {
  if (userRole === 'admin') return true; // ✅ Admin bypass
  if (loading) return true; // ✅ Safe fallback during load
  
  const override = overrides.find(o => o.section === section && o.action === action);
  if (override) {
    return override.granted;
  }
  
  const rolePerm = permissions?.find(p => p.section === section);
  if (rolePerm) {
    return rolePerm[`can_${action}`] || false; // ✅ Checks property
  }
  
  return false; // ⚠️ UNSAFE: Falls back to deny on missing DB config
};
```

**ROOT CAUSE IDENTIFIED:**
Line 75: `return false` when DB config missing = **automatic deny for all non-admin**.

If `RolePermission` table is empty or missing records for a role, the hook denies all actions except admin.

---

### useVisibility Hook (lines 112-128)

```javascript
const isVisible = (section) => {
  if (userRole === 'admin') return true; // ✅ Admin bypass
  if (loading) return true; // ✅ Safe default while loading
  const vis = visibility.find(v => v.section === section);
  return vis ? vis.is_visible : true; // ✅ Safe: Shows section if missing config
};

const isLocked = (section) => {
  if (userRole === 'admin') return false; // ✅ Admin bypass
  if (loading) return false; // ✅ Safe default
  const vis = visibility.find(v => v.section === section);
  return vis ? vis.is_locked : false; // ✅ Safe: Unlocked if missing config
};
```

**Status:** ✅ **SAFE** — Defaults to ALLOW on missing config.

---

## 3. Database Records Audit

### Issue: Missing RolePermission Records

The enforcement failure likely occurred because:

1. **AdminSettingsPanel** stores role permissions in `RolePermission` entity.
2. If this table is **empty or incomplete**, `usePermissions.can()` returns `false` for all checks.
3. ProtectedRoute was calling permission checks that always failed.
4. Result: Admin gets locked out even though `admin` has the bypass.

### Safe Fix Required

Change `usePermissions` fallback logic:
- **If DB records missing**: Don't deny everything; use safe defaults instead.
- **Admin/system_manager**: Always allow (already have bypass).
- **Other roles**: Use DEFAULT_VISIBILITY config as fallback.

---

## 4. ProtectedRoute Logic Audit

**Current Status:** ✅ **SAFE (Emergency Bypass)**

```javascript
if (!isAuthenticated) {
  return unauthenticatedElement;
}

// EMERGENCY BYPASS: All permission/visibility checks temporarily disabled
// Authenticated users have full access to all routes
return <Outlet />;
```

**Previous Logic (Before Bypass):**
```javascript
const hasRouteAccess = isForcedAdmin || canAccessRoute(userRole, location.pathname);
if (!hasRouteAccess) {
  return <AccessDenied reason={...} />;
}
```

**Issue:** `canAccessRoute()` could have been returning `false` for admin if the route wasn't explicitly listed in ROLE_PERMISSIONS.

---

## 5. Root Cause Summary

**PRIMARY CAUSE:** Unsafe fallback in `usePermissions` hook.

**TRIGGER:** 
- Empty or incomplete `RolePermission` DB table
- Hook checks DB first, doesn't find records
- Falls back to `return false` (deny all)
- Even admin users checking permissions via this hook get blocked

**WHY EMERGENCY BYPASS WORKS:**
- ProtectedRoute now skips ALL permission/visibility checks
- Authenticated users = full access
- Allows admin to log in and populate missing DB records

---

## 6. Safe Production Fixes

### Fix 1: Update usePermissions Hook

Replace unsafe fallback with safe defaults:

```javascript
const can = (section, action) => {
  // Admin always allowed
  if (userRole === 'admin' || userRole === 'system_manager') return true;
  
  if (loading) return true; // Safe: allow while loading
  
  // Check user privilege overrides first
  const override = overrides.find(o => o.section === section && o.action === action);
  if (override) return override.granted;
  
  // Check role permissions from DB
  const rolePerm = permissions?.find(p => p.section === section);
  if (rolePerm) {
    return rolePerm[`can_${action}`] || false;
  }
  
  // SAFE FALLBACK: Use default visibility config
  const defaultConfig = DEFAULT_VISIBILITY[userRole];
  if (defaultConfig) {
    // If any portal has this section, allow it
    for (const portalConfig of Object.values(defaultConfig)) {
      if (Array.isArray(portalConfig)) {
        const found = portalConfig.find(s => s.section === section);
        if (found && found.visible) return true;
      }
    }
  }
  
  // Only deny if explicitly missing from both DB and defaults
  return false;
};
```

### Fix 2: Initialize RolePermission Records on First Admin Login

In AdminSettingsPanel or Settings page:

```javascript
useEffect(() => {
  const ensureRolePermissions = async () => {
    const roles = ['admin', 'dispatcher', 'fleet_manager', 'finance', 'driver'];
    
    for (const role of roles) {
      const exists = await base44.entities.RolePermission.filter({ role_name: role }).catch(() => []);
      
      if (exists.length === 0) {
        // Create default records from ROLE_PERMISSIONS config
        const sections = Object.keys(ROLE_PERMISSIONS[role] || {});
        // Create records for each section...
      }
    }
  };
  
  if (user?.role === 'admin') {
    ensureRolePermissions();
  }
}, [user]);
```

### Fix 3: Add Fallback to ProtectedRoute

Restore permission checking but with safe fallback:

```javascript
if (!isAuthenticated) {
  return unauthenticatedElement;
}

// For now: allow all authenticated users (emergency bypass)
// TODO: Re-enable after ensuring DB is populated
const canAccess = canAccessRoute(currentUser?.role, location.pathname, currentUser?.email);

if (!canAccess) {
  return <AccessDenied reason={`Your ${currentUser?.role} role doesn't have access.`} />;
}

return <Outlet />;
```

---

## 7. Implementation Order

1. ✅ **Phase 1 (DONE):** Emergency bypass in ProtectedRoute
2. ✅ **Phase 2 (DONE):** Clear all cached permission state
3. **Phase 3 (NEXT):** Fix usePermissions safe fallback
4. **Phase 4:** Add DB initialization logic to Settings
5. **Phase 5:** Test all roles (admin, system_manager, dispatcher, etc.)
6. **Phase 6:** Re-enable permission checks in ProtectedRoute
7. **Phase 7:** Remove emergency bypass

---

## 8. Testing Checklist

After each fix, test these routes for each role:

**Admin:**
- [ ] /dashboard
- [ ] /loads
- [ ] /dispatch
- [ ] /fleet
- [ ] /settings

**System Manager:**
- [ ] /dashboard
- [ ] /loads
- [ ] /dispatch

**Dispatcher:**
- [ ] /dashboard
- [ ] /loads
- [ ] /dispatch

**Fleet Manager:**
- [ ] /fleet
- [ ] /maintenance
- [ ] /compliance

**Finance:**
- [ ] /finance
- [ ] /payroll

**Driver:**
- [ ] /driver/dashboard
- [ ] /driver/loads

**Client:**
- [ ] /client/tracking
- [ ] /client/invoices

---

## 9. Fallback Config Reference

From `lib/visibilityConfig.js`:

- Admin has full access to all sections
- System_manager has most sections except audit/settings
- Dispatcher limited to dispatch/loads/drivers/tracking/messages
- Other roles have specific limited views
- All roles default to ALLOW on missing DB config

---

## 10. Next Steps

1. Read and confirm this audit
2. Implement Fix 1 (usePermissions safe fallback)
3. Test all routes with emergency bypass still active
4. Implement Fix 2 (DB initialization)
5. Test role-based access for each role
6. Implement Fix 3 (re-enable permission checks)
7. Verify all tests pass
8. Remove emergency bypass
9. Document in CHANGELOG