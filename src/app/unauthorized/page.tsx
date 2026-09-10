'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut, Lock, Sparkles } from 'lucide-react';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#f8fafc] px-4 text-center overflow-hidden">
      {/* Soft Pastel Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-rose-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-100 bg-white/95 p-8 sm:p-9 shadow-xl shadow-rose-500/5 backdrop-blur-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 text-rose-500 shadow-md shadow-rose-500/15 mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
          <Lock className="h-3.5 w-3.5 text-rose-600" />
          <span>RBAC Access Blocked</span>
        </div>

        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">403 — Access Denied</h1>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Your current session role (<span className="text-rose-600 font-black">{user?.role || 'Guest'}</span>) does not possess sufficient privileges to inspect this resource.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>

          <button
            onClick={logout}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
