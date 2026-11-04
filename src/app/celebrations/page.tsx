"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import CelebrationsView from "@/components/celebrations/CelebrationsView";

export default function CelebrationsPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <CelebrationsView />
      </AppLayout>
    </ProtectedRoute>
  );
}
