"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PlatformActivityView from "@/components/platform/PlatformActivityView";

export default function PlatformActivityPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
      <AppLayout>
        <PlatformActivityView />
      </AppLayout>
    </ProtectedRoute>
  );
}
