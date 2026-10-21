"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import TwoFactorSettings from "@/components/security/TwoFactorSettings";

export default function SecurityPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
          <TwoFactorSettings
            eyebrow="Account security"
            description="Add a code from an authenticator app to every sign-in, with single-use backup codes if you lose your phone."
          />
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
