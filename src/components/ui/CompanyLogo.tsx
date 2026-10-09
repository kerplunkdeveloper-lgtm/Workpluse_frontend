"use client";

import React, { useState } from "react";
import { Building2 } from "lucide-react";

const SIZES = {
  xs: "h-6 w-6 rounded-md text-[10px]",
  sm: "h-8 w-8 rounded-lg text-xs",
  md: "h-10 w-10 rounded-xl text-sm",
  lg: "h-16 w-16 rounded-2xl text-xl",
} as const;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "W";

/** Company logo with a branded initials fallback (also used if the image fails to load). */
export default function CompanyLogo({
  name,
  logoUrl,
  size = "md",
  className = "",
  fallbackIcon = false,
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  fallbackIcon?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const box = `${SIZES[size]} shrink-0 overflow-hidden ${className}`;

  if (logoUrl && !failed) {
    return (
      <span className={`${box} inline-flex items-center justify-center bg-white ring-1 ring-black/5`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={`${name} logo`} onError={() => setFailed(true)} className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${box} keep-white inline-flex items-center justify-center ${fallbackIcon ? "bg-[#202653]" : "bg-gradient-to-br from-indigo-500 to-indigo-700"} font-serif font-semibold tracking-wide`}>
      {fallbackIcon ? <Building2 className="h-4 w-4" strokeWidth={1.8} /> : initialsOf(name)}
    </span>
  );
}
