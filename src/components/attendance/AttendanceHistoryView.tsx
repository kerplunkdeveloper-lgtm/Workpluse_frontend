"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, FileSearch, Pencil, Plus, RefreshCw } from "lucide-react";
import { attendanceApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatTime, unwrapList } from "@/lib/utils";
import type { Attendance } from "@/types";
import Pagination from "@/components/ui/Pagination";
import RegularizationModal from "./RegularizationModal";
import AdminMarkDialog, { type AdminMarkInitial } from "./AdminMarkDialog";
import EmployeeCombobox, { type EmployeeOption } from "./EmployeeCombobox";
import { breakMinutesOf, formatHm, localDateKey, recordDateKey, statusMeta, workedMinutes } from "./attendanceUtils";

const TEAM_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"];

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "WORK_FROM_HOME", label: "Remote" },
  { value: "HALF_DAY", label: "Half day" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "ABSENT", label: "Absent" },
];

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
] as const;
type RangeValue = (typeof RANGES)[number]["value"];

const rangeDates = (range: RangeValue, from: string, to: string): { from?: string; to?: string } => {
  const today = new Date();
  const key = localDateKey;
  switch (range) {
    case "today":
      return { from: key(today), to: key(today) };
    case "7d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { from: key(start), to: key(today) };
    }
    case "month":
      return { from: key(new Date(today.getFullYear(), today.getMonth(), 1)), to: key(today) };
    case "lastMonth":
      return { from: key(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: key(new Date(today.getFullYear(), today.getMonth(), 0)) };
    case "custom":
      return { from: from || undefined, to: to || undefined };
    default:
      return {};
  }
};

