import React from "react";
import Link from "next/link";
import Image from "next/image";
import Brand from "@/components/ui/Brand";
import { ArrowRight, ArrowUpRight, Bell, CalendarCheck, Check, CheckCircle2, ChevronRight, CircleCheck, Clock3, Globe2, KeyRound, LayoutDashboard, Lock, MapPin, Plus, RefreshCw, Search, ShieldCheck, Users, Wallet, WifiOff } from "lucide-react";
import type { SubscriptionPlanOption } from "@/types";
import {
  FAQ as FAQ_ITEMS,
  FEATURES,
  FOOTER_COLUMNS,
  HERO,
  INDUSTRIES,
  OFFLINE,
  SECURITY,
  WORKFLOW,
  type Feature,
  type FeatureId,
} from "./content";

export const WRAP = "mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8";

const CARD_WHITE =
  "rounded-3xl bg-white ring-1 ring-slate-900/[0.08] shadow-[0_2px_8px_rgba(15,23,42,0.04),0_20px_40px_-20px_rgba(30,27,75,0.08)] transition-all duration-300 hover:shadow-[0_12px_36px_-10px_rgba(79,70,229,0.16)] hover:-translate-y-1 hover:ring-indigo-500/30";

function Eyebrow({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold tracking-wider uppercase backdrop-blur-md ${
        dark
          ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30"
          : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/15 shadow-sm"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dark ? "bg-indigo-400 animate-pulse" : "bg-indigo-600"
        }`}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  center = false,
  dark = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={`lp-reveal ${center ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}`}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-4 text-balance text-3xl font-extrabold leading-[1.1] tracking-[-0.035em] sm:text-4xl lg:text-[2.85rem] ${
          dark ? "text-white" : "text-slate-950"
        }`}
      >
        {title}
      </h2>
      {body && (
        <p
          className={`mt-4 text-pretty text-base leading-relaxed sm:text-lg ${
            dark ? "text-slate-300" : "text-slate-600"
          } ${center ? "mx-auto max-w-2xl" : "max-w-xl"}`}
        >
          {body}
        </p>
      )}
    </div>
  );
}

const Serif = ({ children }: { children: React.ReactNode }) => (
  <span className="font-display font-normal italic tracking-[-0.02em] bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent">
    {children}
  </span>
);

