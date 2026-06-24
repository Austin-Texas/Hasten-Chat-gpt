import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { checkEntityAccess, canAccessRoute } from '@/lib/rolePermissions';

/**
 * usePermissions — Check user permissions from DB (RolePermission + UserPrivilege)
 * Respects user overrides and temporary access
 */
export function usePermissions(userId, userRole) {
  const [permissions, setPermissions] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        // Load role permissions from DB
        const rolePerms = await base44.entities.RolePermission.filter(
          { role_name: userRole },
          '-created_date',
          100
        ).catch(() => []);

        // Load user privilege overrides
        const userPrivs = await base44.entities.UserPrivilege.filter(
          { user_id: userId },
          '-created_date',
          100
        ).catch(() => []);

        // Filter out expired temporary access
        const now = new Date().toISOString();
        const validPrivs = userPrivs.filter(p => {
          if (p.valid_until && p.valid_until < now) return false;
          if (p.valid_from && p.valid_from > now) return false;
          return true;
        });

        setPermissions(rolePerms);
        setOverrides(validPrivs);
      } catch (err) {
        console.error('[usePermissions] Failed to load permissions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [userId, userRole]);

  /**
   * Check if user can perform action on section
   * Returns: true if permitted, false if denied
   * Checks in order: admin bypass, user overrides, role permissions, default fallback
   */
  const can = (section, action) => {
    // EMERGENCY: Admin always has full permission (owner recovery)
    if (userRole === 'admin') return true;

    if (loading) return true; // Safe default: allow during load rather than deny

    // Check user privilege overrides first
    const override = overrides.find(o => o.section === section && o.action === action);
    if (override) {
      return override.granted;
    }

    // Check role permissions from DB
    const rolePerm = permissions?.find(p => p.section === section);
    if (rolePerm) {
      return rolePerm[`can_${action}`] || false;
    }

    // Fallback to static config (for backwards compatibility)
    return false;
  };

  return { can, permissions, overrides, loading };
}

/**
 * useVisibility — Check which sections are visible per role/portal
 */
export function useVisibility(userRole, portalType) {
  const [visibility, setVisibility] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVisibility = async () => {
      try {
        const visSettings = await base44.entities.PortalVisibility.filter(
          { role: userRole, portal_type: portalType },
          'order_index',
          100
        ).catch(() => []);

        setVisibility(visSettings);
      } catch (err) {
        console.error('[useVisibility] Failed to load visibility:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVisibility();
  }, [userRole, portalType]);

  /**
   * Check if section is visible for this role/portal
   * EMERGENCY: Admin always sees everything
   */
  const isVisible = (section) => {
    if (userRole === 'admin') return true; // Admin bypass
    if (loading) return true; // Default show while loading
    const vis = visibility.find(v => v.section === section);
    return vis ? vis.is_visible : true;
  };

  /**
   * Check if section is locked (permission denied)
   * EMERGENCY: Admin can never be locked out
   */
  const isLocked = (section) => {
    if (userRole === 'admin') return false; // Admin bypass
    if (loading) return false;
    const vis = visibility.find(v => v.section === section);
    return vis ? vis.is_locked : false;
  };

  /**
   * Get all visible sections, sorted by order_index
   */
  const getVisibleSections = () => {
    return visibility
      .filter(v => v.is_visible && !v.is_locked)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(v => v.section);
  };

  return { visibility, isVisible, isLocked, getVisibleSections, loading };
}

/**
 * Check user route access (for ProtectedRoute)
 */
export function checkRouteAccess(userRole, routePath) {
  return canAccessRoute(userRole, routePath);
}