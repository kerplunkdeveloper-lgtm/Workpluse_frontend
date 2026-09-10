'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  Lock,
  Mail,
  Building2,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    organizationName: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'COMPANY_ADMIN',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(formData);
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f8fafc] px-4 py-12 overflow-hidden">
      {/* Soft Pastel Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-purple-100/30 blur-3xl"></div>

      <div className="relative z-10 w-full max-w-lg">
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
              <span>Multi-Tenant Enterprise Setup</span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
              Create <span className="text-slate-950">Work</span><span className="text-[#0284c7]">Pulse</span><span className="text-xs text-slate-400">™</span> Account
            </h2>
            <p className="mt-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              People • Time • Growth • Together
            </p>
          </div>

          {error && (
            <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs font-semibold text-rose-700 animate-in fade-in-50 duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">Company / Organization Name</label>
              <div className="relative mt-1.5">
                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="organizationName"
                  required
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="Acme Global Corporation"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">First Name</label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Alex"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Last Name</label>
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Vance"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Work Email Address</label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="alex@acme.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Initial Account Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-xs"
              >
                <option value="COMPANY_ADMIN">Company Administrator (Full Organization Access)</option>
                <option value="MANAGER">Branch/Department Manager</option>
                <option value="EMPLOYEE">Employee (Personal Attendance Only)</option>
              </select>
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
                  <span>Create Account & Workspace</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link href="/login" prefetch={true} className="font-bold text-indigo-600 hover:text-indigo-700">
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
