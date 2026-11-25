"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import SubscriptionSettingsView from "@/components/settings/SubscriptionSettingsView";

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["COMPANY_ADMIN"]}>
      <AppLayout>
        <SubscriptionSettingsView />
      </AppLayout>
    </ProtectedRoute>
  );
}
