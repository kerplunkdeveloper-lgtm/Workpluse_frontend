"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  LogIn,
  LocateOff,
  LogOut,
  MapPin,
  Navigation,
  Timer,
  X,
} from "lucide-react";
import { useAttendance, PunchOptions } from "@/context/AttendanceContext";
import DayOffRequestDialog from "./DayOffRequestDialog";

export type PunchConfirmAction = "CHECK_IN" | "CHECK_OUT";

type CheckInWorkMode = NonNullable<PunchOptions["workMode"]>;

interface PunchConfirmDialogProps {
  action: PunchConfirmAction | null;
  loading?: boolean;
  locationLabel?: string | null;
  onCancel: () => void;
  /** Receives the work mode and optional note the employee picked before punch-in. */
  onConfirm: (options?: PunchOptions) => void;
  initialWorkMode?: CheckInWorkMode;
  forceWorkMode?: CheckInWorkMode;
}

const NOTE_LIMIT = 160;

export default function PunchConfirmDialog(props: PunchConfirmDialogProps) {
  const { todayStatus } = useAttendance();
  if (!props.action) return null;
  // On a weekly off, holiday or company leave punch-in is closed until HR or an admin approves the work.
  // Punching out is never blocked, and neither is someone who is already in.
  const dayOff = todayStatus?.dayOff;
  if (props.action === "CHECK_IN" && dayOff && !dayOff.canPunch && !todayStatus?.hasCheckedIn) {
    return <DayOffRequestDialog onCancel={props.onCancel} />;
  }
  // Mounting the body per open resets the work-mode choice each time.
  return <PunchConfirmBody {...props} action={props.action} />;
}

/** Ticks once a second, in its own component so the rest of the dialog does not re-render. */
function LiveTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <span className="tabular-nums">{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</span>
      <span className="sr-only"> {now.toLocaleDateString("en-IN")}</span>
    </>
  );
}

const hm = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

