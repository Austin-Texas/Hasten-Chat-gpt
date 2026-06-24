import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/lib/AuthContext';

export default function ThemeProvider({ children }) {
  const { currentUser } = useAuth();
  const businessRole = currentUser?.businessRole || currentUser?.role;
  const { theme, loading } = useTheme(currentUser?.id, businessRole);

  // Apply cached theme from localStorage immediately on mount (before DB fetch)
  useEffect(() => {
    // Set portal mode attribute immediately based on role
    const isEnterpriseRole = ['admin', 'super_admin', 'dispatcher'].includes(businessRole);
    document.documentElement.setAttribute('data-portal', isEnterpriseRole ? 'enterprise' : 'premium');

    // Apply HASTEN_UI role-based defaults (body classes)
    if (window.HASTEN_UI && businessRole) {
      window.HASTEN_UI.applyRoleDefaults(businessRole);
    }

    try {
      const cached = localStorage.getItem('hasten_theme');
      if (cached) {
        const cachedTheme = JSON.parse(cached);
        // Only apply if no DB theme loaded yet
        if (!theme) {
          applyCachedTheme(cachedTheme, businessRole);
        }
      } else {
        // No cached theme — apply role-based density defaults
        applyCachedTheme({}, businessRole);
      }
    } catch (e) {
      // ignore parse errors
      applyCachedTheme({}, businessRole);
    }
  }, [businessRole]);

  return children;
}

/**
 * Apply cached theme from localStorage for instant render
 * (mirrors the logic in hooks/useTheme.js applyTheme)
 */
function applyCachedTheme(themeSetting, userRole) {
  if (!themeSetting) return;
  const root = document.documentElement;

  // Portal mode: enterprise (admin/dispatcher) vs premium (driver/customer)
  const isEnterpriseRole = ['admin', 'super_admin', 'dispatcher'].includes(userRole);
  root.setAttribute('data-portal', isEnterpriseRole ? 'enterprise' : 'premium');

  root.classList.remove('dark', 'light', 'high-contrast');

  if (themeSetting.theme_mode === 'light') {
    root.classList.add('light');
  } else if (themeSetting.theme_mode === 'high_contrast') {
    root.classList.add('dark', 'high-contrast');
  } else if (themeSetting.theme_mode === 'system') {
    root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } else {
    root.classList.add('dark');
  }

  // Role-based default density
  root.classList.remove('density-comfortable', 'density-compact', 'density-ultra-compact');
  const defaultDensity = isEnterpriseRole ? 'compact' : 'comfortable';
  const density = themeSetting.density || defaultDensity;
  root.classList.add(`density-${density}`);

  // HASTEN UI density class
  root.classList.remove('h-density-comfortable', 'h-density-compact', 'h-density-ultra');
  root.classList.add(`h-density-${density === 'ultra_compact' ? 'ultra' : density}`);

  // HASTEN UI role class
  root.classList.remove('role-admin', 'role-dispatcher', 'role-superadmin', 'role-driver', 'role-customer');
  if (userRole) {
    root.classList.add(`role-${userRole === 'super_admin' ? 'superadmin' : userRole}`);
  }

  // HASTEN UI theme class
  root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
  root.classList.add(`theme-${themeSetting.theme_mode === 'light' ? 'light' : themeSetting.theme_mode === 'high_contrast' ? 'high-contrast' : 'dark'}`);

  // HASTEN UI font size + glass classes
  root.classList.remove('font-size-small', 'font-size-default', 'font-size-large');
  root.classList.add(`font-size-${themeSetting.font_size || 'default'}`);
  root.classList.remove('font-small', 'font-default', 'font-large');
  root.classList.add(`font-${themeSetting.font_size || 'default'}`);
  root.classList.remove('glass-low', 'glass-medium', 'glass-high');
  root.classList.add(`glass-${themeSetting.glassmorphism_intensity || 'medium'}`);
}