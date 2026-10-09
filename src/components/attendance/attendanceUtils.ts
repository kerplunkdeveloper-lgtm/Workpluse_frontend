import type { Attendance, AttendanceStatus } from "@/types";

/** One visual language for attendance statuses across the page. */
export const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  PRESENT: { label: "Present", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15" },
  LATE: { label: "Late", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  HALF_DAY: { label: "Half day", dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700 ring-orange-600/20" },
  WORK_FROM_HOME: { label: "Remote", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700 ring-sky-600/15" },
  ON_LEAVE: { label: "On leave", dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 ring-violet-600/15" },
  ABSENT: { label: "Absent", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-600/15" },
  HOLIDAY: { label: "Holiday", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 ring-slate-500/15" },
  WEEK_OFF: { label: "Week off", dot: "bg-slate-300", badge: "bg-slate-100 text-slate-600 ring-slate-500/15" },
};

export const statusMeta = (status?: AttendanceStatus | string | null) =>
  STATUS_META[String(status || "")] || { label: String(status || "—").replace(/_/g, " ").toLowerCase(), dot: "bg-slate-300", badge: "bg-slate-100 text-slate-600 ring-slate-500/15" };

/** Statuses that count as a day worked. */
export const WORKED_STATUSES = ["PRESENT", "LATE", "WORK_FROM_HOME", "HALF_DAY"];

/** YYYY-MM-DD in the viewer's local time (toISOString would use UTC and shift late-night dates). */
export const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Attendance dates are stored as UTC midnight date-only values, so the first 10 characters are the day. */
export const recordDateKey = (record: Pick<Attendance, "date">) => String(record.date).slice(0, 10);

/** Minutes worked on a record, tolerant of the older field names some responses use. */
export const workedMinutes = (record: Partial<Attendance>) =>
  Number(record.workingMinutes ?? record.workMinutes ?? (record.workHours != null ? Number(record.workHours) * 60 : 0)) || 0;

export const breakMinutesOf = (record: Partial<Attendance>) => Number(record.breakMinutes ?? record.totalBreakMinutes ?? 0) || 0;

/** "7h 42m" — compact, for tight table cells and KPIs. */
export const formatHm = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};

/** "07:42:09" — for the live timer. */
export const formatClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
};

export const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;

/** Shift length in minutes from "HH:mm" strings, handling overnight shifts. */
export const shiftLengthMinutes = (start?: string, end?: string) => {
  const parse = (v?: string) => {
    const m = String(v || "").match(/^(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const s = parse(start);
  const e = parse(end);
  if (s === null || e === null) return null;
  const diff = e - s;
  return diff > 0 ? diff : diff + 24 * 60;
};

/** "09:30" → "9:30 AM". */
export const formatShiftTime = (value?: string) => {
  const m = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "—";
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};

/**
 * Live milliseconds worked today: time since check-in minus completed breaks
 * and any break still running. After check-out the stored total is final.
 */
export const liveWorkedMs = (attendance: Partial<Attendance> | undefined, isOnBreak: boolean, now: number) => {
  if (!attendance?.checkIn) return 0;
  if (attendance.checkOut) return workedMinutes(attendance) * 60000;
  let ms = now - new Date(attendance.checkIn).getTime() - breakMinutesOf(attendance) * 60000;
  if (isOnBreak) {
    const breakStart = attendance.events?.find((e) => e.type === "BREAK_START")?.timestamp;
    if (breakStart) ms -= now - new Date(breakStart).getTime();
  }
  return Math.max(0, ms);
};
