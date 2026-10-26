"use client";

import React, { useMemo, useState } from "react";
import { FileDown, Search, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { printAttendanceList, type AttendanceListPerson } from "@/lib/printAttendanceList";

export interface DailyListPerson {
  id: string;
  name: string;
  employeeCode?: string;
  designation: string;
  department: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakMinutes?: number;
  lunchMinutes?: number;
  location?: string | null;
  status: "PRESENT" | "REMOTE" | "ON_LEAVE" | "LATE" | "ABSENT" | "OFF";
}

interface DailyAttendanceListProps {
  people: DailyListPerson[];
  organization: string;
  /** The tenant's own date, "YYYY-MM-DD". */
  dateKey: string;
  /** The tenant's local hour, 0-23. From 6 pm on, "not punched in" is reported as absent. */
  localHour: number;
  isHoliday?: boolean;
  holidayName?: string | null;
}

const STATUS_LABEL: Record<string, string> = { PRESENT: "Present", LATE: "Late", REMOTE: "Remote", ON_LEAVE: "On leave", ABSENT: "Absent", OFF: "Day off" };

/**
 * The day's two lists, present and absent, with a PDF. Before 6 pm "absent" means "has not punched in yet",
 * since people can still arrive; after that it is a real absence.
 */
export default function DailyAttendanceList({ people, organization, dateKey, localHour, isHoliday, holidayName }: DailyAttendanceListProps) {
  const [tab, setTab] = useState<"ABSENT" | "PRESENT">("ABSENT");
  const [query, setQuery] = useState("");

  const endOfDay = localHour >= 18;
  const absentLabel = endOfDay ? "Absent" : "Not punched";

  const groups = useMemo(() => {
    const byName = (a: DailyListPerson, b: DailyListPerson) => a.name.localeCompare(b.name);
    return {
      absent: people.filter((p) => p.status === "ABSENT").sort(byName),
      present: people.filter((p) => ["PRESENT", "LATE", "REMOTE"].includes(p.status)).sort(byName),
      onLeave: people.filter((p) => p.status === "ON_LEAVE").sort(byName),
    };
  }, [people]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tab === "ABSENT" ? groups.absent : groups.present;
    if (!q) return list;
    return list.filter((p) => `${p.name} ${p.employeeCode || ""} ${p.department} ${p.designation}`.toLowerCase().includes(q));
  }, [groups, tab, query]);

  const dateLabel = useMemo(() => {
    const d = new Date(`${dateKey}T00:00:00`);
    return Number.isNaN(d.getTime()) ? dateKey : d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [dateKey]);

  const toPdfPerson = (p: DailyListPerson): AttendanceListPerson => ({
    name: p.name,
    employeeCode: p.employeeCode,
    department: p.department,
    designation: p.designation,
    checkInTime: p.checkInTime,
    checkOutTime: p.checkOutTime,
    breakMinutes: p.breakMinutes,
    lunchMinutes: p.lunchMinutes,
    location: p.location,
    statusLabel: STATUS_LABEL[p.status] || p.status,
  });

  const downloadPdf = () => {
    try {
      printAttendanceList({
        organization,
        dateLabel,
        generatedAt: new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
        absentLabel,
        absent: groups.absent.map(toPdfPerson),
        present: groups.present.map(toPdfPerson),
        onLeave: groups.onLeave.map(toPdfPerson),
        total: people.length,
      });
      toast.info("In the print window, choose “Save as PDF”.");
    } catch (err: any) {
      toast.error(err?.message || "Could not create the PDF.");
    }
  };

  const tabs = [
    { key: "ABSENT" as const, label: absentLabel, count: groups.absent.length, icon: UserX, on: "bg-rose-600 text-white", count_on: "bg-white/20" },
    { key: "PRESENT" as const, label: "Present", count: groups.present.length, icon: UserCheck, on: "bg-emerald-600 text-white", count_on: "bg-white/20" },
  ];

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="daily-list-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Daily attendance list</p>
          <h2 id="daily-list-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            Who is in, who is not
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {dateLabel}
            {isHoliday ? ` · Holiday${holidayName ? `: ${holidayName}` : ""}. Nobody is counted absent.` : endOfDay ? " · End-of-day list" : " · Updates as people punch in. Absent is final after 6 pm."}
          </p>
        </div>
        <button
          type="button"
          onClick={downloadPdf}
          disabled={people.length === 0}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Attendance list" className="flex gap-1.5">
          {tabs.map(({ key, label, count, icon: Icon, on, count_on }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${active ? on : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className={`rounded-full px-1.5 tabular-nums ${active ? count_on : "bg-white text-slate-500"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, code or department"
            aria-label="Search the attendance list"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-400">
          {query.trim() ? "Nobody matches your search." : tab === "ABSENT" ? (isHoliday ? "It is a holiday." : "Everyone has punched in.") : "Nobody has punched in yet."}
        </p>
      ) : (
        <div className="mt-4 grid max-h-96 grid-cols-1 gap-2.5 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${tab === "ABSENT" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{p.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.designation} • {p.department}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                {tab === "PRESENT" ? (
                  <>
                    <span className="block font-mono text-xs font-bold text-slate-700">{p.checkInTime || "—"}</span>
                    <span className="text-[11px] text-slate-400">{STATUS_LABEL[p.status]}</span>
                  </>
                ) : (
                  p.employeeCode && <span className="font-mono text-xs text-slate-400">{p.employeeCode}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