const distanceLabel = (meters: number) => (meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`);

function Stat({ icon: Icon, label, value, tone = "text-slate-900" }: { icon: React.ElementType; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/70">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className={`mt-1 truncate text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

interface GpsPanelProps {
  status: "locating" | "ready" | "denied" | "error";
  place: string | null;
  accuracy?: number;
  branchName?: string | null;
  distance: number | null;
  inRange: boolean;
  hasRange: boolean;
  error: string | null;
  retrying: boolean;
  onRetry: () => void;
  officeCheck: boolean;
  workModeLabel?: string;
}

/** What the punch will record: where you are right now, or how to turn GPS on if it is off. */
function GpsPanel({ status, place, accuracy, branchName, distance, inRange, hasRange, error, retrying, onRetry, officeCheck, workModeLabel }: GpsPanelProps) {
  if (status === "locating") {
    return (
      <div role="status" className="flex items-center gap-2.5 rounded-2xl bg-amber-50 px-3.5 py-3 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
        <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
        Capturing your location. Allow location if your browser asks.
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div role="alert" className="space-y-2.5 rounded-2xl bg-rose-50 px-3.5 py-3 ring-1 ring-rose-200">
        <p className="flex items-start gap-2 text-xs font-bold text-rose-800">
          <LocateOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          GPS is off. Turn it on to punch.
        </p>
        <p className="text-xs leading-5 text-rose-700">{error || "We could not read your location."}</p>
        {status === "denied" && (
          <ol className="list-decimal space-y-0.5 pl-5 text-[11px] leading-5 text-rose-700">
            <li>Click the lock icon beside the web address.</li>
            <li>Set Location to Allow.</li>
            <li>Come back and tap the button below.</li>
          </ol>
        )}
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500 active:scale-[0.98] disabled:opacity-60"
        >
          {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
          {retrying ? "Checking..." : "Enable GPS and try again"}
        </button>
      </div>
    );
  }

  const tone = hasRange ? (inRange ? "emerald" : "amber") : "slate";
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  }[tone];

  return (
    <div role="status" className={`rounded-2xl px-3.5 py-3 ring-1 ${toneClass}`}>
      <p className="flex items-start gap-2 text-xs font-bold">
        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">Location captured</span>
          <span className="block truncate text-sm">{place || "Your current position"}</span>
        </span>
      </p>
      <p className="mt-1.5 pl-6 text-[11px] font-medium leading-4 opacity-90">
        {hasRange && distance != null
          ? inRange
            ? `Inside office range · ${distanceLabel(distance)} from ${branchName || "your office"}`
            : `Outside office range · ${distanceLabel(distance)} from ${branchName || "your office"}`
          : officeCheck ? "No office range is configured for this branch" : `${workModeLabel || "This work mode"} uses your current location; office range does not apply`}
        {accuracy != null && <span> · accurate to about {distanceLabel(accuracy)}</span>}
      </p>
    </div>
  );
}

function PunchConfirmBody({ action, loading, locationLabel, onCancel, onConfirm, initialWorkMode, forceWorkMode }: PunchConfirmDialogProps & { action: PunchConfirmAction }) {
  const { todayStatus, isWithinGeofence, distanceToBranch, currentLocation, locationStatus, currentPlace, retryLocation, locationError } = useAttendance();
  const [retrying, setRetrying] = useState(false);
  // The clock when the dialog opened: reading the time while rendering is not allowed, and a popup lives for seconds.
  const [openedAt] = useState(() => Date.now());
  const gpsReady = locationStatus === "ready";
  const tryGpsAgain = async () => {
    setRetrying(true);
    try {
      await retryLocation();
    } finally {
      setRetrying(false);
    }
  };
  const policy = todayStatus?.locationPolicy;
  const isCheckIn = action === "CHECK_IN";
  const [workMode, setWorkMode] = useState<CheckInWorkMode>(initialWorkMode || "OFFICE");
  const [note, setNote] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  const officeBlocked = isCheckIn && workMode === "OFFICE" && !isWithinGeofence;
  const officeCheck = isCheckIn && workMode === "OFFICE";
  const workModeLabel = workMode === "WORK_FROM_HOME" ? "Remote" : workMode === "CLIENT_VISIT" ? "Client visit / travel" : workMode === "TRAVEL" ? "Travel" : workMode === "SHOOT" ? "Shoot" : "Office";
  const shootInProgress = todayStatus?.attendance?.wfhNote?.startsWith("SHOOT:") === true;
  const customNoteRequired = isCheckIn && workMode === "CLIENT_VISIT" && !note.trim();
  // No punch without a captured GPS position: it is what the attendance record says about where you were.
  const blocked = Boolean(loading) || !gpsReady || officeBlocked || customNoteRequired;

  const modes: { value: CheckInWorkMode; label: string; hint: string; icon: typeof Building2 }[] = [
    { value: "OFFICE", label: "Office", hint: "At your assigned office", icon: Building2 },
    ...(policy?.allowWfh !== false ? [{ value: "WORK_FROM_HOME" as const, label: "Remote", hint: "Work from home", icon: Home }] : []),
    ...(todayStatus?.approvedShoot ? [{ value: "SHOOT" as const, label: "Shoot", hint: "Approved for today", icon: BriefcaseBusiness }] : []),
    { value: "CLIENT_VISIT" as const, label: "Other", hint: "Client visit, travel, shoot", icon: BriefcaseBusiness },
  ];

  // Close on Escape (unless saving), lock the page behind the dialog, and start on the safe button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !loading && onCancel();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [loading, onCancel]);

  const shift = todayStatus?.shift;
  const punchedInAt = todayStatus?.attendance?.checkIn ? new Date(todayStatus.attendance.checkIn) : null;
  const workedMinutes = todayStatus?.workedMinutesToday ?? (punchedInAt ? (openedAt - punchedInAt.getTime()) / 60000 - (todayStatus?.totalPauseMinutes || 0) : 0);

  const accent = isCheckIn
    ? { icon: "from-indigo-500 to-violet-600 shadow-indigo-500/30", button: "bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500" }
    : { icon: "from-rose-500 to-orange-500 shadow-rose-500/30", button: "bg-gradient-to-br from-rose-600 to-orange-500 shadow-rose-600/30 hover:from-rose-500 hover:to-orange-400" };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="punch-confirm-title"
        aria-describedby="punch-confirm-desc"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(86dvh,calc(100dvh-5.5rem))] w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.55)] sm:rounded-[28px]"
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden border-b border-slate-100 px-4 pb-3.5 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
          <div aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl ${isCheckIn ? "bg-indigo-200/60" : "bg-rose-200/60"}`} />
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-center gap-4">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${accent.icon}`}>
              {isCheckIn ? <LogIn className="h-6 w-6" /> : <LogOut className="h-6 w-6" />}
            </span>
            <div className="min-w-0 pr-8">
              <h3 id="punch-confirm-title" className="text-lg font-semibold tracking-tight text-slate-950">
                {isCheckIn ? "Ready to punch in?" : (todayStatus?.approvedShoot || shootInProgress) ? "Ready to shoot out?" : "Ready to punch out?"}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <Clock aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                <LiveTime />
              </p>
            </div>
          </div>
          <p id="punch-confirm-desc" className="relative mt-3 text-[13px] leading-relaxed text-slate-500">
            {isCheckIn
              ? workMode === "WORK_FROM_HOME"
                ? "Your work mode will be recorded as Remote for today."
                : workMode === "CLIENT_VISIT"
                  ? "Add a short reason so your team knows where you are working."
                  : "We will check that you are at your assigned office before starting your shift."
              : todayStatus?.approvedShoot
                ? "This will end your approved shoot and save the shoot hours to your timesheet."
                : "Your shift ends now and today's hours are saved to your timesheet."}
          </p>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-3.5 sm:px-6 sm:py-4">
          <GpsPanel
            status={locationStatus}
            place={currentPlace}
            accuracy={currentLocation?.accuracy}
            branchName={policy?.branchName}
            distance={distanceToBranch}
            inRange={isWithinGeofence}
            hasRange={officeCheck && policy?.radiusMeters != null && distanceToBranch != null}
            error={locationError}
            retrying={retrying}
            onRetry={tryGpsAgain}
            officeCheck={officeCheck}
            workModeLabel={workModeLabel}
          />
          {isCheckIn ? (
            <>
              {todayStatus?.dayOff?.canPunch && (
                <div role="status" className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Approved to work today ({todayStatus.dayOff.title}). Every hour is logged as overtime.</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <Stat icon={CalendarDays} label="Shift" value={shift ? `${shift.startTime} – ${shift.endTime}` : "Not assigned"} />
                <Stat icon={officeCheck ? Building2 : MapPin} label={officeCheck ? "Office" : "Current location"} value={officeCheck ? (policy?.branchName || "Not assigned") : (currentPlace || "Your current position")} />
              </div>

              {workMode === "SHOOT" && todayStatus?.approvedShoot && (
                <div className="rounded-2xl bg-violet-50 px-3.5 py-3 ring-1 ring-violet-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Approved shoot time</p>
                  <p className="mt-1 truncate text-sm font-semibold text-violet-950">{todayStatus.approvedShoot.shootName}</p>
                  <p className="mt-0.5 text-xs font-medium text-violet-700">
                    {todayStatus.approvedShoot.location} · {todayStatus.approvedShoot.startTime} – {todayStatus.approvedShoot.endTime}
                  </p>
                </div>
              )}

              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Where are you working today?</legend>
                <div className={`grid gap-2 ${modes.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {modes.filter((mode) => !forceWorkMode || mode.value === forceWorkMode).map((mode) => {
                    const selected = workMode === mode.value;
                    return (
                      <label
                        key={mode.value}
                        className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition focus-within:ring-2 focus-within:ring-indigo-300 ${
                          selected ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-500" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input type="radio" name="work-mode" value={mode.value} checked={selected} onChange={() => setWorkMode(mode.value)} className="sr-only" />
                        {selected && <CheckCircle2 aria-hidden="true" className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-indigo-600" />}
                        <mode.icon aria-hidden="true" className={`h-5 w-5 ${selected ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-xs font-semibold">{mode.label}</span>
                        <span className="hidden text-[10px] leading-3 text-slate-500 sm:block">{mode.hint}</span>
                      </label>
                    );
                  })}
                </div>
                {officeBlocked && (
                  <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    You are outside the office area. Move closer, or choose Remote.
                  </p>
                )}
              </fieldset>

              <label className="block space-y-1.5">
                <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>
                    {workMode === "CLIENT_VISIT" ? "Reason" : "Note"}{" "}
                    <span className="font-medium normal-case tracking-normal">{workMode === "CLIENT_VISIT" ? "(required)" : "(optional)"}</span>
                  </span>
                  <span className="font-medium normal-case tracking-normal tabular-nums">
                    {note.length}/{NOTE_LIMIT}
                  </span>
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, NOTE_LIMIT))}
                  placeholder={workMode === "CLIENT_VISIT" ? "Client visit, shoot, travel..." : workMode === "WORK_FROM_HOME" ? "Working from home today" : "Anything your team should know"}
                  rows={2}
                  aria-invalid={customNoteRequired}
                  className={`w-full resize-none rounded-2xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${customNoteRequired ? "border-rose-300" : "border-slate-200"}`}
                />
                {customNoteRequired && <p className="text-[11px] font-medium text-rose-600">Enter a reason to continue.</p>}
              </label>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <Stat icon={LogIn} label="Punched in" value={punchedInAt ? punchedInAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—"} />
              <Stat icon={Timer} label="Worked so far" value={hm(workedMinutes)} tone="text-indigo-700" />
              <div className="col-span-2">
                <Stat icon={CalendarDays} label="Shift" value={shift ? `${shift.name || "Shift"} · ${shift.startTime} – ${shift.endTime}` : "Not assigned"} />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2.5 border-t border-slate-100 bg-slate-50/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(isCheckIn ? { workMode, note: note.trim() || undefined } : undefined)}
            disabled={blocked}
            className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${accent.button}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isCheckIn ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            {loading ? "Saving..." : !gpsReady ? "Turn on GPS to punch" : isCheckIn ? "Punch in now" : "Punch out now"}
          </button>
        </div>
      </div>
    </div>
  );
}
