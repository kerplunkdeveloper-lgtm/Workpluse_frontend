"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, setSessionAccessToken } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function SsoCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing company sign-in…");

  useEffect(() => {
    let cancelled = false;
    const complete = async () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const code = params.get("code");
      if (error || !code) {
        setMessage("Company sign-in could not be completed. Please try again.");
        window.setTimeout(() => router.replace("/login"), 1800);
        return;
      }
      try {
        const result = await authApi.exchangeSso(code);
        if (cancelled) return;
        if (result?.data?.twoFactorRequired && result.data.challengeToken) {
          sessionStorage.setItem("workpulse_2fa_challenge", result.data.challengeToken);
          router.replace("/two-factor");
          return;
        }
        const accessToken = result?.data?.accessToken || result?.data?.token;
        if (!result?.success || !accessToken) throw new Error("No session was returned");
        setSessionAccessToken(accessToken);
        window.location.replace("/dashboard");
      } catch {
        setMessage("Company sign-in failed or the one-time code expired.");
        window.setTimeout(() => router.replace("/login"), 1800);
      }
    };
    void complete();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-700">{message}</p>
      </div>
    </main>
  );
}
