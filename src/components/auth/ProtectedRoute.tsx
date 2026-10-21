"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { UserRole } from "@/types";

import AppSkeletonLoader from "@/components/ui/AppSkeletonLoader";
import { BillingLocked } from "@/components/billing/WorkspaceBilling";
import WorkspaceSuspended from "@/components/billing/WorkspaceSuspended";
import TwoFactorSettings from "@/components/security/TwoFactorSettings";
import { roleLabel } from "@/lib/utils";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const BILLING_PATHS = ["/settings", "/platform/billing"];

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !token) {
      const id = window.setTimeout(() => router.replace("/login"), 0);
      return () => window.clearTimeout(id);
    }
  }, [isLoading, token, router]);

  if (isLoading) {
    return <AppSkeletonLoader />;
  }

  if (!token || !user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4 shadow-xs">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600 max-w-md mb-6">
          This section requires elevated privileges. Your current role is{" "}
          <span className="px-2 py-0.5 rounded bg-slate-100 text-indigo-700 font-semibold border border-slate-200">{roleLabel(user.role)}</span>.
        </p>
        <button
          onClick={() => router.replace("/dashboard")}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // A suspended workspace gets no billing escape hatch: only the owner can lift it.
  if (user.entitlement?.code === "ACCOUNT_SUSPENDED" && user.role !== "SUPER_ADMIN") {
    return <WorkspaceSuspended />;
  }

  // The workspace requires admins to use 2FA; the API refuses everything but
  // setup until it is on, so show setup in place of the page.
  if (user.twoFactorSetupRequired) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your workspace requires admins to turn on two-step verification before continuing.
        </div>
        <TwoFactorSettings
          eyebrow="Required by your workspace"
          description="Scan the secret with an authenticator app such as Google Authenticator or 1Password, then enter the code it shows."
        />
      </main>
    );
  }

  const locked = user.entitlement && user.entitlement.allowApp === false;
  const billingEscape = BILLING_PATHS.some((path) => pathname?.startsWith(path));
  const canManageBilling = user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN";
  if (locked && !(billingEscape && canManageBilling)) {
    return <BillingLocked />;
  }

  return <>{children}</>;
}
