import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AccessDenied from '@/components/AccessDenied';
import { canAccessRoute } from '@/lib/rolePermissions';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, currentUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  // Enforce route-level access control based on businessRole
  // Safe fallback: admin users can always access, even if businessRole missing
  const businessRole = currentUser?.businessRole;
  const authRole = currentUser?.role;
  
  // super_admin and admin users bypass businessRole checks (they can always access)
  if (authRole === 'admin' || ['super_admin', 'admin'].includes(businessRole)) {
    return <Outlet />;
  }
  
  // Non-admin users MUST have businessRole set
  if (!businessRole) {
    return <AccessDenied reason="Account setup incomplete. Contact administrator." />;
  }

  const hasAccess = canAccessRoute(businessRole, location.pathname);
  if (!hasAccess) {
    return <AccessDenied reason={`${businessRole} cannot access ${location.pathname}`} />;
  }

  return <Outlet />;
}