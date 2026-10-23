"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import AuditLogView from "@/components/audit/AuditLogView";

export default function AuditPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN"]}>
      <AppLayout>
        <AuditLogView />
      </AppLayout>
    </ProtectedRoute>
  );
}
