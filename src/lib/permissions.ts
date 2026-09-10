import { User, UserRole, Permission } from '@/types/auth';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'manage:organizations',
    'manage:company',
    'manage:branches',
    'manage:departments',
    'manage:employees',
    'manage:shifts',
    'view:all_attendance',
    'mark:attendance',
    'view:my_attendance',
    'view:reports',
    'manage:leaves',
    'view:leaves',
    'manage:payroll',
  ],
  COMPANY_ADMIN: [
    'manage:company',
    'manage:branches',
    'manage:departments',
    'manage:employees',
    'manage:shifts',
    'view:all_attendance',
    'mark:attendance',
    'view:my_attendance',
    'view:reports',
    'manage:leaves',
    'view:leaves',
    'manage:payroll',
  ],
  MANAGER: [
    'manage:departments',
    'manage:employees',
    'manage:shifts',
    'view:all_attendance',
    'mark:attendance',
    'view:my_attendance',
    'view:reports',
    'manage:leaves',
    'view:leaves',
  ],
  EMPLOYEE: [
    'mark:attendance',
    'view:my_attendance',
    'view:leaves',
  ],
};

export const hasPermission = (user: User | null, permission: Permission): boolean => {
  if (!user) return false;
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};

export const hasAnyPermission = (user: User | null, permissions: Permission[]): boolean => {
  if (!user) return false;
  return permissions.some((permission) => hasPermission(user, permission));
};

export const hasAllPermissions = (user: User | null, permissions: Permission[]): boolean => {
  if (!user) return false;
  return permissions.every((permission) => hasPermission(user, permission));
};

export const hasRole = (user: User | null, roles: UserRole | UserRole[]): boolean => {
  if (!user) return false;
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
};

export const getRoleBadgeDetails = (role?: UserRole): { label: string; color: string; bg: string } => {
  switch (role) {
    case 'SUPER_ADMIN':
      return { label: 'Super Admin', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200 shadow-xs' };
    case 'COMPANY_ADMIN':
      return { label: 'Company Admin', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200 shadow-xs' };
    case 'MANAGER':
      return { label: 'Manager', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200 shadow-xs' };
    case 'EMPLOYEE':
      return { label: 'Employee', color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200 shadow-xs' };
    default:
      return { label: 'Guest', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200 shadow-xs' };
  }
};

/**
 * Web App Access Policy:
 * Only Admin and Manager roles are permitted to access the web application dashboard.
 * Employees must use the WorkPulse Mobile App.
 */
export const WEB_APP_ROLES: UserRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'];

export const isAllowedOnWebApp = (user: User | null): boolean => {
  if (!user) return false;
  return WEB_APP_ROLES.includes(user.role);
};

