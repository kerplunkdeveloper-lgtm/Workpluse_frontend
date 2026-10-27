"use client";

import React from "react";
import { cn } from "@/lib/utils";

// A chevron drawn as a background, so the control stays one element and keeps its place in flex and grid layouts.
const CHEVRON =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat";

const BASE =
  "cursor-pointer appearance-none rounded-xl border bg-white text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Draws the red border used for a field with an error. */
  invalid?: boolean;
}

/**
 * The one dropdown for the app: consistent chevron, focus ring, pointer cursor and disabled state.
 * Pass `className` to change size, width or colour; it overrides the defaults, and the room kept on the
 * right for the chevron always stays.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(BASE, "border-slate-200 px-3 py-2.5 text-sm", invalid && "border-rose-400 focus:border-rose-500", className, CHEVRON, "pr-9")}
      {...props}
    />
  );
});

export default Select;
