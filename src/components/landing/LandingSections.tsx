import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarCheck,
  Check,
  CircleCheck,
  Clock3,
  KeyRound,
  LayoutDashboard,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Signal,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";
import type { SubscriptionPlanOption } from "@/types";
import { FAQ as FAQ_ITEMS, FEATURES, FOOTER_COLUMNS, HERO, INDUSTRIES, OFFLINE, SECURITY, WORKFLOW, type Feature, type FeatureId } from "./content";

export const WRAP = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";

const CARD = "rounded-[28px] bg-white ring-1 ring-slate-900/[0.07] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(30,27,75,0.22)]";

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`inline-flex items-center gap-2 text-[13px] font-medium ${dark ? "text-indigo-200" : "text-indigo-600"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-indigo-300" : "bg-indigo-500"}`} aria-hidden="true" />
      {children}
    </p>
  );
}

function SectionHeading({ eyebrow, title, body, center = false }: { eyebrow: string; title: React.ReactNode; body?: string; center?: boolean }) {
  return (
    <div className={`lp-reveal ${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-balance text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-[2.75rem]">{title}</h2>
      {body && <p className={`mt-5 text-pretty text-base leading-relaxed text-slate-600 sm:text-[17px] ${center ? "mx-auto max-w-xl" : "max-w-xl"}`}>{body}</p>}
    </div>
  );
}

const Serif = ({ children }: { children: React.ReactNode }) => (
  <span className="font-display font-normal italic tracking-[-0.01em] text-indigo-600">{children}</span>
);

/* ── Hero ─────────────────────────────────────────────────────────────────── */

export function Hero() {
  return (
    <section className="relative isolate pt-14 sm:pt-20 lg:pt-24">
      <div aria-hidden="true" className="lp-grid absolute inset-x-0 top-0 -z-10 h-[720px]" />
      <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-[480px] w-[min(1100px,100%)] -translate-x-1/2 bg-[radial-gradient(50%_55%_at_50%_0%,rgba(99,102,241,0.18),transparent)]" />

      <div className={`${WRAP} text-center`}>
        <Link
          href="#features"
          className="wp-rise group mx-auto inline-flex max-w-full items-center gap-2 rounded-full bg-white/80 py-1 pl-1 pr-3 text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/10 backdrop-blur transition hover:ring-slate-900/20"
        >
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">India-first</span>
          <span className="truncate">{HERO.eyebrow}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        <h1 className="wp-rise wp-rise-delay-1 mx-auto mt-8 max-w-4xl text-balance text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-7xl lg:text-[5.5rem]">
          {HERO.headline[0]}
          <br />
          <Serif>{HERO.headline[1]}</Serif>
        </h1>

        <p className="wp-rise wp-rise-delay-2 mx-auto mt-7 max-w-[38rem] text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">{HERO.subhead}</p>

        <div className="wp-rise wp-rise-delay-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href={HERO.primaryCta.href}
            className="keep-white group inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-[15px] font-semibold shadow-[0_12px_28px_-10px_rgba(30,27,75,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-slate-800 active:scale-[0.98] sm:w-auto"
          >
            {HERO.primaryCta.label}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link href={HERO.secondaryCta.href} className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-slate-700 transition hover:text-slate-950">
            {HERO.secondaryCta.label}
            <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700" aria-hidden="true" />
          </Link>
        </div>

        <ul className="wp-rise wp-rise-delay-3 mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[13px] font-medium text-slate-500">
          {HERO.trustPoints.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CircleCheck className="h-4 w-4 text-indigo-500" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className={WRAP}>
        <ProductPreview />
      </div>
    </section>
  );
}

const TREND = [61, 66, 63, 70, 74, 71, 79, 83, 78, 87, 90, 92.6];

function trendPaths(values: number[], width = 320, height = 110) {
  const step = width / (values.length - 1);
  const points = values.map((v, i) => [+(i * step).toFixed(1), +(height - ((v - 50) / 50) * height).toFixed(1)]);
  const line = "M" + points.map((p) => p.join(",")).join(" L");
  return { line, area: `${line} L${width},${height} L0,${height} Z`, last: points[points.length - 1] };
}

const PUNCHES = [
  { initials: "AR", name: "Ananya Rao", place: "Andheri office", time: "09:02", status: "On time", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", avatar: "bg-indigo-100 text-indigo-700" },
  { initials: "IS", name: "Imran Shaikh", place: "Bhiwandi warehouse", time: "09:11", status: "Synced late", tone: "bg-slate-100 text-slate-600 ring-slate-500/15", avatar: "bg-amber-100 text-amber-800" },
  { initials: "LI", name: "Lakshmi Iyer", place: "Andheri office", time: "09:17", status: "Late 7m", tone: "bg-amber-50 text-amber-700 ring-amber-600/20", avatar: "bg-emerald-100 text-emerald-800" },
  { initials: "RV", name: "Rohit Verma", place: "Pune plant", time: "09:24", status: "On time", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", avatar: "bg-sky-100 text-sky-800" },
];

export function DashboardPreview() {
  return <ProductPreview />;
}

function ProductPreview() {
  const { line, area, last } = trendPaths(TREND);
  return (
    <div aria-label="WorkPulse dashboard preview" role="img" className="wp-rise wp-rise-delay-3 relative mx-auto mt-16 max-w-[1120px] pb-6 sm:mt-20">
      <div aria-hidden="true" className="absolute inset-x-[8%] top-10 -z-10 h-[70%] rounded-full bg-indigo-500/25 blur-[90px]" />

      <div className="rounded-[20px] bg-white/50 p-1.5 ring-1 ring-slate-900/[0.08] backdrop-blur sm:rounded-[28px] sm:p-2.5">
        <div className="overflow-hidden rounded-[15px] bg-white text-left shadow-[0_60px_120px_-50px_rgba(30,27,75,0.55)] ring-1 ring-slate-900/10 sm:rounded-[20px]">
          {/* Window chrome */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            </div>
            <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
              <Lock className="h-3 w-3" aria-hidden="true" />
              WorkPulse · Dashboard
            </div>
            <div className="w-[42px]" />
          </div>

          <div className="grid md:grid-cols-[208px_1fr]">
            {/* Sidebar */}
            <aside className="hidden border-r border-slate-100 bg-slate-50/60 p-3 md:block">
              <div className="flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-slate-200/80">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">ST</span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-slate-900">Sharma Textiles</p>
                  <p className="text-[10px] text-slate-500">3 branches</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-slate-400 ring-1 ring-slate-200/80">
                <Search className="h-3 w-3" /> Search
              </div>
              <nav className="mt-4 space-y-0.5 text-[12px] font-medium text-slate-600">
                {[
                  { icon: LayoutDashboard, label: "Dashboard", active: true },
                  { icon: Clock3, label: "Attendance" },
                  { icon: CalendarCheck, label: "Leave" },
                  { icon: Users, label: "People" },
                  { icon: Wallet, label: "Payroll" },
                  { icon: MapPin, label: "Geofences" },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${item.active ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/80" : ""}`}>
                    <item.icon className={`h-3.5 w-3.5 ${item.active ? "text-indigo-600" : "text-slate-400"}`} />
                    {item.label}
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main */}
            <div className="min-w-0 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Monday, 6 April</p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">Good morning, Meera</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/15 sm:inline-flex">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-slate-200">
                    <Bell className="h-3.5 w-3.5 text-slate-500" />
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {[
                  { label: "Present", value: "184", sub: "of 204 people", accent: "text-slate-950" },
                  { label: "Late", value: "12", sub: "3 fewer than last Mon", accent: "text-slate-950" },
                  { label: "On leave", value: "8", sub: "2 half days", accent: "text-slate-950" },
                  { label: "Approvals", value: "5", sub: "waiting on you", accent: "text-indigo-600" },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl p-3 ring-1 ring-slate-200/80 sm:p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">{kpi.label}</p>
                    <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${kpi.accent}`}>{kpi.value}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_1fr]">
                <div className="rounded-xl p-4 ring-1 ring-slate-200/80">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-slate-900">Attendance rate</p>
                    <p className="text-[11px] font-medium text-emerald-600">+8.4% vs last month</p>
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-950">92.6%</p>
                  <svg viewBox="0 0 320 110" className="mt-3 h-28 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="lp-trend-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((r) => <line key={r} x1="0" x2="320" y1={r * 36 + 2} y2={r * 36 + 2} stroke="#eef2f7" strokeWidth="1" />)}
                    <path d={area} fill="url(#lp-trend-fill)" />
                    <path d={line} fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    <circle cx={last[0]} cy={last[1]} r="4" fill="#fff" stroke="#4f46e5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>

                <div className="rounded-xl p-4 ring-1 ring-slate-200/80">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-slate-900">Latest punches</p>
                    <p className="text-[11px] font-medium text-slate-400">Today</p>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {PUNCHES.map((p) => (
                      <li key={p.name} className="flex items-center gap-2.5">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${p.avatar}`}>{p.initials}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-slate-900">{p.name}</p>
                          <p className="truncate text-[10px] text-slate-500">{p.place} · {p.time}</p>
                        </div>
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${p.tone}`}>{p.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating callouts add depth on wide screens only; placed over empty sidebar space and the window chrome. */}
      <div aria-hidden="true" className="absolute -left-6 bottom-14 hidden w-60 rounded-2xl bg-white/95 p-3.5 text-left shadow-[0_24px_50px_-20px_rgba(30,27,75,0.35)] ring-1 ring-slate-900/[0.08] backdrop-blur xl:block 2xl:-left-12">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/15">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-slate-900">Punch accepted</p>
            <p className="text-[11px] text-slate-500">Inside geofence · 38 m</p>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="keep-white absolute -right-6 -top-20 hidden w-64 rounded-2xl bg-slate-950 p-4 text-left shadow-[0_30px_60px_-24px_rgba(30,27,75,0.7)] ring-1 ring-white/10 xl:block 2xl:-right-12">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium opacity-70">Payroll · April 2026</p>
          <CircleCheck className="h-3.5 w-3.5" />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">₹18,42,650</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[98%] rounded-full bg-indigo-400" />
        </div>
        <p className="mt-2 text-[11px] opacity-70">204 payslips ready for review</p>
      </div>
    </div>
  );
}

/* ── Industries ───────────────────────────────────────────────────────────── */

export function ProofBar() {
  return (
    <section aria-label="Who WorkPulse is built for" className="py-14 sm:py-20">
      <div className={WRAP}>
        <p className="text-center text-[13px] font-medium text-slate-500">Built for teams that don&apos;t sit at desks all day</p>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:gap-x-12">
          {INDUSTRIES.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-400 transition hover:text-slate-700">
              <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Features (bento) ─────────────────────────────────────────────────────── */

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
    <section id="features" className="scroll-mt-24 py-16 sm:py-24">
      <div className={WRAP}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:gap-16">
          <SectionHeading eyebrow="The full workday" title={<>Attendance, leave and payroll. <Serif>One place.</Serif></>} />
          <p className="lp-reveal max-w-sm text-pretty text-base leading-relaxed text-slate-600 lg:pb-1">
            Every feature is built to stop leakage, keep employees informed and cut admin work.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
    <article className={`lp-reveal group flex min-w-0 flex-col overflow-hidden p-2 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_32px_60px_-30px_rgba(79,70,229,0.35)] ${CARD} ${className}`}>
      <div aria-hidden="true" className={`relative overflow-hidden rounded-[22px] bg-slate-50 ring-1 ring-slate-900/[0.04] ${wide ? "h-60 sm:h-64" : "h-56"}`}>
        <FeatureVisual id={feature.id} />
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <feature.icon className="h-[18px] w-[18px] text-indigo-600" aria-hidden="true" />
          <h3 className="text-[17px] font-semibold tracking-tight text-slate-950">{feature.title}</h3>
        </div>
        <p className="mt-2 max-w-md text-pretty text-[15px] leading-relaxed text-slate-600">{feature.body}</p>
      </div>
    </article>
  );
}

function FeatureVisual({ id }: { id: FeatureId }) {
  switch (id) {
    case "geofence":
      return (
        <div className="lp-dots absolute inset-0">
          <svg viewBox="0 0 600 260" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
            <path d="M-20 190 C 120 160, 220 220, 360 170 S 560 120, 640 150" stroke="#e2e8f0" strokeWidth="14" fill="none" />
            <path d="M210 -20 C 230 80, 260 160, 240 300" stroke="#e2e8f0" strokeWidth="10" fill="none" />
            <circle cx="300" cy="125" r="96" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 6" />
            <circle cx="300" cy="125" r="48" fill="rgba(99,102,241,0.08)" />
          </svg>
          <div className="absolute left-1/2 top-[48%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="mt-2 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">Andheri · 150 m</span>
          </div>
          {[
            { pos: "left-[40%] top-[22%]", initials: "AR" },
            { pos: "left-[57%] top-[64%]", initials: "LI" },
            { pos: "left-[39%] top-[66%]", initials: "RV" },
          ].map((a) => (
            <span key={a.initials} className={`absolute ${a.pos} flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-slate-700 shadow-md ring-2 ring-emerald-400`}>{a.initials}</span>
          ))}
          <div className="absolute right-[6%] top-[16%] flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 shadow-lg ring-1 ring-slate-200 sm:right-[9%]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-[10px] font-bold text-rose-700 ring-2 ring-rose-300">KD</span>
            <div>
              <p className="text-[11px] font-semibold text-slate-900">Punch blocked</p>
              <p className="text-[10px] text-slate-500">1.2 km outside · logged</p>
            </div>
          </div>
        </div>
      );
    case "offline":
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-2 px-5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><WifiOff className="h-3.5 w-3.5" /> No connection</span>
            <span className="flex items-center gap-1.5 text-indigo-600"><RefreshCw className="h-3.5 w-3.5 animate-spin [animation-duration:2.5s]" /> Will sync</span>
          </div>
          {[
            { time: "09:14:08", label: "Punch in", state: "Saved on device" },
            { time: "13:02:41", label: "Break start", state: "Saved on device" },
            { time: "13:31:15", label: "Break end", state: "Queued" },
          ].map((row, i) => (
            <div key={row.time} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/80" style={{ opacity: 1 - i * 0.18 }}>
              <div>
                <p className="text-[12px] font-semibold text-slate-900">{row.label}</p>
                <p className="font-code text-[10px] text-slate-500">{row.time}</p>
              </div>
              <span className="text-[10px] font-semibold text-amber-700">{row.state}</span>
            </div>
          ))}
        </div>
      );
    case "payroll":
      return (
        <div className="absolute inset-x-5 top-4 rounded-2xl bg-white px-4 py-3.5 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-900">Payslip · April</p>
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">Auto</span>
          </div>
          <dl className="mt-2.5 space-y-1 text-[11px]">
            {[
              ["Basic", "₹32,000"],
              ["HRA", "₹12,800"],
              ["PF (12%)", "−₹3,840"],
              ["Professional tax", "−₹200"],
              ["TDS", "−₹1,250"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-slate-500">{k}</dt>
                <dd className={`font-medium tabular-nums ${v.startsWith("−") ? "text-rose-600" : "text-slate-800"}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2.5 flex justify-between border-t border-dashed border-slate-200 pt-2 text-[12px] font-semibold">
            <span className="text-slate-900">Net pay</span>
            <span className="tabular-nums text-slate-950">₹39,510</span>
          </div>
        </div>
      );
    case "shifts": {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const SHIFT = { M: "bg-indigo-500 text-white", E: "bg-indigo-200 text-indigo-900", N: "bg-slate-800 text-white", O: "bg-[repeating-linear-gradient(135deg,#f1f5f9_0_6px,#e2e8f0_6px_8px)] text-slate-400" } as const;
      const LABEL = { M: "Morning", E: "Evening", N: "Night", O: "Off" } as const;
      const rows: { name: string; plan: (keyof typeof SHIFT)[] }[] = [
        { name: "Ananya", plan: ["M", "M", "M", "M", "M", "O", "O"] },
        { name: "Imran", plan: ["E", "E", "N", "N", "O", "M", "M"] },
        { name: "Lakshmi", plan: ["N", "N", "O", "E", "E", "E", "O"] },
        { name: "Rohit", plan: ["O", "M", "M", "E", "E", "N", "N"] },
      ];
      return (
        <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6">
          <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1.5 text-[10px] font-semibold text-slate-400 sm:grid-cols-[76px_repeat(7,1fr)]">
            <span />
            {days.map((d) => <span key={d} className="text-center">{d}</span>)}
            {rows.map((r) => (
              <React.Fragment key={r.name}>
                <span className="self-center truncate text-[11px] text-slate-700">{r.name}</span>
                {r.plan.map((s, i) => (
                  <span key={i} className={`flex h-8 items-center justify-center rounded-lg text-[9px] sm:text-[10px] ${SHIFT[s]}`}>
                    <span className="hidden sm:inline">{s === "O" ? "Off" : LABEL[s]}</span>
                    <span className="sm:hidden">{s}</span>
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 self-end rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Clock3 className="h-3 w-3 text-indigo-600" /> Sunday work → overtime applied
          </div>
        </div>
      );
    }
    case "invite":
      return (
        <div className="absolute inset-0 flex items-center justify-center px-5">
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">ST</span>
              <div>
                <p className="text-[12px] font-semibold text-slate-900">Join Sharma Textiles</p>
                <p className="text-[10px] text-slate-500">Invited by Meera · HR</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 font-code text-[10px] text-slate-500 ring-1 ring-slate-200/80">Temporary password · ••••••••</div>
            <div className="mt-3 flex h-8 items-center justify-center rounded-lg bg-slate-950 text-[11px] font-semibold text-white">Accept and set password</div>
          </div>
        </div>
      );
    case "unlock":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <KeyRound className="h-3.5 w-3.5 text-indigo-600" /> Unlock code sent to admin email
          </span>
          <div className="flex gap-1.5 sm:gap-2">
            {["4", "8", "2", "9", "1", ""].map((d, i) => (
              <span key={i} className={`flex h-11 w-9 items-center justify-center rounded-xl bg-white font-code text-lg font-semibold text-slate-900 shadow-sm ring-1 sm:h-12 sm:w-10 ${d ? "ring-slate-200" : "ring-2 ring-indigo-500"}`}>
                {d || <span className="h-5 w-px animate-pulse bg-indigo-500" />}
              </span>
            ))}
          </div>
        </div>
      );
  }
}

/* ── Workflow ─────────────────────────────────────────────────────────────── */

const STEP_DETAIL = [
  ["Andheri · 150 m radius", "General shift 09:30–18:30", "10 min grace"],
  ["Punch in 09:02 · inside geofence", "Offline punch synced 09:41"],
  ["204 payslips ready", "PF and ESI exports generated"],
];

export function Workflow() {
  return (
    <section className="py-16 sm:py-24">
      <div className={WRAP}>
        <SectionHeading
          center
          eyebrow="From first punch to payroll"
          title={<>A calmer way to <Serif>run the month.</Serif></>}
          body="Every part of the workday shares the same source of truth, so HR spends less time reconciling and more time helping people."
        />

        <ol className="relative mt-16 grid gap-4 md:grid-cols-3">
          <span aria-hidden="true" className="absolute left-[16%] right-[16%] top-[2.1rem] hidden border-t border-dashed border-indigo-200 md:block" />
          {WORKFLOW.map((step, i) => (
            <li key={step.number} className={`lp-reveal relative flex flex-col p-6 sm:p-7 ${CARD}`}>
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 font-code text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(30,27,75,0.6)]">
                {step.number}
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
              <p className="mt-2 text-pretty text-[15px] leading-relaxed text-slate-600">{step.body}</p>
              <ul className="mt-6 flex flex-wrap gap-1.5 border-t border-slate-100 pt-5">
                {STEP_DETAIL[i].map((d) => (
                  <li key={d} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 ring-1 ring-slate-200/70">{d}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="mt-10 text-center">
          <Link href="/register" className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-indigo-600 transition hover:text-indigo-500">
            Set up your workspace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Offline ──────────────────────────────────────────────────────────────── */

export function Offline() {
  return (
    <section id="offline" className="scroll-mt-24 py-16 sm:py-24">
      <div className={WRAP}>
        <div className={`relative grid items-center gap-12 overflow-hidden p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:p-16 ${CARD}`}>
          <div aria-hidden="true" className="lp-dots absolute inset-y-0 right-0 hidden w-1/2 [mask-image:linear-gradient(to_left,#000,transparent)] lg:block" />
          <div className="lp-reveal relative">
            <Eyebrow>{OFFLINE.eyebrow}</Eyebrow>
            <h2 className="mt-4 text-balance text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-[2.6rem]">
              Punch in from a basement. <Serif>Sync when the signal returns.</Serif>
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-600">{OFFLINE.body}</p>
            <ul className="mt-8 space-y-3.5">
              {OFFLINE.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px] text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
                    <Check className="h-3 w-3" aria-hidden="true" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <PhoneMock />
        </div>
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div aria-hidden="true" className="lp-reveal relative mx-auto w-full max-w-[300px]">
      <div className="absolute -inset-8 -z-10 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="rounded-[2.75rem] bg-slate-950 p-2.5 shadow-[0_40px_80px_-30px_rgba(30,27,75,0.6)] ring-1 ring-slate-900">
        <div className="relative overflow-hidden rounded-[2.2rem] bg-slate-50">
          <div className="flex items-center justify-between px-6 pb-2 pt-3 text-[11px] font-semibold text-slate-900">
            <span>9:14</span>
            <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-950" />
            <span className="flex items-center gap-1 text-slate-400"><Signal className="h-3 w-3" /> No service</span>
          </div>

          <div className="px-4 pb-5 pt-3">
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
              <WifiOff className="h-3.5 w-3.5" /> Offline · punches saved on this phone
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200/80">
              <p className="text-[11px] font-medium text-slate-500">Bhiwandi warehouse</p>
              <p className="mt-1 font-code text-3xl font-semibold tabular-nums tracking-tight text-slate-950">09:14:08</p>
              <div className="mx-auto mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white shadow-lg shadow-indigo-600/30">
                <CircleCheck className="h-4 w-4" /> Punched in
              </div>
            </div>

            <p className="mt-5 px-1 text-[11px] font-semibold text-slate-500">Today</p>
            <div className="mt-2 space-y-2">
              {[
                { name: "Punch in", time: "09:14", state: "On device", tone: "text-amber-700" },
                { name: "Punch out (Sat)", time: "18:32", state: "Synced", tone: "text-emerald-700" },
                { name: "Punch in (Sat)", time: "09:26", state: "Synced", tone: "text-emerald-700" },
              ].map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200/70">
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{row.name}</p>
                    <p className="font-code text-[10px] text-slate-500">{row.time}</p>
                  </div>
                  <span className={`text-[10px] font-semibold ${row.tone}`}>{row.state}</span>
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
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(amount);

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
  const cols = plans.length === 3 ? "lg:grid-cols-3" : plans.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-4";
  return (
    <section id="pricing" className="scroll-mt-24 py-16 sm:py-24">
      <div className={WRAP}>
        <SectionHeading center eyebrow="Simple pricing" title={<>Simple plans. <Serif>Full workday.</Serif></>} body="Current limits and features, straight from our billing system." />

        <div className="mt-9 flex justify-center">
          <div role="radiogroup" aria-label="Billing cycle" className="inline-flex rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/10">
            {(["MONTHLY", "ANNUAL"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cycle === c}
                onClick={() => onCycle(c)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${cycle === c ? "keep-white bg-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}
              >
                {c === "MONTHLY" ? "Monthly" : "Annual"}
                {c === "ANNUAL" && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cycle === c ? "bg-white/15" : "bg-emerald-50 text-emerald-700"}`}>Save 20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {unavailable && (
          <p className="mx-auto mt-12 max-w-xl rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-800 ring-1 ring-amber-200">
            Pricing is temporarily unavailable. Please try again shortly.
          </p>
        )}

        {!unavailable && plans.length === 0 && (
          <div aria-busy="true" className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-[30rem] rounded-[28px]" />
            ))}
          </div>
        )}

        {plans.length > 0 && (
          <div className={`mt-14 grid items-stretch gap-4 md:grid-cols-2 ${cols}`} aria-live="polite">
            {plans.map((p) => {
              const dark = !!p.popular;
              return (
                <article
                  key={p.id}
                  className={`relative flex min-w-0 flex-col rounded-[28px] p-6 transition duration-300 sm:p-7 ${
                    dark
                      ? "bg-slate-950 text-white shadow-[0_40px_80px_-30px_rgba(30,27,75,0.7)] ring-1 ring-slate-950"
                      : `${CARD} hover:-translate-y-0.5`
                  }`}
                >
                  {dark && <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(80%_50%_at_50%_0%,rgba(99,102,241,0.35),transparent)]" />}
                  <div className="relative flex h-7 items-center justify-between gap-3">
                    <h3 className={`truncate text-lg font-semibold tracking-tight ${dark ? "text-white" : "text-slate-950"}`}>{p.name}</h3>
                    {dark ? (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-indigo-500 px-2.5 py-1 text-[11px] font-semibold text-white">Popular</span>
                    ) : (
                      p.badge && <span className="truncate text-[12px] font-medium text-slate-500">{p.badge}</span>
                    )}
                  </div>
                  <p className={`relative mt-2 line-clamp-2 min-h-[2.75rem] text-[13px] leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>{p.description}</p>

                  <div className="relative mt-6 flex items-baseline gap-1">
                    <span className={`text-[2.6rem] font-semibold leading-none tracking-[-0.04em] tabular-nums ${dark ? "text-white" : "text-slate-950"}`}>
                      {money(cycle === "MONTHLY" ? p.priceMonthly : p.priceAnnual, p.currency)}
                    </span>
                    {p.priceMonthly > 0 && <span className={`text-[13px] ${dark ? "text-slate-400" : "text-slate-500"}`}>/ {cycle === "MONTHLY" ? "month" : "year"}</span>}
                  </div>

                  <Link
                    href={`/register?plan=${p.id}`}
                    className={`relative mt-6 inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition active:scale-[0.98] ${
                      dark
                        ? "bg-white text-slate-950 hover:bg-indigo-50"
                        : "keep-white bg-slate-950 hover:bg-slate-800"
                    }`}
                  >
                    {p.id === "FREE_TRIAL" ? "Start free trial" : `Choose ${p.name}`}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  <ul className={`relative mt-7 flex-1 space-y-3 border-t pt-6 ${dark ? "border-white/10" : "border-slate-100"}`}>
                    {p.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-[13px] ${dark ? "text-slate-200" : "text-slate-700"}`}>
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? "text-indigo-300" : "text-indigo-600"}`} aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-[13px] text-slate-500">Every plan starts with a 14-day free trial. No card needed.</p>
      </div>
    </section>
  );
}

/* ── Security ─────────────────────────────────────────────────────────────── */

const AUDIT = [
  { icon: ShieldCheck, text: "Meera signed in with two-step verification", time: "09:01", tone: "text-emerald-600 bg-emerald-50" },
  { icon: MapPin, text: "Punch outside Andheri geofence blocked", time: "09:07", tone: "text-rose-600 bg-rose-50" },
  { icon: Users, text: "Rohit Verma's role changed to Manager", time: "10:22", tone: "text-indigo-600 bg-indigo-50" },
  { icon: Wallet, text: "April payroll exported by Meera", time: "16:45", tone: "text-slate-600 bg-slate-100" },
];

export function Security() {
  return (
    <section id="security" className="scroll-mt-24 py-16 sm:py-24">
      <div className={`${WRAP} grid items-center gap-14 lg:grid-cols-2 lg:gap-20`}>
        <div>
          <SectionHeading eyebrow="Security and compliance" title={<>Your people&apos;s data, <Serif>handled with care.</Serif></>} />
          <dl className="mt-10 space-y-7">
            {SECURITY.map((s) => (
              <div key={s.title} className="lp-reveal flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-900/[0.08]">
                  <s.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-base font-semibold tracking-tight text-slate-950">{s.title}</dt>
                  <dd className="mt-1 max-w-md text-pretty text-[15px] leading-relaxed text-slate-600">{s.body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div aria-hidden="true" className={`lp-reveal p-2 ${CARD}`}>
          <div className="rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-900/[0.04] sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Audit log</p>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                <Lock className="h-3 w-3" /> Every change recorded
              </span>
            </div>
            <ul className="relative mt-5 space-y-2.5">
              {AUDIT.map((a) => (
                <li key={a.text} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.tone}`}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  <p className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">{a.text}</p>
                  <span className="shrink-0 font-code text-[11px] text-slate-400">{a.time}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {["Hashed passwords", "Role-based access", "Tenant isolation"].map((t) => (
                <div key={t} className="rounded-xl bg-white px-2 py-3 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/70">{t}</div>
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
    <section id="faq" className="scroll-mt-24 py-16 sm:py-24">
      <div className={`${WRAP} grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow="Questions, answered" title={<>Good to know <Serif>before you start.</Serif></>} />
          <p className="mt-5 max-w-sm text-pretty text-[15px] leading-relaxed text-slate-600">
            Still deciding? We keep the important details close by so your team can move with confidence.
          </p>
          <Link href="/register" className="group mt-7 inline-flex items-center gap-1.5 text-[15px] font-semibold text-indigo-600 transition hover:text-indigo-500">
            Try it free for 14 days <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        <div className={`divide-y divide-slate-100 px-5 sm:px-8 ${CARD}`}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group py-5 sm:py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-semibold text-slate-900 transition hover:text-indigo-600 [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition duration-300 group-open:rotate-45 group-open:bg-indigo-600 group-open:text-white">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>
              <p className="max-w-2xl pr-10 pt-3 text-pretty text-[15px] leading-relaxed text-slate-600">{item.answer}</p>
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
    <section className="pb-20 pt-8 sm:pb-28">
      <div className={WRAP}>
        <div className="lp-reveal relative isolate overflow-hidden rounded-[32px] bg-[#0b0d1f] px-6 py-16 text-center shadow-[0_50px_100px_-40px_rgba(30,27,75,0.8)] sm:px-16 sm:py-24">
          <div aria-hidden="true" className="lp-grid-dark absolute inset-0 -z-10" />
          <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-80 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/40 blur-[100px]" />
          <Eyebrow dark>14 days free · no card needed</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl">
            Ready for a <span className="font-display font-normal italic text-indigo-300">cleaner workday?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-pretty text-base text-slate-300 sm:text-lg">Set up your workspace in minutes. Start free for 14 days, with no card needed.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link href="/register" className="group inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-slate-950 shadow-lg transition hover:bg-indigo-50 active:scale-[0.98] sm:w-auto">
              Create your workspace
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/login" className="keep-white group inline-flex items-center gap-1.5 text-[15px] font-semibold opacity-80 transition hover:opacity-100">
              Sign in <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
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
    <footer className="border-t border-slate-200/80 bg-white/60">
      <div className={`${WRAP} grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]`}>
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-128.png" alt="WorkPulse logo" width={32} height={32} className="h-8 w-8 rounded-xl" />
            <span className="text-[17px] font-semibold tracking-tight text-slate-950">WorkPulse</span>
          </Link>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">Geofenced attendance, leave and payroll for Indian teams. Built for the floor, not just the office.</p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-[13px] font-semibold text-slate-950">{col.title}</p>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith("#") ? (
                    <a href={l.href} className="text-sm text-slate-500 transition hover:text-slate-950">{l.label}</a>
                  ) : (
                    <Link href={l.href} className="text-sm text-slate-500 transition hover:text-slate-950">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-slate-200/80">
        <div className={`${WRAP} flex flex-col gap-2 py-6 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between`}>
          <p>© {new Date().getFullYear()} WorkPulse. All rights reserved.</p>
          <p>Made for teams across India.</p>
        </div>
      </div>
    </footer>
  );
}
