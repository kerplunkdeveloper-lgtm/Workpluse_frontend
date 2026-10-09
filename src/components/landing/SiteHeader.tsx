"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
        className={`mx-auto max-w-[1200px] rounded-2xl transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
          raised ? "bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-16px_rgba(30,27,75,0.25)] ring-1 ring-slate-900/[0.07] backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="flex h-14 items-center justify-between gap-4 pl-3 pr-2 sm:pl-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image src="/logo-128.png" alt="WorkPulse logo" width={30} height={30} className="h-[30px] w-[30px] rounded-lg" priority />
            <span className="truncate text-[17px] font-semibold tracking-tight text-slate-950">WorkPulse</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-900/[0.04] hover:text-slate-950">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-900/[0.04] hover:text-slate-950 sm:inline-flex">
              Sign in
            </Link>
            <Link
              href="/register"
              className="keep-white group inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-950 px-4 text-sm font-semibold shadow-[0_6px_16px_-6px_rgba(30,27,75,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-slate-800 active:scale-[0.98]"
            >
              Start free
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
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
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 md:hidden ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <nav aria-label="Mobile" className="min-h-0">
            <div className="space-y-0.5 border-t border-slate-900/[0.06] px-2 pb-3 pt-2">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-900/[0.04]">
                  {l.label}
                </a>
              ))}
              <Link href="/login" tabIndex={open ? 0 : -1} className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-900/[0.04]">
                Sign in
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
