"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import SupportCenter from "@/components/support/SupportCenter";

export default function SupportPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <SupportCenter />
      </AppLayout>
    </ProtectedRoute>
  );
}
