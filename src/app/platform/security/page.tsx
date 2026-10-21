"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PlatformNav from "@/components/platform/PlatformNav";
import TwoFactorSettings from "@/components/security/TwoFactorSettings";

export default function PlatformSecurityPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
      <AppLayout>
        <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
          <PlatformNav active="security" />
          <TwoFactorSettings
            eyebrow="Platform security"
            description="Protect platform-owner actions with an authenticator app and single-use backup codes."
          />
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
