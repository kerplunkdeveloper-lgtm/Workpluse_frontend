import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteFooter } from "./LandingSections";
import { SiteHeader } from "./SiteHeader";

export type MarketingPage = {
  eyebrow: string;
  title: string;
  intro: string;
  proof: string;
  benefits: string[];
  workflows: { title: string; body: string }[];
  related: { href: string; label: string }[];
};

export function MarketingSolutionPage({ page }: { page: MarketingPage }) {
  return (
    <div className="min-h-screen bg-[#fafbfc] font-landing text-slate-900 antialiased">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative mx-auto max-w-5xl text-center">
            <p className="inline-flex rounded-full bg-indigo-100 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">{page.eyebrow}</p>
            <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-6xl">{page.title}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">{page.intro}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800">Start a free trial <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/register?intent=demo" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50">Book a demo</Link>
            </div>
            <p className="mt-5 text-sm font-semibold text-emerald-700">{page.proof}</p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8 lg:py-24">
          {page.benefits.map((benefit) => (
            <article key={benefit} className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,.3)] ring-1 ring-slate-900/[0.08]">
              <CheckCircle2 className="h-6 w-6 text-indigo-600" />
              <h2 className="mt-5 text-lg font-bold text-slate-950">{benefit}</h2>
            </article>
          ))}
        </section>

        <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">How Clocked helps</p>
            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {page.workflows.map((workflow, index) => (
                <article key={workflow.title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
                  <span className="text-sm font-black text-indigo-300">0{index + 1}</span>
                  <h2 className="mt-5 text-xl font-bold">{workflow.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{workflow.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="rounded-[2rem] bg-indigo-50 p-7 ring-1 ring-indigo-100 sm:p-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Explore the rest of the Clocked HRMS</h2>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {page.related.map((item) => <Link key={item.href} href={item.href} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-600 hover:text-white">{item.label}</Link>)}
              <Link href="/pricing" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-600 hover:text-white">View pricing</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
