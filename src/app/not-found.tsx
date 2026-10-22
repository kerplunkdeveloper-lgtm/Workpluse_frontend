import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f5f7fb] px-4 py-16">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/25 blur-3xl" />
      <div className="relative w-full max-w-xl text-center">
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <span className="animate-ripple absolute inset-0 rounded-[2rem] border border-indigo-200/80" />
          <span className="absolute inset-2 rounded-[1.5rem] border border-indigo-100 bg-white shadow-[0_20px_60px_rgba(48,42,140,0.12)]" />
          <span className="relative text-2xl font-semibold tracking-[-0.05em] text-indigo-600">404</span>
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Workspace route</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">This page doesn&apos;t exist</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-500">
          The link may be old or mistyped. Everything in your workspace is still where you left it.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="inline-flex h-12 items-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5 hover:bg-indigo-700">
            Go to dashboard
          </Link>
          <Link href="/" className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700">
            WorkPulse home
          </Link>
        </div>
      </div>
    </main>
  );
}