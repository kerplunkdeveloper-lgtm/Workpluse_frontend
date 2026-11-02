"use client";

import React, { useEffect, useId, useState } from "react";
import {
  Coffee,
  Clock,
  LockKeyhole,
  Play,
  RefreshCw,
  Square,
  MapPin,
  Timer,
  ShieldCheck,
  Utensils,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAttendance, PunchOptions } from "@/context/AttendanceContext";
import { useAuth } from "@/context/AuthContext";
import { formatTime, INDIA_TIME_ZONE, todayLocalKey } from "@/lib/utils";
import { overtimeApi, permissionsApi } from "@/lib/api";
import { toast } from "sonner";
import type { Attendance } from "@/types";
import PunchConfirmDialog from "./PunchConfirmDialog";
import { breakMinutesOf, lunchMinutesOf, formatClock, formatHm, formatShiftTime, liveWorkedMs, shiftLengthMinutes } from "./attendanceUtils";

type PunchAction = "CHECK_IN" | "CHECK_OUT";

/** Container: wires the attendance context into the presentational panels. */
export default function PunchClockCard() {
  const { user } = useAuth();
  const ctx = useAttendance();
  const [action, setAction] = useState<PunchAction | null>(null);
  const [overtimeBusy, setOvertimeBusy] = useState(false);
  const [permissionRequests, setPermissionRequests] = useState<any[]>([]);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionTick, setPermissionTick] = useState(() => Date.now());

  const loadApprovedPermission = async () => {
    if (user?.role !== "EMPLOYEE") return;
    try {
      const res = await permissionsApi.my();
      setPermissionRequests(res?.data?.requests || []);
    } catch {
      // The attendance clock remains usable if the permissions panel is unavailable.
    }
  };

  useEffect(() => {
    void loadApprovedPermission();
    const id = window.setInterval(() => {
      setPermissionTick(Date.now());
      void loadApprovedPermission();
    }, 30000);
    return () => window.clearInterval(id);
  }, [user?.role]);

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
  const activeOvertimeSession = status?.attendance?.overtimeRequests?.find(
    (request) => request.status === "APPROVED" && request.otCheckIn && !request.otCheckOut,
  ) || null;
  const approvedOvertimeRequest = status?.attendance?.overtimeRequests?.find(
    (request) => request.status === "APPROVED" && !request.otCheckIn && !request.otCheckOut,
  ) || null;

  const handleOvertimeStart = async () => {
    setOvertimeBusy(true);
    try {
      const result = await overtimeApi.start();
      if (result?.success) {
        toast.success("Overtime started. End it when you finish.");
        await ctx.refreshStatus();
      } else toast.error(result?.message || "Could not start overtime");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Could not start overtime");
    } finally { setOvertimeBusy(false); }
  };

  const handleOvertimeEnd = async () => {
    if (!activeOvertimeSession) return;
    setOvertimeBusy(true);
    try {
      const result = await overtimeApi.end(activeOvertimeSession.id);
      if (result?.success) {
        toast.success("Overtime ended and sent for approval.");
        await ctx.refreshStatus();
      } else toast.error(result?.message || "Could not end overtime");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Could not end overtime");
    } finally { setOvertimeBusy(false); }
  };
  return (
    <>
      <div className="grid gap-4">
        <TodayPanel
          firstName={user?.employee?.firstName || ""}
          attendance={status?.attendance}
          shift={status?.shift || user?.employee?.shift || null}
          hasCheckedIn={Boolean(status?.hasCheckedIn || status?.attendance?.checkIn)}
          hasCheckedOut={Boolean(status?.hasCheckedOut || status?.attendance?.checkOut)}
          punchingClosed={Boolean(status?.punchingClosed)}
          punchingClosedReason={status?.punchingClosedReason || null}
          hasApprovedShoot={Boolean(status?.approvedShoot)}
          hasFlexiblePunching={Boolean(status?.flexiblePunching)}
          isOnBreak={Boolean(status?.isOnBreak)}
          activePauseType={status?.activePauseType || null}
          activePauseStartedAt={status?.activePauseStartedAt || null}
          isOnline={ctx.isOnline}
          busy={ctx.isActionLoading}
          onPunch={(a) => setAction(a)}
          onToggleBreak={() => void (status?.isOnBreak ? (status.activePauseType === "LUNCH" ? ctx.endLunch() : ctx.endBreak()) : ctx.startBreak())}
          onStartLunch={() => void ctx.startLunch()}
          onEndLunch={() => void ctx.endLunch()}
          activeOvertimeSession={activeOvertimeSession}
          overtimeApproved={Boolean(approvedOvertimeRequest || activeOvertimeSession)}
          onStartOvertime={() => void handleOvertimeStart()}
          onEndOvertime={() => void handleOvertimeEnd()}
          overtimeBusy={overtimeBusy}
        />
        {user?.role === "EMPLOYEE" && (
          <PermissionSessionCard
            requests={permissionRequests}
            now={permissionTick}
            currentLocation={ctx.currentLocation}
            currentPlace={ctx.currentPlace}
            locationStatus={ctx.locationStatus}
            isWithinGeofence={ctx.isWithinGeofence}
            distanceToBranch={ctx.distanceToBranch}
            busy={permissionBusy}
            onRefreshLocation={ctx.retryLocation}
            onStart={async (requestId) => {
              if (!ctx.currentLocation) {
                await ctx.retryLocation();
                return;
              }
              setPermissionBusy(true);
              try {
                const res = await permissionsApi.start(requestId, { ...ctx.currentLocation, locationLabel: ctx.currentPlace || undefined });
                if (res?.success) { toast.success("Permission timer started"); await loadApprovedPermission(); }
                else toast.error(res?.message || "Could not start permission");
              } catch (error: any) { toast.error(error?.response?.data?.message || error?.message || "Could not start permission"); }
              finally { setPermissionBusy(false); }
            }}
            onEnd={async (requestId) => {
              if (!ctx.currentLocation) {
                await ctx.retryLocation();
                return;
              }
              setPermissionBusy(true);
              try {
                const res = await permissionsApi.end(requestId, { ...ctx.currentLocation, locationLabel: ctx.currentPlace || undefined });
                if (res?.success) { toast.success("Permission timer stopped"); await loadApprovedPermission(); }
                else toast.error(res?.message || "Could not stop permission");
              } catch (error: any) { toast.error(error?.response?.data?.message || error?.message || "Could not stop permission"); }
              finally { setPermissionBusy(false); }
            }}
          />
        )}
        <PunchNotices error={ctx.locationError} pendingPunches={ctx.pendingPunchCount} onSync={() => void ctx.triggerSync()} />
      </div>
      <PunchConfirmDialog action={action} loading={ctx.isActionLoading} onCancel={() => setAction(null)} onConfirm={(o) => void confirmPunch(o)} />
    </>
  );
}

