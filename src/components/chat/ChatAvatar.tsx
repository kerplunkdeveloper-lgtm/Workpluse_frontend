"use client";

import React from "react";



import { Hash } from "lucide-react";

import { initialsOf } from "./chatUtils";

export function Avatar({ label, channel = false, size = "md" }: { label: string; channel?: boolean; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "h-8 w-8 text-[11px] rounded-xl" : size === "lg" ? "h-11 w-11 text-sm rounded-2xl" : "h-10 w-10 text-xs rounded-xl";
  return channel ? (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100`}>
      <Hash className="h-4 w-4" />
    </span>
  ) : (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center bg-slate-100 font-bold tracking-wide text-slate-700 border border-slate-200`}>
      {initialsOf(label)}
    </span>
  );
}
