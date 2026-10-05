"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PlatformBillingView from "@/components/billing/PlatformBillingView";

export default function PlatformBillingPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
      <AppLayout>
        <PlatformBillingView />
      </AppLayout>
    </ProtectedRoute>
  );
}
