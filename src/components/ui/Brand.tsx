"use client";

import Link from "next/link";

interface BrandProps {
  href?: string;
  inverse?: boolean;
  compact?: boolean;
  subtitle?: string;
  className?: string;
}

export default function Brand({
  href = "/",
  inverse = false,
  compact = false,
  subtitle,
  className = "",
}: BrandProps) {
  const content = (
    <>
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4d46e8] text-white shadow-[0_10px_24px_-12px_rgba(37,99,235,0.8)]">
        <span className="font-sans text-[20px] font-bold leading-none tracking-tight">W<span className="text-[15px]">.</span></span>
        <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-sky-300" />
      </span>
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className={`block font-sans text-[20px] font-semibold tracking-tight ${inverse ? "text-white" : "text-slate-950"}`}>
            Work<span className={inverse ? "text-indigo-200" : "text-indigo-600"}>Pluse</span>
          </span>
          {subtitle && (
            <span className={`mt-1.5 block truncate text-xs font-semibold uppercase tracking-[0.18em] ${inverse ? "text-white/50" : "text-slate-500"}`}>
              {subtitle}
            </span>
          )}
        </span>
      )}
    </>
  );

  return (
    <Link
      href={href}
      aria-label="WorkPluse home"
      suppressHydrationWarning
      className={`inline-flex items-center gap-3 rounded-xl ${className}`}
    >
      {content}
    </Link>
  );
}
