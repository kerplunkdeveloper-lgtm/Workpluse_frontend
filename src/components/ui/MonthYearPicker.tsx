"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type MonthYearPickerProps = {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  className?: string;
};

/** Consistent month/year control for payroll, reports and statutory workflows. */
export default function MonthYearPicker({ month, year, onMonthChange, onYearChange, className = "" }: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => b - a);
  const [open, setOpen] = useState<"month" | "year" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={rootRef} className={`relative inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm ${className}`}>
      <span className="px-2 text-xs font-semibold text-slate-500">Period</span>
      <PeriodMenu label={MONTHS[month - 1] || "Select month"} open={open === "month"} onToggle={() => setOpen(open === "month" ? null : "month")}>
        {MONTHS.map((name, index) => <MenuOption key={name} selected={month === index + 1} onClick={() => { onMonthChange(index + 1); setOpen(null); }}>{name}</MenuOption>)}
      </PeriodMenu>
      <PeriodMenu compact label={String(year)} open={open === "year"} onToggle={() => setOpen(open === "year" ? null : "year")}>
        {years.map((value) => <MenuOption key={value} selected={year === value} onClick={() => { onYearChange(value); setOpen(null); }}>{value}</MenuOption>)}
      </PeriodMenu>
    </div>
  );
}

function PeriodMenu({ label, open, onToggle, children, compact = false }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={onToggle} className={`inline-flex h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${compact ? "min-w-[5.75rem]" : "min-w-[9rem]"}`}>
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div role="listbox" className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-64 w-full min-w-[9rem] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/5">{children}</div>}
    </div>
  );
}

function MenuOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="option" aria-selected={selected} onClick={onClick} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm transition ${selected ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}><span>{children}</span>{selected && <Check className="h-4 w-4" />}</button>;
}
