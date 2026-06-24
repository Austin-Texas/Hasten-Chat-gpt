import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();
const DEMO_STORAGE_KEY = 'hasten_user';

const normalizeDemoUser = (storedUser = {}) => {
  const businessRole = storedUser.businessRole || storedUser.role || 'admin';
  const isAdminLike = ['super_admin', 'admin'].includes(businessRole);

  return {
    id: storedUser.id || 'demo-user',
    email: storedUser.email || 'netzeus20@gmail.com',
    full_name: storedUser.full_name || storedUser.fullName || storedUser.name || 'Brian M',
    name: storedUser.name || storedUser.full_name || storedUser.fullName || 'Brian M',
    role: isAdminLike ? 'admin' : businessRole,
    businessRole,
    isDemoUser: true,
  };
};

const getStoredDemoUser = () => {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    return normalizeDemoUser(JSON.parse(raw));
  } catch (error) {
    console.warn('[AuthContext] Invalid demo login state. Clearing local session.', error);
    localStorage.removeItem(DEMO_STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const applyAuthState = useCallback((nextUser) => {
    setUser(nextUser);
    setIsAuthenticated(Boolean(nextUser));
    setAuthError(null);
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthChecked(true);
  }, []);

  const checkUserAuth = useCallback(async () => {
    const demoUser = getStoredDemoUser();
    if (demoUser) {
      applyAuthState(demoUser);
      return demoUser;
    }

    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const currentUser = await base44.auth.me();
      const normalizedUser = {
        ...currentUser,
        businessRole: currentUser?.businessRole || currentUser?.role || 'admin',
      };

      applyAuthState(normalizedUser);
      return normalizedUser;
    } catch (error) {
      console.warn('[AuthContext] Base44 auth unavailable locally; user is unauthenticated.', error?.message || error);
      applyAuthState(null);
      return null;
    }
  }, [applyAuthState]);

  const checkAppState = useCallback(async () => {
    // Local demo login should not call Base44 public settings because local appParams.appId can be null.
    setAppPublicSettings(null);
    await checkUserAuth();
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = (shouldRedirect = true) => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
    setAuthError(null);

    try {
      base44.auth.logout();
    } catch (error) {
      console.warn('[AuthContext] Base44 logout skipped:', error?.message || error);
    }

    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentUser: user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
