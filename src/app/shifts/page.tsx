"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import ShiftsAndRostersView from "@/components/shifts/ShiftsAndRostersView";

export default function ShiftsPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <ShiftsAndRostersView />
      </AppLayout>
    </ProtectedRoute>
  );
}
