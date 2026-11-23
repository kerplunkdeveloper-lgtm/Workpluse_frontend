"use client";

import Link from "next/link";
import Image from "next/image";

interface BrandProps {
  href?: string;
  inverse?: boolean;
  compact?: boolean;
  /** Uses the transparent dark-text lockup for light landing surfaces. */
  landing?: boolean;
  subtitle?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { box: "h-10 w-[150px]", mark: "h-10 w-10", sizes: "150px" },
  md: { box: "h-12 w-[184px]", mark: "h-12 w-12", sizes: "184px" },
  lg: { box: "h-14 w-[216px]", mark: "h-14 w-14", sizes: "216px" },
} as const;

export default function Brand({
  href = "/",
  inverse = false,
  compact = false,
  landing = false,
  subtitle,
  className = "",
  size = "md",
}: BrandProps) {
  const s = SIZES[size];
  const lightLogoSrc = landing ? "/clocked-hrms-lockup-dark.png" : "/clocked-hrms-lockup.png";
  const content = compact ? (
    <span className={`${s.mark} flex shrink-0 items-center justify-center rounded-2xl ${inverse ? "bg-[#202653] ring-1 ring-white/15" : "bg-indigo-600 shadow-lg shadow-indigo-600/25"}`}>
      <Image src="/clocked-clock-icon.png" alt="" width={128} height={128} sizes="48px" className="h-[72%] w-[72%] object-contain" priority />
    </span>
  ) : inverse ? (
    <span className={`${s.box} inline-flex shrink-0 items-center`}>
      <Image src="/clocked-hrms-lockup.png" alt="Clocked HRMS" width={866} height={288} sizes={s.sizes} className="h-auto w-full object-contain drop-shadow-[0_4px_10px_rgba(14,165,233,0.28)]" priority />
    </span>
  ) : (
    <div className="flex min-w-0 flex-col items-start">
      <span className={`${s.box} inline-flex items-center`}>
        <Image src={lightLogoSrc} alt="Clocked HRMS" width={2160} height={720} sizes={s.sizes} className="h-auto w-full object-contain" priority />
      </span>
      {subtitle && <span className="mt-1 block truncate pl-1 text-[10px] font-bold uppercase tracking-[0.16em] leading-none text-slate-500">{subtitle}</span>}
    </div>
  );

  return (
    <Link href={href} aria-label="Clocked home" suppressHydrationWarning className={`inline-flex items-center rounded-xl transition-opacity hover:opacity-95 ${className}`}>
      {content}
    </Link>
  );
}
