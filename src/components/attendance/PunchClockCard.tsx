"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Coffee,
  Globe,
  LockKeyhole,
  MapPin,
  Navigation,
  Play,
  RefreshCw,
  Square,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAttendance, PunchOptions } from "@/context/AttendanceContext";
import { useAuth } from "@/context/AuthContext";
import { formatTime } from "@/lib/utils";
import type { Attendance, CheckInLocationPolicy } from "@/types";
import PunchConfirmDialog from "./PunchConfirmDialog";
import { breakMinutesOf, formatClock, formatDistance, formatHm, formatShiftTime, liveWorkedMs, shiftLengthMinutes } from "./attendanceUtils";

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
      locationLabel: ctx.locationLabel || undefined,
    };
    const ok = action === "CHECK_IN" ? await ctx.checkIn(options) : await ctx.checkOut(options);
    if (ok) setAction(null);
  };

  if (ctx.isLoading && !ctx.todayStatus) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]" aria-busy="true">
        <div className="skeleton-shimmer h-[340px] rounded-2xl" />
        <div className="skeleton-shimmer h-[340px] rounded-2xl" />
      </div>
    );
  }

  const status = ctx.todayStatus;
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <TodayPanel
          firstName={user?.employee?.firstName || ""}
          attendance={status?.attendance}
          shift={status?.shift || user?.employee?.shift || null}
          hasCheckedIn={Boolean(status?.hasCheckedIn || status?.attendance?.checkIn)}
          hasCheckedOut={Boolean(status?.hasCheckedOut || status?.attendance?.checkOut)}
          isOnBreak={Boolean(status?.isOnBreak)}
          isOnline={ctx.isOnline}
          busy={ctx.isActionLoading}
          onPunch={(a) => setAction(a)}
          onToggleBreak={() => void (status?.isOnBreak ? ctx.endBreak() : ctx.startBreak())}
        />
        <LocationPanel
          policy={status?.locationPolicy}
          showRule={!status?.hasCheckedIn}
          label={ctx.locationLabel || status?.attendance?.checkInLocation || null}
          gpsReady={Boolean(ctx.currentLocation)}
          distance={ctx.distanceToBranch}
          error={ctx.locationError}
          pendingPunches={ctx.pendingPunchCount}
          onSync={() => void ctx.triggerSync()}
        />
      </div>
      <PunchConfirmDialog action={action} loading={ctx.isActionLoading} locationLabel={ctx.locationLabel} onCancel={() => setAction(null)} onConfirm={(o) => void confirmPunch(o)} />
    </>
  );
}

const CARD = "rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.18)]";

export interface TodayPanelProps {
  firstName: string;
  attendance?: Partial<Attendance>;
  shift: { name?: string; startTime?: string; endTime?: string } | null;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  isOnBreak: boolean;
  isOnline: boolean;
  busy: boolean;
  onPunch: (action: PunchAction) => void;
  onToggleBreak: () => void;
  /** Fixed clock for previews/tests; omitted in the app so the timer ticks. */
  now?: number;
}

