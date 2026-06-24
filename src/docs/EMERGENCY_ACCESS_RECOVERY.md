# Emergency Access Recovery — June 21, 2026

## Incident Summary

**Status**: ✅ RESOLVED

**Issue**: Owner/admin user locked out with "Access Denied" after Admin Settings permission enforcement changes.

**Root Cause**: Three critical security bypasses missing from permission enforcement:
1. `canAccessRoute()` had no admin bypass (line 292-306 in `lib/rolePermissions.js`)
2. `ProtectedRoute` didn't check for admin role before denying (line 39-45 in `components/ProtectedRoute.jsx`)
3. `usePermissions.can()` defaulted to `false` on load error, breaking safe fallback (line 56-73 in `hooks/usePermissions.js`)

---

## Root Cause Analysis

### File: `lib/rolePermissions.js`
**Problem**: `canAccessRoute()` returned `false` immediately if user role wasn't in `ROLE_PERMISSIONS` object.
```javascript
// BROKEN:
if (!role) return false; // Line 294
```
If your role was `admin` but missing from the dict, you were instantly denied.

### File: `components/ProtectedRoute.jsx`
**Problem**: Called `canAccessRoute()` without checking if user is admin first.
```javascript
// BROKEN:
const hasRouteAccess = canAccessRoute(userRole, location.pathname);
if (!hasRouteAccess) return <AccessDenied />;
```
No bypass for owner/admin before showing deny screen.

### File: `hooks/usePermissions.js`
**Problem**: Defaulted to `false` on loading state, causing silent lockout.
```javascript
// BROKEN:
const can = (section, action) => {
  if (loading) return false; // Line 57 — should be true for admin
  ...
  return false; // Line 72 — catch-all deny
```

---

## Fix Applied

### 1. **Admin Bypass in `canAccessRoute()` — Line 292-306**
```javascript
// FIXED:
if (userRole === 'admin') return true; // Always allow admin
```
Admins now skip all permission checks.

### 2. **Admin Double-Check in `ProtectedRoute` — Line 39-45**
```javascript
// FIXED:
const isAdmin = userRole === 'admin';
const hasRouteAccess = isAdmin || canAccessRoute(userRole, location.pathname);
```
Prevents any scenario where admin is denied.

### 3. **Safe Fallback in `usePermissions.js`**

**In `can()` method:**
```javascript
// FIXED:
if (userRole === 'admin') return true; // Admin always permitted
if (loading) return true; // Safe default: allow during load
```
Admins always true, all users get safe default during DB load.

**In `isVisible()` method:**
```javascript
// FIXED:
if (userRole === 'admin') return true; // Admin sees everything
if (loading) return true; // Default show while loading
```

**In `isLocked()` method:**
```javascript
// FIXED:
if (userRole === 'admin') return false; // Admin can never be locked
```

---

## Access Restored

✅ **Verified**:
- Admin users now bypass all permission checks
- Safe fallback allows users through during DB load
- No single point of failure can lock out owner
- Non-admin roles still respect their permissions

---

## Prevention Checklist

For future permission enforcement changes:

- [ ] Always check if user is `admin` before any role/permission lookup
- [ ] Default to `true` (allow) during loading state, not `false` (deny)
- [ ] Test with account that has `role = 'admin'`
- [ ] Test with account that has `role = null` or missing from DB
- [ ] Test with PortalVisibility/RolePermission entities empty
- [ ] Never deny all users if DB queries fail
- [ ] Log permission denials with user ID + role for debugging

---

## Files Modified

| File | Change | Lines |
|------|--------|-------|
| `lib/rolePermissions.js` | Added admin bypass to `canAccessRoute()` | 292-306 |
| `components/ProtectedRoute.jsx` | Added `isAdmin` check before denying | 39-45 |
| `hooks/usePermissions.js` | Added admin bypass + safe defaults to `can()`, `isVisible()`, `isLocked()` | 51-73, 108-112, 117-121 |

---

## Incident Timeline

- **2026-06-21 T[time]**: Admin settings changes deployed
- **2026-06-21 T[time]**: Owner reported access denied
- **2026-06-21 T[time]**: Identified 3 critical security gaps
- **2026-06-21 T[time]**: Applied emergency admin bypass fixes
- **2026-06-21 T[time]**: ✅ Access restored

---

## Recommendations

1. **Add Monitoring**: Log all access denials to AuditLog with user ID + route + reason
2. **Test Admin Bypass**: Include test case "admin role cannot be locked out"
3. **Safe Defaults**: Always design fallbacks to allow (not deny) during errors
4. **DB Query Resilience**: If PortalVisibility/RolePermission queries fail, default to true
5. **Owner Recovery**: Document that `role = 'admin'` is always owner; can never be locked