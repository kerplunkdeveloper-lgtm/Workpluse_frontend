import type { ReactNode } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Brand from "@/components/ui/Brand";

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

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
  asideTitle = "The workday, held in one place.",
  asideDescription = "Clock in, approve leave, and run payroll without jumping between tools.",
  points = [
    "GPS attendance with offline punch sync",
    "Approvals, people, and shifts in one workspace",
    "Payroll-ready records with a full audit trail",
  ],
  footer,
  wide = false,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 lg:grid lg:grid-cols-[minmax(420px,0.92fr)_minmax(0,1.08fr)]">
      <aside className="relative hidden overflow-hidden bg-slate-900 px-10 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
        <div aria-hidden="true" className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-blue-500/30 blur-[110px]" />
        <div aria-hidden="true" className="absolute -bottom-28 right-[-40px] h-96 w-96 rounded-full bg-sky-400/20 blur-[120px]" />

        <Brand inverse subtitle="Workforce, in rhythm" className="relative z-10 w-fit" />

        <div className="relative z-10 my-auto max-w-[34rem] py-16">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">
            WorkPulse workspace
          </p>
          <h1 className="font-serif text-balance text-4xl font-semibold leading-[1.12] tracking-tight xl:text-[46px]">
            {asideTitle}
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-white/65">{asideDescription}</p>

          <ul className="mt-9 space-y-4">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-indigo-200">
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/45">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 text-indigo-200" />
          Encrypted, role-aware, and built for operational trust.
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-blue-200/50 blur-[90px]" />
          <div className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-sky-200/40 blur-[90px]" />
        </div>
        <div className={`relative w-full ${wide ? "max-w-[540px]" : "max-w-[440px]"}`}>
          <Brand subtitle="Workforce, in rhythm" className="mb-10 w-fit lg:hidden" />

          <div className="mb-7">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{eyebrow}</p>
            <h2 className="font-serif text-balance text-[32px] font-semibold leading-tight text-slate-950 sm:text-[36px]">
              {title}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
          </div>

          <div className="app-card p-5 sm:p-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
