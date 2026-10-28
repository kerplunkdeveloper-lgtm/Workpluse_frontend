"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Brand from "@/components/ui/Brand";
import { ArrowRight, Menu, X } from "lucide-react";
import { NAV_LINKS } from "./content";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const raised = scrolled || open;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div
        className={`mx-auto max-w-[1200px] rounded-2xl transition-all duration-300 ${
          raised
            ? "bg-white/85 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-slate-900/[0.08] backdrop-blur-xl"
            : "bg-white/60 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] ring-1 ring-slate-900/[0.05] backdrop-blur-md"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-4 pl-3 pr-2 sm:pl-4">
          <Brand size="sm" subtitle="Workforce, in rhythm" />

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={`${l.href}-${l.label}`}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-950"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-950 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register?intent=demo"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 sm:inline-flex"
            >
              Book a demo
            </Link>
            <Link
              href="/register"
              className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <span>Get started</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-900/[0.05] md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          id="mobile-nav"
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 md:hidden ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <nav aria-label="Mobile" className="min-h-0">
            <div className="space-y-1 border-t border-slate-900/[0.06] px-3 pb-3 pt-2">
              {NAV_LINKS.map((l) => (
                <a
                  key={`${l.href}-${l.label}`}
                  href={l.href}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-[15px] font-medium text-slate-700 hover:bg-slate-900/[0.04] hover:text-slate-950"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/login"
                tabIndex={open ? 0 : -1}
                className="block rounded-lg px-3 py-2 text-[15px] font-medium text-slate-700 hover:bg-slate-900/[0.04] hover:text-slate-950"
              >
                Sign in
              </Link>
              <Link
                href="/register?intent=demo"
                tabIndex={open ? 0 : -1}
                className="block rounded-lg px-3 py-2 text-[15px] font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                Book a demo
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
