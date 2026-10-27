"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff, Building2 } from "lucide-react";
import AuthShell, {
  AuthDivider,
  authIcon,
  authInput,
  authInputWrap,
  authLabel,
  authPrimaryButton,
  authSecondaryButton,
} from "@/components/ui/AuthShell";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const loginWithGoogleRef = useRef(loginWithGoogle);

  useEffect(() => {
    loginWithGoogleRef.current = loginWithGoogle;
  }, [loginWithGoogle]);

  useEffect(() => {
    if (!googleClientId) return;
    const existing = document.getElementById("google-gis");
    const mount = () => {
      const el = document.getElementById("google-signin");
      if (!el || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (res) => {
          if (res?.credential) await loginWithGoogleRef.current(res.credential);
        },
      });
      el.innerHTML = "";
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
      });
    };
    if (existing && window.google?.accounts?.id) {
      mount();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gis";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = mount;
    document.body.appendChild(script);
  }, [googleClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  };

  const handleSso = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Enter your work email first to continue with company SSO.");
      return;
    }
    setSsoLoading(true);
    try {
      const result = await authApi.discoverSso(cleanEmail);
      if (!result?.enabled || !result.startUrl) {
        toast.error("Company SSO is not enabled for this account.");
        return;
      }
      window.location.assign(result.startUrl);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Company SSO is temporarily unavailable.");
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      description="Sign in with your office email, personal email or employee code."
      footer={
        <>
          New organization?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Start a free trial
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className={authLabel}>Office email, personal email or employee code</label>
          <div className={authInputWrap()}>
            <Mail className={authIcon} />
            <input
              type="text"
              inputMode="email"
              id="login-email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={authInput}
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-[13px] font-semibold text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700">
              Forgot password?
            </Link>
          </div>
          <div className={authInputWrap()}>
            <Lock className={authIcon} />
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={authInput}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={submitting} className={authPrimaryButton}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <AuthDivider>or continue with</AuthDivider>

      <div className="space-y-3">
        {googleClientId ? <div id="google-signin" className="flex min-h-[44px] justify-center" /> : null}
        <button type="button" onClick={handleSso} disabled={ssoLoading} className={authSecondaryButton}>
          {ssoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-[18px] w-[18px] text-slate-500" />}
          Company SSO
        </button>
      </div>
    </AuthShell>
  );
}
