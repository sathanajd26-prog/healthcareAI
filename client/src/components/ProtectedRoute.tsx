import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForUser } from './HomeButton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallbackPath?: string;
}

/**
 * Route authorization guard.
 * - Redirects unauthenticated guests to public home (or fallbackPath).
 * - Redirects authenticated users with unauthorized roles to their authorized role dashboard.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath,
}) => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-medical-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Verifying clinical authorization...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated guest, block access to protected page and redirect to public home
  if (!token || !user) {
    return <Navigate to={fallbackPath || '/'} state={{ from: location }} replace />;
  }

  // If role is restricted and user's role is not authorized, redirect to their authorized role home
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const authorizedHome = getHomeRouteForUser(user, token);
    return <Navigate to={fallbackPath || authorizedHome.path} replace />;
  }

  return <>{children}</>;
};
