'use client';

import React from 'react';
import Link from 'next/link';
import {
  Smartphone,
  MapPin,
  Clock,
  CalendarDays,
  Banknote,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Bell,
  Fingerprint,
  ChevronRight,
  Download,
  Building2,
} from 'lucide-react';

export default function MobileAppPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f8fafc] text-slate-900 overflow-x-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-sky-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-blue-100/30 blur-3xl"></div>

      {/* Top Navigation */}
      <header className="relative z-20 flex h-20 w-full items-center justify-between border-b border-slate-200/70 bg-white/80 px-6 sm:px-12 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-2xl shadow-md shadow-blue-500/15 border border-slate-100 bg-white p-1">
            <img
              src="/workpulse-logo.png"
              alt="WorkPulse Logo"
              className="h-full w-full object-contain rounded-xl"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-slate-900">
                Work<span className="text-[#0284c7]">Pulse</span>
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                Mobile
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dedicated Employee Edition
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
          >
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Admin & Manager Web Sign In</span>
          </Link>
        </div>
      </header>

      {/* Hero Container */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12 sm:px-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Context & Download */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 shadow-2xs">
              <Smartphone className="h-4 w-4 text-amber-600" />
              <span>Access Policy: Web Dashboard is for Admins & Managers</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              WorkPulse Mobile App <br />
              <span className="bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] bg-clip-text text-transparent">
                Built for Active Employees
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              To guarantee precision geofencing, on-device biometric security, and real-time push notifications,
              all regular employees access WorkPulse via the native mobile app on iOS and Android.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Geofence Verified Check-In</h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Punches are strictly verified within company office premises with live GPS radius tracking.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                  <Bell className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Automated Daily Reminders</h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Receive instant alerts at 08:50 AM to punch in, and 06:00 PM to punch out and finalize your shift.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-3">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">10-Second Leave Requests</h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Request sick, casual, or earned leaves in a few taps and track manager approvals live.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
                  <Banknote className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Payslip & Salary Downloads</h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Inspect your itemized earnings, statutory PF/ESI withholdings, and download PDF slips.
                </p>
              </div>
            </div>

            {/* Download & QR Action Banner */}
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white p-6 shadow-md shadow-indigo-500/5">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-200 bg-white p-3 shadow-xs shrink-0">
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-slate-900 text-white font-mono text-[10px] text-center p-2">
                    <div className="flex flex-col items-center gap-1">
                      <QrCode className="h-10 w-10 text-indigo-400" />
                      <span className="font-bold tracking-wider">SCAN TO INSTALL</span>
                    </div>
                  </div>
                  <span className="mt-2 text-[10px] font-bold text-slate-500">Android & iOS</span>
                </div>

                <div className="space-y-3 text-center sm:text-left flex-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Get the App on your device
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Scan the QR code or tap below to install the WorkPulse mobile app for instant check-in.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                    <button
                      onClick={() => alert('WorkPulse Mobile APK download started: workpulse-employee-v2.0.apk')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-md shadow-slate-900/20 active:scale-95"
                    >
                      <Download className="h-4 w-4 text-emerald-400" />
                      <span>Download Android APK</span>
                    </button>
                    <button
                      onClick={() => alert('Apple TestFlight invitation link copied. Open in Safari on your iPhone.')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-2xs active:scale-95"
                    >
                      <Smartphone className="h-4 w-4 text-blue-600" />
                      <span>iOS TestFlight</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Phone Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-[310px] sm:w-[330px] rounded-[48px] border-[10px] border-slate-900 bg-slate-900 p-2 shadow-2xl shadow-indigo-500/25 ring-1 ring-slate-800">
              {/* Phone Speaker Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 h-4 w-28 rounded-full bg-slate-800 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-slate-950 mr-2" />
                <div className="h-1.5 w-10 rounded-full bg-slate-700" />
              </div>

              {/* Phone Screen Screen Content */}
              <div className="relative rounded-[38px] bg-[#f8fafc] overflow-hidden pt-7 pb-6 px-4 text-slate-900 flex flex-col h-[600px]">
                {/* Status Bar */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-2 mb-3">
                  <span>08:50 AM</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">5G</span>
                    <div className="h-2 w-4 rounded-xs border border-slate-400 bg-emerald-500" />
                  </div>
                </div>

                {/* In-App Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      D
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">David Miller</h4>
                      <p className="text-[10px] font-medium text-slate-400">Pondicherry HQ • Software Eng</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                    Active
                  </span>
                </div>

                {/* Shift Reminder Banner */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 mb-3 shadow-2xs">
                  <div className="flex items-start gap-2">
                    <Bell className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold text-indigo-950">Morning Shift Reminder</p>
                      <p className="text-[10px] text-indigo-700 leading-snug">
                        Shift starts at 09:00 AM. Grace period active until 09:15 AM.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clock-In Radar Card */}
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-center my-auto">
                  <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-400/40 animate-ping" />
                    <Fingerprint className="h-10 w-10 text-white relative z-10" />
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Within Geofence (18m)
                  </span>

                  <h3 className="mt-2 text-sm font-black text-slate-900">Pondicherry HQ Office</h3>
                  <p className="text-[10px] text-slate-400">Wi-Fi: WorkPulse_Secure_5G</p>

                  <button
                    onClick={() => alert('Mobile Attendance Punch Simulated: Clocked in at 08:50 AM')}
                    className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                  >
                    Tap to Punch In
                  </button>
                </div>

                {/* Quick Nav Bottom Pill */}
                <div className="mt-auto grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1 text-center text-[10px] font-bold text-slate-600 shadow-2xs">
                  <div className="p-1.5 text-indigo-600 rounded-xl bg-indigo-50">Punch</div>
                  <div className="p-1.5">Leaves</div>
                  <div className="p-1.5">Payslips</div>
                  <div className="p-1.5">Profile</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
