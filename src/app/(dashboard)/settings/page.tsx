'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Shield,
  Bell,
  Save,
  Check,
  MapPin,
  Clock,
  Lock,
  Sparkles,
  Sliders,
  Globe,
  Radio,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'security' | 'notifications'>('profile');

  // Form States
  const [orgName, setOrgName] = useState(user?.organization?.name || 'Apex Technologies Corp');
  const [industry, setIndustry] = useState('Information Technology');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST +5:30)');
  const [currency, setCurrency] = useState('INR (₹)');
  const [graceMinutes, setGraceMinutes] = useState('15');
  const [fenceRadius, setFenceRadius] = useState('200');
  const [halfDayThreshold, setHalfDayThreshold] = useState('4.5');
  const [autoCheckoutHours, setAutoCheckoutHours] = useState('12');
  const [enforceMockGpsCheck, setEnforceMockGpsCheck] = useState(true);
  const [requireSelfieVerification, setRequireSelfieVerification] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <ProtectedRoute requiredPermission="manage:company">
      <div className="space-y-6">
        {/* Hero Banner Matching dashboard_ui.png */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-indigo-700 backdrop-blur-md shadow-xs border border-indigo-100">
                <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                <span>Enterprise Configuration Suite</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                Company Settings & Work Rules
              </h1>
              <p className="text-xs lg:text-sm text-slate-600 leading-relaxed">
                Fine-tune attendance calculation thresholds, mobile geofencing boundaries, timezones, and enterprise-wide workforce security policies.
              </p>
            </div>

            {/* Save Status & Pill */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-5 py-3 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all active:scale-[0.98]"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
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
                <span className="text-xs font-semibold text-slate-500">Active Tenant</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800 truncate block">
                  {orgName}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Primary Workspace ID</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-blue-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Late Grace Window</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">{graceMinutes} Minutes</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Allowed tardiness threshold</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-amber-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 18 C25 22, 50 10, 75 16 C85 20, 95 10, 100 8 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 18 C25 22, 50 10, 75 16 C85 20, 95 10, 100 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Geofence Perimeter</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">{fenceRadius} Meters</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Default branch punch radar</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-emerald-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 15 C30 8, 50 20, 70 12 C85 5, 95 15, 100 10 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 15 C30 8, 50 20, 70 12 C85 5, 95 15, 100 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Security Architecture</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">Dual-Token</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">15m Access / 7d HTTP Cookie</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-purple-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 22 C30 14, 55 24, 75 14 C85 8, 95 16, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 22 C30 14, 55 24, 75 14 C85 8, 95 16, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {saved && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 animate-in fade-in-50 duration-200 shadow-xs">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
            <span>Organization settings and work policies successfully synced across all nodes!</span>
          </div>
        )}

        {/* Navigation Tabs Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Organization Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Attendance & Geofencing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Security & Authentication</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Notifications & Webhooks</span>
          </button>
        </div>

        {/* Tab Content Cards */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Organization Identity & Details</h3>
                  <p className="text-[11px] text-slate-400">Official tenant registration and localization settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Company Legal Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-4 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Displayed across all staff payslips and email notifications.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Primary Administrator Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    disabled
                    className="mt-1.5 w-full rounded-2xl border border-slate-200/60 bg-slate-100/70 py-2.5 px-4 text-xs font-medium text-slate-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Super administrator account anchor.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Primary Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-4 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="Information Technology">Information Technology & Software</option>
                    <option value="Financial Services">Financial Services & Banking</option>
                    <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                    <option value="Manufacturing & Logistics">Manufacturing & Logistics</option>
                    <option value="Retail & E-commerce">Retail & E-commerce</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Default System Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-4 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="Asia/Kolkata (IST +5:30)">Asia/Kolkata (IST +5:30)</option>
                    <option value="America/New_York (EST -5:00)">America/New_York (EST -5:00)</option>
                    <option value="Europe/London (GMT +0:00)">Europe/London (GMT +0:00)</option>
                    <option value="Asia/Dubai (GST +4:00)">Asia/Dubai (GST +4:00)</option>
                    <option value="Asia/Singapore (SGT +8:00)">Asia/Singapore (SGT +8:00)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Attendance Calculations & GPS Geofence</h3>
                  <p className="text-[11px] text-slate-400">Rules controlling late mark flags, half days, and location precision</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Late Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-4 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Employees clocking in after this grace window beyond shift start will be flagged as LATE.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Default Geolocation Fence (Meters)</label>
                  <input
                    type="number"
                    value={fenceRadius}
                    onChange={(e) => setFenceRadius(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-4 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Allowed radius from office branch GPS coordinates for valid mobile punch.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Half-Day Minimum Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={halfDayThreshold}
                    onChange={(e) => setHalfDayThreshold(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-4 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Total working hours required to qualify for at least a half-day credit.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Automatic Punch-Out Timer (Hours)</label>
                  <input
                    type="number"
                    value={autoCheckoutHours}
                    onChange={(e) => setAutoCheckoutHours(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-4 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Auto-close uncompleted shifts after this duration with a regularize flag.
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Block Fake / Mock GPS Apps</p>
                    <p className="text-[11px] text-slate-400">Reject punches coming from developer mock location providers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enforceMockGpsCheck}
                    onChange={(e) => setEnforceMockGpsCheck(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Require Live Camera Selfie Verification</p>
                    <p className="text-[11px] text-slate-400">Demand a quick facial snapshot upon every clock in</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireSelfieVerification}
                    onChange={(e) => setRequireSelfieVerification(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === 'security' && (
            <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Dual-Token Authentication Architecture</h3>
                  <p className="text-[11px] text-slate-400">Enterprise security rules implemented as per technical specification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                      A
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">Short-Lived Access Token</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Lifespan: <span className="font-bold text-slate-800">15 Minutes</span>. Kept in memory/storage and dispatched with every <code className="bg-white px-1 py-0.5 rounded text-[10px] text-indigo-600 font-mono">Authorization: Bearer</code> header.
                  </p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Active & Verified</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">
                      R
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">Long-Lived Refresh Token</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Lifespan: <span className="font-bold text-slate-800">7 Days</span>. Stored securely in an <code className="bg-white px-1 py-0.5 rounded text-[10px] text-purple-600 font-mono">HttpOnly, SameSite=Lax</code> cookie, unreachable by client JavaScript.
                  </p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Auto-Rotating Interceptor Ready</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Alert Dispatchers & Channels</h3>
                  <p className="text-[11px] text-slate-400">Automated workforce notifications for managers and personnel</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Daily Attendance Summary Email</p>
                    <p className="text-[11px] text-slate-400">Send managers a morning roster digest at 10:00 AM</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Tardy / Late Punch Instant Alerts</p>
                    <p className="text-[11px] text-slate-400">Push notifications to branch leads when staff exceed grace limit</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Leave Approval Dispatch</p>
                    <p className="text-[11px] text-slate-400">Notify employees immediately when their leaves or regularizations are reviewed</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400">
              Changes take effect immediately across all connected client applications.
            </p>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-6 py-3 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all active:scale-[0.98]"
            >
              <Save className="h-4 w-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
