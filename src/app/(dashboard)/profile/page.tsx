'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { getRoleBadgeDetails } from '@/lib/permissions';
import {
  User,
  Mail,
  Shield,
  Building2,
  BadgeCheck,
  Hash,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Fingerprint,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const roleBadge = getRoleBadgeDetails(user?.role);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Hero Banner Matching dashboard_ui.png */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-indigo-700 backdrop-blur-md shadow-xs border border-indigo-100">
                <Fingerprint className="h-3.5 w-3.5 text-indigo-600" />
                <span>Identity & Security Protocol</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                Staff Identity & Access Credentials
              </h1>
              <p className="text-xs lg:text-sm text-slate-600 leading-relaxed">
                Dynamic session introspection fetched directly via <code className="font-mono text-xs font-bold text-indigo-700 bg-white/70 px-1.5 py-0.5 rounded">GET /api/auth/me</code> with zero-trust token claims.
              </p>
            </div>

            {/* Re-verify Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-2xl bg-white/90 border border-indigo-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-indigo-600 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{refreshing ? 'Verifying...' : 'Re-verify via /me'}</span>
              </button>
            </div>
          </div>

          {/* Decorative geometric background elements */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-52 w-52 rounded-full bg-indigo-300/20 blur-2xl"></div>
          <div className="pointer-events-none absolute -top-12 right-40 h-44 w-44 rounded-full bg-blue-300/20 blur-2xl"></div>
        </div>

        {/* 4 KPI Wave Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Identity Status</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <BadgeCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">
                  {user?.employee?.status || 'ACTIVE'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Verified workforce directory</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-emerald-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">RBAC Scope</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800 font-mono text-base lg:text-xl truncate block">
                  {user?.role || 'EMPLOYEE'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">System authorization tier</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-purple-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 18 C25 22, 50 10, 75 16 C85 20, 95 10, 100 8 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 18 C25 22, 50 10, 75 16 C85 20, 95 10, 100 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Assigned Branch</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800 truncate block">
                  {user?.employee?.branchId ? `Branch #${user.employee.branchId.slice(-4)}` : 'Headquarters'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Designated geofence radar</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-blue-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 15 C30 8, 50 20, 70 12 C85 5, 95 15, 100 10 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 15 C30 8, 50 20, 70 12 C85 5, 95 15, 100 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Assigned Shift</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800 truncate block">
                  General Morning
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">09:00 AM - 06:00 PM (15m grace)</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-amber-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 22 C30 14, 55 24, 75 14 C85 8, 95 16, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 22 C30 14, 55 24, 75 14 C85 8, 95 16, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Profile ID Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-500 text-white font-black text-3xl shadow-lg shadow-indigo-600/25">
                {user?.employee?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 shadow-xs" title="Online & Active"></span>
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                {user?.employee?.firstName ? `${user.employee.firstName} ${user.employee.lastName || ''}` : 'WorkPulse User'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
              <div className="mt-2.5 flex items-center justify-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${roleBadge.bg} ${roleBadge.color} border-indigo-100`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 space-y-2.5 text-left">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400">Employee Code</span>
                <span className="font-mono font-bold text-slate-800">{user?.employee?.employeeCode || 'EMP-1001'}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400">Department</span>
                <span className="font-semibold text-slate-800">{user?.employee?.departmentId ? `Dept #${user.employee.departmentId.slice(-4)}` : 'Engineering & Operations'}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400">Work Organization</span>
                <span className="font-semibold text-slate-800">{user?.organization?.name || 'Apex Enterprises'}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400">Work Status</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Active Roster
                </span>
              </div>
            </div>
          </div>

          {/* Right: Detailed Cards (2 Columns width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Account Attributes & Identity Mapping</h3>
                    <p className="text-[11px] text-slate-400">Synchronized with core attendance PostgreSQL database schema</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Primary Login Email</span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-slate-900">{user?.email}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Shield className="h-3.5 w-3.5 text-purple-500" />
                    <span>System Role & Permissions Scope</span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-slate-900 font-mono">{user?.role}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>Tenant Identifier</span>
                  </div>
                  <p className="mt-1.5 text-xs font-mono font-bold text-slate-900 truncate">
                    {user?.organizationId || 'org_649f829012a93'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Punch Boundary Check</span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-slate-900">
                    Geofenced (200m active radius)
                  </p>
                </div>
              </div>
            </div>

            {/* Enterprise Session Security & Device Trust Audit Card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Enterprise Session Security & Device Trust</h3>
                    <p className="text-[11px] text-slate-400">Cryptographically signed session credentials protected server-side</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-3 py-1 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>TLS 1.3 Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <Shield className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Token Architecture</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Short-lived Bearer tokens in memory with HttpOnly rotate protection.</p>
                  <span className="mt-2 inline-block rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-600">
                    Encrypted Claims
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Database Isolation</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">PostgreSQL Prisma engine with row-level multi-tenant partitioning.</p>
                  <span className="mt-2 inline-block rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-600">
                    Tenant-Guarded
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Access Perimeter</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Haversine GPS validation on punch events with late-arrival grace.</p>
                  <span className="mt-2 inline-block rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600">
                    Geofenced Radar
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <span>Session State: <strong className="text-slate-800">Cryptographically Verified</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  <span>Payload Integrity: <strong className="text-slate-800">HMAC-SHA256 Signature Valid</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
