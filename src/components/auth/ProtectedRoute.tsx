'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, hasRole } from '@/lib/permissions';
import { Permission, UserRole } from '@/types/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  allowedRoles,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/landing');
      } else if (user?.role === 'EMPLOYEE') {
        // Platform policy: Employees access WorkPulse via mobile app; web app is for Admins & Managers
        router.push('/mobile-app');
      } else if (allowedRoles && !hasRole(user, allowedRoles)) {
        router.push('/unauthorized');
      } else if (requiredPermission && !hasPermission(user, requiredPermission)) {
        router.push('/unauthorized');
      }
    }
  }, [loading, isAuthenticated, user, requiredPermission, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role === 'EMPLOYEE') {
    return null;
  }

  if (allowedRoles && !hasRole(user, allowedRoles)) {
    return null;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
