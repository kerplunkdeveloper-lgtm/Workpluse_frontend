"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import Brand from "@/components/ui/Brand";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
    }
  }, [initialToken]);

  // Password requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    hasMinLength &&
    hasUppercase &&
    hasNumber &&
    passwordsMatch &&
    token.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage("Password reset token is missing. Please click the link from your email.");
      return;
    }

    if (!isFormValid) return;

    setSubmitting(true);
    try {
      const res = await authApi.resetPassword({
        token: token.trim(),
        newPassword,
      });

      if (res?.success) {
        setSuccess(true);
        toast.success("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setErrorMessage(res?.message || "Failed to reset password.");
        toast.error(res?.message || "Failed to reset password.");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to reset password. The link may have expired.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-mesh-radial relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center mb-4">
          <Brand subtitle="Workforce, in rhythm" />
        </div>

        <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">
          Create a new password
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Your new password must be secure and different from previous passwords
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 shadow-xl space-y-6"
        >
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Password Reset Complete!</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Your password has been successfully updated. All active sessions have been secured.
                Redirecting you to login...
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                >
                  <span>Sign In Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div className="space-y-1">
                    <p className="font-semibold">{errorMessage}</p>
                    <p className="text-xs text-rose-600">
                      Reset links are single-use and expire after 60 minutes.
                    </p>
                    <Link
                      href="/forgot-password"
                      className="inline-block text-xs font-bold underline text-rose-800 hover:text-rose-950 mt-1"
                    >
                      Request a new password reset link &rarr;
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Token input (only if missing from URL) */}
              {!initialToken && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[13px] font-medium text-slate-700">
                      Reset Token
                    </label>
                    <span className="text-xs text-slate-400">From your reset email</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste your reset token here"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      required
                    />
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength checklist */}
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs text-slate-500">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-semibold" : ""}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-500" : "text-slate-300"}`} />
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-600 font-semibold" : ""}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasUppercase ? "text-emerald-500" : "text-slate-300"}`} />
                    <span>Uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-semibold" : ""}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-500" : "text-slate-300"}`} />
                    <span>At least 1 number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-600 font-semibold" : ""}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecial ? "text-emerald-500" : "text-slate-300"}`} />
                    <span>Special character</span>
                  </div>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    required
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Reset Password & Sign In</span>
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-slate-200 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
