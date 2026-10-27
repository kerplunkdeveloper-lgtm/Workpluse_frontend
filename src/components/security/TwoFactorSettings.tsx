"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type ApiError = { response?: { data?: { message?: string } } };
const messageOf = (error: unknown, fallback: string) =>
  (error as ApiError)?.response?.data?.message || fallback;

/** Authenticator-app setup, backup codes and disable, for the signed-in user. */
export default function TwoFactorSettings({ eyebrow, description }: { eyebrow: string; description: string }) {
  const { user, refreshUser } = useAuth();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const enabled = Boolean(user?.twoFactorEnabled);

  useEffect(() => {
    let cancelled = false;
    if (!setup?.otpauthUrl) {
      setQrCode(null);
      return;
    }
    import("qrcode")
      .then((module) => module.default.toDataURL(setup.otpauthUrl, { width: 240, margin: 2, errorCorrectionLevel: "M" }))
      .then((url) => { if (!cancelled) setQrCode(url); })
      .catch(() => { if (!cancelled) setQrCode(null); });
    return () => { cancelled = true; };
  }, [setup?.otpauthUrl]);

  const begin = async () => {
    setBusy(true);
    try {
      const result = await authApi.beginTwoFactorSetup();
      setSetup(result.data);
      toast.success("Setup started. Scan the QR code with your authenticator app.");
    } catch (error) { toast.error(messageOf(error, "Could not start two-step setup")); }
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
      await refreshUser();
    } catch (error) { toast.error(messageOf(error, "Invalid authenticator code")); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await authApi.disableTwoFactor(code.trim());
      setCode("");
      toast.success("Two-step verification disabled.");
      await refreshUser();
    } catch (error) { toast.error(messageOf(error, "Could not disable two-step verification")); }
    finally { setBusy(false); }
  };

  return (
    <section className="app-card max-w-2xl p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">Two-step verification</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-3 text-sm font-semibold">
        Status:{" "}
        <span className={enabled ? "text-emerald-700" : "text-amber-700"}>{enabled ? "On" : "Off"}</span>
      </p>
      {setup ? (
        <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Scan this QR code with Google Authenticator or Microsoft Authenticator:</p>
          {qrCode ? <img src={qrCode} alt="Authenticator setup QR code" className="mx-auto rounded-xl bg-white p-3" width={264} height={264} /> : <p className="rounded-xl bg-white p-3 text-sm text-slate-600">Preparing QR code…</p>}
          <p className="text-xs text-slate-600">This setup QR stays the same until you confirm setup. The 6-digit code changes every 30 seconds.</p>
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-indigo-600">Can&apos;t scan? Show manual setup key</summary>
            <code className="mt-2 block break-all rounded-xl bg-white p-3 text-indigo-700">{setup.secret}</code>
            <a className="mt-2 inline-block font-semibold text-indigo-600 underline" href={setup.otpauthUrl}>Open authenticator link</a>
          </details>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Enter the 6-digit code" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          <button onClick={confirm} disabled={busy || !code.trim()} className="keep-white rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">Confirm setup</button>
        </div>
      ) : enabled ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Current 6-digit code" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button onClick={disable} disabled={busy || !code.trim()} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">Turn off</button>
        </div>
      ) : (
        <div className="mt-6">
          <button onClick={begin} disabled={busy} className="keep-white rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">Set up authenticator</button>
        </div>
      )}
      {backupCodes.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">Save these backup codes now</p>
          <p className="mt-1 text-xs text-amber-800">Each code can be used once if you lose access to your authenticator.</p>
          <code className="mt-3 grid grid-cols-2 gap-2 text-sm text-amber-950">{backupCodes.map((item) => <span key={item}>{item}</span>)}</code>
        </div>
      )}
    </section>
  );
}
