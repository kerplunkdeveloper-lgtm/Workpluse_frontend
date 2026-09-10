'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import { UserRole, Permission } from '@/types/auth';
import {
  ShieldCheck,
  Check,
  X,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Shield,
  UserCheck,
  Lock,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  Server,
  Terminal,
  HelpCircle,
} from 'lucide-react';

const allPermissions: { key: Permission; label: string; description: string; category: string }[] = [
  { key: 'manage:organizations', label: 'Manage All Organizations', description: 'System-wide tenant provisioning and multi-tenant access', category: 'Tenancy' },
  { key: 'manage:company', label: 'Company Profile & Settings', description: 'Configure organization name, shift policies, and branches', category: 'Administration' },
  { key: 'manage:branches', label: 'Branch & Geofence Config', description: 'Manage branch locations, GPS coordinates, and radius', category: 'Geofencing' },
  { key: 'manage:departments', label: 'Department Structure', description: 'Create and assign departments across the workforce', category: 'Workforce' },
  { key: 'manage:employees', label: 'Employee Management', description: 'Create employee records, update status, and assign roles', category: 'Workforce' },
  { key: 'manage:shifts', label: 'Shift Schedules', description: 'Define work shifts, grace periods, and break windows', category: 'Operations' },
  { key: 'view:all_attendance', label: 'View All Workforce Attendance', description: 'Access organization-wide attendance history and reports', category: 'Attendance' },
  { key: 'mark:attendance', label: 'Clock In / Clock Out', description: 'Record personal attendance events and timestamps', category: 'Attendance' },
  { key: 'view:my_attendance', label: 'View Personal Attendance', description: 'Access individual attendance records and punch history', category: 'Personal' },
  { key: 'view:reports', label: 'Analytics & Audit Reports', description: 'Export attendance metrics, late rates, and overtime logs', category: 'Analytics' },
];

