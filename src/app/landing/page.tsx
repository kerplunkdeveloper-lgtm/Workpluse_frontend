'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  MapPin,
  Clock,
  Banknote,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  CalendarCheck,
  FileSpreadsheet,
  Award,
  BarChart3,
  Building2,
  Laptop,
  Check,
  ChevronRight,
  Shield,
  FileText,
  Star,
  Layers,
  ChevronDown,
} from 'lucide-react';

export default function LandingPage() {
  // Interactive CTC Calculator State for Hero Teaser
  const [ctcAnnual, setCtcAnnual] = useState<number>(600000);

  const monthlyCtc = Math.round(ctcAnnual / 12);
  const basicSalary = Math.round(monthlyCtc * 0.5);
  const hra = Math.round(basicSalary * 0.5);
  const transportAllowance = 3000;
  const specialAllowance = Math.max(0, monthlyCtc - (basicSalary + hra + transportAllowance));
  const pfEmployee = Math.round(basicSalary * 0.12);
  const esiEmployee = monthlyCtc <= 21000 ? Math.round(monthlyCtc * 0.0075) : 0;
  const professionalTax = 200;
  const netTakeHome = monthlyCtc - (pfEmployee + esiEmployee + professionalTax);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 px-4 py-2 text-center text-xs font-semibold text-white">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>WorkPulse 2.0 Released: Autonomous GPS Geofencing, Late Waiver Rules & 1-Click Payroll PDF</span>
          <Link href="/login" prefetch={true} className="underline font-bold ml-2 hover:text-white/80">
            Try Live Demo &rarr;
          </Link>
        </span>
      </div>

      {/* Global Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/landing" className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              <img
                src="/workpulse-logo.png"
                alt="WorkPulse Logo"
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center leading-none">
                <span className="text-xl font-black tracking-tight text-slate-950">Work</span>
                <span className="text-xl font-black tracking-tight text-[#0284c7]">Pulse</span>
                <span className="text-[10px] font-bold text-slate-400 ml-0.5">™</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                People • Time • Growth
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-indigo-600 transition-colors">Onboarding Flow</a>
            <a href="#payroll" className="hover:text-indigo-600 transition-colors">Payroll & CTC</a>
            <a href="#security" className="hover:text-indigo-600 transition-colors">Enterprise Security</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              prefetch={true}
              className="rounded-2xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              prefetch={true}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 transition-all"
            >
              <span>Launch Demo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Soft Ambient Background Glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-200/30 blur-3xl"></div>
        <div className="pointer-events-none absolute top-10 right-0 h-[600px] w-[600px] rounded-full bg-blue-200/30 blur-3xl"></div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-xs backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All-In-One Workforce SaaS Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              Smarter Attendance, Precision Geofencing & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Zero-Friction Payroll</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Empower your enterprise with GPS boundary verification, automated 8-hour shift late waivers, end-to-end employee onboarding, and 1-click payslip generation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/login"
                prefetch={true}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/35 active:scale-95 transition-all"
              >
                <span>Explore Live Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                prefetch={true}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-xs"
              >
                <Building2 className="h-4 w-4 text-slate-500" />
                <span>Register New Company</span>
              </Link>
            </div>

            {/* Demo Quick Logins Callout */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Zero Installation Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Pre-configured Demo Accounts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Multi-tenant PostgreSQL</span>
              </div>
            </div>
          </div>

          {/* Hero Live Mockup Showcase */}
          <div className="mt-14 relative mx-auto max-w-5xl">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-2.5 sm:p-4 shadow-2xl shadow-indigo-500/10 backdrop-blur-md">
              <div className="rounded-2xl border border-slate-100 bg-slate-900 text-white p-4 sm:p-6 overflow-hidden">
                {/* Mockup Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                    <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                    <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                    <span className="ml-2 text-xs font-mono text-slate-400">workpulse.app/dashboard</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Radar Geofence Active (200m)</span>
                  </div>
                </div>

                {/* Mockup Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {/* Card 1 */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
                    <p className="text-xs font-semibold text-slate-400">Live Workforce Present</p>
                    <p className="mt-2 text-3xl font-black text-white">96.8%</p>
                    <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-400">
                      <span>↑ 3.2% vs yesterday</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
                    <p className="text-xs font-semibold text-slate-400">Late Waiver Rule</p>
                    <p className="mt-2 text-2xl font-black text-indigo-300">8h Full Day</p>
                    <p className="mt-2 text-[11px] text-slate-400">Late punch auto-cleared if 8h worked</p>
                  </div>

                  {/* Card 3 */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
                    <p className="text-xs font-semibold text-slate-400">Payroll Calculation</p>
                    <p className="mt-2 text-2xl font-black text-emerald-300">Instant PDF</p>
                    <p className="mt-2 text-[11px] text-slate-400">One-click monthly payroll batch</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Feature Pillars */}
      <section id="features" className="py-20 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Architected for Scale</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Complete Workforce Automation
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Every critical HR operation engineered into a cohesive, responsive experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-slate-100 bg-[#f8fafc] p-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">GPS Geofence Radar</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Validate employee check-ins and check-outs with pinpoint GPS Haversine distance calculations. Configure multiple company branches with customizable radii (default 200m).
              </p>
              <ul className="space-y-2 pt-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Real-time proximity checks</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Remote punch override request flow</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-slate-100 bg-[#f8fafc] p-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">8-Hour Late Waiver Rule</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Empower flexibility while maintaining accountability. Employees arriving past shift grace time have their late deduction auto-waived if they complete a full 8-hour shift.
              </p>
              <ul className="space-y-2 pt-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Configurable grace periods (e.g. 15 min)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Overtime calculation engine</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-slate-100 bg-[#f8fafc] p-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
                <Banknote className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">1-Click Payroll & PDF Payslips</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Connect attendance directly to monthly compensation. Automatically compute Basic, HRA, PF, ESI, Professional Tax, and generate professional PDF payslips ready to download.
              </p>
              <ul className="space-y-2 pt-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Batch monthly calculation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Clean printable PDF salary slips</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Onboarding Workflow Section */}
      <section id="workflow" className="py-20 bg-[#f8fafc] border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              <span>HR Onboarding Pipeline</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              From New Joiner to Activated Staff
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              A structured 6-stage lifecycle that eliminates paperwork and ensures compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { step: '01', title: 'Create Joiner', desc: 'HR provisions draft profile & temporary credentials' },
              { step: '02', title: 'Self-Service', desc: 'Employee completes personal details & emergency contacts' },
              { step: '03', title: 'Document Vault', desc: 'Upload PAN, Aadhaar, degree certificates & photo' },
              { step: '04', title: 'HR Audit', desc: 'HR verifies uploaded documents & confirms legitimacy' },
              { step: '05', title: 'Admin Approval', desc: 'Company Admin grants formal clearance' },
              { step: '06', title: 'Offer & Activate', desc: 'Formal offer letter generated, e-signed & account active' },
            ].map((st, i) => (
              <div key={st.step} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-2xl font-black text-indigo-600 font-mono">{st.step}</span>
                  <h4 className="mt-2 text-sm font-bold text-slate-900">{st.title}</h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{st.desc}</p>
                </div>
                <div className="mt-4 flex items-center text-[10px] font-bold text-indigo-600">
                  <span>Stage Verified</span>
                  <Check className="h-3.5 w-3.5 ml-1 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Salary Breakdown Teaser */}
      <section id="payroll" className="py-20 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-white shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                  <Banknote className="h-3.5 w-3.5" />
                  <span>Salary Structure Simulation</span>
                </div>
                <h3 className="text-3xl font-black tracking-tight">
                  Instant CTC Breakdown Calculator
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Configure dynamic compensation packages. Adjust the annual CTC slider below to simulate statutory components, allowances, and take-home pay.
                </p>

                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">Annual CTC Target</span>
                    <span className="text-emerald-400 font-mono text-base">₹{ctcAnnual.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="300000"
                    max="3600000"
                    step="50000"
                    value={ctcAnnual}
                    onChange={(e) => setCtcAnnual(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>₹3,00,000 (Junior)</span>
                    <span>₹18,00,000 (Mid)</span>
                    <span>₹36,00,000 (Lead)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/login"
                    prefetch={true}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30"
                  >
                    <span>Open Payroll Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Calculated Breakdown Card */}
              <div className="rounded-2xl border border-indigo-800/40 bg-white/5 p-6 backdrop-blur-md space-y-3 font-mono text-xs">
                <div className="flex justify-between pb-2 border-b border-white/10 text-slate-400">
                  <span>Monthly Gross CTC</span>
                  <span className="text-white font-bold">₹{monthlyCtc.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Basic Salary (50%)</span>
                  <span>₹{basicSalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>HRA Allowance (50% Basic)</span>
                  <span>₹{hra.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Transport Allowance</span>
                  <span>₹{transportAllowance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Special Allowance</span>
                  <span>₹{specialAllowance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-300 pt-2 border-t border-white/10">
                  <span>Employee PF (12%)</span>
                  <span>- ₹{pfEmployee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span>Professional Tax</span>
                  <span>- ₹{professionalTax}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-white/20 text-emerald-400 font-bold text-sm">
                  <span>Net Monthly In-Hand</span>
                  <span>₹{netTakeHome.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & RBAC Guardrail Section */}
      <section id="security" className="py-20 bg-[#f8fafc] border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              <span>Zero-Trust Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Enterprise Data Security & Role Segregation
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Built from day one with strict multi-tenant isolation and role-based permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 font-bold">
                SA
              </div>
              <h4 className="text-base font-bold text-slate-900">Super Admin</h4>
              <p className="text-xs text-slate-500">Cross-organization provisioning, system health monitoring, and global platform telemetry.</p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold">
                CA
              </div>
              <h4 className="text-base font-bold text-slate-900">Company Admin</h4>
              <p className="text-xs text-slate-500">Tenant-wide policy controls, branch geofencing, shift design, and final payroll authorization.</p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold">
                BM
              </div>
              <h4 className="text-base font-bold text-slate-900">Branch Manager</h4>
              <p className="text-xs text-slate-500">Branch roster supervision, leave approvals, and shift change approvals for designated locations.</p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 font-bold">
                EM
              </div>
              <h4 className="text-base font-bold text-slate-900">Staff Employee</h4>
              <p className="text-xs text-slate-500">Geofenced GPS punch in/out, leave balance tracking, document uploads, and PDF payslip download.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1">
              <img
                src="/workpulse-logo.png"
                alt="WorkPulse"
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center leading-none">
                <span className="text-base font-black tracking-tight text-slate-950">Work</span>
                <span className="text-base font-black tracking-tight text-[#0284c7]">Pulse</span>
                <span className="text-[10px] font-bold text-slate-400 ml-0.5">™</span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                People • Time • Growth
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center md:text-right space-y-1">
            <p>&copy; {new Date().getFullYear()} WorkPulse Inc. All rights reserved.</p>
            <p className="text-[11px] text-slate-400">A Product by KerplunkMedia &bull; Enterprise Attendance Platform v2.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
