"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import DepartmentsView from "@/components/organization/DepartmentsView";

export default function DepartmentsPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "HR"]}>
      <AppLayout>
        <DepartmentsView />
      </AppLayout>
    </ProtectedRoute>
  );
}
