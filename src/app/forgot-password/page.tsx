"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import Brand from "@/components/ui/Brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res?.success) {
        setSubmitted(true);
        if (res.resetUrl) {
          setDevResetUrl(res.resetUrl);
        }
        toast.success("Password reset instructions sent!");
      } else {
        toast.error(res?.message || "Failed to process forgot password request.");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to submit request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-mesh-radial relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center mb-4">
          <Brand subtitle="Workforce, in rhythm" />
        </div>

        <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">
          Reset your password
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your registered work email to receive password recovery instructions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 shadow-xl space-y-6"
        >
          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Check Your Inbox</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  If an account exists for <span className="font-semibold text-slate-900">{email}</span>, we have sent instructions to reset your password.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-600">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Security & Next Steps</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-500 text-xs">
                  <li>The reset link is active for <strong>60 minutes</strong>.</li>
                  <li>Check your spam or junk folder if you don't see it within a minute.</li>
                  <li>Each link is single-use and invalidates previous links.</li>
                </ul>
              </div>

              {/* Developer / Simulation Mode Instant Quick-Link */}
              {devResetUrl && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    <span>Development Testing Link</span>
                  </div>
                  <p className="text-xs text-indigo-700">
                    SMTP simulated dispatch detected. Click below to test password reset directly:
                  </p>
                  <a
                    href={devResetUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
                  >
                    <span>Proceed to Reset Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setDevResetUrl(null);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Need to try a different email address?
                </button>

                <Link
                  href="/login"
                  className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    required
                    autoFocus
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  We'll send a secure one-time password recovery link to this address.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Generating Secure Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-4 h-4 text-white" />
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