export function PermissionSessionCard({
  requests,
  now,
  currentLocation,
  currentPlace,
  locationStatus,
  isWithinGeofence,
  distanceToBranch,
  busy,
  onRefreshLocation,
  onStart,
  onEnd,
}: {
  requests: any[];
  now: number;
  currentLocation: { latitude: number; longitude: number; accuracy?: number } | null;
  currentPlace: string | null;
  locationStatus: "locating" | "ready" | "denied" | "error";
  isWithinGeofence: boolean;
  distanceToBranch: number | null;
  busy: boolean;
  onRefreshLocation: () => Promise<boolean>;
  onStart: (id: string) => Promise<void>;
  onEnd: (id: string) => Promise<void>;
}) {
  const today = todayLocalKey();
  const permission = requests.find((request) => request.date?.slice(0, 10) === today && request.status === "APPROVED" && !request.endedAt);
  if (!permission) return null;

  const running = Boolean(permission.startedAt);
  const parseClockMinutes = (value?: string | null) => {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  };
  const currentParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const currentHour = Number(currentParts.find((part) => part.type === "hour")?.value || 0);
  const currentMinute = Number(currentParts.find((part) => part.type === "minute")?.value || 0);
  const currentMinutes = currentHour * 60 + currentMinute;
  const startMinutes = parseClockMinutes(permission.startTime);
  const endMinutes = parseClockMinutes(permission.endTime);
  const hasTimeWindow = startMinutes !== null && endMinutes !== null;
  const beforeWindow = !running && hasTimeWindow && currentMinutes < startMinutes;
  const expired = !running && hasTimeWindow && currentMinutes >= endMinutes;
  if (expired) return null;

  const elapsedMinutes = running ? Math.max(0, Math.floor((now - new Date(permission.startedAt).getTime()) / 60000)) : 0;
  const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  const canUseLocation = Boolean(currentLocation) && isWithinGeofence;
  const canStart = !beforeWindow && canUseLocation;

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-indigo-200/80 bg-gradient-to-r from-white via-indigo-50/70 to-cyan-50/80 px-5 py-4 shadow-[0_20px_55px_-30px_rgba(79,70,229,0.55)] ring-1 ring-white/70 sm:px-6" aria-labelledby="permission-session-title">
      <div className="pointer-events-none absolute -right-10 -top-20 h-44 w-44 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${running ? "bg-emerald-600" : "bg-indigo-600"} text-white shadow-[0_12px_24px_-8px_rgba(79,70,229,0.7)]`}>
            {running ? <Timer className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="permission-session-title" className="text-[15px] font-bold tracking-[-0.01em] text-slate-950">Approved permission</h3>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${running ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                {running ? "Active" : "Ready"}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
              {running
                ? `Permission time captured: ${formatDuration(elapsedMinutes)}`
                : beforeWindow
                  ? `Starts at ${permission.startTime} IST · ${permission.reason}`
                  : `${permission.startTime || "Today"} – ${permission.endTime || "Use when needed"} IST · ${permission.reason}`}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-indigo-600" /> Office geofence required</span>
              {distanceToBranch !== null && <span>{Math.round(distanceToBranch)}m from office</span>}
              {currentPlace && <span className="truncate">{currentPlace}</span>}
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[208px]">
          <button
            type="button"
            disabled={busy || !canStart}
            onClick={() => void (running ? onEnd(permission.id) : onStart(permission.id))}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold text-white shadow-[0_12px_24px_-10px_rgba(79,70,229,0.75)] transition hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none ${running ? "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500" : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"}`}
          >
            {running ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            {busy ? "Updating…" : running ? "End permission" : beforeWindow ? `Starts at ${permission.startTime}` : "Start permission"}
          </button>
          {!canUseLocation && !beforeWindow && (
            <button type="button" onClick={() => void onRefreshLocation()} className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">
              <MapPin className="h-3.5 w-3.5" /> {locationStatus === "locating" ? "Finding office location…" : currentLocation ? "Move inside office range" : "Allow GPS to continue"}
            </button>
          )}
        </div>
      </div>
    </section>
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
  punchingClosed?: boolean;
  punchingClosedReason?: string | null;
  hasApprovedShoot?: boolean;
  hasFlexiblePunching?: boolean;
  isOnBreak: boolean;
  activePauseType?: "BREAK" | "LUNCH" | null;
  activePauseStartedAt?: string | null;
  isOnline: boolean;
  busy: boolean;
  onPunch: (action: PunchAction) => void;
  onToggleBreak: () => void;
  onStartLunch: () => void;
  onEndLunch: () => void;
  activeOvertimeSession?: { id: string; otCheckIn?: string | null; otCheckOut?: string | null } | null;
  overtimeApproved?: boolean;
  onStartOvertime: () => void;
  onEndOvertime: () => void;
  overtimeBusy?: boolean;
  /** Fixed clock for previews/tests; omitted in the app so the timer ticks. */
  now?: number;
}

export function TodayPanel({ firstName, attendance, shift, hasCheckedIn, hasCheckedOut, punchingClosed = false, punchingClosedReason, hasApprovedShoot = false, hasFlexiblePunching = false, isOnBreak, activePauseType, activePauseStartedAt, isOnline, busy, onPunch, onToggleBreak, onStartLunch, onEndLunch, activeOvertimeSession = null, overtimeApproved = false, onStartOvertime, onEndOvertime, overtimeBusy = false, now: fixedNow }: TodayPanelProps) {
  const [tick, setTick] = useState(() => fixedNow ?? Date.now());
  const working = hasCheckedIn && !hasCheckedOut;
  useEffect(() => {
    if (fixedNow !== undefined || (!working && !activeOvertimeSession)) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [fixedNow, working, activeOvertimeSession]);
  const now = fixedNow ?? tick;

  const workedMs = liveWorkedMs(attendance, isOnBreak, now);
  const shiftMinutes = shiftLengthMinutes(shift?.startTime, shift?.endTime);
  const progress = shiftMinutes ? Math.min(100, (workedMs / 60000 / shiftMinutes) * 100) : null;
  const remaining = shiftMinutes ? Math.max(0, shiftMinutes - workedMs / 60000) : null;
  const late = Number(attendance?.lateMinutes || 0);
  const breakMinutes = breakMinutesOf(attendance || {});
  const lunchMinutes = lunchMinutesOf(attendance || {});
  const activePauseMinutes = isOnBreak && activePauseStartedAt
    ? Math.max(0, (now - new Date(activePauseStartedAt).getTime()) / 60000)
    : 0;
  const displayedBreakMinutes = breakMinutes + (activePauseType === "BREAK" ? activePauseMinutes : 0);
  const displayedLunchMinutes = lunchMinutes + (activePauseType === "LUNCH" ? activePauseMinutes : 0);
  const overtimeElapsedMinutes = activeOvertimeSession?.otCheckIn
    ? Math.max(0, (now - new Date(activeOvertimeSession.otCheckIn).getTime()) / 60000)
    : 0;

  const state = activeOvertimeSession
    ? { label: "Overtime running", dot: "bg-indigo-400 animate-pulse" }
    : hasCheckedOut
    ? { label: "Day complete", dot: "bg-slate-400" }
    : isOnBreak
      ? { label: "On break", dot: "bg-amber-400 animate-pulse" }
      : working
        ? { label: "Working", dot: "bg-emerald-400 animate-pulse" }
      : punchingClosed && !hasApprovedShoot && !hasFlexiblePunching
        ? { label: "Punching closed", dot: "bg-amber-400" }
        : { label: "Not punched in", dot: "bg-slate-500" };

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const headline = activeOvertimeSession
    ? "Your overtime session is running."
    : hasCheckedOut
    ? "You're done for today."
    : working
      ? isOnBreak
        ? "Enjoy your break."
        : "Your shift is running."
      : punchingClosed && !hasApprovedShoot && !hasFlexiblePunching
        ? "Your shift has ended for today."
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
              Worked today{displayedBreakMinutes + displayedLunchMinutes > 0 ? ` · ${formatHm(displayedBreakMinutes + displayedLunchMinutes)} on pauses` : ""}
            </p>
            {activeOvertimeSession && (
              <p className="mt-1 text-xs font-semibold text-indigo-300">OT running · {formatHm(overtimeElapsedMinutes)}</p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onPunch(hasCheckedIn ? "CHECK_OUT" : "CHECK_IN")}
                disabled={busy || hasCheckedOut || (punchingClosed && !hasCheckedIn && !hasApprovedShoot && !hasFlexiblePunching)}
                className={`inline-flex h-14 w-full items-center sm:w-auto sm:min-w-[12.5rem] justify-center gap-2.5 rounded-2xl px-7 text-sm font-semibold tracking-[-0.01em] transition duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f24] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-white/[0.06] disabled:text-white/40 disabled:shadow-none ${
                  hasCheckedIn
                    ? "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_12px_30px_-10px_rgba(244,63,94,0.75),inset_0_1px_0_rgba(255,255,255,0.28)] hover:from-rose-400 hover:to-rose-600"
                    : "bg-white text-[#0a0f24] shadow-[0_12px_30px_-12px_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(15,23,42,0.08)] hover:bg-indigo-50"
                }`}
              >
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : hasCheckedOut ? <LockKeyhole className="h-4 w-4" /> : hasCheckedIn ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                {hasCheckedOut ? "Shift completed" : hasCheckedIn ? "Punch out" : punchingClosed && !hasApprovedShoot && !hasFlexiblePunching ? "Punching closed" : hasApprovedShoot ? "Shoot punch in" : hasFlexiblePunching ? "Any-time punch in" : "Punch in"}
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
              {hasCheckedOut && (overtimeApproved || activeOvertimeSession) && (
                <button
                  type="button"
                  onClick={activeOvertimeSession ? onEndOvertime : onStartOvertime}
                  disabled={busy || overtimeBusy}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl sm:w-auto bg-indigo-400/15 px-5 text-sm font-medium text-indigo-100 ring-1 ring-indigo-300/30 hover:bg-indigo-400/25 disabled:opacity-50"
                >
                  {overtimeBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  {activeOvertimeSession ? "End overtime" : "Start overtime"}
                </button>
              )}
            </div>
            {punchingClosed && !hasCheckedIn && !hasApprovedShoot && !hasFlexiblePunching && (
              <p className="mt-3 max-w-md text-xs text-amber-300" role="status">
                {punchingClosedReason || "Punch-in is unavailable after the shift end time."}
              </p>
            )}
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
          <Fact label="☕ Break" value={formatHm(displayedBreakMinutes)} />
          <Fact label="🍽️ Lunch" value={formatHm(displayedLunchMinutes)} />
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
