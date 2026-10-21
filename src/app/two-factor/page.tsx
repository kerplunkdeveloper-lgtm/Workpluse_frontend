"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/ui/AuthShell";
import { useAuth } from "@/context/AuthContext";

export default function TwoFactorPage() {
  const { completeTwoFactorLogin, isLoading } = useAuth();
  const [code, setCode] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.trim()) await completeTwoFactorLogin(code.trim());
  };

  return (
    <AuthShell
      eyebrow="Two-step verification"
      title="Confirm your sign-in"
      description="Enter the 6-digit code from your authenticator app. You can also use a one-time backup code."
      footer={<Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">Back to login</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-medium text-slate-700" htmlFor="two-factor-code">
          Authenticator or backup code
          <input id="two-factor-code" autoFocus inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-[0.35em] outline-none focus:border-indigo-500" maxLength={20} />
        </label>
        <button disabled={isLoading || !code.trim()} className="keep-white w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50">
          {isLoading ? "Verifying…" : "Verify and continue"}
        </button>
      </form>
    </AuthShell>
  );
}
