"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, PartyPopper } from "lucide-react";
import { attendanceApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import { useAttendance } from "@/context/AttendanceContext";
import type { Attendance } from "@/types";
import { WORKED_STATUSES, formatHm, localDateKey, recordDateKey, statusMeta, workedMinutes } from "./attendanceUtils";

const CARD = "rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.18)]";

/* ── My week & month ─────────────────────────────────────────────────────── */

/** Container: loads the signed-in employee's recent records and refreshes after each punch. */
export function MyAttendanceInsights() {
  const { todayStatus } = useAttendance();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const refreshKey = `${todayStatus?.hasCheckedIn}-${todayStatus?.hasCheckedOut}`;

  useEffect(() => {
    let active = true;
    // ~5 weeks covers both the current week and the whole current month.
    attendanceApi
      .getMyAttendance({ page: 1, limit: 40 })
      .then((res) => active && (setRecords(unwrapList<Attendance>(res)), setFailed(false)))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return <MyInsightsView records={records} loading={loading} failed={failed} />;
}

export function MyInsightsView({ records, loading, failed, now: fixedNow }: { records: Attendance[]; loading: boolean; failed: boolean; now?: number }) {
  // Captured once per mount; the week/month view doesn't need to tick.
  const [mountedAt] = useState(() => Date.now());
  const now = fixedNow ?? mountedAt;
  const byDay = useMemo(() => new Map(records.map((r) => [recordDateKey(r), r])), [records]);
  const today = new Date(now);
  const todayKey = localDateKey(today);

  const week = useMemo(() => {
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = localDateKey(d);
      return { date: d, key, record: byDay.get(key), isToday: key === todayKey, isFuture: key > todayKey };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDay, todayKey]);

  const monthPrefix = todayKey.slice(0, 7);
  const month = records.filter((r) => recordDateKey(r).startsWith(monthPrefix));
  const worked = month.filter((r) => WORKED_STATUSES.includes(r.status));
  const late = month.filter((r) => r.status === "LATE" || Number(r.lateMinutes) > 0).length;
  const minutes = month.reduce((sum, r) => sum + workedMinutes(r), 0);
  const onTimeRate = worked.length ? Math.round(((worked.length - late) / worked.length) * 100) : null;
  const weekMinutes = week.reduce((sum, d) => sum + (d.record ? workedMinutes(d.record) : 0), 0);
  const maxDay = Math.max(9 * 60, ...week.map((d) => (d.record ? workedMinutes(d.record) : 0)));

  return (
    <section className={`${CARD} grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`} aria-label="Your attendance this week and month">
      <div className="p-5 sm:p-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">This week</h2>
          <p className="text-xs text-slate-500"><span className="font-semibold tabular-nums text-slate-900">{formatHm(weekMinutes)}</span> worked</p>
        </div>
        {failed ? (
          <p className="mt-6 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">Couldn&apos;t load your week. Refresh the page to try again.</p>
        ) : (
          <ol className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
            {week.map(({ date, key, record, isToday, isFuture }) => {
              const mins = record ? workedMinutes(record) : 0;
              const meta = record ? statusMeta(record.status) : null;
              return (
                <li key={key} className="flex flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end justify-center rounded-xl bg-slate-50 p-1.5" title={record ? `${meta?.label} · ${formatHm(mins)}` : isFuture ? "Upcoming" : "No record"}>
                    {loading ? (
                      <span className="skeleton-shimmer h-1/2 w-full rounded-lg" />
                    ) : record ? (
                      <span className={`w-full max-w-[22px] rounded-md ${meta?.dot} ${mins ? "" : "opacity-40"}`} style={{ height: `${Math.max(10, (mins / maxDay) * 100)}%` }} />
                    ) : (
                      <span className={`h-1.5 w-1.5 rounded-full ${isFuture ? "bg-slate-200" : "bg-slate-300"}`} />
                    )}
                  </div>
                  <div className="text-center leading-tight">
                    <p className={`text-[11px] font-semibold ${isToday ? "text-indigo-600" : "text-slate-500"}`}>{date.toLocaleDateString("en-IN", { weekday: "short" })}</p>
                    <p className="text-[11px] tabular-nums text-slate-400">{mins ? formatHm(mins) : date.getDate()}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="border-t border-slate-100 p-5 sm:p-7 lg:border-l lg:border-t-0">
        <h2 className="text-sm font-semibold text-slate-900">{today.toLocaleDateString("en-IN", { month: "long" })} so far</h2>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
          <Kpi label="Days worked" value={loading ? null : String(worked.length)} />
          <Kpi label="Hours" value={loading ? null : formatHm(minutes)} />
          <Kpi label="On-time rate" value={loading ? null : onTimeRate === null ? "—" : `${onTimeRate}%`} tone={onTimeRate !== null && onTimeRate < 80 ? "text-amber-700" : undefined} />
          <Kpi label="Avg per day" value={loading ? null : worked.length ? formatHm(minutes / worked.length) : "—"} />
        </dl>
      </div>
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | null; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tone || "text-slate-950"}`}>
        {value ?? <span className="skeleton-shimmer inline-block h-7 w-16 rounded-md align-middle" />}
      </dd>
    </div>
  );
}

/* ── Team today (admins & managers) ──────────────────────────────────────── */

export interface TeamSummary {
  totalEmployees: number;
  present: number;
  late: number;
  halfDay: number;
  wfh: number;
  onLeave: number;
  absent: number;
  currentlyClockedIn: number;
  attendanceRate: number;
  isHoliday?: boolean;
  holidayName?: string | null;
}

export function TeamToday() {
  const { todayStatus } = useAttendance();
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      attendanceApi
        .getSummary()
        .then((res) => active && (setSummary((res?.data || res) as TeamSummary), setFailed(false)))
        .catch(() => active && setFailed(true));
    void load();
    // Keep the board current while the page is open.
    const id = window.setInterval(load, 60000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [todayStatus?.hasCheckedIn, todayStatus?.hasCheckedOut]);

  if (failed && !summary) return null;
  return <TeamTodayView summary={summary} />;
}

// `absent` counts people with no record yet today, so there is no log to filter to.
const SEGMENTS: { key: keyof TeamSummary; status: string | null; label: string; color: string }[] = [
  { key: "present", status: "PRESENT", label: "Present", color: "bg-emerald-500" },
  { key: "late", status: "LATE", label: "Late", color: "bg-amber-500" },
  { key: "wfh", status: "WORK_FROM_HOME", label: "Remote", color: "bg-sky-500" },
  { key: "halfDay", status: "HALF_DAY", label: "Half day", color: "bg-orange-400" },
  { key: "onLeave", status: "ON_LEAVE", label: "On leave", color: "bg-violet-500" },
  { key: "absent", status: null, label: "Not in yet", color: "bg-slate-300" },
];

export function TeamTodayView({ summary }: { summary: TeamSummary | null }) {
  const total = summary?.totalEmployees || 0;
  return (
    <section className={`${CARD} p-5 sm:p-7`} aria-labelledby="team-today-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="team-today-title" className="text-sm font-semibold text-slate-900">Team today</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {summary ? `${summary.currentlyClockedIn} of ${total} people are clocked in right now` : "Loading the team…"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-950">{summary ? `${summary.attendanceRate}%` : "—"}</p>
          <p className="text-xs text-slate-500">attendance rate</p>
        </div>
      </div>

      {summary?.isHoliday ? (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-violet-50 px-3.5 py-3 text-sm text-violet-900">
          <PartyPopper className="h-4 w-4" /> Today is a holiday{summary.holidayName ? `: ${summary.holidayName}` : ""}.
        </p>
      ) : (
        <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          {summary && total > 0 && SEGMENTS.map((s) => {
            const value = Number(summary[s.key]) || 0;
            return value ? <span key={s.key} className={`${s.color} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(value / total) * 100}%` }} /> : null;
          })}
        </div>
      )}

      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {SEGMENTS.map((s) => {
          const body = (
            <>
              <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                {s.label}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-slate-900">
                {summary ? Number(summary[s.key]) || 0 : "—"}
                {s.status && <ArrowUpRight className="h-3 w-3 text-slate-300 transition group-hover:text-slate-500" />}
              </span>
            </>
          );
          const tile = "group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ring-1 ring-slate-200/80";
          return (
            <li key={s.key}>
              {s.status ? (
                <Link href={`/attendance?status=${s.status}&range=today#attendance-history`} scroll={false} className={`${tile} transition hover:bg-slate-50 hover:ring-slate-300`}>
                  {body}
                </Link>
              ) : (
                <div className={tile}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
