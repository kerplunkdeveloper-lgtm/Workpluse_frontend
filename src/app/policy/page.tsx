"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PolicyView from "@/components/policy/PolicyView";

export default function PolicyPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <PolicyView />
      </AppLayout>
    </ProtectedRoute>
  );
}
