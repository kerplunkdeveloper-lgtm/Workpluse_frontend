"use client";

import React, { useEffect, useRef } from "react";
import { CalendarCheck2, ShieldCheck, X } from "lucide-react";
import { useAttendance } from "@/context/AttendanceContext";

export default function ApprovedLeaveDialog({ onCancel }: { onCancel: () => void }) {
  const { todayStatus } = useAttendance();
  const closeRef = useRef<HTMLButtonElement>(null);
  const leaveTitle = todayStatus?.dayOff?.title || "approved leave";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="approved-leave-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.55)]">
        <div className="relative overflow-hidden border-b border-slate-100 px-5 pb-5 pt-6 sm:px-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-emerald-200/60 blur-3xl" />
          <button ref={closeRef} type="button" onClick={onCancel} aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800">
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <CalendarCheck2 className="h-7 w-7" />
            </span>
            <div className="min-w-0 pr-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Leave approved</p>
              <h2 id="approved-leave-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Punch-in is disabled today</h2>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Approved leave</p>
            <p className="mt-1 text-sm font-semibold text-emerald-950">{leaveTitle}</p>
            <p className="mt-1 text-xs leading-5 text-emerald-800">Your approved leave is protecting today on your attendance and payroll record.</p>
          </div>
          <p className="text-sm leading-6 text-slate-600">You cannot start a shift while this leave is active. If your plans changed and you need to work, ask HR or an admin to cancel or update the leave first.</p>
          <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>Your punch-out remains available if you were already clocked in.</span>
          </div>
          <button type="button" onClick={onCancel} className="h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800">Got it</button>
        </div>
      </div>
    </div>
  );
}
