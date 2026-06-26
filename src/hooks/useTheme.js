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

        if (userId) {
          const userTheme = await base44.entities.ThemeSetting.filter(
            { scope: 'user', target_id: userId },
            '-created_date',
            1
          ).catch(() => []);
          if (userTheme && userTheme.length > 0) themeSettings = userTheme[0];
        }

        if (!themeSettings && userRole) {
          const roleTheme = await base44.entities.ThemeSetting.filter(
            { scope: 'role', target_role: userRole },
            '-created_date',
            1
          ).catch(() => []);
          if (roleTheme && roleTheme.length > 0) themeSettings = roleTheme[0];
        }

        if (!themeSettings) {
          const globalTheme = await base44.entities.ThemeSetting.filter(
            { scope: 'global' },
            '-created_date',
            1
          ).catch(() => []);
          if (globalTheme && globalTheme.length > 0) themeSettings = globalTheme[0];
        }

        if (themeSettings) {
          setTheme(themeSettings);
          applyTheme(themeSettings, userRole);
        } else {
          applyTheme({}, userRole);
          setTheme(null);
        }
      } catch (err) {
        console.error('[useTheme] Failed to load theme:', err);
        applyTheme({}, userRole);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadAndApplyTheme();
  }, [userId, userRole]);

  useEffect(() => {
    const subscriptions = [];
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
    return () => subscriptions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') unsubscribe();
    });
  }, [userId, userRole]);

  return { theme, loading };
}

function normalizeThemeMode(mode) {
  return mode === 'compact_dark' ? 'dark' : mode;
}

function applyTheme(themeSetting, userRole) {
  const root = document.documentElement;
  const isEnterpriseRole = ['admin', 'super_admin', 'dispatcher', 'finance'].includes(userRole);
  const portalMode = isEnterpriseRole ? 'enterprise' : 'premium';
  const themeMode = normalizeThemeMode(themeSetting.theme_mode);

  root.setAttribute('data-portal', portalMode);
  root.classList.remove('dark', 'light', 'high-contrast');
  root.classList.remove('skin-enterprise-dark', 'skin-compact-dark', 'skin-clean-white', 'skin-hybrid-glass', 'skin-executive-graphite', 'skin-high-contrast-ops');

  const skinPreset = themeSetting.skin_preset || (themeSetting.theme_mode === 'light' ? 'clean_white' : themeSetting.theme_mode === 'compact_dark' ? 'compact_dark' : 'enterprise_dark');
  root.classList.add(`skin-${String(skinPreset).replace(/_/g, '-')}`);
  root.setAttribute('data-theme-skin', skinPreset);

  if (themeMode === 'light') {
    root.classList.add('light');
  } else if (themeMode === 'high_contrast') {
    root.classList.add('dark', 'high-contrast');
  } else if (themeMode === 'system') {
    root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } else {
    root.classList.add('dark');
  }

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

  if (themeSetting.secondary_accent_color) {
    const rgb = hexToRgb(themeSetting.secondary_accent_color);
    if (rgb) {
      root.style.setProperty('--secondary', `${rgb.h} ${rgb.s}% ${rgb.l}%`);
      root.style.setProperty('--accent', `${rgb.h} ${rgb.s}% ${rgb.l}%`);
    }
  }

  root.classList.remove('density-comfortable', 'density-compact', 'density-ultra-compact');
  const defaultDensity = isEnterpriseRole ? 'compact' : 'comfortable';
  const density = themeSetting.theme_mode === 'compact_dark' ? 'ultra_compact' : themeSetting.density || defaultDensity;
  root.classList.add(`density-${density}`);

  root.classList.remove('h-density-comfortable', 'h-density-compact', 'h-density-ultra');
  const hDensity = density === 'ultra_compact' ? 'ultra' : density;
  root.classList.add(`h-density-${hDensity}`);

  root.classList.remove('role-admin', 'role-dispatcher', 'role-superadmin', 'role-driver', 'role-customer', 'role-finance');
  if (userRole) {
    const roleClass = userRole === 'super_admin' ? 'superadmin' : userRole;
    root.classList.add(`role-${roleClass}`);
  }

  root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast', 'theme-hybrid', 'theme-compact-dark');
  if (themeMode === 'light') root.classList.add('theme-light');
  else if (themeMode === 'high_contrast') root.classList.add('theme-high-contrast');
  else if (themeSetting.theme_mode === 'compact_dark') root.classList.add('theme-dark', 'theme-compact-dark');
  else root.classList.add('theme-dark');
  if (skinPreset === 'hybrid_glass') root.classList.add('theme-hybrid');

  root.classList.remove('font-size-small', 'font-size-default', 'font-size-large');
  const fontSize = themeSetting.font_size === 'normal' ? 'default' : themeSetting.font_size || 'default';
  root.classList.add(`font-size-${fontSize}`);

  root.classList.remove('font-small', 'font-default', 'font-large');
  root.classList.add(`font-${fontSize}`);

  const glassIntensity = { low: 'blur(10px)', medium: 'blur(20px)', high: 'blur(30px)' };
  if (themeSetting.glassmorphism_intensity) {
    root.style.setProperty('--glass-blur', glassIntensity[themeSetting.glassmorphism_intensity] || 'blur(20px)');
  }

  root.classList.remove('glass-low', 'glass-medium', 'glass-high');
  root.classList.add(`glass-${themeSetting.glassmorphism_intensity || 'medium'}`);

  if (themeSetting.logo_mode) root.setAttribute('data-logo-mode', themeSetting.logo_mode);

  try {
    localStorage.setItem('hasten_theme', JSON.stringify({ ...themeSetting, density }));
  } catch (e) {
    // ignore
  }
}

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

  return { r, g, b, h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
