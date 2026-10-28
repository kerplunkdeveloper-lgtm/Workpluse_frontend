"use client";

import React, { useEffect, useId, useState } from "react";
import {
  Coffee,
  LockKeyhole,
  Play,
  RefreshCw,
  Square,
  Utensils,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAttendance, PunchOptions } from "@/context/AttendanceContext";
import { useAuth } from "@/context/AuthContext";
import { formatTime } from "@/lib/utils";
import type { Attendance } from "@/types";
import PunchConfirmDialog from "./PunchConfirmDialog";
import { breakMinutesOf, lunchMinutesOf, formatClock, formatHm, formatShiftTime, liveWorkedMs, shiftLengthMinutes } from "./attendanceUtils";

type PunchAction = "CHECK_IN" | "CHECK_OUT";

/** Container: wires the attendance context into the presentational panels. */
export default function PunchClockCard() {
  const { user } = useAuth();
  const ctx = useAttendance();
  const [action, setAction] = useState<PunchAction | null>(null);

  const confirmPunch = async (chosen?: PunchOptions) => {
    if (!action) return;
    const options: PunchOptions = {
      workMode: chosen?.workMode || (ctx.todayStatus?.isWorkFromHome ? "WORK_FROM_HOME" : "OFFICE"),
      note: chosen?.note,
      locationLabel: chosen?.note?.trim() || ctx.locationLabel || undefined,
    };
    const ok = action === "CHECK_IN" ? await ctx.checkIn(options) : await ctx.checkOut(options);
    if (ok) setAction(null);
  };

  if (ctx.isLoading && !ctx.todayStatus) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <div className="skeleton-shimmer h-[340px] rounded-2xl" />
      </div>
    );
  }

  const status = ctx.todayStatus;
  return (
    <>
      <div className="grid gap-4">
        <TodayPanel
          firstName={user?.employee?.firstName || ""}
          attendance={status?.attendance}
          shift={status?.shift || user?.employee?.shift || null}
          hasCheckedIn={Boolean(status?.hasCheckedIn || status?.attendance?.checkIn)}
          hasCheckedOut={Boolean(status?.hasCheckedOut || status?.attendance?.checkOut)}
          isOnBreak={Boolean(status?.isOnBreak)}
          activePauseType={status?.activePauseType || null}
          isOnline={ctx.isOnline}
          busy={ctx.isActionLoading}
          onPunch={(a) => setAction(a)}
          onToggleBreak={() => void (status?.isOnBreak ? (status.activePauseType === "LUNCH" ? ctx.endLunch() : ctx.endBreak()) : ctx.startBreak())}
          onStartLunch={() => void ctx.startLunch()}
          onEndLunch={() => void ctx.endLunch()}
        />
        <PunchNotices error={ctx.locationError} pendingPunches={ctx.pendingPunchCount} onSync={() => void ctx.triggerSync()} />
      </div>
      <PunchConfirmDialog action={action} loading={ctx.isActionLoading} onCancel={() => setAction(null)} onConfirm={(o) => void confirmPunch(o)} />
    </>
  );
}


/** Deep-ink hero surface. Deliberately has no `bg-white`, which would win over any dark background utility. */
const HERO =
  "relative isolate overflow-hidden rounded-[28px] bg-[#0a0f24] text-white ring-1 ring-white/10 shadow-[0_30px_70px_-30px_rgba(30,27,75,0.75),inset_0_1px_0_rgba(255,255,255,0.08)]";

export interface TodayPanelProps {
  firstName: string;
  attendance?: Partial<Attendance>;
  shift: { name?: string; startTime?: string; endTime?: string } | null;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  isOnBreak: boolean;
  activePauseType?: "BREAK" | "LUNCH" | null;
  isOnline: boolean;
  busy: boolean;
  onPunch: (action: PunchAction) => void;
  onToggleBreak: () => void;
  onStartLunch: () => void;
  onEndLunch: () => void;
  /** Fixed clock for previews/tests; omitted in the app so the timer ticks. */
  now?: number;
}