/* ── Hero ─────────────────────────────────────────────────────────────────── */

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#fafbfc] pt-14 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32">
      {/* Background soft ambient glow & crisp grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.14),rgba(250,251,252,0))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-48 -z-10 h-[480px] w-[850px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-pink-500/5 blur-[120px]"
      />
      <div aria-hidden="true" className="lp-grid absolute inset-x-0 top-0 -z-10 h-[720px] opacity-70" />

      <div className={`${WRAP} text-center`}>
        {/* Release / Announcement pill */}
        <Link
          href="#features"
          className="group mx-auto inline-flex items-center gap-2.5 rounded-full bg-white/90 p-1 pr-4 text-xs font-medium text-slate-700 ring-1 ring-slate-900/10 shadow-[0_2px_8px_rgba(15,23,42,0.06)] backdrop-blur-md transition-all duration-300 hover:ring-indigo-500/30 hover:shadow-md"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 px-3 py-0.5 text-[11px] font-bold text-white shadow-sm shadow-indigo-500/30">
            <span className="text-xs leading-none" role="img" aria-label="India flag">🇮🇳</span>
            <span>India-First SaaS</span>
          </span>
          <span className="font-medium text-slate-700 group-hover:text-slate-950">
            {HERO.eyebrow}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-700" />
        </Link>

        {/* Hero Headline */}
        <h1 className="mx-auto mt-8 max-w-4xl text-balance text-4xl font-extrabold leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-[4.85rem]">
          <span>{HERO.headline[0]}</span>
          <br />
          <Serif>{HERO.headline[1]}</Serif>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg lg:text-xl">
          {HERO.subhead}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <Link
            href={HERO.primaryCta.href}
            className="group relative inline-flex h-13 w-full max-w-xs items-center justify-center gap-2.5 overflow-hidden rounded-full bg-slate-950 px-8 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(15,23,42,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] sm:w-auto"
          >
            <span>{HERO.primaryCta.label}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          <Link
            href={HERO.secondaryCta.href}
            className="group inline-flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-medium text-slate-700 ring-1 ring-slate-900/10 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-slate-50 hover:text-slate-950 hover:ring-slate-900/20 sm:w-auto"
          >
            <span>{HERO.secondaryCta.label}</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700" />
          </Link>
        </div>

        {/* Trust Badges */}
        <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs font-semibold text-slate-600 sm:text-sm">
          {HERO.trustPoints.map((t) => (
            <li
              key={t}
              className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 ring-1 ring-slate-900/[0.08] shadow-sm transition-colors hover:ring-slate-900/20 hover:text-slate-900"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Product Preview in Hero */}
      <div className={WRAP}>
        <ProductPreview />
      </div>
    </section>
  );
}

const TREND = [61, 66, 63, 70, 74, 71, 79, 83, 78, 87, 90, 92.6];

function trendPaths(values: number[], width = 320, height = 110) {
  const step = width / (values.length - 1);
  const points = values.map((v, i) => [
    +(i * step).toFixed(1),
    +(height - ((v - 50) / 50) * height).toFixed(1),
  ]);
  const line = "M" + points.map((p) => p.join(",")).join(" L");
  return {
    line,
    area: `${line} L${width},${height} L0,${height} Z`,
    last: points[points.length - 1],
  };
}

const PUNCHES = [
  {
    initials: "AR",
    name: "Ananya Rao",
    place: "Andheri office",
    time: "09:02",
    status: "Verified GPS",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    avatar: "bg-indigo-100 text-indigo-700",
  },
  {
    initials: "IS",
    name: "Imran Shaikh",
    place: "Bhiwandi warehouse",
    time: "09:11",
    status: "Synced Offline",
    tone: "bg-amber-50 text-amber-700 ring-amber-600/20",
    avatar: "bg-amber-100 text-amber-800",
  },
  {
    initials: "LI",
    name: "Lakshmi Iyer",
    place: "Andheri office",
    time: "09:17",
    status: "Late 7m (Grace)",
    tone: "bg-sky-50 text-sky-700 ring-sky-600/20",
    avatar: "bg-emerald-100 text-emerald-800",
  },
  {
    initials: "RV",
    name: "Rohit Verma",
    place: "Pune plant",
    time: "09:24",
    status: "Verified GPS",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    avatar: "bg-purple-100 text-purple-800",
  },
];

export function DashboardPreview() {
  return <ProductPreview />;
}

function ProductPreview() {
  const { line, area, last } = trendPaths(TREND);
  return (
    <div
      aria-label="WorkPluse dashboard preview"
      role="img"
      className="relative mx-auto mt-16 max-w-[1160px] pb-4 sm:mt-20"
    >
      {/* Background glow behind preview */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[10%] top-12 -z-10 h-[70%] rounded-full bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-cyan-500/10 blur-[100px]"
      />

      {/* Main Preview Container */}
      <div className="rounded-[24px] bg-white/70 p-2 ring-1 ring-slate-900/[0.08] shadow-[0_25px_70px_-20px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:rounded-[32px] sm:p-3">
        <div className="overflow-hidden rounded-[18px] bg-white text-left ring-1 ring-slate-900/10 shadow-sm sm:rounded-[24px]">
          {/* macOS styled window bar */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 shadow-xs">
              <Lock className="h-3 w-3 text-indigo-600" aria-hidden="true" />
              <span className="font-mono text-[11px]">app.workpulse.in/dashboard/live</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live Sync
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-[220px_1fr]">
            {/* Sidebar Mockup */}
            <aside className="hidden border-r border-slate-100 bg-slate-50/60 p-4 md:block">
              <div className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-slate-200/80 shadow-xs">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-600/30">
                  WP
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">Apex Industries</p>
                  <p className="text-[10px] text-slate-500">4 branches • 850 active</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-400 ring-1 ring-slate-200/70">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <span>Search team...</span>
              </div>

              <nav className="mt-4 space-y-1 text-xs font-medium text-slate-600">
                {[
                  { icon: LayoutDashboard, label: "Live Dashboard", active: true },
                  { icon: Clock3, label: "Attendance & Shifts" },
                  { icon: CalendarCheck, label: "Leave Requests" },
                  { icon: Users, label: "Workforce" },
                  { icon: Wallet, label: "Statutory Payroll" },
                  { icon: MapPin, label: "GPS Geofences" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                      item.active
                        ? "bg-white text-slate-950 font-semibold ring-1 ring-slate-200 shadow-xs"
                        : "hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <item.icon
                      className={`h-4 w-4 ${
                        item.active ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
              </nav>
            </aside>

            {/* Dashboard Content */}
            <div className="min-w-0 bg-white p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Real-time workspace overview • Today
                  </p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                    Shift Roster & Punches
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                    <Bell className="h-4 w-4" />
                  </span>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: "Present Today",
                    value: "98.2%",
                    sub: "835 of 850 punched in",
                    accent: "text-emerald-600",
                    border: "border-slate-200/80 bg-slate-50/50",
                  },
                  {
                    label: "On-Time Punches",
                    value: "94.6%",
                    sub: "Only 12 late marks",
                    accent: "text-indigo-600",
                    border: "border-slate-200/80 bg-slate-50/50",
                  },
                  {
                    label: "Approved Leaves",
                    value: "15",
                    sub: "3 emergency covers",
                    accent: "text-amber-600",
                    border: "border-slate-200/80 bg-slate-50/50",
                  },
                  {
                    label: "Offline Sync Queue",
                    value: "0 Pending",
                    sub: "All punches reconciled",
                    accent: "text-sky-600",
                    border: "border-slate-200/80 bg-slate-50/50",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`rounded-2xl p-3.5 ring-1 ${kpi.border} transition-all hover:bg-white hover:shadow-xs`}
                  >
                    <p className="text-[11px] font-medium text-slate-500">{kpi.label}</p>
                    <p className={`mt-1.5 text-2xl font-bold tracking-tight tabular-nums ${kpi.accent}`}>
                      {kpi.value}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-slate-400">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Trend Chart & Live Punches */}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                {/* Visual Chart Card */}
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Attendance Velocity</p>
                      <p className="text-[11px] text-slate-500">30-day consistency score</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                      +9.2% this week
                    </span>
                  </div>

                  <p className="mt-3 text-3xl font-extrabold tracking-tight tabular-nums text-slate-950">
                    99.4%
                  </p>

                  <svg
                    viewBox="0 0 320 110"
                    className="mt-3 h-28 w-full overflow-visible"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="lp-hero-trend-fill-light" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((r) => (
                      <line
                        key={r}
                        x1="0"
                        x2="320"
                        y1={r * 36 + 2}
                        y2={r * 36 + 2}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    ))}
                    <path d={area} fill="url(#lp-hero-trend-fill-light)" />
                    <path
                      d={line}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={last[0]}
                      cy={last[1]}
                      r="4.5"
                      fill="#4f46e5"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Real-Time Punch Feed */}
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-900">Live Punch Feed</p>
                    <span className="text-[11px] font-medium text-indigo-600">Auto-refreshing</span>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {PUNCHES.map((p) => (
                      <li
                        key={p.name}
                        className="flex items-center gap-2.5 rounded-xl bg-slate-50/60 p-2 ring-1 ring-slate-100"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${p.avatar}`}
                        >
                          {p.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-900">{p.name}</p>
                          <p className="truncate text-[10px] text-slate-500">
                            {p.place} • {p.time}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${p.tone}`}
                        >
                          {p.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Callout Badges with micro-motion */}
      <div
        aria-hidden="true"
        className="animate-lp-float absolute -left-4 bottom-14 hidden w-64 rounded-2xl bg-white/95 p-4 text-left shadow-[0_20px_45px_-10px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 backdrop-blur-xl xl:block 2xl:-left-10"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/20">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900">Geofence Verified</p>
            <p className="text-[11px] text-slate-500">Andheri Branch • 34m inside</p>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="animate-lp-float-delayed absolute -right-4 -top-8 hidden w-72 rounded-2xl bg-white/95 p-4 text-left shadow-[0_20px_45px_-10px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 backdrop-blur-xl xl:block 2xl:-right-10"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-indigo-700">
            Automated Payroll • April
          </span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-600/20">
            Ready
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
          ₹24,85,400
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[100%] rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">PF, ESI & TDS calculated for 850 staff</p>
      </div>
    </div>
  );
}

/* ── Industries ───────────────────────────────────────────────────────────── */

export function ProofBar() {
  return (
    <section
      id="solutions"
      aria-label="Who WorkPluse is built for"
      className="border-y border-slate-200/80 bg-slate-50/80 py-12 text-slate-600"
    >
      <div className={WRAP}>
        <p className="text-center text-xs font-semibold tracking-widest text-slate-500 uppercase">
          Trusted by fast-moving field & floor teams across India
        </p>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-x-6">
          {INDUSTRIES.map((item) => (
            <li
              key={item.label}
              className="group flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-900/[0.07] shadow-xs transition-all duration-200 hover:shadow-md hover:ring-indigo-500/30 hover:text-indigo-600"
            >
              <item.icon
                className="h-4 w-4 text-indigo-600 transition-colors group-hover:text-indigo-700"
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Features (Bento Grid) ────────────────────────────────────────────────── */

const FEATURE_LAYOUT: Record<FeatureId, string> = {
  geofence: "sm:col-span-2 lg:col-span-4",
  offline: "lg:col-span-2",
  payroll: "lg:col-span-2",
  shifts: "sm:col-span-2 lg:col-span-4",
  invite: "lg:col-span-3",
  unlock: "lg:col-span-3",
};

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-white py-20 sm:py-28 relative isolate">
      <div className={WRAP}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end lg:gap-16">
          <SectionHeading
            eyebrow="Precision Operations"
            title={
              <>
                Attendance, leave and payroll. <Serif>In one focused suite.</Serif>
              </>
            }
          />
          <p className="lp-reveal max-w-md text-pretty text-base leading-relaxed text-slate-600 lg:pb-1">
            Built specifically to eliminate buddy punching, handle poor connectivity, and run
            Indian statutory payroll with zero errors.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} feature={f} className={FEATURE_LAYOUT[f.id]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, className }: { feature: Feature; className: string }) {
  const wide = feature.id === "geofence" || feature.id === "shifts";
  return (
    <article
      className={`lp-reveal group flex min-w-0 flex-col overflow-hidden p-3 ${CARD_WHITE} ${className}`}
    >
      <div
        aria-hidden="true"
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 ring-1 ring-slate-900/[0.06] ${
          wide ? "h-64 sm:h-72" : "h-60"
        }`}
      >
        <FeatureVisual id={feature.id} />
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20">
            <feature.icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-slate-950">{feature.title}</h3>
        </div>
        <p className="mt-2.5 max-w-md text-pretty text-sm leading-relaxed text-slate-600">
          {feature.body}
        </p>
      </div>
    </article>
  );
}

function FeatureVisual({ id }: { id: FeatureId }) {
  switch (id) {
    case "geofence":
      return (
        <div className="lp-dots absolute inset-0">
          <svg
            viewBox="0 0 600 260"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full opacity-80"
          >
            <path
              d="M-20 190 C 120 160, 220 220, 360 170 S 560 120, 640 150"
              stroke="#cbd5e1"
              strokeWidth="12"
              fill="none"
            />
            <path
              d="M210 -20 C 230 80, 260 160, 240 300"
              stroke="#cbd5e1"
              strokeWidth="10"
              fill="none"
            />
            {/* Animated radar rings */}
            <circle
              cx="300"
              cy="130"
              r="105"
              fill="rgba(99,102,241,0.06)"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            <circle cx="300" cy="130" r="55" fill="rgba(99,102,241,0.09)" />
          </svg>

          {/* Central Office Pin */}
          <div className="absolute left-1/2 top-[50%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 ring-4 ring-white">
              <MapPin className="h-6 w-6" />
            </span>
            <span className="mt-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-md">
              Andheri Office • 150m Radius
            </span>
          </div>

          {/* Punching Employees */}
          {[
            { pos: "left-[38%] top-[25%]", name: "Ananya", ok: true },
            { pos: "left-[58%] top-[66%]", name: "Lakshmi", ok: true },
            { pos: "left-[36%] top-[68%]", name: "Rohit", ok: true },
          ].map((a) => (
            <div
              key={a.name}
              className={`absolute ${a.pos} flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-800 shadow-md ring-2 ring-emerald-500`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-800 font-bold">
                ✓
              </span>
              <span>{a.name}</span>
            </div>
          ))}

          {/* Spoof / Outside Geofence warning */}
          <div className="absolute right-[5%] top-[14%] flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-xl ring-1 ring-rose-200">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-[11px] font-bold text-rose-700 ring-1 ring-rose-300">
              KD
            </span>
            <div>
              <p className="text-xs font-bold text-rose-700">Punch Blocked</p>
              <p className="text-[10px] text-slate-500">1.4 km outside • Logged</p>
            </div>
          </div>
        </div>
      );

    case "offline":
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-2.5 px-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-amber-600">
              <WifiOff className="h-3.5 w-3.5" /> No Network (Basement)
            </span>
            <span className="flex items-center gap-1.5 text-indigo-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Auto-syncing
            </span>
          </div>
          {[
            { time: "09:14:08", label: "Morning Punch-in", state: "Saved locally (Encrypted)" },
            { time: "13:02:41", label: "Lunch Break Start", state: "Synced on reconnect" },
            { time: "13:31:15", label: "Lunch Break End", state: "Timestamp Preserved" },
          ].map((row, i) => (
            <div
              key={row.time}
              className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
              style={{ opacity: 1 - i * 0.15 }}
            >
              <div>
                <p className="text-xs font-bold text-slate-900">{row.label}</p>
                <p className="font-mono text-[10px] text-slate-400">{row.time}</p>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                {row.state}
              </span>
            </div>
          ))}
        </div>
      );

    case "payroll":
      return (
        <div className="absolute inset-x-4 top-3.5 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-950">Statutory Payslip Breakdown</p>
              <p className="text-[10px] text-slate-500">Automatic 1-click calculation</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
              Verified
            </span>
          </div>
          <dl className="mt-3 space-y-1.5 text-xs">
            {[
              ["Basic Salary", "₹38,000"],
              ["House Rent Allowance (HRA)", "₹15,200"],
              ["Provident Fund (PF 12%)", "−₹4,560"],
              ["ESI & Health Deduction", "−₹410"],
              ["TDS / Tax Withheld", "−₹1,850"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-slate-500">{k}</dt>
                <dd
                  className={`font-semibold tabular-nums ${
                    v.startsWith("−") ? "text-rose-600" : "text-slate-900"
                  }`}
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex justify-between border-t border-dashed border-slate-200 pt-2.5 text-xs font-bold">
            <span className="text-slate-900">Net Take-home</span>
            <span className="text-sm font-extrabold tabular-nums text-indigo-600">₹46,380</span>
          </div>
        </div>
      );

    case "shifts": {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const SHIFT = {
        M: "bg-indigo-600 text-white font-bold",
        E: "bg-indigo-100 text-indigo-900 font-semibold",
        N: "bg-slate-900 text-white font-bold",
        O: "bg-slate-100 text-slate-400 font-medium",
      } as const;
      const LABEL = { M: "Morning", E: "Evening", N: "Night", O: "Off" } as const;
      const rows = [
        { name: "Ananya R.", plan: ["M", "M", "M", "M", "M", "O", "O"] },
        { name: "Imran S.", plan: ["E", "E", "N", "N", "O", "M", "M"] },
        { name: "Lakshmi I.", plan: ["N", "N", "O", "E", "E", "E", "O"] },
        { name: "Rohit V.", plan: ["O", "M", "M", "E", "E", "N", "N"] },
      ];
      return (
        <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 text-[10px] font-bold text-slate-400 sm:grid-cols-[90px_repeat(7,1fr)]">
            <span />
            {days.map((d) => (
              <span key={d} className="text-center">
                {d}
              </span>
            ))}
            {rows.map((r) => (
              <React.Fragment key={r.name}>
                <span className="self-center truncate text-xs font-semibold text-slate-800">
                  {r.name}
                </span>
                {r.plan.map((s, i) => (
                  <span
                    key={i}
                    className={`flex h-8 items-center justify-center rounded-lg text-[10px] sm:text-[11px] shadow-sm ${
                      SHIFT[s as keyof typeof SHIFT]
                    }`}
                  >
                    <span className="hidden sm:inline">
                      {s === "O" ? "Off" : LABEL[s as keyof typeof LABEL]}
                    </span>
                    <span className="sm:hidden">{s}</span>
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Clock3 className="h-4 w-4" /> Shift swaps & overtime automated
            </span>
            <span className="text-[11px] text-emerald-600 font-bold">100% Roster Coverage</span>
          </div>
        </div>
      );
    }

    case "invite":
      return (
        <div className="absolute inset-0 flex items-center justify-center px-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md">
                WP
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">Invite via WhatsApp or Email</p>
                <p className="text-[10px] text-slate-500">Zero paperwork onboarding</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-2.5 font-mono text-[11px] text-slate-600 ring-1 ring-slate-200">
              workpulse.in/join?token=x89d2k • Passcode generated
            </div>
            <div className="mt-3 flex h-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-sm">
              Staff sets permanent PIN on 1st punch
            </div>
          </div>
        </div>
      );

    case "unlock":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 px-5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <KeyRound className="h-4 w-4 text-indigo-600" />
            Instant Admin Activation Code
          </span>
          <div className="flex gap-2">
            {["8", "4", "2", "9", "3", ""].map((d, i) => (
              <span
                key={i}
                className={`flex h-12 w-10 items-center justify-center rounded-xl bg-white font-mono text-xl font-bold text-slate-950 shadow-md ring-1 sm:h-13 sm:w-11 ${
                  d ? "ring-slate-200" : "ring-2 ring-indigo-500 bg-indigo-50/50"
                }`}
              >
                {d || <span className="h-6 w-0.5 animate-pulse bg-indigo-600" />}
              </span>
            ))}
          </div>
          <p className="text-[11px] font-medium text-slate-400">
            Encrypted one-time code sent directly to workspace owner
          </p>
        </div>
      );
  }
}

/* ── Workflow ─────────────────────────────────────────────────────────────── */

const STEP_DETAIL = [
  ["Define branches & GPS radius", "Set general/rotating shift hours", "Configure grace period"],
  ["Staff clocks in from mobile", "Exact GPS & timestamp saved", "Punches sync offline"],
  ["1-click monthly approvals", "PF, ESI & TDS deducted", "Instant PDF payslips"],
];

export function Workflow() {
  return (
    <section id="workflow" className="scroll-mt-24 bg-[#f8fafc] py-20 sm:py-28 relative isolate border-t border-slate-200/80">
      <div className={WRAP}>
        <SectionHeading
          center
          eyebrow="Simple 3-Step Setup"
          title={
            <>
              From first punch to payroll. <Serif>Completely stress-free.</Serif>
            </>
          }
          body="Everything works from the same single source of truth, so your HR team saves 15+ hours every month on attendance reconciliation."
        />

        <ol className="relative mt-16 grid gap-6 md:grid-cols-3">
          <span
            aria-hidden="true"
            className="absolute left-[16%] right-[16%] top-[2.5rem] hidden border-t-2 border-dashed border-indigo-200 md:block"
          />
          {WORKFLOW.map((step, i) => (
            <li
              key={step.number}
              className={`lp-reveal relative flex flex-col p-7 ${CARD_WHITE}`}
            >
              <div className="flex items-center justify-between">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 font-mono text-base font-extrabold text-white shadow-lg shadow-indigo-600/30">
                  {step.number}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Step {step.number}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-slate-950">
                {step.title}
              </h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600">
                {step.body}
              </p>
              <ul className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-5 text-xs text-slate-600 font-medium">
                {STEP_DETAIL[i].map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 text-base font-bold text-indigo-600 transition-colors hover:text-indigo-700"
          >
            <span>Ready to set up your team in 2 minutes?</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Offline Spotlight ────────────────────────────────────────────────────── */

export function Offline() {
  return (
    <section id="offline" className="scroll-mt-24 py-20 sm:py-28 bg-white relative isolate border-t border-slate-200/80">
      <div className={WRAP}>
        <div className="relative isolate overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-[#0a0f2c] to-slate-900 p-8 text-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.4)] ring-1 ring-slate-900 sm:p-14 lg:p-16">
          <div
            aria-hidden="true"
            className="lp-grid-dark absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000,transparent)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 -z-10 h-96 w-96 rounded-full bg-indigo-500/25 blur-[100px]"
          />

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="lp-reveal">
              <Eyebrow dark>{OFFLINE.eyebrow}</Eyebrow>
              <h2 className="mt-5 text-balance text-3xl font-extrabold leading-[1.12] tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                Punch in from a basement.{" "}
                <span className="font-display font-normal italic text-indigo-300">
                  Sync when signal returns.
                </span>
              </h2>
              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
                {OFFLINE.body}
              </p>

              <ul className="mt-8 space-y-4">
                {OFFLINE.points.map((p) => (
                  <li key={p} className="flex items-start gap-3.5 text-sm sm:text-base text-slate-200">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-white/10 pt-8">
                <div>
                  <p className="text-2xl font-extrabold text-white">100%</p>
                  <p className="text-xs text-slate-400">Original Time Preserved</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-extrabold text-white">0s</p>
                  <p className="text-xs text-slate-400">Duplicate Loss Guarantee</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-extrabold text-white">IndexedDB</p>
                  <p className="text-xs text-slate-400">Encrypted Local Storage</p>
                </div>
              </div>
            </div>

            <PhoneMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div aria-hidden="true" className="lp-reveal relative mx-auto w-full max-w-[320px]">
      <div className="rounded-[3rem] bg-slate-950 p-3 shadow-[0_30px_70px_rgba(0,0,0,0.8)] ring-2 ring-white/15">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-slate-900 ring-1 ring-white/10">
          {/* Phone Top Notch */}
          <div className="flex items-center justify-between px-6 pb-2 pt-3 text-xs font-semibold text-slate-200">
            <span>09:14</span>
            <span className="h-4 w-24 rounded-full bg-slate-950 ring-1 ring-white/10" />
            <span className="flex items-center gap-1 text-amber-400 text-[10px]">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          </div>

          <div className="p-4 pb-6 pt-3 text-white">
            <div className="rounded-xl bg-amber-500/15 p-2.5 text-center text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
              ⚠️ Offline Mode • Punches stored safely
            </div>

            <div className="mt-4 rounded-2xl bg-white/[0.06] p-4 text-center ring-1 ring-white/10">
              <p className="text-xs font-medium text-slate-400">Bhiwandi Warehouse, Bay 4</p>
              <p className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-white">
                09:14:08
              </p>
              <div className="mx-auto mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-600/40">
                <CircleCheck className="h-4 w-4" /> Punched In • Stored Locally
              </div>
            </div>

            <p className="mt-5 text-xs font-bold text-slate-400">Saved Today</p>
            <div className="mt-2 space-y-2">
              {[
                { name: "Shift In", time: "09:14 AM", status: "On device", tone: "text-amber-400" },
                { name: "Shift Out (Yesterday)", time: "06:30 PM", status: "Synced", tone: "text-emerald-400" },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/5"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{row.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">{row.time}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${row.tone}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Pricing ──────────────────────────────────────────────────────────────── */

const money = (amount: number, currency: string) =>
  amount === 0
    ? "Free"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 0,
      }).format(amount);

export function Pricing({
  plans,
  unavailable,
  cycle,
  onCycle,
}: {
  plans: SubscriptionPlanOption[];
  unavailable: boolean;
  cycle: "MONTHLY" | "ANNUAL";
  onCycle: (c: "MONTHLY" | "ANNUAL") => void;
}) {
  const cols =
    plans.length === 3
      ? "lg:grid-cols-3"
      : plans.length === 2
      ? "lg:grid-cols-2"
      : "lg:grid-cols-4";

  return (
    <section id="pricing" className="scroll-mt-24 bg-[#f8fafc] py-20 sm:py-28 relative isolate border-t border-slate-200/80">
      <div className={WRAP}>
        <SectionHeading
          center
          eyebrow="Transparent Investment"
          title={
            <>
              Simple, transparent pricing. <Serif>Scale without surprises.</Serif>
            </>
          }
          body="Start free for 14 days. No card required. Pick the plan that matches your organization size."
        />

        {/* Monthly / Annual Toggle */}
        <div className="mt-10 flex justify-center">
          <div
            role="radiogroup"
            aria-label="Billing cycle"
            className="inline-flex rounded-full bg-white p-1.5 shadow-sm ring-1 ring-slate-900/10"
          >
            {(["MONTHLY", "ANNUAL"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cycle === c}
                onClick={() => onCycle(c)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                  cycle === c
                    ? "bg-slate-950 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <span>{c === "MONTHLY" ? "Monthly" : "Annual"}</span>
                {c === "ANNUAL" && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      cycle === c
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    Save 20% 🎉
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {unavailable && (
          <p className="mx-auto mt-12 max-w-xl rounded-2xl bg-amber-50 p-4 text-center text-sm font-medium text-amber-800 ring-1 ring-amber-200">
            Pricing is temporarily updating. Please refresh in a moment.
          </p>
        )}

        {!unavailable && plans.length === 0 && (
          <div aria-busy="true" className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-[32rem] rounded-3xl" />
            ))}
          </div>
        )}

        {plans.length > 0 && (
          <div
            className={`mt-14 grid items-stretch gap-6 md:grid-cols-2 ${cols}`}
            aria-live="polite"
          >
            {plans.map((p) => {
              const dark = !!p.popular;
              return (
                <article
                  key={p.id}
                  className={`relative flex min-w-0 flex-col rounded-3xl p-7 transition-all duration-300 ${
                    dark
                      ? "bg-slate-950 text-white shadow-[0_24px_60px_-15px_rgba(79,70,229,0.35)] ring-2 ring-indigo-500 scale-[1.02] z-10"
                      : "bg-white text-slate-900 ring-1 ring-slate-900/[0.08] shadow-sm hover:shadow-xl hover:-translate-y-1"
                  }`}
                >
                  {dark && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(80%_50%_at_50%_0%,rgba(99,102,241,0.35),transparent)]"
                    />
                  )}

                  {/* Header Row: Name & Badge */}
                  <div className="relative flex min-h-7 flex-wrap items-center justify-between gap-2">
                    <h3
                      className={`text-xl font-bold tracking-tight ${
                        dark ? "text-white" : "text-slate-950"
                      }`}
                    >
                      {p.name}
                    </h3>
                    {dark ? (
                      <span className="whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm shadow-indigo-500/40">
                        Most Popular
                      </span>
                    ) : (
                      p.badge && (
                        <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {p.badge}
                        </span>
                      )
                    )}
                  </div>

                  {/* Description: full text, never truncated */}
                  <p
                    className={`relative mt-3 text-sm leading-relaxed ${
                      dark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {p.description}
                  </p>

                  {/* Price */}
                  <div className="relative mt-6 flex items-baseline gap-1.5">
                    <span
                      className={`text-4xl font-extrabold tracking-tight tabular-nums ${
                        dark ? "text-white" : "text-slate-950"
                      }`}
                    >
                      {money(cycle === "MONTHLY" ? p.priceMonthly : p.priceAnnual, p.currency)}
                    </span>
                    {p.priceMonthly > 0 && (
                      <span className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                        / {cycle === "MONTHLY" ? "month" : "year"}
                      </span>
                    )}
                  </div>

                  {/* Action CTA Button */}
                  <Link
                    href={`/register?plan=${p.id}`}
                    className={`relative mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full text-sm font-bold transition-all active:scale-[0.98] ${
                      dark
                        ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/40 hover:from-indigo-600 hover:to-indigo-700"
                        : "bg-slate-950 text-white hover:bg-slate-800"
                    }`}
                  >
                    <span>
                      {p.id === "FREE_TRIAL" ? "Start Free 14-Day Trial" : `Choose ${p.name}`}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  {/* Features List: full display without clipping */}
                  <ul
                    className={`relative mt-7 flex-1 space-y-3.5 border-t pt-6 ${
                      dark ? "border-white/10" : "border-slate-100"
                    }`}
                  >
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className={`flex items-start gap-2.5 text-sm ${
                          dark ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        <Check
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            dark ? "text-indigo-400" : "text-indigo-600"
                          }`}
                          aria-hidden="true"
                          strokeWidth={2.5}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Lock className="h-4 w-4 text-emerald-600" />
            Every plan includes our 14-day full-feature trial. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Security & Compliance ────────────────────────────────────────────────── */

const AUDIT = [
  {
    icon: ShieldCheck,
    text: "Meera signed in with two-step verification",
    time: "09:01",
    tone: "text-emerald-600 bg-emerald-50 ring-emerald-500/20",
  },
  {
    icon: MapPin,
    text: "Punch outside Andheri geofence blocked and recorded",
    time: "09:07",
    tone: "text-rose-600 bg-rose-50 ring-rose-500/20",
  },
  {
    icon: Users,
    text: "Rohit Verma's branch permission updated to Manager",
    time: "10:22",
    tone: "text-indigo-600 bg-indigo-50 ring-indigo-500/20",
  },
  {
    icon: Wallet,
    text: "April payroll bank transfer sheet exported by Admin",
    time: "16:45",
    tone: "text-slate-600 bg-slate-100 ring-slate-400/20",
  },
];

export function Security() {
  return (
    <section id="security" className="scroll-mt-24 bg-white py-20 sm:py-28 relative isolate border-t border-slate-200/80">
      <div className={`${WRAP} grid items-center gap-14 lg:grid-cols-2 lg:gap-20`}>
        <div>
          <SectionHeading
            eyebrow="Security & Governance"
            title={
              <>
                Your organization&apos;s data, <Serif>fortified and compliant.</Serif>
              </>
            }
          />
          <dl className="mt-10 space-y-8">
            {SECURITY.map((s) => (
              <div key={s.title} className="lp-reveal flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 shadow-xs">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-base font-bold tracking-tight text-slate-950">{s.title}</dt>
                  <dd className="mt-1 max-w-md text-pretty text-sm leading-relaxed text-slate-600">
                    {s.body}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div aria-hidden="true" className={`lp-reveal p-3 ${CARD_WHITE}`}>
          <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-900/[0.04]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">Immutable Audit Trail</p>
                <p className="text-xs text-slate-500">Every sensitive event logged</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                <Lock className="h-3.5 w-3.5 text-indigo-600" /> Tamper-resistant
              </span>
            </div>

            <ul className="mt-6 space-y-3">
              {AUDIT.map((a) => (
                <li
                  key={a.text}
                  className="flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${a.tone}`}
                  >
                    <a.icon className="h-4 w-4" />
                  </span>
                  <p className="min-w-0 flex-1 text-xs font-semibold text-slate-800">{a.text}</p>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400">{a.time}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
              {["AES-256 Storage", "Role-Based Access", "Tenant Isolated"].map((t) => (
                <div
                  key={t}
                  className="rounded-xl bg-white px-2 py-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────────── */

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 bg-[#f8fafc] py-20 sm:py-28 relative isolate border-t border-slate-200/80">
      <div className={`${WRAP} grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Got Questions?"
            title={
              <>
                Everything you need <Serif>to know before starting.</Serif>
              </>
            }
          />
          <p className="mt-5 max-w-sm text-pretty text-sm leading-relaxed text-slate-600">
            Have custom requirements or thousands of employees across branches? We are here to help
            you get up and running smoothly.
          </p>
          <Link
            href="/register"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            <span>Start Free 14-Day Trial</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className={`divide-y divide-slate-100 px-6 sm:px-8 ${CARD_WHITE}`}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-bold text-slate-900 transition-colors hover:text-indigo-600 [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-open:rotate-45 group-open:bg-indigo-600 group-open:text-white">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>
              <p className="mt-3.5 max-w-2xl pr-10 text-pretty text-sm leading-relaxed text-slate-600">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Closing CTA ──────────────────────────────────────────────────────────── */

export function CtaBand() {
  return (
    <section className="bg-white py-20 sm:py-32 relative isolate border-t border-slate-200/80">
      <div className={WRAP}>
        <div className="relative isolate overflow-hidden rounded-[36px] bg-gradient-to-b from-slate-950 via-[#0d1230] to-slate-950 px-8 py-16 text-center shadow-[0_40px_100px_-20px_rgba(15,23,42,0.6)] ring-1 ring-slate-900 sm:px-16 sm:py-24">
          <div aria-hidden="true" className="lp-grid-dark absolute inset-0 -z-10 opacity-50" />
          <div
            aria-hidden="true"
            className="animate-lp-aurora pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/35 blur-[120px]"
          />

          <Eyebrow dark>14 Days Free • No Credit Card Required</Eyebrow>

          <h2 className="mx-auto mt-6 max-w-3xl text-balance text-3xl font-extrabold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Ready to bring rhythm and clarity to your workforce?
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-slate-300 sm:text-lg">
            Deploy in minutes. Keep teams clocking in with verified GPS, whether online or offline,
            and run payroll with complete confidence.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href="/register"
              className="group relative inline-flex h-13 w-full max-w-xs items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 text-base font-bold text-slate-950 shadow-xl transition-all duration-300 hover:bg-slate-100 active:scale-[0.98] sm:w-auto"
            >
              <span>Create Your Free Workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <Link
              href="/login"
              className="group inline-flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-white/10 px-8 text-base font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-all duration-200 hover:bg-white/15 sm:w-auto"
            >
              <span>Sign in to Workspace</span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────────────────────────── */

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#f8fafc] text-slate-600">
      <div className={`${WRAP} grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]`}>
        <div className="max-w-xs">
          <Brand size="md" />
          <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
            India&apos;s geofenced attendance, leave and statutory payroll platform. Engineered for
            factories, retail, construction and modern field operations.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            All cloud systems operational
          </div>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-950">{col.title}</p>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith("#") ? (
                    <a
                      href={l.href}
                      className="text-sm text-slate-600 transition-colors hover:text-slate-950"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm text-slate-600 transition-colors hover:text-slate-950"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-slate-200/80 bg-slate-100/60">
        <div
          className={`${WRAP} flex flex-col items-center justify-between gap-5 py-6 text-xs text-slate-500 md:flex-row`}
        >
          <p className="text-center md:text-left">
            © {new Date().getFullYear()} WorkPluse Technologies Pvt Ltd. All rights reserved.
          </p>

          {/* Centered Kerplunk Media Logo Link (Only logo, no box, no arrow) */}
          <div className="flex items-center justify-center">
            <a
              href="https://www.kerplunkmedia.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center transition-all duration-200 hover:opacity-85 hover:scale-105"
              title="Kerplunk Media"
            >
              <Image
                src="/kerplunk-media.png"
                alt="Kerplunk Media"
                width={1024}
                height={268}
                sizes="200px"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </a>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-center text-slate-500 md:justify-end">
            <Globe2 className="h-3.5 w-3.5 text-indigo-600" />
            Engineered with precision for workforce teams across India.
          </p>
        </div>
      </div>
    </footer>
  );
}