export function TodayPanel({ firstName, attendance, shift, hasCheckedIn, hasCheckedOut, isOnBreak, isOnline, busy, onPunch, onToggleBreak, now: fixedNow }: TodayPanelProps) {
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

  const state = hasCheckedOut
    ? { label: "Day complete", dot: "bg-slate-400", tone: "text-slate-600 bg-slate-100" }
    : isOnBreak
      ? { label: "On break", dot: "bg-amber-500 animate-pulse", tone: "text-amber-800 bg-amber-50" }
      : working
        ? { label: "Working", dot: "bg-emerald-500 animate-pulse", tone: "text-emerald-700 bg-emerald-50" }
        : { label: "Not checked in", dot: "bg-slate-300", tone: "text-slate-600 bg-slate-100" };

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const headline = hasCheckedOut
    ? "You're done for today."
    : working
      ? isOnBreak
        ? "Enjoy your break."
        : "Your shift is running."
      : `${greeting}${firstName ? `, ${firstName}` : ""}.`;

  return (
    <section className={`${CARD} relative overflow-hidden`} aria-labelledby="today-title">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />
      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${state.tone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
            {state.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-slate-500" : "text-amber-700"}`}>
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "Online" : "Offline — punches save on this device"}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 id="today-title" className="text-sm font-medium text-slate-500">{headline}</h2>
            <p className="mt-1 text-5xl font-semibold tabular-nums tracking-[-0.03em] text-slate-950 sm:text-6xl" aria-live="off">
              {formatClock(workedMs)}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">Worked today{breakMinutesOf(attendance || {}) > 0 ? ` · ${formatHm(breakMinutesOf(attendance || {}))} on breaks` : ""}</p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => onPunch(hasCheckedIn ? "CHECK_OUT" : "CHECK_IN")}
              disabled={busy || hasCheckedOut}
              className={`inline-flex h-12 min-w-[11rem] items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none ${
                hasCheckedIn ? "bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50" : "keep-white bg-indigo-600 shadow-indigo-600/25 hover:bg-indigo-500"
              }`}
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : hasCheckedOut ? <LockKeyhole className="h-4 w-4" /> : hasCheckedIn ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              {hasCheckedOut ? "Shift completed" : hasCheckedIn ? "Punch out" : "Punch in"}
            </button>
            {working && (
              <button
                type="button"
                onClick={onToggleBreak}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Coffee className="h-4 w-4" />
                {isOnBreak ? "End break" : "Start break"}
              </button>
            )}
          </div>
        </div>

        {progress !== null && (
          <div className="mt-7">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                {shift?.name || "Shift"} <span className="font-normal text-slate-400">· {formatShiftTime(shift?.startTime)} – {formatShiftTime(shift?.endTime)}</span>
              </span>
              <span className="tabular-nums text-slate-500">
                {hasCheckedIn ? (remaining && remaining > 0 ? `${formatHm(remaining)} left` : "Shift hours met") : `${formatHm(shiftMinutes || 0)} shift`}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Shift progress">
              <div className={`h-full rounded-full transition-[width] duration-700 ${progress >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100 sm:grid-cols-4">
          <Fact label="Punch in" value={attendance?.checkIn ? formatTime(attendance.checkIn) : "—"} />
          <Fact label="Punch out" value={attendance?.checkOut ? formatTime(attendance.checkOut) : "—"} />
          <Fact label="Breaks" value={formatHm(breakMinutesOf(attendance || {}))} />
          <Fact
            label="Arrival"
            value={!attendance?.checkIn ? "—" : late > 0 ? `${formatHm(late)} late` : "On time"}
            tone={!attendance?.checkIn ? undefined : late > 0 ? "text-amber-700" : "text-emerald-700"}
          />
        </dl>
      </div>
    </section>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${tone || "text-slate-900"}`}>{value}</dd>
    </div>
  );
}

export interface LocationPanelProps {
  policy?: CheckInLocationPolicy;
  showRule: boolean;
  label: string | null;
  gpsReady: boolean;
  distance: number | null;
  error: string | null;
  pendingPunches: number;
  onSync: () => void;
}

export function LocationPanel({ policy, showRule, label, gpsReady, distance, error, pendingPunches, onSync }: LocationPanelProps) {
  return (
    <aside className={`${CARD} flex flex-col p-5 sm:p-7`} aria-labelledby="location-title">
      <div className="flex items-center justify-between">
        <h2 id="location-title" className="text-sm font-semibold text-slate-900">Location</h2>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${gpsReady ? "text-emerald-700" : "text-slate-500"}`}>
          <Navigation className="h-3.5 w-3.5" />
          {gpsReady ? "GPS ready" : "Finding you…"}
        </span>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <MapPin className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900" title={label || undefined}>{label || "Location not available yet"}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {distance !== null ? `${formatDistance(distance)} from your branch` : "Your team sees a place name, never exact coordinates."}
          </p>
        </div>
      </div>

      {showRule && <CheckInRule policy={policy} distance={distance} />}

      <div className="mt-auto space-y-2 pt-5">
        {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{error}</p>}
        {pendingPunches > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
            <span>{pendingPunches} offline punch{pendingPunches === 1 ? "" : "es"} waiting to sync</span>
            <button type="button" onClick={onSync} className="font-semibold text-indigo-700 hover:text-indigo-900">Sync now</button>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Tells the employee where they're allowed to check in before they tap Punch in. */
function CheckInRule({ policy, distance }: { policy?: CheckInLocationPolicy; distance: number | null }) {
  if (!policy) return null;

  if (policy.mode === "ANYWHERE" || policy.radiusMeters === null) {
    return (
      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-emerald-900">
        <Globe className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-xs leading-5"><span className="font-semibold">Check in from anywhere.</span> Your location is still recorded with the punch.</p>
      </div>
    );
  }

  const where = policy.branchName ? `of ${policy.branchName}` : "of your office";
  const inside = distance !== null && distance <= policy.radiusMeters;
  const outside = distance !== null && !inside;
  return (
    <div className={`mt-5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 ${outside ? "bg-amber-50 text-amber-900" : "bg-indigo-50 text-indigo-900"}`}>
      <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-xs leading-5">
        <span className="font-semibold">Office check-in only</span>, within {formatDistance(policy.radiusMeters)} {where}.
        {inside && " You're inside the area."}
        {outside && ` You're about ${formatDistance(distance)} away, so move closer to check in.`}
        {distance === null && " We'll confirm your location when you punch in."}
        {outside && ` Working elsewhere today? Pick${policy.allowWfh ? " Work from home," : ""} Client visit or Travel when you punch in.`}
      </p>
    </div>
  );
}
