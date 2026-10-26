"use client";

import React, { useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, CalendarOff, CheckCircle2, Clapperboard, Hourglass, Loader2, Plane, RefreshCw, Send, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { dayOffWorkApi } from "@/lib/api";
import { useAttendance } from "@/context/AttendanceContext";

const REASONS = [
  { value: "SHOOT", label: "Shoot", hint: "On a shoot", icon: Clapperboard },
  { value: "TRAVEL", label: "Travel", hint: "Travelling for work", icon: Plane },
  { value: "CLIENT_VISIT", label: "Client visit", hint: "Meeting a client", icon: BriefcaseBusiness },
  { value: "OTHER", label: "Other", hint: "Other company work", icon: CalendarOff },
] as const;
type Reason = (typeof REASONS)[number]["value"];

const NOTE_LIMIT = 300;

const KIND_TEXT: Record<string, string> = { WEEK_OFF: "weekly off", HOLIDAY: "company holiday", COMPANY_LEAVE: "company leave" };

interface DayOffRequestDialogProps {
  onCancel: () => void;
}

/**
 * Shown instead of the punch form when today is a weekly off, holiday or company leave.
 * Punching is closed: the employee can ask HR or an admin to approve working today (shoot, travel, client
 * work). Once it is approved the normal punch form opens.
 */
export default function DayOffRequestDialog({ onCancel }: DayOffRequestDialogProps) {
  const { todayStatus, refreshStatus } = useAttendance();
  const dayOff = todayStatus?.dayOff;
  const request = dayOff?.workRequest || null;
  const [reason, setReason] = useState<Reason>("SHOOT");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const pending = request?.status === "PENDING";
  const rejected = request?.status === "REJECTED";
  const needsNote = reason === "OTHER" && note.trim().length < 3;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !sending && onCancel();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [sending, onCancel]);

  // While waiting, look for the decision every 15 seconds so the employee does not have to reload.
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => void refreshStatus(), 15000);
    return () => clearInterval(id);
  }, [pending, refreshStatus]);

  if (!dayOff) return null;
  const kindText = KIND_TEXT[dayOff.kind] || "day off";
  const title =
    dayOff.kind === "WEEK_OFF" ? `Today is ${dayOff.title}, your weekly off` : dayOff.kind === "HOLIDAY" ? `Today is a holiday: ${dayOff.title}` : `Company leave: ${dayOff.title}`;

  const send = async () => {
    if (needsNote) {
      toast.error("Tell us what the work is.");
      return;
    }
    setSending(true);
    try {
      await dayOffWorkApi.request({ reasonType: reason, note: note.trim() || undefined });
      toast.success("Sent to HR and your admin for approval.");
      await refreshStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not send your request.");
      void refreshStatus();
    } finally {
      setSending(false);
    }
  };

  const check = async () => {
    setChecking(true);
    try {
      await refreshStatus();
    } finally {
      setChecking(false);
    }
  };

  const tone = pending
    ? { icon: "from-amber-400 to-orange-500 shadow-amber-500/30", glow: "bg-amber-200/60", Icon: Hourglass }
    : rejected
      ? { icon: "from-rose-500 to-orange-500 shadow-rose-500/30", glow: "bg-rose-200/60", Icon: XCircle }
      : { icon: "from-slate-600 to-slate-800 shadow-slate-500/30", glow: "bg-slate-200/70", Icon: CalendarOff };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4" onClick={() => !sending && onCancel()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="day-off-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(86dvh,calc(100dvh-5.5rem))] w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.55)] sm:rounded-[28px]"
      >
        <div className="relative shrink-0 overflow-hidden border-b border-slate-100 px-4 pb-3.5 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
          <div aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl ${tone.glow}`} />
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-center gap-4">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${tone.icon}`}>
              <tone.Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 pr-8">
              <h3 id="day-off-title" className="text-lg font-semibold leading-snug tracking-tight text-slate-950">
                {pending ? "Waiting for approval" : rejected ? "Request not approved" : title}
              </h3>
              <p className="mt-0.5 text-sm font-medium text-slate-500">{pending || rejected ? title : "Punching is closed today"}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-3.5 sm:px-6 sm:py-4">
          {pending ? (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                Your request to work on this {kindText} was sent to HR and your admin. You can punch in as soon as it is approved. This page checks for the decision by itself.
              </p>
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">You asked to work on</p>
                <p className="mt-1 font-semibold text-amber-950">{REASONS.find((r) => r.value === request?.reasonType)?.label || request?.reasonType}</p>
                {request?.note && <p className="mt-0.5 text-amber-900/80">{request.note}</p>}
              </div>
            </>
          ) : (
            <>
              {rejected ? (
                <div role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                  <p className="font-semibold">HR or your admin did not approve it.</p>
                  {request?.reviewNote && <p className="mt-0.5">{request.reviewNote}</p>}
                  <p className="mt-1 text-xs text-rose-700/80">If the plan changed, you can send a new request below.</p>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-slate-600">
                  Working anyway today, on a shoot, travelling or on other company work? Tell us why and HR or your admin will approve it. Every hour you work today is logged as overtime.
                </p>
              )}

              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">What are you working on?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {REASONS.map((r) => {
                    const selected = reason === r.value;
                    return (
                      <label
                        key={r.value}
                        className={`relative flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-3 transition focus-within:ring-2 focus-within:ring-indigo-300 ${
                          selected ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-500" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input type="radio" name="day-off-reason" value={r.value} checked={selected} onChange={() => setReason(r.value)} className="sr-only" />
                        <r.icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${selected ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold">{r.label}</span>
                          <span className="block truncate text-[10px] text-slate-500">{r.hint}</span>
                        </span>
                        {selected && <CheckCircle2 aria-hidden="true" className="absolute right-2 top-2 h-3.5 w-3.5 text-indigo-600" />}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block space-y-1.5">
                <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>
                    Details <span className="font-medium normal-case tracking-normal">{reason === "OTHER" ? "(required)" : "(optional)"}</span>
                  </span>
                  <span className="font-medium normal-case tracking-normal tabular-nums">
                    {note.length}/{NOTE_LIMIT}
                  </span>
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, NOTE_LIMIT))}
                  rows={3}
                  placeholder={reason === "SHOOT" ? "Which shoot, where, and for how long" : reason === "TRAVEL" ? "Where you are travelling and why" : reason === "CLIENT_VISIT" ? "Which client and the purpose" : "What is the work?"}
                  aria-invalid={needsNote && note.length > 0}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2.5 border-t border-slate-100 bg-slate-50/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {pending ? "Close" : "I am not working"}
          </button>
          {pending ? (
            <button
              type="button"
              onClick={check}
              disabled={checking}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
            >
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Check again
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={sending || needsNote}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : rejected ? "Send a new request" : "Ask for approval"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
