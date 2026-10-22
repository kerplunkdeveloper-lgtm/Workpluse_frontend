"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Key, Loader2, CheckCircle2, X, Mail, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

interface UnlockPlanModalProps {
  isOpen: boolean;
  organizationName?: string;
  onSuccess: () => void;
  onClose?: () => void;
}

export default function UnlockPlanModal({
  isOpen,
  organizationName,
  onSuccess,
  onClose,
}: UnlockPlanModalProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) {
      setError("Please enter your unlock code.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const result = await authApi.activatePlan(cleaned);
      if (result?.success) {
        toast.success(result.message || "🎉 Plan activated! Dashboard is now fully unlocked.");
        onSuccess();
      } else {
        setError(result?.message || "Invalid unlock code. Please try again.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid unlock code. Check your email and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="relative p-8">
            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Icon + Title */}
            <div className="flex flex-col items-center text-center mb-8">
              <motion.div
                className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4"
                animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Lock className="w-7 h-7 text-amber-600" />
              </motion.div>

              <h2 className="text-xl font-semibold text-slate-900 mb-2">Activate Your Plan</h2>
              <p className="text-sm text-slate-500 max-w-xs">
                Enter the unlock code sent to your email when you registered{" "}
                {organizationName && (
                  <span className="text-indigo-600 font-medium">{organizationName}</span>
                )}.
              </p>
            </div>

            {/* Email hint */}
            <div className="flex items-center gap-2.5 mb-6 px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-200">
              <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
              <p className="text-xs text-indigo-900">
                Check your inbox for an email from WorkPulse with subject:{" "}
                <span className="font-mono font-semibold">"[WorkPulse] Your Plan Unlock Code"</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Unlock Code
                </label>
                <input
                  ref={inputRef}
                  id="unlock-code-input"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setError(null);
                    setCode(e.target.value.toUpperCase());
                  }}
                  placeholder="WP-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-mono text-lg tracking-widest placeholder:text-slate-400 placeholder:text-base placeholder:tracking-normal outline-none transition"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Use the unlock code emailed to the workspace owner.
                </p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isLoading || !code.trim()}
                  id="activate-plan-btn"
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Activate Plan
                    </>
                  )}
                </button>

              </div>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500">
              Can't find your code?{" "}
              <a href="mailto:support@workpulse.com" className="text-indigo-600 hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
