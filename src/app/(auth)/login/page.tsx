'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMobileOnlyError, setIsMobileOnlyError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsMobileOnlyError(false);
    setLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      const code = err.response?.data?.code;
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to sign in. Please verify your credentials.';

      if (code === 'MOBILE_APP_REQUIRED' || msg.toLowerCase().includes('mobile app')) {
        setIsMobileOnlyError(true);
        setError(
          'Web dashboard is restricted to Administrators and Managers. Employees must use the WorkPulse Mobile App to clock in and manage attendance.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setIsMobileOnlyError(false);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f8fafc] px-4 py-12 overflow-hidden">
      {/* Soft Pastel Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-purple-100/30 blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-4 flex items-center justify-between px-1">
          <Link
            href="/landing"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <span>&larr; Back to Home</span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            WorkPulse v2.0
          </span>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-slate-100 bg-white/95 p-8 sm:p-9 shadow-xl shadow-indigo-500/5 backdrop-blur-md">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-3xl shadow-xl shadow-blue-500/15 border border-slate-100 bg-white p-1">
              <img
                src="/workpulse-logo.png"
                alt="WorkPulse Logo"
                className="h-full w-full object-contain rounded-2xl"
              />
            </div>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Admin & Manager Web Portal</span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
              Sign in to <span className="text-slate-950">Work</span><span className="text-[#0284c7]">Pulse</span><span className="text-xs text-slate-400">™</span>
            </h2>
            <p className="mt-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              People • Time • Growth • Together
            </p>
          </div>

          {error && (
            <div
              className={`mt-5 rounded-2xl p-3.5 text-xs font-medium animate-in fade-in-50 duration-200 ${
                isMobileOnlyError
                  ? 'border border-amber-200 bg-amber-50/90 text-amber-900'
                  : 'border border-rose-200 bg-rose-50/80 text-rose-700'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    isMobileOnlyError ? 'text-amber-600' : 'text-rose-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-relaxed">{error}</p>
                  {isMobileOnlyError && (
                    <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-amber-800">
                        Employees use the mobile app on phone:
                      </span>
                      <Link
                        href="/mobile-app"
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs"
                      >
                        <span>Open Mobile App</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">Work Email Address</label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@workpulse.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Password</label>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg hover:shadow-blue-500/35 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Web Portal</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Quick 1-Click Demo Logins:
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@workpulse.com', 'Password@123')}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2 px-1 text-[11px] font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-xs transition-all"
                title="Sign in as Administrator (Full Access)"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                <span className="truncate">Admin (Web)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('manager@workpulse.com', 'Password@123')}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2 px-1 text-[11px] font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-600 hover:shadow-xs transition-all"
                title="Sign in as Manager (Department & Team Access)"
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="truncate">Manager (Web)</span>
              </button>

              <Link
                href="/mobile-app"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50/50 py-2 px-1 text-[11px] font-bold text-amber-800 hover:border-amber-300 hover:bg-amber-50 hover:shadow-xs transition-all"
                title="Employees use the WorkPulse Mobile App"
              >
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="truncate">Employee (Mobile)</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Need a new company workspace?{' '}
            <Link href="/register" prefetch={true} className="font-bold text-indigo-600 hover:text-indigo-700">
              Register organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
