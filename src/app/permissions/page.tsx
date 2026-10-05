"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PermissionsView from "@/components/settings/PermissionsView";

export default function PermissionsPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN"]}>
      <AppLayout>
        <PermissionsView />
      </AppLayout>
    </ProtectedRoute>
  );
}
