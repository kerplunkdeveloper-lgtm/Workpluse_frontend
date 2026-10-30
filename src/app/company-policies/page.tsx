"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import CompanyPolicyLibrary from "@/components/company-policies/CompanyPolicyLibrary";

export default function CompanyPoliciesPage() {
  return <ProtectedRoute><AppLayout><CompanyPolicyLibrary /></AppLayout></ProtectedRoute>;
}