/** Container: owns filters (mirrored in the URL so views can be shared) and data loading. */
export default function AttendanceHistoryView() {
  const { role } = useAuth();
  const isTeamView = TEAM_ROLES.includes(String(role));
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const status = (params?.get("status") || "ALL").toUpperCase();
  const range = (RANGES.some((r) => r.value === params?.get("range")) ? params?.get("range") : "month") as RangeValue;
  const customFrom = params?.get("from") || "";
  const customTo = params?.get("to") || "";
  const employee: EmployeeOption | null = params?.get("employee")
    ? { id: params.get("employee")!, name: params.get("employeeName") || "Selected employee", meta: "" }
    : null;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [regularize, setRegularize] = useState<Attendance | null>(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [markInitial, setMarkInitial] = useState<AdminMarkInitial | undefined>();

  const setFilters = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params?.toString());
      Object.entries(next).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
      if (sp.get("status") === "ALL") sp.delete("status");
      setPage(1);
      router.replace(`${pathname}${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const { from, to } = useMemo(() => rangeDates(range, customFrom, customTo), [range, customFrom, customTo]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    attendanceApi
      .getHistory({
        from,
        to,
        status: status !== "ALL" ? status : undefined,
        employeeId: isTeamView ? employee?.id : undefined,
        page,
        limit: pageSize,
      })
      .then((res) => {
        if (!active) return;
        setRows(unwrapList<Attendance>(res));
        setTotal(Number(res?.total ?? res?.pagination?.total ?? 0));
        setTotalPages(Number(res?.totalPages ?? res?.pagination?.totalPages ?? 1));
        setFailed(false);
      })
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [from, to, status, employee?.id, isTeamView, page, pageSize, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const openCorrection = (row: Attendance) => {
    if (!isTeamView) return setRegularize(row);
    const e = row.employee;
    setMarkInitial({
      employee: e ? { id: e.id, name: `${e.firstName} ${e.lastName || ""}`.trim(), meta: e.employeeCode || "" } : null,
      date: recordDateKey(row),
      status: row.status,
      inTime: row.checkIn ? toHHmm(row.checkIn) : undefined,
      outTime: row.checkOut ? toHHmm(row.checkOut) : undefined,
    });
    setMarkOpen(true);
  };

  return (
    <section id="attendance-history" className="scroll-mt-24 space-y-4" aria-labelledby="attendance-log-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="attendance-log-title" className="text-lg font-semibold tracking-tight text-slate-950">{isTeamView ? "Team attendance log" : "Your attendance log"}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading ? "Loading records…" : `${total.toLocaleString("en-IN")} record${total === 1 ? "" : "s"}${from ? ` · ${prettyRange(from, to)}` : ""}`}
          </p>
        </div>
        {isTeamView && (
          <button
            type="button"
            onClick={() => {
              setMarkInitial(undefined);
              setMarkOpen(true);
            }}
            className="keep-white inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold shadow-sm transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Mark attendance
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-900/[0.06] lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 lg:pb-0">
          {STATUS_FILTERS.map((s) => {
            const selected = status === s.value;
            return (
              <button
                key={s.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilters({ status: s.value })}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selected ? "keep-white bg-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {s.value !== "ALL" && <span className={`h-1.5 w-1.5 rounded-full ${statusMeta(s.value).dot}`} />}
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Date range</span>
            <CalendarRange className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <select
              value={range}
              onChange={(e) => setFilters({ range: e.target.value, ...(e.target.value !== "custom" ? { from: null, to: null } : {}) })}
              className="h-9 appearance-none rounded-lg bg-white pl-8 pr-8 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          {range === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" value={customFrom} max={customTo || undefined} onChange={(e) => setFilters({ from: e.target.value })} className="h-9 rounded-lg px-2.5 text-sm text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" aria-label="To date" value={customTo} min={customFrom || undefined} onChange={(e) => setFilters({ to: e.target.value })} className="h-9 rounded-lg px-2.5 text-sm text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}
          {isTeamView && (
            <EmployeeCombobox
              value={employee}
              onChange={(o) => setFilters({ employee: o?.id || null, employeeName: o?.name || null })}
              className="w-full sm:w-56"
            />
          )}
          <button type="button" onClick={reload} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <AttendanceLogView
        rows={rows}
        loading={loading}
        failed={failed}
        isTeamView={isTeamView}
        filtered={status !== "ALL" || Boolean(employee) || range !== "all"}
        onRetry={reload}
        onClearFilters={() => setFilters({ status: null, range: "all", from: null, to: null, employee: null, employeeName: null })}
        onCorrect={openCorrection}
      />

      {!loading && total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          noun="records"
        />
      )}

      <RegularizationModal isOpen={Boolean(regularize)} attendance={regularize} onClose={() => setRegularize(null)} onSuccess={reload} />
      <AdminMarkDialog open={markOpen} initial={markInitial} onClose={() => setMarkOpen(false)} onSaved={reload} />
    </section>
  );
}

/** Same em dash as the other empty cells (formatTime returns a hyphen). */
const timeOrDash = (value?: string) => (value ? formatTime(value) : "—");

const toHHmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const prettyRange = (from: string, to?: string) => {
  const fmt = (k: string) => new Date(`${k}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return !to || from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
};

const dayLabel = (row: Attendance) => {
  const d = new Date(`${recordDateKey(row)}T00:00:00`);
  return { date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), weekday: d.toLocaleDateString("en-IN", { weekday: "short" }) };
};

