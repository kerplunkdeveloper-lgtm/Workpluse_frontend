"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import ApprovalsInboxView from "@/components/approvals/ApprovalsInboxView";

export default function ApprovalsPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <ApprovalsInboxView />
      </AppLayout>
    </ProtectedRoute>
  );
}
