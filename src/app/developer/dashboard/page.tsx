"use client";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import DeveloperSupportDashboard from "@/components/support/DeveloperSupportDashboard";
export default function DeveloperDashboardPage() {
  return <ProtectedRoute allowedRoles={["DEVELOPER"]}><AppLayout><DeveloperSupportDashboard /></AppLayout></ProtectedRoute>;
}
