"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, CreditCard } from "lucide-react";
import type { Organization, WorkspaceEntitlement } from "@/types";

export function trialDaysRemaining(
  entitlement?: WorkspaceEntitlement | null,
  organization?: Organization | null
): number | null {
  const numbered = entitlement?.daysRemaining;
  if (typeof numbered === "number" && Number.isFinite(numbered)) {
    return Math.max(0, Math.round(numbered));
  }
  const endRaw = entitlement?.expiresAt || organization?.trialEndsAt || organization?.subscriptionExpiresAt;
  if (endRaw) {
    const end = new Date(endRaw).getTime();
    if (Number.isFinite(end)) return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
  }
  const created = organization?.createdAt;
  if (created) {
    const end = new Date(created).getTime() + 14 * 86_400_000;
    if (Number.isFinite(end)) return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
  }
  return null;
}

export function trialDaysLabel(days: number | null): string {
  if (days === null) return "Trial is active";
  if (days === 0) return "Last day";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

export function SubscriptionBanner() {
  const { user, role } = useAuth();
  const entitlement = user?.entitlement;
  if (!entitlement) return null;

  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const days = trialDaysRemaining(entitlement, user?.organization);
  const state = String(entitlement.state || "").toUpperCase();

  if (entitlement.allowApp === false) return null;

  if (state === "TRIAL" || state === "TRIALING") {
    return (
      <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-900 flex flex-wrap items-center justify-between gap-3">
        <p>
          <span className="font-bold">Free trial.</span> {trialDaysLabel(days)}.
          Paid features stay on the trial until you check out.
        </p>
        {isAdmin && (
          <Link href="/settings?billing=1" className="font-semibold text-indigo-700 hover:text-indigo-900">
            Choose a plan
          </Link>
        )}
      </div>
    );
  }

  if (state === "GRACE" || state === "PAST_DUE" || state === "CANCELED_ACTIVE") {
    return (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {entitlement.message || "Your subscription needs attention."}
          {days != null ? ` Access continues for ${days} day${days === 1 ? "" : "s"}.` : ""}
        </p>
        {isAdmin && (
          <Link href="/settings?billing=1" className="font-semibold text-amber-800 hover:text-amber-950">
            Update billing
          </Link>
        )}
      </div>
    );
  }

  return null;
}

export function BillingLocked() {
  const { user, role, logout } = useAuth();
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const message =
    user?.entitlement?.message ||
    "This workspace subscription is inactive. Update billing to restore access.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-4">
        <CreditCard className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Subscription required</h2>
      <p className="text-slate-600 max-w-md mb-6 text-sm leading-relaxed">{message}</p>
      {isAdmin ? (
        <Link
          href="/settings?billing=1"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm"
        >
          Open billing
        </Link>
      ) : (
        <p className="text-xs text-slate-500">Ask a company admin to renew the workspace plan.</p>
      )}
      <button onClick={() => logout()} className="mt-4 text-xs text-slate-500 hover:text-slate-800">
        Sign out
      </button>
    </div>
  );
}
