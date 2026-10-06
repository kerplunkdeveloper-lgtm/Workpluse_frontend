"use client";

import React from "react";
import Link from "next/link";
import { Building2, History, IndianRupee } from "lucide-react";

const TABS = [
  { href: "/platform/clients", label: "Clients", icon: Building2, hint: "Companies, plans and payments" },
  { href: "/platform/billing", label: "Pricing & offers", icon: IndianRupee, hint: "Plan prices and coupons" },
  { href: "/platform/activity", label: "Activity", icon: History, hint: "Every owner action on a client" },
] as const;

/** Segmented navigation shared by the platform-owner screens. */
export default function PlatformNav({ active }: { active: "clients" | "billing" | "activity" }) {
  return (
    <nav aria-label="Platform sections" className="inline-flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner">
      {TABS.map((tab) => {
        const isActive = tab.href.endsWith(active);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            title={tab.hint}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
              isActive ? "keep-white bg-indigo-600 shadow-md shadow-indigo-600/20" : "text-slate-600 hover:bg-white hover:text-slate-900"
            }`}
          >
            <tab.icon aria-hidden="true" className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