export function TodayPanel({ firstName, attendance, shift, hasCheckedIn, hasCheckedOut, isOnBreak, activePauseType, isOnline, busy, onPunch, onToggleBreak, onStartLunch, onEndLunch, now: fixedNow }: TodayPanelProps) {
  const [tick, setTick] = useState(() => fixedNow ?? Date.now());
  const working = hasCheckedIn && !hasCheckedOut;
  useEffect(() => {
    if (fixedNow !== undefined || !working) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [fixedNow, working]);
  const now = fixedNow ?? tick;

  const workedMs = liveWorkedMs(attendance, isOnBreak, now);
  const shiftMinutes = shiftLengthMinutes(shift?.startTime, shift?.endTime);
  const progress = shiftMinutes ? Math.min(100, (workedMs / 60000 / shiftMinutes) * 100) : null;
  const remaining = shiftMinutes ? Math.max(0, shiftMinutes - workedMs / 60000) : null;
  const late = Number(attendance?.lateMinutes || 0);
  const breakMinutes = breakMinutesOf(attendance || {});
  const lunchMinutes = lunchMinutesOf(attendance || {});

  const state = hasCheckedOut
    ? { label: "Day complete", dot: "bg-slate-400" }
    : isOnBreak
      ? { label: "On break", dot: "bg-amber-400 animate-pulse" }
      : working
        ? { label: "Working", dot: "bg-emerald-400 animate-pulse" }
        : { label: "Not punched in", dot: "bg-slate-500" };

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const headline = hasCheckedOut
    ? "You're done for today."
    : working
      ? isOnBreak
        ? "Enjoy your break."
        : "Your shift is running."
      : `${greeting}${firstName ? `, ${firstName}` : ""}.`;

  const [hh, mm, ss] = formatClock(workedMs).split(":");

  return (
    <section className={HERO} aria-labelledby="today-title">
      {/* Ambient light: one indigo bloom top-right, a cool cyan wash bottom-left, and a faint dot grid for texture. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-32 -z-10 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-20 -z-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
      />

      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur">
            <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
            {state.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-slate-300" : "text-amber-300"}`}>
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "Online" : "Offline — punches save on this device"}
          </span>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h2 id="today-title" className="text-sm font-medium text-slate-300">{headline}</h2>

            <p role="timer" aria-live="off" aria-label={`Worked today ${formatClock(workedMs)}`} className="mt-2 flex items-baseline font-semibold tabular-nums leading-none tracking-[-0.055em] text-white">
              <span className="text-6xl sm:text-[88px]">{hh}</span>
              <span className="mx-0.5 text-5xl text-white/25 sm:text-7xl">:</span>
              <span className="text-6xl sm:text-[88px]">{mm}</span>
              <span className="ml-2 text-2xl tracking-[-0.03em] text-indigo-300/80 sm:text-4xl">{ss}</span>
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Worked today{breakMinutes > 0 ? ` · ${formatHm(breakMinutes)} on breaks` : ""}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onPunch(hasCheckedIn ? "CHECK_OUT" : "CHECK_IN")}
                disabled={busy || hasCheckedOut}
                className={`inline-flex h-14 w-full items-center sm:w-auto sm:min-w-[12.5rem] justify-center gap-2.5 rounded-2xl px-7 text-sm font-semibold tracking-[-0.01em] transition duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f24] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-white/[0.06] disabled:text-white/40 disabled:shadow-none ${
                  hasCheckedIn
                    ? "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_12px_30px_-10px_rgba(244,63,94,0.75),inset_0_1px_0_rgba(255,255,255,0.28)] hover:from-rose-400 hover:to-rose-600"
                    : "bg-white text-[#0a0f24] shadow-[0_12px_30px_-12px_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(15,23,42,0.08)] hover:bg-indigo-50"
                }`}
              >
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : hasCheckedOut ? <LockKeyhole className="h-4 w-4" /> : hasCheckedIn ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                {hasCheckedOut ? "Shift completed" : hasCheckedIn ? "Punch out" : "Punch in"}
              </button>
              {working && !isOnBreak && (
                <button type="button" onClick={onStartLunch} disabled={busy} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl sm:w-auto bg-indigo-400/15 px-5 text-sm font-medium text-indigo-100 ring-1 ring-indigo-300/30 hover:bg-indigo-400/25 disabled:opacity-50">
                  <Utensils className="h-4 w-4 text-indigo-200" /> <span aria-hidden="true">🍽️</span> Start lunch
                </button>
              )}
              {working && (
                <button
                  type="button"
                  onClick={onToggleBreak}
                  disabled={busy}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl sm:w-auto bg-white/[0.06] px-5 text-sm font-medium text-slate-100 ring-1 ring-white/15 backdrop-blur transition duration-200 hover:bg-white/10 hover:ring-white/25 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
                >
                  {activePauseType === "LUNCH" ? <Utensils className="h-4 w-4 text-indigo-200" /> : <Coffee className="h-4 w-4 text-amber-300" />}
                  <span aria-hidden="true">{activePauseType === "LUNCH" ? "🍽️" : "☕"}</span>
                  {isOnBreak ? (activePauseType === "LUNCH" ? "End lunch" : "End break") : "Start break"}
                </button>
              )}
            </div>
          </div>

          {progress !== null && (
            <ShiftRing
              percent={progress}
              name={shift?.name || "Shift"}
              range={`${formatShiftTime(shift?.startTime)} – ${formatShiftTime(shift?.endTime)}`}
              caption={hasCheckedIn ? (remaining && remaining > 0 ? `${formatHm(remaining)} left` : "Shift hours met") : `${formatHm(shiftMinutes || 0)} shift`}
            />
          )}
        </div>

        <dl className="mt-9 grid grid-cols-2 divide-white/10 overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur sm:grid-cols-4 sm:divide-x">
          <Fact label="Punch in" value={attendance?.checkIn ? formatTime(attendance.checkIn) : "—"} />
          <Fact label="Punch out" value={attendance?.checkOut ? formatTime(attendance.checkOut) : "—"} />
          <Fact label="☕ Break" value={formatHm(breakMinutes)} />
          <Fact label="🍽️ Lunch" value={formatHm(lunchMinutes)} />
          <Fact
            label="Arrival"
            value={!attendance?.checkIn ? "—" : late > 0 ? `${formatHm(late)} late` : "On time"}
            tone={!attendance?.checkIn ? undefined : late > 0 ? "text-amber-300" : "text-emerald-300"}
          />
        </dl>
      </div>
    </section>
  );
}

/** Circular shift progress: gradient arc on a faint track, with the shift window underneath. */
function ShiftRing({ percent, name, range, caption }: { percent: number; name: string; range: string; caption: string }) {
  const gradientId = useId();
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const done = percent >= 100;
  return (
    <div className="flex flex-row items-center gap-5 sm:flex-col sm:gap-3">
      <div className="relative h-36 w-36 shrink-0 sm:h-44 sm:w-44">
        <svg viewBox="0 0 150 150" className="h-full w-full -rotate-90" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Shift progress">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={done ? "#34d399" : "#818cf8"} />
              <stop offset="100%" stopColor={done ? "#6ee7b7" : "#22d3ee"} />
            </linearGradient>
          </defs>
          <circle cx="75" cy="75" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-white sm:text-4xl">
            {Math.round(percent)}
            <span className="ml-0.5 text-base font-medium text-slate-400">%</span>
          </span>
          <span className="mt-0.5 text-[11px] font-medium text-slate-400">of shift</span>
        </div>
      </div>
      <div className="min-w-0 sm:text-center">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="mt-0.5 text-xs tabular-nums text-slate-400">{range}</p>
        <p className="mt-1.5 inline-flex rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-indigo-200 ring-1 ring-white/10">{caption}</p>
      </div>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-white/10 px-5 py-4 max-sm:odd:border-r max-sm:[&:nth-child(n+3)]:border-t">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className={`mt-1 truncate text-base font-semibold tabular-nums tracking-[-0.01em] ${tone || "text-white"}`}>{value}</dd>
    </div>
  );
}

export interface PunchNoticesProps {
  error: string | null;
  pendingPunches: number;
  onSync: () => void;
}

/** Only renders when there is something to act on: a location problem or punches waiting to sync. */
export function PunchNotices({ error, pendingPunches, onSync }: PunchNoticesProps) {
  if (!error && pendingPunches === 0) return null;
  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{error}</p>}
      {pendingPunches > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          <span>{pendingPunches} offline punch{pendingPunches === 1 ? "" : "es"} waiting to sync</span>
          <button type="button" onClick={onSync} className="font-semibold text-indigo-700 hover:text-indigo-900">Sync now</button>
        </div>
      )}
    </div>
  );
}
