"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import ReportsView from "@/components/reports/ReportsView";

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <ReportsView />
      </AppLayout>
    </ProtectedRoute>
  );
}
