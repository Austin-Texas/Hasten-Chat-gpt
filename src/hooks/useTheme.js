import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useTheme — Fetches and applies ThemeSetting based on user preferences & role/portal
 * Priority: user-specific > role-specific override > global theme
 * Automatically switches themes when user role/portal changes
 * Persists across logins via DB storage
 */
export function useTheme(userId, userRole) {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAndApplyTheme = async () => {
      try {
        let themeSettings = null;

        // 1. Try to load user-specific theme (persisted from last session)
        if (userId) {
          const userTheme = await base44.entities.ThemeSetting.filter(
            { scope: 'user', target_id: userId },
            '-created_date',
            1
          ).catch(() => []);
          
          if (userTheme && userTheme.length > 0) {
            themeSettings = userTheme[0];
          }
        }

        // 2. Try to load role-specific portal override (auto-switch by role)
        if (!themeSettings && userRole) {
          const roleTheme = await base44.entities.ThemeSetting.filter(
            { scope: 'role', target_role: userRole },
            '-created_date',
            1
          ).catch(() => []);
          
          if (roleTheme && roleTheme.length > 0) {
            themeSettings = roleTheme[0];
          }
        }

        // 3. Fall back to global theme
        if (!themeSettings) {
          const globalTheme = await base44.entities.ThemeSetting.filter(
            { scope: 'global' },
            '-created_date',
            1
          ).catch(() => []);
          
          if (globalTheme && globalTheme.length > 0) {
            themeSettings = globalTheme[0];
          }
        }

        // Apply theme immediately and force re-render on role/portal change
        if (themeSettings) {
          setTheme(themeSettings);
          applyTheme(themeSettings, userRole);
        } else {
          // Fallback: no theme in DB, apply role-based defaults
          applyTheme({}, userRole);
          setTheme(null);
        }
      } catch (err) {
        console.error('[useTheme] Failed to load theme:', err);
        applyTheme({});
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadAndApplyTheme();
  }, [userId, userRole]); // Re-run when userId or userRole changes (portal switch)

  // Subscribe to real-time theme changes
  useEffect(() => {
    const subscriptions = [];

    // Subscribe to user-specific theme updates
    if (userId) {
      subscriptions.push(
        base44.entities.ThemeSetting.subscribe(event => {
          if (event.data?.scope === 'user' && event.data?.target_id === userId) {
            setTheme(event.data);
            applyTheme(event.data, userRole);
          }
        })
      );
    }

    // Subscribe to role-specific portal theme updates
    if (userRole) {
      subscriptions.push(
        base44.entities.ThemeSetting.subscribe(event => {
          if (event.data?.scope === 'role' && event.data?.target_role === userRole) {
            setTheme(event.data);
            applyTheme(event.data, userRole);
          }
        })
      );
    }

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
    };
  }, [userId, userRole]);

  return { theme, loading };
}

/**
 * Apply ThemeSetting to document root
 * @param {object} themeSetting - Theme settings from DB or empty object for defaults
 * @param {string} userRole - Business role for density defaults
 */
