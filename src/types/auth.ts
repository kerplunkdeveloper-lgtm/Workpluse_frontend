export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type Permission =
  | 'manage:organizations'
  | 'manage:company'
  | 'manage:branches'
  | 'manage:departments'
  | 'manage:employees'
  | 'manage:shifts'
  | 'view:all_attendance'
  | 'mark:attendance'
  | 'view:my_attendance'
  | 'view:reports'
  | 'manage:leaves'
  | 'view:leaves'
  | 'manage:payroll';

export interface Organization {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  organizationId: string;
  userId?: string | null;
  employeeCode: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  branchId?: string | null;
  departmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organization?: Organization;
  employee?: Employee | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
