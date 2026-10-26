import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck2,
  Fingerprint,
  Lock,
  MapPin,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Brand from "@/components/ui/Brand";

/* ── Shared form building blocks (used by sign in, register, etc.) ─────────── */

export const authLabel = "mb-1.5 block text-[13px] font-semibold text-slate-700";

export const authInputWrap = (invalid = false) =>
  `group flex h-12 items-center gap-3 rounded-xl border bg-[#ffffff] px-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all ${
    invalid
      ? "border-rose-400 ring-4 ring-rose-500/10"
      : "border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10"
  }`;

export const authInput =
  "min-w-0 flex-1 bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400";

export const authIcon =
  "h-[18px] w-[18px] shrink-0 text-slate-400 transition-colors group-focus-within:text-indigo-500";

export const authPrimaryButton =
  "keep-white group/btn relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 text-[14px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(79,70,229,0.75)] transition-all hover:-translate-y-px hover:shadow-[0_16px_32px_-10px_rgba(79,70,229,0.85)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

export const authSecondaryButton =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60";

export function AuthDivider({ children = "or" }: { children?: ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3 text-[12px] font-medium uppercase tracking-wider text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      {children}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

/* ── Left panel product preview ─────────────────────────────────────────────── */

function ProductPreview() {
  const bars = [46, 62, 54, 78, 70, 92, 84];
  return (
    <div aria-hidden="true" className="relative mt-10 max-w-[30rem]">
      <div className="absolute -inset-4 rounded-[2rem] bg-indigo-500/20 blur-2xl" />

      <div className="wp-auth-float relative rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
            Sample view
          </span>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Today at a glance</p>

        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          {[
            { label: "Present", value: "94%", tone: "text-emerald-300" },
            { label: "On leave", value: "12", tone: "text-sky-300" },
            { label: "Approvals", value: "5", tone: "text-amber-300" },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 py-2.5">
              <p className="text-[10px] font-medium text-white/50">{tile.label}</p>
              <p className={`mt-0.5 text-xl font-bold tabular-nums ${tile.tone}`}>{tile.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
          <div className="flex items-end justify-between gap-1.5" style={{ height: 64 }}>
            {bars.map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-md bg-gradient-to-t from-indigo-500/70 to-sky-300/90"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] font-medium uppercase tracking-wider text-white/35">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d} className="flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -right-3 flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#0d1433]/90 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-md sm:-right-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
          <Wallet className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-[11px] font-semibold text-white">Payroll run ready</span>
          <span className="block text-[10px] text-white/50">Attendance locked · statutory checked</span>
        </span>
      </div>
    </div>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────────── */

interface AuthShellProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  asideTitle?: string;
  asideDescription?: string;
  points?: string[];
  footer?: ReactNode;
  wide?: boolean;
}

const POINT_ICONS = [MapPin, CalendarCheck2, Fingerprint];

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
  asideTitle = "The workday, held in one place.",
  asideDescription = "Punch in, approve leave, and run payroll without jumping between tools.",
  points = [
    "GPS attendance with offline punch sync",
    "Approvals, people, and shifts in one workspace",
    "Payroll-ready records with a full audit trail",
  ],
  footer,
  wide = false,
}: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-slate-50 lg:h-dvh lg:overflow-hidden lg:grid lg:grid-cols-[minmax(460px,1.04fr)_minmax(0,0.96fr)]">
      {/* Brand / product panel */}
      <aside className="wp-auth-aside relative hidden overflow-hidden px-10 py-8 text-white lg:flex lg:h-dvh lg:flex-col xl:px-16 xl:py-10">
        <div aria-hidden="true" className="wp-auth-grid absolute inset-0" />

        <div className="relative z-10 flex items-center justify-between">
          <Brand inverse size="lg" />
        </div>

        <div className="relative z-10 my-auto py-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            WorkPluse workspace
          </span>

          <h1 className="mt-6 max-w-[30rem] text-balance bg-gradient-to-br from-white via-white to-indigo-200 bg-clip-text text-4xl font-bold leading-[1.1] tracking-tight text-transparent xl:text-[46px]">
            {asideTitle}
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-white/65">{asideDescription}</p>

          <ul className="mt-8 flex max-w-[30rem] flex-col gap-2.5">
            {points.map((point, i) => {
              const Icon = POINT_ICONS[i % POINT_ICONS.length];
              return (
                <li key={point} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-indigo-200">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  {point}
                </li>
              );
            })}
          </ul>

          <div className="[@media(max-height:860px)]:hidden">
            <ProductPreview />
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/50">
          <span className="flex items-center gap-1.5">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-indigo-200" />
            Encrypted &amp; role-aware
          </span>
          <span className="flex items-center gap-1.5">
            <BadgeCheck aria-hidden="true" className="h-4 w-4 text-indigo-200" />
            Full audit trail
          </span>
          <span className="flex items-center gap-1.5">
            <Lock aria-hidden="true" className="h-4 w-4 text-indigo-200" />
            Tenant-isolated data
          </span>
        </div>
      </aside>

      {/* Form panel */}
      <section className="wp-auth-form-bg relative flex min-h-dvh flex-col lg:h-dvh lg:overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8 lg:px-12 lg:pt-8">
          <div className="lg:hidden">
            <Brand size="sm" />
          </div>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to website
          </Link>
        </div>

        <div className="flex flex-1 flex-col px-5 py-6 sm:px-8 lg:px-12">
          <div className={`wp-auth-rise m-auto w-full ${wide ? "max-w-[520px]" : "max-w-[440px]"}`}>
            <div className="mb-5 [@media(min-height:900px)]:mb-7">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 ring-1 ring-indigo-100">
                {eyebrow}
              </p>
              <h2 className="text-balance text-[30px] font-bold leading-tight tracking-tight text-slate-950 sm:text-[34px]">
                {title}
              </h2>
              <p className="mt-2.5 max-w-md text-[14px] leading-6 text-slate-500">{description}</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(30,41,99,0.28),0_2px_6px_rgba(15,23,42,0.04)] sm:p-7">
              {children}
            </div>

            {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
          </div>
        </div>

        <p className="px-5 pb-6 text-center text-xs text-slate-400">
          By continuing you agree to our{" "}
          <Link href="/terms" className="font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
