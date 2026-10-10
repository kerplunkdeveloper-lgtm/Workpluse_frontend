"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarPlus, CheckCircle2, Clock3, MapPin, UsersRound } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import PunchClockCard from "@/components/attendance/PunchClockCard";
import AttendanceHistoryView from "@/components/attendance/AttendanceHistoryView";
import { MyAttendanceInsights, TeamToday } from "@/components/attendance/AttendanceInsights";

const TEAM_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"];

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AttendanceWorkspace />
      </AppLayout>
    </ProtectedRoute>
  );
}

function AttendanceWorkspace() {
  const { role } = useAuth();
  const { todayStatus, isOnline, currentLocation } = useAttendance();
  const isTeam = TEAM_ROLES.includes(String(role));
  const punchedIn = Boolean(todayStatus?.hasCheckedIn || todayStatus?.attendance?.checkIn);
  const punchedOut = Boolean(todayStatus?.hasCheckedOut || todayStatus?.attendance?.checkOut);

  return (
    <main className="mx-auto w-full max-w-[1320px] space-y-5 pb-10">
      <header className="flex flex-col gap-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-44px_rgba(15,23,42,.28)] sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <LiveDate />
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[.18em] text-indigo-600">Workday command center</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">Attendance</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {isTeam ? "Punch in for yourself, see who's in today, and keep the team's records accurate." : "Punch in and out, take breaks, and keep an eye on your hours."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/leaves" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300">
            <CalendarPlus className="h-4 w-4 text-slate-500" /> Apply leave
          </Link>
          {isTeam && (
            <Link href="/reports" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              <BarChart3 className="h-4 w-4 text-slate-500" /> Reports
            </Link>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Attendance status summary">
        <StatusTile icon={punchedOut ? CheckCircle2 : Clock3} label="Today" value={punchedOut ? "Complete" : punchedIn ? "In progress" : "Not started"} tone={punchedOut || punchedIn ? "text-emerald-700" : "text-slate-700"} />
        <StatusTile icon={Clock3} label="Shift" value={todayStatus?.shift?.name || "Your assigned shift"} />
        <StatusTile icon={MapPin} label="Location" value={currentLocation ? "GPS ready" : "Checking location"} tone={currentLocation ? "text-emerald-700" : "text-amber-700"} />
        <StatusTile icon={isTeam ? UsersRound : CheckCircle2} label={isTeam ? "Team view" : "Connection"} value={isTeam ? "Live today" : isOnline ? "Online" : "Offline mode"} tone={isOnline || isTeam ? "text-indigo-700" : "text-amber-700"} />
      </section>

      <PunchClockCard />
      {isTeam && <TeamToday />}
      <MyAttendanceInsights />

      <Suspense fallback={<div className="skeleton-shimmer h-96 rounded-2xl" />}>
        <AttendanceHistoryView />
      </Suspense>
    </main>
  );
}

function StatusTile({ icon: Icon, label, value, tone = "text-slate-900" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400"><Icon className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></div>
      <p className={`mt-2 truncate text-sm font-semibold ${tone}`} title={value}>{value}</p>
    </div>
  );
}

/** "Friday, 9 October · 10:42 AM" — updates each minute, not each second, to avoid needless renders. */
function LiveDate() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const id = window.setInterval(update, 30000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="text-xs font-medium text-slate-500" suppressHydrationWarning>
      {now
        ? `${now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · ${now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
        : " "}
    </p>
  );
}
