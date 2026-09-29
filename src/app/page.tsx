"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import type { SubscriptionPlanOption } from "@/types";
import { motion } from "framer-motion";
import {
  Sparkles,
  Shield,
  MapPin,
  Clock,
  WifiOff,
  Wifi,
  Receipt,
  Users,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Calendar,
  Layers,
  ChevronRight,
  KeyRound,
  Award,
  Menu,
  X,
} from "lucide-react";

export default function LandingPage() {
  const { user, token } = useAuth();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [plansUnavailable, setPlansUnavailable] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    authApi.getPlans()
      .then((response) => {
        if (active) setPlans(Array.isArray(response?.plans) ? response.plans : []);
      })
      .catch(() => {
        if (active) setPlansUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const formatPlanPrice = (plan: SubscriptionPlanOption) => {
    const amount = billingCycle === "MONTHLY" ? plan.priceMonthly : plan.priceAnnual;
    if (amount === 0) return "Free";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: plan.currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="wp-page-shell min-h-screen text-slate-900 relative overflow-x-hidden selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Soft Ambient Background Glows */}
      <div className="wp-ambient-orb left-[-7rem] top-28" aria-hidden="true" />
      <div className="wp-ambient-orb wp-ambient-orb--alt right-[-6rem] top-[38rem]" aria-hidden="true" />

      {/* ─── Navigation Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#ffffff]/90 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo.png"
                alt="WorkPulse Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div>
              <span className="font-serif text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-1.5">
                WorkPulse
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200 font-sans">
                  LIVE
                </span>
              </span>
              <span className="text-[10px] text-slate-500 tracking-[0.16em] block uppercase font-semibold">
                Workforce, in rhythm
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">
              Features
            </a>
            <a href="#offline" className="hover:text-slate-900 transition flex items-center gap-1.5">
              Offline Mode
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold">
                NEW
              </span>
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition">
              Pricing Plans
            </a>
            <a href="#security" className="hover:text-slate-900 transition">
              Security & Geofencing
            </a>
          </nav>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-3">
            {token && user ? (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
              >
                Go to Workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  Start Free Trial
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
            <button
              type="button"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <nav className="md:hidden border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl">
            <div className="grid gap-1">
              {[['#features', 'Features'], ['#offline', 'Solutions'], ['#pricing', 'Pricing'], ['#security', 'Security']].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobileNavOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                  {label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Enterprise GPS Geofencing · Offline-First Sync · Statutory Payroll</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-serif text-4xl sm:text-6xl lg:text-[4.6rem] font-semibold tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.08]"
        >
          Run the workday
          <br />
          <span className="italic text-indigo-600">without losing the people.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-sm sm:text-base lg:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed"
        >
          Eliminate buddy punching with strict GPS boundary validation. Keep teams clocking in even
          without internet via device-level IndexedDB synchronization. Automate CTC breakdowns,
          statutory deductions, and email invitations effortlessly.
        </motion.p>

        {/* Hero CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="px-7 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center gap-2"
          >
            Create Organization Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3.5 rounded-full bg-[#ffffff] hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-sm shadow-xs transition flex items-center gap-2"
          >
            Live Workspace Sign In
          </Link>
        </motion.div>

        {/* ─── Interactive Live Preview Card ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="wp-glass wp-hover-lift mt-14 max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 relative overflow-hidden text-left"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Live Geofence Radar · HQ Branch
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                12m to Branch Center (Within 300m Radius)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                Auto-Sync Ready
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                Offline Mode Supported
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {/* Clock Widget */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Real-time Timekeeper
                </div>
                <div className="font-mono text-3xl font-semibold text-slate-900 tabular-nums">
                  {currentTime
                    ? currentTime.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })
                    : "--:--:--"}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Assigned Shift: General (09:00 - 18:00)
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready to Punch
                </span>
              </div>
            </div>

            {/* GPS Geofence Widget */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  GPS Coordinate Lock
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">11.9344° N, 79.8358° E</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hardware Accuracy: ±12m · Anti-spoofing verified
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Boundary Status</span>
                <span className="text-emerald-600 font-bold">Authorized</span>
              </div>
            </div>

            {/* Offline Engine Widget */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  IndexedDB Queue Engine
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">0 Pending Punches</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Punches survive offline drops and sync with original time
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Sync Pipeline</span>
                <span className="text-indigo-600 font-bold">Active & Hot</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Attendance hero visual: generated illustration with accessible HTML labels over it. */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.36 }}
        className="relative mx-auto mt-8 min-h-[185px] max-w-4xl overflow-hidden rounded-[26px] border border-indigo-300/40 bg-[#17358f] text-left shadow-[0_28px_70px_-38px_rgba(37,59,170,0.75)] sm:min-h-[220px]"
        style={{ backgroundImage: "url('/attendance-hero.png')", backgroundPosition: "center", backgroundSize: "cover" }}
        aria-label="Live attendance preview"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#122d7f]/90 via-[#16399a]/45 to-transparent" aria-hidden="true" />
        <div className="relative z-10 flex min-h-[185px] max-w-[55%] flex-col justify-between p-5 text-white sm:min-h-[220px] sm:p-7">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-slate-950/20 px-3 py-1 text-[10px] font-bold tracking-wide text-cyan-50 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Live attendance
            </span>
            <p className="mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-5xl">04:10:04 <span className="align-middle rounded-md border border-white/25 bg-white/15 px-1.5 py-1 text-xs font-bold tracking-normal">PM</span></p>
            <p className="mt-1 text-[10px] text-blue-100 sm:text-xs">Tuesday, September 23, 2026</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-blue-50 sm:text-xs">
            <span className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 backdrop-blur-sm">Working from Thalapet, Oulgaret, Puducherry</span>
            <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-emerald-950 shadow-lg shadow-emerald-950/20">On duty</span>
          </div>
        </div>
      </motion.div>

      {/* ─── Core Features Section ────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            The full workday
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mt-2">
            Attendance, leave, and payroll — without the noise.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-3">
            Every feature is engineered to eliminate leakage, keep employees informed, and simplify
            administration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Smart GPS Geofencing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Restrict clock-ins to exact geographical coordinates. Configure customizable radii per
              branch with automated geofence bypass audits and device verification.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-amber-300 hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Offline-First Sync Engine</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Network dropped in basements or remote sites? Punches store in browser IndexedDB with
              exact timestamps and auto-sync to the server the second connection returns.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-purple-300 hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Statutory Payroll Engine</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Full salary calculations incorporating overtime, comp-off credits, lop deductions,
              statutory PF & ESI formulas, and instant one-click payslip generation.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Dynamic Rosters & Shifts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Grace periods, rotational rosters, shift swaps, and per-day shift overrides. Rest-day
              punches automatically trigger overtime compensation gateways.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">1-Click Employee Invitation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Invite employees via email. The system generates secure temporary credentials, emails the
              login link, and requires a permanent password setup on their first sign-in.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-rose-300 hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Secure Plan Unlock Keys</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upon organization registration, admins receive a unique cryptographic unlock code by
              email (format: WP-XXXX-XXXX-XXXX) to unlock their company dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Offline Mode Showcase ────────────────────────────────────────── */}
      <section id="offline" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-white border border-indigo-200/80 relative overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold mb-4">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                Zero Connectivity Tolerance
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight leading-snug">
                Clock in even when the signal drops.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-4 leading-relaxed">
                Factory basements, warehouse deadzones, or sudden carrier outages won&apos;t disrupt your
                operations. WorkPulse records clock-ins locally with millisecond-exact timestamps and
                synchronizes in chronological order as soon as network returns.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>IndexedDB browser queue prevents data loss on tab close or refresh</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Exact original punch time honored by server (no unfair late marks)</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Duplicate punch deduplication prevents double check-ins</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">Offline Queue Visualizer</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">Auto-Sync Active</span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between">
                  <span>[OFFLINE PUNCH] CHECK_IN @ 09:02:14 AM</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 font-bold">QUEUED</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between">
                  <span>[OFFLINE PUNCH] BREAK_START @ 01:15:30 PM</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 font-bold">QUEUED</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                  <span>[ONLINE EVENT] Auto-sync dispatched 2 punches</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 font-bold">SYNCED ✅</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing Plans Section ────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Predictable Pricing
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mt-2">
            Simple plans. Full workday.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-3">
            Compare current limits and features directly from our billing system.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                billingCycle === "MONTHLY"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("ANNUAL")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                billingCycle === "ANNUAL"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Annual Billing
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {plansUnavailable && (
          <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
            Pricing is temporarily unavailable. Please try again shortly.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-live="polite">
          {plans.map((p) => {
            return (
              <div
                key={p.id}
                className={`rounded-3xl p-6 flex flex-col justify-between transition relative ${
                  p.popular
                    ? "bg-gradient-to-b from-indigo-50/50 to-white border-2 border-indigo-500 shadow-xl shadow-indigo-500/10"
                    : "bg-white border border-slate-200 shadow-sm hover:border-slate-300"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                    <span className="text-[10px] font-semibold text-slate-500">{p.badge}</span>
                  </div>

                  <div className="mb-4">
                    <span className="font-serif text-3xl font-semibold text-slate-900">{formatPlanPrice(p)}</span>
                    {p.priceMonthly > 0 && (
                      <span className="text-xs text-slate-500"> {billingCycle === "MONTHLY" ? "/ month" : "/ year"}</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mb-6 leading-relaxed">{p.description}</p>

                  <div className="space-y-2.5 pb-6 border-b border-slate-200">
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href={`/register?plan=${p.id}`}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      p.popular
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                    }`}
                  >
                    {p.id === "FREE_TRIAL" ? "Start free trial" : `Choose ${p.name}`}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Security & Geofence Assurance ────────────────────────────────── */}
      <section id="security" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Security-conscious access</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Password hashing, short-lived access tokens, role checks, audit records, and
                organization-scoped data access.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Mobile & Web Parity</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Admins and managers command operations via web. Field staff and employees clock in
                via responsive web or WorkPulse companion app.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Indian payroll workflows</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Tools for PF, ESI, tax, overtime, payroll review, and statutory exports. Your team
                remains responsible for reviewing rules that apply to your organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-[#ffffff] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-xs shrink-0">
              <Image
                src="/logo.png"
                alt="WorkPulse Logo"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-serif text-sm font-semibold text-slate-900">WorkPulse</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600">
            <Link href="/login" className="hover:text-slate-900 transition">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-slate-900 transition">
              Start Free Trial
            </Link>
            <a href="#features" className="hover:text-slate-900 transition">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition">
              Pricing
            </a>
            <Link href="/privacy" className="hover:text-slate-900 transition">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 transition">
              Terms
            </Link>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} WorkPulse. All rights reserved. Geofenced Enterprise Attendance.
          </p>
        </div>
      </footer>
    </div>
  );
}