const employeeName = (row: Attendance) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName || ""}`.trim() : "Unknown employee");

function Avatar({ row }: { row: Attendance }) {
  const e = row.employee;
  if (e?.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={e.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />;
  }
  return (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-700">
      {`${e?.firstName?.[0] || "?"}${e?.lastName?.[0] || ""}`.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export interface AttendanceLogViewProps {
  rows: Attendance[];
  loading: boolean;
  failed: boolean;
  isTeamView: boolean;
  filtered: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onCorrect: (row: Attendance) => void;
}

/** Presentational: table on wide screens, stacked cards on phones. */
export function AttendanceLogView({ rows, loading, failed, isTeamView, filtered, onRetry, onClearFilters, onCorrect }: AttendanceLogViewProps) {
  const shell = "overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

  if (failed) {
    return (
      <div className={`${shell} px-6 py-14 text-center`}>
        <p className="text-sm font-semibold text-slate-900">Couldn&apos;t load attendance records</p>
        <p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p>
        <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className={`${shell} px-6 py-16 text-center`}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FileSearch className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-semibold text-slate-900">{filtered ? "No records match these filters" : "No attendance records yet"}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {filtered ? "Try a wider date range or a different status." : isTeamView ? "Records appear here as your team punches in." : "Your records appear here after your first punch."}
        </p>
        {filtered && (
          <button type="button" onClick={onClearFilters} className="mt-4 rounded-lg px-3.5 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
            Clear filters
          </button>
        )}
      </div>
    );
  }

  const skeletonRows = Array.from({ length: 6 });
  const th = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500";

  return (
    <div className={shell}>
      {/* Wide screens: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70">
            <tr>
              {isTeamView && <th className={`${th} pl-5`}>Employee</th>}
              <th className={`${th} ${isTeamView ? "" : "pl-5"}`}>Date</th>
              <th className={th}>Punch in</th>
              <th className={th}>Punch out</th>
              <th className={th}>Worked</th>
              <th className={`${th} hidden xl:table-cell`}>Breaks</th>
              <th className={`${th} hidden lg:table-cell`}>Location</th>
              <th className={th}>Status</th>
              <th className={`${th} pr-5 text-right`}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? skeletonRows.map((_, i) => (
                  <tr key={i}>
                    <td colSpan={isTeamView ? 9 : 8} className="px-5 py-3.5"><span className="skeleton-shimmer block h-5 rounded-md" /></td>
                  </tr>
                ))
              : rows.map((row) => {
                  const day = dayLabel(row);
                  const mins = workedMinutes(row);
                  const late = Number(row.lateMinutes || 0);
                  return (
                    <tr key={row.id} className="group transition hover:bg-slate-50/70">
                      {isTeamView && (
                        <td className="py-3 pl-5 pr-4">
                          <div className="flex min-w-[12rem] items-center gap-3">
                            <Avatar row={row} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{employeeName(row)}</p>
                              <p className="truncate text-xs text-slate-500">{[row.employee?.employeeCode, row.employee?.designation || row.employee?.department?.name].filter(Boolean).join(" · ") || "—"}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className={`whitespace-nowrap py-3 pr-4 ${isTeamView ? "pl-4" : "pl-5"}`}>
                        <p className="font-medium text-slate-900">{day.date}</p>
                        <p className="text-xs text-slate-500">{day.weekday}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                        {timeOrDash(row.checkIn)}
                        {late > 0 && <p className="text-xs font-medium text-amber-700">{formatHm(late)} late</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">{row.checkIn && !row.checkOut ? <span className="text-xs font-medium text-emerald-700">Working</span> : timeOrDash(row.checkOut)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-slate-900">{mins ? formatHm(mins) : "—"}</td>
                      <td className="hidden whitespace-nowrap px-4 py-3 tabular-nums text-slate-500 xl:table-cell">{breakMinutesOf(row) ? formatHm(breakMinutesOf(row)) : "—"}</td>
                      <td className="hidden max-w-[14rem] truncate px-4 py-3 text-slate-600 lg:table-cell" title={row.checkInLocation || row.branch?.name || ""}>{row.checkInLocation || row.branch?.name || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="py-3 pl-4 pr-5 text-right">
                        <button
                          type="button"
                          onClick={() => onCorrect(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 opacity-70 ring-1 ring-slate-200 transition hover:bg-white hover:text-indigo-700 hover:ring-indigo-200 group-hover:opacity-100"
                        >
                          <Pencil className="h-3 w-3" />
                          {isTeamView ? "Correct" : "Request fix"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Phones: cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {loading
          ? skeletonRows.slice(0, 4).map((_, i) => <li key={i} className="p-4"><span className="skeleton-shimmer block h-16 rounded-lg" /></li>)
          : rows.map((row) => {
              const day = dayLabel(row);
              const mins = workedMinutes(row);
              const late = Number(row.lateMinutes || 0);
              return (
                <li key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {isTeamView && <Avatar row={row} />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{isTeamView ? employeeName(row) : `${day.weekday}, ${day.date}`}</p>
                        <p className="truncate text-xs text-slate-500">{isTeamView ? `${day.weekday}, ${day.date}` : row.checkInLocation || row.branch?.name || "—"}</p>
                      </div>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
                    <div><dt className="text-slate-500">In</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{timeOrDash(row.checkIn)}</dd></div>
                    <div><dt className="text-slate-500">Out</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{row.checkIn && !row.checkOut ? "Working" : timeOrDash(row.checkOut)}</dd></div>
                    <div><dt className="text-slate-500">Worked</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{mins ? formatHm(mins) : "—"}</dd></div>
                  </dl>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-700">{late > 0 ? `${formatHm(late)} late` : ""}</span>
                    <button type="button" onClick={() => onCorrect(row)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                      <Pencil className="h-3 w-3" /> {isTeamView ? "Correct" : "Request fix"}
                    </button>
                  </div>
                </li>
              );
            })}
      </ul>
    </div>
  );
}
