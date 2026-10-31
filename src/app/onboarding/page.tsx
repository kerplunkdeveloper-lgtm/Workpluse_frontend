"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import OnboardingView from "@/components/onboarding/OnboardingView";

export default function OnboardingPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <OnboardingView />
      </AppLayout>
    </ProtectedRoute>
  );
}
