"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PolicyView from "@/components/policy/PolicyView";
import { useAuth } from "@/context/AuthContext";

export default function PolicyPage() {
  const { role } = useAuth();
  const canManageSettings = ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"].includes(role || "");
  return (
    <ProtectedRoute>
      <AppLayout>
        {canManageSettings && <PolicyView />}
      </AppLayout>
    </ProtectedRoute>
  );
}
