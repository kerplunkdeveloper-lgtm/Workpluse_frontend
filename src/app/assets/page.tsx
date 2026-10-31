"use client";

import React from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import AssetManagementView from "@/components/assets/AssetManagementView";

export default function AssetsPage() {
  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]}>
      <AppLayout>
        <div className="max-w-7xl mx-auto pb-12">
          <AssetManagementView />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