const roles: { role: UserRole; title: string; color: string; bg: string; border: string }[] = [
  { role: 'SUPER_ADMIN', title: 'Super Admin', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { role: 'COMPANY_ADMIN', title: 'Company Admin', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { role: 'MANAGER', title: 'Branch Manager', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { role: 'EMPLOYEE', title: 'Staff Employee', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
];

export default function PermissionsMatrixPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [testResult, setTestResult] = useState<{
    endpoint: string;
    status: number;
    success: boolean;
    message: string;
    timestamp: string;
  } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const categories = ['ALL', 'Tenancy', 'Administration', 'Geofencing', 'Workforce', 'Operations', 'Attendance', 'Analytics'];

  const filteredPermissions = allPermissions.filter((perm) => {
    const matchesSearch =
      perm.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || perm.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const testEndpoint = async (endpoint: string, label: string, displayGate: string) => {
    setTesting(label);
    setTestResult(null);
    try {
      const res = await api.get(endpoint);
      setTestResult({
        endpoint: displayGate,
        status: res.status,
        success: true,
        message: res.data?.message || 'Access verified — Identity authorized for this security tier.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
        setTestResult({
          endpoint: displayGate,
          status: axiosErr.response?.status || 403,
          success: false,
          message: axiosErr.response?.data?.message || 'Access Forbidden (403) — Policy Enforced',
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        setTestResult({
          endpoint: displayGate,
          status: 500,
          success: false,
          message: 'Network request failed or connection timed out.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } finally {
      setTesting(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
      <div className="space-y-6">
        {/* Hero Banner Matching dashboard_ui.png */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-indigo-700 backdrop-blur-md shadow-xs border border-indigo-100">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Zero-Trust RBAC Governance Engine</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                Role Permissions & API Security Gate
              </h1>
              <p className="text-xs lg:text-sm text-slate-600 leading-relaxed">
                Review verified role privilege scopes, inspect granular backend middleware capabilities, and test real-time endpoint guardrails for signed-in identities.
              </p>
            </div>

            {/* Right Badge / Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="rounded-2xl bg-white/80 backdrop-blur-md p-3.5 border border-indigo-100/80 shadow-xs flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Session Role</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-black text-slate-800 tracking-wide font-mono">
                      {user?.role || 'AUTHENTICATED'}
                    </span>
                  </div>
                </div>
              </div>
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
                <span className="text-xs font-semibold text-slate-500">Configured Roles</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">4 Defined</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Hierarchical system roles</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-purple-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Permission Gates</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <KeyRound className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">10 Policies</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Granular endpoint checkpoints</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-emerald-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 18 C25 22, 50 10, 75 16 C85 20, 95 10, 100 8 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 18 C25 22, 50 10, 75 16 C85 20, 95 10, 100 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Security Guard</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">100% Strict</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">JWT header signature checks</p>
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
                <span className="text-xs font-semibold text-slate-500">Active Tenant</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800 truncate block">
                  {user?.organization?.name || 'Enterprise'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Isolated database namespace</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-amber-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 22 C30 14, 55 24, 75 14 C85 8, 95 16, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 22 C30 14, 55 24, 75 14 C85 8, 95 16, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Live Backend RBAC Tester Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Terminal className="h-4 w-4" />
                </span>
                <h2 className="text-base font-bold text-slate-800">Live API Guardrail Simulation</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Trigger real HTTP requests to backend protected routes using your current authentication header.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Session Bearer:</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => testEndpoint('/auth/admin-only', 'admin', 'Gate: Enterprise Admin Security Tier')}
              disabled={!!testing}
              className="flex items-center justify-between rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50/50 p-4 text-left transition-all hover:border-purple-300 hover:shadow-xs disabled:opacity-50 group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-purple-500"></span>
                  <p className="text-xs font-bold text-purple-900">Admin Security Tier</p>
                </div>
                <p className="text-[11px] font-mono text-purple-700/80 mt-1">Role Scope: COMPANY_ADMIN+</p>
                <p className="text-[10px] text-slate-400 mt-1">Tenant provisioning, payroll approvals & configuration</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-purple-600 shadow-xs group-hover:scale-105 transition-transform">
                {testing === 'admin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-purple-600" />}
              </div>
            </button>

            <button
              onClick={() => testEndpoint('/auth/manager-only', 'manager', 'Gate: Operations Management Tier')}
              disabled={!!testing}
              className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 text-left transition-all hover:border-emerald-300 hover:shadow-xs disabled:opacity-50 group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  <p className="text-xs font-bold text-emerald-900">Operations Manager Tier</p>
                </div>
                <p className="text-[11px] font-mono text-emerald-700/80 mt-1">Role Scope: MANAGER+</p>
                <p className="text-[10px] text-slate-400 mt-1">Branch roster management & shift scheduling</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-xs group-hover:scale-105 transition-transform">
                {testing === 'manager' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-emerald-600" />}
              </div>
            </button>

            <button
              onClick={() => testEndpoint('/auth/employee-only', 'employee', 'Gate: Workforce Staff Tier')}
              disabled={!!testing}
              className="flex items-center justify-between rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50/50 p-4 text-left transition-all hover:border-blue-300 hover:shadow-xs disabled:opacity-50 group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                  <p className="text-xs font-bold text-blue-900">Workforce Staff Tier</p>
                </div>
                <p className="text-[11px] font-mono text-blue-700/80 mt-1">Role Scope: EMPLOYEE (Active)</p>
                <p className="text-[10px] text-slate-400 mt-1">Personal attendance punches & leave submission</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-600 shadow-xs group-hover:scale-105 transition-transform">
                {testing === 'employee' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-blue-600" />}
              </div>
            </button>
          </div>

          {/* Execution Output Box */}
          {testResult && (
            <div
              className={`mt-4 rounded-2xl border p-4.5 transition-all animate-in fade-in-50 duration-200 ${
                testResult.success
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                  : 'border-rose-200 bg-rose-50/70 text-rose-900'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  {testResult.success ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  )}
                  <span className="font-mono text-xs">
                    HTTP {testResult.status} &bull; {testResult.endpoint}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      testResult.success ? 'bg-emerald-200/80 text-emerald-800' : 'bg-rose-200/80 text-rose-800'
                    }`}
                  >
                    {testResult.success ? 'AUTHORIZED' : 'ACCESS DENIED'}
                  </span>
                </div>
                <span className="text-[11px] opacity-75 font-mono">{testResult.timestamp}</span>
              </div>
              <p className="mt-2 text-xs font-medium pl-8">{testResult.message}</p>
            </div>
          )}
        </div>

        {/* Matrix Table Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          {/* Filter and Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800">RBAC Role-Capability Matrix</h3>
                <p className="text-[11px] text-slate-400">Showing {filteredPermissions.length} matching permission rules</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-md">
                {categories.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all w-44"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-4 px-6 min-w-[280px]">Feature & Security Scope</th>
                  <th className="py-4 px-3 text-center">Category</th>
                  {roles.map((r) => (
                    <th key={r.role} className="py-4 px-4 text-center min-w-[120px]">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.bg} ${r.color} ${r.border} border`}>
                          {r.title}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPermissions.map((perm) => (
                  <tr key={perm.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                          <KeyRound className="h-3 w-3" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{perm.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{perm.description}</div>
                          <div className="mt-1 font-mono text-[10px] text-indigo-600 bg-indigo-50/80 inline-block px-1.5 py-0.5 rounded">
                            {perm.key}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {perm.category}
                      </span>
                    </td>
                    {roles.map((r) => {
                      const hasPerm = ROLE_PERMISSIONS[r.role].includes(perm.key);
                      return (
                        <td key={r.role} className="py-4 px-4 text-center">
                          {hasPerm ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                              <X className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
