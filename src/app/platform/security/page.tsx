"use client";

import { useState } from "react";
import { authApi } from "@/lib/api";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PlatformNav from "@/components/platform/PlatformNav";
import { toast } from "sonner";

export default function PlatformSecurityPage() {
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const begin = async () => {
    setBusy(true);
    try {
      const result = await authApi.beginTwoFactorSetup();
      setSetup(result.data);
      toast.success("Setup started. Add the secret to your authenticator app.");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not start two-step setup"); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await authApi.confirmTwoFactorSetup(code.trim());
      setBackupCodes(result.data?.backupCodes || []);
      setSetup(null);
      setCode("");
      toast.success("Two-step verification enabled.");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Invalid authenticator code"); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await authApi.disableTwoFactor(code.trim());
      setCode("");
      toast.success("Two-step verification disabled.");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not disable two-step verification"); }
    finally { setBusy(false); }
  };

  return <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><AppLayout><main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8"><PlatformNav active="security" /><section className="app-card max-w-2xl p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Platform security</p><h1 className="mt-2 text-2xl font-bold text-slate-950">Two-step verification</h1><p className="mt-2 text-sm leading-6 text-slate-600">Protect platform-owner actions with an authenticator app and single-use backup codes.</p>{setup ? <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">Add this secret to your authenticator app:</p><code className="block break-all rounded-xl bg-white p-3 text-sm text-indigo-700">{setup.secret}</code><a className="text-xs font-semibold text-indigo-600 underline" href={setup.otpauthUrl}>Open authenticator link</a><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter the 6-digit code" className="w-full rounded-xl border border-slate-200 px-3 py-2" /><button onClick={confirm} disabled={busy || !code.trim()} className="keep-white rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">Confirm setup</button></div> : <div className="mt-6 flex flex-wrap gap-3"><button onClick={begin} disabled={busy} className="keep-white rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">Set up authenticator</button><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Current 6-digit code" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button onClick={disable} disabled={busy || !code.trim()} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">Disable</button></div>}{backupCodes.length > 0 && <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-900">Save these backup codes now</p><p className="mt-1 text-xs text-amber-800">Each code can be used once if you lose access to your authenticator.</p><code className="mt-3 grid grid-cols-2 gap-2 text-sm text-amber-950">{backupCodes.map((item) => <span key={item}>{item}</span>)}</code></div>}</section></main></AppLayout></ProtectedRoute>;
}
