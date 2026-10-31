"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import EmployeeDirectory from "@/components/employees/EmployeeDirectory";

export default function EmployeesPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <EmployeeDirectory />
      </AppLayout>
    </ProtectedRoute>
  );
}
