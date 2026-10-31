"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import HolidaysView from "@/components/holidays/HolidaysView";

export default function HolidaysPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <HolidaysView />
      </AppLayout>
    </ProtectedRoute>
  );
}
