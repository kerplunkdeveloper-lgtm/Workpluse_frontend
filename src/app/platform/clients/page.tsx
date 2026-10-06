"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PlatformClientsView from "@/components/platform/PlatformClientsView";

export default function PlatformClientsPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
      <AppLayout>
        <PlatformClientsView />
      </AppLayout>
    </ProtectedRoute>
  );
}
