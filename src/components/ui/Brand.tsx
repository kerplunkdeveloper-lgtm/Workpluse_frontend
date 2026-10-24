"use client";

import Link from "next/link";
import Image from "next/image";

interface BrandProps {
  href?: string;
  /** Use on dark backgrounds: swaps to the white-wordmark logo. */
  inverse?: boolean;
  /** Mark only (no wordmark), e.g. the collapsed sidebar. */
  compact?: boolean;
  subtitle?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LOCKUP = { width: 1024, height: 341 };

const SIZES = {
  sm: { box: "h-7 sm:h-8", mark: "h-8 w-8", sizes: "(max-width: 640px) 140px, 180px" },
  md: { box: "h-9 sm:h-10", mark: "h-9 w-9", sizes: "(max-width: 640px) 180px, 220px" },
  lg: { box: "h-11 sm:h-12", mark: "h-11 w-11", sizes: "(max-width: 640px) 220px, 280px" },
} as const;

export default function Brand({
  href = "/",
  inverse = false,
  compact = false,
  subtitle,
  className = "",
  size = "md",
}: BrandProps) {
  const s = SIZES[size];

  const content = compact ? (
    <Image
      src="/logo.png"
      alt="WorkPluse"
      width={128}
      height={128}
      sizes="64px"
      className={`${s.mark} shrink-0 object-contain drop-shadow-sm`}
      priority
    />
  ) : (
    <div className="flex min-w-0 flex-col items-start leading-none justify-center">
      <Image
        src={inverse ? "/brand/workpulse-lockup-dark.png" : "/brand/workpulse-lockup.png"}
        alt="WorkPluse"
        width={LOCKUP.width}
        height={LOCKUP.height}
        sizes={s.sizes}
        className={`${s.box} w-auto max-w-full shrink-0 object-contain object-left`}
        priority
      />
      {subtitle && (
        <span
          className={`mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.16em] leading-none ${
            inverse ? "text-indigo-200/80" : "text-slate-500"
          }`}
        >
          {subtitle}
        </span>
      )}
    </div>
  );

  return (
    <Link
      href={href}
      aria-label="WorkPluse home"
      suppressHydrationWarning
      className={`inline-flex items-center rounded-xl transition-opacity hover:opacity-95 ${className}`}
    >
      {content}
    </Link>
  );
}
