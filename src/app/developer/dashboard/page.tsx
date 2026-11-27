"use client";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import SupportCenter from "@/components/support/SupportCenter";
export default function DeveloperDashboardPage() {
  return <ProtectedRoute allowedRoles={["DEVELOPER"]}><AppLayout><SupportCenter agentOnly /></AppLayout></ProtectedRoute>;
}
