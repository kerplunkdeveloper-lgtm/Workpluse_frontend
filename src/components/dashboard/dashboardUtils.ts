"use client";

import React from "react";



import { CalendarDays, Clock, Home, Users } from "lucide-react";









import { type KpiStatus } from "./dashboardMetrics";

export const KPI_META: Record<
  KpiStatus,
  {
    label: string;
    hint: string;
    color: string;
    ring: string;
    bar: string;
    iconBg: string;
    gradient: string;
    icon: React.ElementType;
  }
> = {
  PRESENT: {
    label: "Present Today",
    hint: "On site & punched in",
    color: "text-emerald-700",
    ring: "ring-emerald-500 border-emerald-400 bg-emerald-50/30",
    bar: "bg-emerald-500",
    iconBg: "bg-emerald-100/80 text-emerald-700",
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    icon: Users,
  },
  REMOTE: {
    label: "Remote / WFH",
    hint: "Working off-site",
    color: "text-violet-700",
    ring: "ring-violet-500 border-violet-400 bg-violet-50/30",
    bar: "bg-violet-500",
    iconBg: "bg-violet-100/80 text-violet-700",
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    icon: Home,
  },
  ON_LEAVE: {
    label: "On Leave",
    hint: "Approved time-off",
    color: "text-sky-700",
    ring: "ring-sky-500 border-sky-400 bg-sky-50/30",
    bar: "bg-sky-500",
    iconBg: "bg-sky-100/80 text-sky-700",
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    icon: CalendarDays,
  },
  LATE: {
    label: "Late Arrivals",
    hint: "Punched after grace time",
    color: "text-amber-700",
    ring: "ring-amber-500 border-amber-400 bg-amber-50/30",
    bar: "bg-amber-500",
    iconBg: "bg-amber-100/80 text-amber-700",
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    icon: Clock,
  },
};

export function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function timeContextBadge(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return { text: "Morning Velocity", icon: "☀️", color: "text-amber-400 bg-amber-950/40 border-amber-500/30" };
  if (hour < 17) return { text: "Afternoon Focus", icon: "🌤️", color: "text-sky-400 bg-sky-950/40 border-sky-500/30" };
  return { text: "Evening Operations", icon: "🌙", color: "text-indigo-400 bg-indigo-950/40 border-indigo-500/30" };
}

export function personName(employee: any) {
  const first = employee?.firstName || employee?.user?.employee?.firstName || "";
  const last = employee?.lastName || employee?.user?.employee?.lastName || "";
  return `${first} ${last}`.trim() || employee?.workEmail || employee?.email || "Team member";
}

export function isSameDay(value?: string | Date | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Attendance and leave dates are DATE columns serialised at UTC midnight, so the
 * "YYYY-MM-DD" prefix is the calendar day. Comparing prefixes against the
 * server's own "today" avoids the browser's timezone shifting a record a day.
 */
export function isTodayRecord(record: any, todayKey: string) {
  if (typeof record?.date === "string") return record.date.slice(0, 10) === todayKey;
  return isSameDay(record?.checkIn);
}

export function leaveCoversDay(leave: any, todayKey: string) {
  const start = String(leave?.startDate || "").slice(0, 10);
  const end = String(leave?.endDate || leave?.startDate || "").slice(0, 10);
  return Boolean(start) && start <= todayKey && todayKey <= end;
}
