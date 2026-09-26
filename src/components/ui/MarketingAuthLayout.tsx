"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  FileText,
  LayoutDashboard,
  Leaf,
  Users,
  Wallet,
} from "lucide-react";

export function WorkPulseMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-500 to-blue-800 text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.7)] font-serif"
      style={{ width: size, height: size }}
    >
      <span
        className="font-black leading-none tracking-tight"
        style={{ fontSize: Math.max(11, Math.round(size * 0.42)) }}
      >
        W
      </span>
    </span>
  );
}

function DashboardPreview() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className="h-[260px] w-full rounded-2xl border border-slate-200/80 bg-white" />;
  }

  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const present = new Set([1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30]);
  const leave = new Set([6, 13]);
  const holiday = new Set([14, 21]);
  const absent = new Set([7, 20, 27]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-[#ffffff] shadow-[0_24px_50px_-28px_rgba(22,19,16,0.35)]">
      <div className="flex min-h-[260px]">
        <aside className="hidden w-[118px] shrink-0 flex-col border-r border-slate-100 bg-[#0f172a] px-2.5 py-3 sm:flex">
          <div className="mb-3 flex items-center gap-1.5 px-1">
            <WorkPulseMark size={22} />
            <span className="text-[10px] font-bold text-white">WorkPulse</span>
          </div>
          <nav className="space-y-0.5">
            {[
              { label: "Dashboard", icon: LayoutDashboard, active: true },
              { label: "Attendance", icon: CalendarDays, active: false },
              { label: "Leave", icon: FileText, active: false },
              { label: "Payroll", icon: CreditCard, active: false },
              { label: "Team", icon: Users, active: false },
              { label: "Reports", icon: BarChart3, active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9px] font-semibold ${
                  item.active ? "bg-indigo-600 text-white shadow-sm" : "text-white/50"
                }`}
              >
                <item.icon className="h-3 w-3 shrink-0" />
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 bg-[#f7f3ec] p-3">
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <div>
              <p className="text-[13px] font-black tracking-tight text-slate-900">Good morning!</p>
              <p className="text-[9px] text-slate-400">Here&apos;s what&apos;s happening with your team today.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-500">
              This week ▾
            </div>
          </div>

          <div className="mb-2.5 grid grid-cols-3 gap-1.5">
            {[
              { icon: Users, label: "124 employees", change: "+12%", tone: "text-indigo-500" },
              { icon: CheckCircle2, label: "96% on time", change: "+8%", tone: "text-emerald-500" },
              { icon: Wallet, label: "₹12.4L payroll", change: "+1%", tone: "text-violet-500" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-slate-100 bg-white px-2 py-1.5 shadow-sm">
                <div className="mb-0.5 flex items-center gap-1">
                  <kpi.icon className={`h-3 w-3 ${kpi.tone}`} />
                  <span className="text-[10px] font-black text-slate-900">{kpi.label.split(" ")[0]}</span>
                  <span className="ml-auto text-[8px] font-bold text-emerald-500">{kpi.change}</span>
                </div>
                <p className="text-[8px] capitalize text-slate-400">{kpi.label.split(" ").slice(1).join(" ")}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.1fr_0.95fr_0.7fr] gap-1.5">
            <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-700">Attendance Overview</span>
                <span className="text-[8px] text-slate-400">◀ April 2024 ▶</span>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-center text-[7px] font-semibold text-slate-400">
                    {d}
                  </div>
                ))}
                {calendarDays.map((n) => {
                  const dot = present.has(n)
                    ? "bg-emerald-500"
                    : leave.has(n)
                      ? "bg-amber-400"
                      : holiday.has(n)
                        ? "bg-sky-400"
                        : absent.has(n)
                          ? "bg-rose-400"
                          : "bg-transparent";
                  return (
                    <div key={n} className="flex flex-col items-center py-0.5">
                      <span className="text-[7px] font-semibold text-slate-600">{n}</span>
                      <span className={`mt-0.5 h-1 w-1 rounded-full ${dot}`} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {[
                  ["bg-emerald-500", "Present"],
                  ["bg-amber-400", "Leave"],
                  ["bg-sky-400", "Holiday"],
                  ["bg-rose-400", "Absent"],
                ].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-0.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${c}`} />
                    <span className="text-[6px] text-slate-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-700">Team Today</span>
                <span className="text-[8px] font-semibold text-indigo-500">View all</span>
              </div>
              {[
                { name: "Aaron Mehta", dept: "Product", status: "Present", ok: true },
                { name: "Priya Sharma", dept: "Design", status: "Present", ok: true },
                { name: "Rohan Kapoor", dept: "Engineering", status: "On Leave", ok: false },
                { name: "Sneha Iyer", dept: "Marketing", status: "Present", ok: true },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-1.5 py-0.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[8px] font-bold text-indigo-600">
                    {p.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[8px] font-semibold text-slate-800">{p.name}</p>
                    <p className="truncate text-[7px] text-slate-400">{p.dept}</p>
                  </div>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[6px] font-bold ${
                      p.ok ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
              <span className="mb-2 block text-[9px] font-bold text-slate-700">Payroll Trend</span>
              <div className="flex h-16 items-end gap-1">
                {[38, 52, 44, 58, 48, 72].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${i === 5 ? "bg-indigo-600" : "bg-indigo-200"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => (
                  <span key={m} className="text-[6px] text-slate-400">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#offline", label: "Solutions" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#security", label: "Resources" },
];

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-[#ffffff] p-6 shadow-[0_28px_60px_-28px_rgba(22,19,16,0.45)] sm:p-8">
      {children}
    </div>
  );
}

export function authFieldRing(focused: boolean) {
  return focused
    ? "border-blue-400 shadow-[0_0_0_3px_rgba(37,99,235,0.14)]"
    : "border-slate-200 hover:border-slate-300";
}

export default function MarketingAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-[420px] w-[520px] rounded-full bg-blue-200/55 blur-[90px]" />
        <div className="absolute right-[-80px] top-24 h-[380px] w-[420px] rounded-full bg-sky-200/50 blur-[100px]" />
        <div className="absolute bottom-[-40px] left-1/4 h-[360px] w-[480px] rounded-full bg-[#F0D9C4]/45 blur-[110px]" />
        <div className="absolute left-[28%] top-[38%] h-40 w-[420px] rounded-full bg-white/70 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1280px] items-center px-3 py-4 sm:px-5 lg:px-8">
        <div className="relative w-full overflow-hidden rounded-[28px] border border-white/80 bg-[#ffffff]/80 shadow-[0_30px_80px_-36px_rgba(22,19,16,0.4)] backdrop-blur-sm">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute left-[36%] top-[32%] h-56 w-[420px] rounded-full bg-[#F6E4D4]/85 blur-3xl" />
            <div className="absolute bottom-6 left-8 h-44 w-80 rounded-full bg-[#D7EDE8]/75 blur-3xl" />
          </div>

          <div className="relative flex items-center gap-1.5 px-5 pt-3.5 sm:px-7">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>

          <header className="relative flex items-center justify-between gap-3 px-5 py-3 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5">
              <WorkPulseMark />
              <span className="font-serif text-[17px] font-semibold tracking-tight text-slate-900">WorkPulse</span>
            </Link>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-[13px] font-medium text-slate-500 md:flex">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-slate-900">
                  {link.label}
                </Link>
              ))}
            </nav>

            <a
              href="mailto:support@workpulse.app"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-500 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.45)] hover:text-slate-900"
            >
              <CircleHelp className="h-4 w-4" />
              Need help?
            </a>
          </header>

          <div className="relative px-5 pb-8 pt-4 sm:px-8 lg:pb-10 lg:pt-6">
            <div className="relative z-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,400px)] lg:gap-10">
              <section className="order-2 min-w-0 lg:order-1">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600">
                  Workforce, in rhythm
                </p>
                <h1 className="max-w-xl font-serif text-[40px] font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-[48px] xl:text-[56px]">
                  Clock the day.
                  <br />
                  <span className="italic text-indigo-600">Pay the people.</span>
                  <br />
                  Keep the beat.
                </h1>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500">
                  Attendance, leave, payroll, and joining in one calm workspace — not a stack of tools.
                </p>

                <div className="relative mt-7">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { icon: CalendarDays, label: "Attendance", sub: "Track with confidence" },
                      { icon: Leaf, label: "Leave", sub: "Simplify approvals" },
                      { icon: CreditCard, label: "Payroll", sub: "Generate and disburse" },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-full border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900">{label}</p>
                          <p className="text-[11px] text-slate-400">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-[8%] top-[-18px] hidden w-[158px] xl:block"
                  >
                    <p
                      className="rotate-[-8deg] font-serif text-[20px] leading-tight text-indigo-500"
                    >
                      A more productive
                      <br />
                      tomorrow, together.
                    </p>
                    <svg className="mt-1 ml-10 h-10 w-20 text-indigo-400" viewBox="0 0 80 40" fill="none">
                      <path
                        d="M4 6 C 28 10, 42 22, 62 34"
                        stroke="currentColor"
                        strokeDasharray="2.5 3.5"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                      <path d="M56 30 L64 36 L54 36" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                <div className="pointer-events-none relative z-0 mt-10 hidden w-[112%] max-w-[760px] lg:block xl:w-[122%] xl:max-w-none">
                  <DashboardPreview />
                </div>
              </section>

              <section className="relative z-20 order-1 lg:order-2">{children}</section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
