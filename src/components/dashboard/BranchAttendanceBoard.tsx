"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CalendarOff, Plane, RefreshCw, UserX } from "lucide-react";
import { attendanceApi } from "@/lib/api";

interface BranchRow {
  id: string | null;
  name: string;
  total: number;
  present: number;
  late: number;
  wfh: number;
  onLeave: number;
  off: number;
  absent: number;
}

interface BranchSummary {
  date: string;
  timezone?: string;
  branches: BranchRow[];
  totals: Omit<BranchRow, "id" | "name">;
}

type SortKey = "NAME" | "LOWEST";

const localHour = (timezone?: string) => {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: timezone }).format(new Date())) % 24;
  } catch {
    return new Date().getHours();
  }
};

/** The people actually expected to work today: everyone except those on leave or off. */
const expected = (row: Pick<BranchRow, "total" | "onLeave" | "off">) => Math.max(0, row.total - row.onLeave - row.off);

const tone = (row: BranchRow) => {
  const base = expected(row);
  if (base === 0) return { bar: "bg-slate-300", text: "text-slate-500", pct: 0 };
  const pct = Math.round((row.present / base) * 100);
  if (pct >= 80) return { bar: "bg-emerald-500", text: "text-emerald-700", pct };
  if (pct >= 50) return { bar: "bg-amber-500", text: "text-amber-700", pct };
  return { bar: "bg-rose-500", text: "text-rose-700", pct };
};

/**
 * Today's attendance, branch by branch: "1/10" is one person present out of ten in that branch. Leave and
 * days off are shown on their own so they are never mistaken for absences.
 */
export default function BranchAttendanceBoard() {
  const [data, setData] = useState<BranchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<SortKey>("NAME");

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const res = await attendanceApi.getBranchSummary();
      const payload = res?.data || res;
      if (payload?.branches) {
        setData(payload);
        setFailed(false);
      }
    } catch {
      if (!background) setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // People punch in all morning, so keep the counts current without a reload.
    const timer = setInterval(() => void load(true), 60000);
    return () => clearInterval(timer);
  }, [load]);

  const endOfDay = localHour(data?.timezone) >= 18;
  const absentLabel = endOfDay ? "Absent" : "Not punched";

  const rows = useMemo(() => {
    const list = [...(data?.branches || [])];
    if (sort === "LOWEST") {
      // Branches with the weakest turnout first; empty branches last.
      return list.sort((a, b) => Number(expected(a) === 0) - Number(expected(b) === 0) || tone(a).pct - tone(b).pct);
    }
    return list;
  }, [data, sort]);

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="branch-attendance-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Branch attendance</p>
          <h2 id="branch-attendance-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            Present today, by branch
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {data ? (
              <>
                <span className="font-semibold text-slate-700">
                  {data.totals.present}/{data.totals.total}
                </span>{" "}
                present across {data.branches.length} {data.branches.length === 1 ? "branch" : "branches"}. People on leave or on a day off (holiday, company leave, weekly off) are not counted as {absentLabel.toLowerCase()}.
              </>
            ) : (
              "Updates every minute."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Sort branches" className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {(
              [
                { key: "NAME", label: "A to Z" },
                { key: "LOWEST", label: "Lowest first" },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={sort === option.key}
                onClick={() => setSort(option.key)}
                className={`rounded-full px-3 py-1.5 transition ${sort === option.key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh branch attendance"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : failed && !data ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl bg-slate-50 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">Branch attendance could not be loaded.</p>
          <button type="button" onClick={() => void load()} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">No branches yet. Add one under Locations & branches.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const t = tone(row);
            const base = expected(row);
            return (
              <article key={row.id || "none"} className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 ring-1 ring-slate-200">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <h3 className="truncate text-sm font-semibold text-slate-900" title={row.name}>
                      {row.name}
                    </h3>
                  </div>
                  <p className="shrink-0 text-right" aria-label={`${row.present} of ${row.total} present`}>
                    <span className={`text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>{row.present}</span>
                    <span className="text-lg font-semibold tabular-nums text-slate-400">/{row.total}</span>
                  </p>
                </div>

                <div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={t.pct}
                    aria-label={`${row.name} turnout`}
                    className="h-2 overflow-hidden rounded-full bg-slate-200"
                  >
                    <div className={`h-full rounded-full transition-all duration-500 ${t.bar}`} style={{ width: `${t.pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {base === 0 ? (row.total === 0 ? "Nobody assigned yet" : "Everyone is on leave or off today") : `${t.pct}% of ${base} expected today`}
                    {row.late > 0 && <span className="text-amber-700"> · {row.late} late</span>}
                    {row.wfh > 0 && <span className="text-violet-700"> · {row.wfh} remote</span>}
                  </p>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div
                    title={endOfDay ? "Expected to work today but never punched in." : "Expected to work today and has not punched in yet. People can still arrive."}
                    className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-200/70"
                  >
                    <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                      <UserX aria-hidden="true" className="h-3 w-3" />
                      {absentLabel}
                    </dt>
                    <dd className="mt-0.5 text-base font-bold tabular-nums text-slate-900">{row.absent}</dd>
                  </div>
                  <div title="On approved leave today." className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-200/70">
                    <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-sky-600">
                      <Plane aria-hidden="true" className="h-3 w-3" />
                      Leave
                    </dt>
                    <dd className="mt-0.5 text-base font-bold tabular-nums text-slate-900">{row.onLeave}</dd>
                  </div>
                  <div
                    title="Day off for the company: a holiday, company leave or the weekly off. These people are not expected to punch today."
                    className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-200/70"
                  >
                    <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <CalendarOff aria-hidden="true" className="h-3 w-3" />
                      Off
                    </dt>
                    <dd className="mt-0.5 text-base font-bold tabular-nums text-slate-900">{row.off}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
