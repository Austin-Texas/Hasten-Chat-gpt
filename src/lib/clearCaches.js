/**
 * Emergency cache clearing for permission/visibility system
 * Clears all cached states that might block access
 */

export const clearAllCaches = () => {
  try {
    // Clear localStorage
    const keysToDelete = [
      'permissions',
      'visibility',
      'rolePermissions',
      'portalVisibility',
      'userPrivilege',
      'userRole',
      'accessControl'
    ];
    
    keysToDelete.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear all localStorage keys that contain 'permission', 'visibility', 'access'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.toLowerCase().includes('permission') ||
        key.toLowerCase().includes('visibility') ||
        key.toLowerCase().includes('access') ||
        key.toLowerCase().includes('role')
      )) {
        localStorage.removeItem(key);
      }
    }
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.toLowerCase().includes('permission') ||
        key.toLowerCase().includes('visibility') ||
        key.toLowerCase().includes('access') ||
        key.toLowerCase().includes('role')
      )) {
        sessionStorage.removeItem(key);
      }
    }
    
    console.log('[EMERGENCY] All permission/visibility caches cleared');
  } catch (err) {
    console.error('[EMERGENCY] Failed to clear caches:', err);
  }
};