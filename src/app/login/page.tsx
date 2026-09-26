"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import { authFieldRing } from "@/components/ui/MarketingAuthLayout";

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
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        width: 320,
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

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      description="Use your work email to open the workspace."
      footer={
        <>
          New organization?{" "}
          <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-700">
            Start a free trial
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-[12px] font-bold text-slate-600">Work email</label>
          <div className={`flex items-center gap-3 rounded-full border bg-[#ffffff] px-4 py-3.5 transition-all ${authFieldRing(emailFocused)}`}>
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your work email"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12px] font-bold text-slate-600">Password</label>
            <Link href="/forgot-password" className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700">
              Forgot password?
            </Link>
          </div>
          <div className={`flex items-center gap-3 rounded-full border bg-[#ffffff] px-4 py-3.5 transition-all ${authFieldRing(passwordFocused)}`}>
            <Lock className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="keep-white mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.7)] transition hover:bg-blue-500 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {googleClientId ? (
        <>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#ffffff] px-3 text-[11px] text-slate-400">Or</span>
            </div>
          </div>
          <div id="google-signin" className="flex justify-center min-h-[40px]" />
        </>
      ) : null}
    </AuthShell>
  );
}
