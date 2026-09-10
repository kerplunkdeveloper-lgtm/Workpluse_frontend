'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, hasRole } from '@/lib/permissions';
import { Permission, UserRole } from '@/types/auth';

interface PermissionGateProps {
  permission?: Permission;
  roles?: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  roles,
  children,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user) return <>{fallback}</>;

  if (permission && !hasPermission(user, permission)) {
    return <>{fallback}</>;
  }

  if (roles && !hasRole(user, roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
