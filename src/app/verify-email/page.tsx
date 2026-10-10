"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import AuthShell from "@/components/ui/AuthShell";
import { authFieldRing } from "@/components/ui/MarketingAuthLayout";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailForm() {
  const { verifyEmail } = useAuth();
  const params = useSearchParams();
  const email = (params.get("email") || "").trim().toLowerCase();
  const checkoutPlan = params.get("checkout");
  const shouldResendOnLoad = params.get("resend") === "1";

  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const autoResent = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN_SECONDS);
    try {
      const res = await authApi.resendVerification(email);
      toast.success(res?.message || "A new code has been sent.");
    } catch {
      toast.error("Could not send a new code. Please try again shortly.");
      setCooldown(0);
    }
  };

  useEffect(() => {
    if (shouldResendOnLoad && email && !autoResent.current) {
      autoResent.current = true;
      void resend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldResendOnLoad, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyEmail(email, code, checkoutPlan);
    } finally {
      setSubmitting(false);
    }
  };

  if (!email) {
    return (
      <p className="text-sm text-slate-600">
        We couldn&apos;t tell which account to verify.{" "}
        <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700">
          Go to sign in
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 truncate">
          Code sent to <strong className="text-slate-900">{email}</strong>
        </span>
      </div>

      <div>
        <label htmlFor="verify-code" className="mb-2 block text-[12px] font-medium text-slate-600">
          6-digit verification code
        </label>
        <div className={`flex items-center gap-3 rounded-full border bg-[#ffffff] px-4 py-3.5 transition-all ${authFieldRing(focused)}`}>
          <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            id="verify-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="123456"
            className="min-w-0 flex-1 bg-transparent font-mono text-lg tracking-[0.4em] text-slate-900 outline-none placeholder:text-slate-300"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || code.length !== 6}
        className="keep-white mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.7)] transition hover:bg-blue-500 active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Verify email
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-[13px] text-slate-500">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </form>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="Verify email"
      title="Check your inbox"
      description="Enter the code we emailed you to activate your account. It expires in 15 minutes."
      footer={
        <>
          Already verified?{" "}
          <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
