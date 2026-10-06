"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import BranchesAndGeofencesView from "@/components/organization/BranchesAndGeofencesView";

export default function BranchesPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN"]}>
      <AppLayout>
        <BranchesAndGeofencesView />
      </AppLayout>
    </ProtectedRoute>
  );
}