function applyTheme(themeSetting, userRole) {
  const root = document.documentElement;

  // Determine portal mode: enterprise (admin/dispatcher) vs premium (driver/customer)
  const isEnterpriseRole = ['admin', 'super_admin', 'dispatcher'].includes(userRole);
  const portalMode = isEnterpriseRole ? 'enterprise' : 'premium';
  root.setAttribute('data-portal', portalMode);

  // Remove all theme mode / skin classes first
  root.classList.remove('dark', 'light', 'high-contrast');
  root.classList.remove('skin-enterprise-dark', 'skin-clean-white', 'skin-hybrid-glass', 'skin-executive-graphite', 'skin-high-contrast-ops');

  // Skin preset class for enterprise-level visual systems
  const skinPreset = themeSetting.skin_preset || (themeSetting.theme_mode === 'light' ? 'clean_white' : 'enterprise_dark');
  root.classList.add(`skin-${String(skinPreset).replace(/_/g, '-')}`);
  root.setAttribute('data-theme-skin', skinPreset);

  // Theme mode
  if (themeSetting.theme_mode === 'light') {
    root.classList.add('light');
  } else if (themeSetting.theme_mode === 'high_contrast') {
    root.classList.add('dark', 'high-contrast');
  } else if (themeSetting.theme_mode === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
  } else {
    // Default: dark
    root.classList.add('dark');
  }

  // Accent color CSS variable (only if custom accent enabled)
  if (themeSetting.accent_color && themeSetting.custom_accent_enabled) {
    const rgb = hexToRgb(themeSetting.accent_color);
    if (rgb) {
      root.style.setProperty('--accent-custom', `${rgb.r} ${rgb.g} ${rgb.b}`);
      root.style.setProperty('--primary', `${rgb.h} ${rgb.s}% ${rgb.l}%`);
      root.style.setProperty('--ring', `${rgb.h} ${rgb.s}% ${rgb.l}%`);
      root.style.setProperty('--sidebar-primary', `${rgb.h} ${rgb.s}% ${rgb.l}%`);
      root.style.setProperty('--sidebar-ring', `${rgb.h} ${rgb.s}% ${rgb.l}%`);
    }
  }

  // Secondary accent color
  if (themeSetting.secondary_accent_color) {
    const rgb = hexToRgb(themeSetting.secondary_accent_color);
    if (rgb) {
      root.style.setProperty('--secondary', `${rgb.h} ${rgb.s}% ${rgb.l}%`);
      root.style.setProperty('--accent', `${rgb.h} ${rgb.s}% ${rgb.l}%`);
    }
  }

  // Density mode — role-based default when not explicitly set
  root.classList.remove('density-comfortable', 'density-compact', 'density-ultra-compact');
  const defaultDensity = isEnterpriseRole ? 'compact' : 'comfortable';
  const density = themeSetting.density || defaultDensity;
  root.classList.add(`density-${density}`);

  // HASTEN UI density class (bridged)
  root.classList.remove('h-density-comfortable', 'h-density-compact', 'h-density-ultra');
  const hDensity = density === 'ultra_compact' ? 'ultra' : density;
  root.classList.add(`h-density-${hDensity}`);

  // HASTEN UI role class
  root.classList.remove('role-admin', 'role-dispatcher', 'role-superadmin', 'role-driver', 'role-customer');
  if (userRole) {
    const roleClass = userRole === 'super_admin' ? 'superadmin' : userRole;
    root.classList.add(`role-${roleClass}`);
  }

  // HASTEN UI theme class
  root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast', 'theme-hybrid');
  if (themeSetting.theme_mode === 'light') {
    root.classList.add('theme-light');
  } else if (themeSetting.theme_mode === 'high_contrast') {
    root.classList.add('theme-high-contrast');
  } else {
    root.classList.add('theme-dark');
  }
  if (skinPreset === 'hybrid_glass') {
    root.classList.add('theme-hybrid');
  }

  // Font size
  root.classList.remove('font-size-small', 'font-size-default', 'font-size-large');
  const fontSize = themeSetting.font_size || 'default';
  root.classList.add(`font-size-${fontSize}`);

  // HASTEN UI font size class
  root.classList.remove('font-small', 'font-default', 'font-large');
  root.classList.add(`font-${fontSize}`);

  // Glassmorphism intensity
  const glassIntensity = {
    low: 'blur(10px)',
    medium: 'blur(20px)',
    high: 'blur(30px)'
  };
  if (themeSetting.glassmorphism_intensity) {
    root.style.setProperty('--glass-blur', glassIntensity[themeSetting.glassmorphism_intensity] || 'blur(20px)');
  }

  // HASTEN UI glass level class
  root.classList.remove('glass-low', 'glass-medium', 'glass-high');
  root.classList.add(`glass-${themeSetting.glassmorphism_intensity || 'medium'}`);

  // Logo mode (data attribute for CSS targeting)
  if (themeSetting.logo_mode) {
    root.setAttribute('data-logo-mode', themeSetting.logo_mode);
  }

  // Persist to localStorage for instant load on refresh
  try {
    localStorage.setItem('hasten_theme', JSON.stringify(themeSetting));
  } catch (e) {
    // ignore
  }
}

/**
 * Convert hex to RGB/HSL for CSS variable usage
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }

  return {
    r,
    g,
    b,
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}