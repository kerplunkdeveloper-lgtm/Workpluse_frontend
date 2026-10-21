"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { orgApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type ApiError = { response?: { data?: { message?: string } } };

/** Workspace switch that makes two-step verification mandatory for company admins. */
export default function AdminTwoFactorPolicy() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const required = Boolean(user?.organization?.requireAdminTwoFactor);
  const ownTwoFactor = Boolean(user?.twoFactorEnabled);

  const toggle = async () => {
    setSaving(true);
    try {
      await orgApi.update({ requireAdminTwoFactor: !required });
      await refreshUser();
      toast.success(!required ? "Admins now need two-step verification." : "Two-step verification is now optional for admins.");
    } catch (error) {
      toast.error((error as ApiError)?.response?.data?.message || "Could not update the security policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-card space-y-3 p-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Admin two-step verification</h3>
        <p className="text-xs text-slate-500">
          When on, every company admin must use an authenticator app to sign in. Admins without it are asked to set it up before they can continue.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={saving || (!required && !ownTwoFactor)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${required ? "border border-rose-200 text-rose-700" : "keep-white bg-indigo-600"}`}
        >
          {required ? "Make optional" : "Require for all admins"}
        </button>
        <span className="text-sm text-slate-600">Currently {required ? "required" : "optional"}</span>
      </div>
      {!required && !ownTwoFactor && (
        <p className="text-xs text-amber-700">
          Turn on two-step verification for your own account first, on the{" "}
          <Link href="/security" className="font-semibold underline">security page</Link>, so you are not locked out.
        </p>
      )}
    </div>
  );
}
