"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarPlus } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
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
  const isTeam = TEAM_ROLES.includes(String(role));

  return (
    <main className="mx-auto w-full max-w-[1320px] space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <LiveDate />
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-[28px]">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isTeam ? "Punch in for yourself, see who's in today, and keep the team's records accurate." : "Punch in and out, take breaks, and keep an eye on your hours."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leaves" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300">
            <CalendarPlus className="h-4 w-4 text-slate-500" /> Apply leave
          </Link>
          {isTeam && (
            <Link href="/reports" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300">
              <BarChart3 className="h-4 w-4 text-slate-500" /> Reports
            </Link>
          )}
        </div>
      </header>

      <PunchClockCard />
      {isTeam && <TeamToday />}
      <MyAttendanceInsights />

      <Suspense fallback={<div className="skeleton-shimmer h-96 rounded-2xl" />}>
        <AttendanceHistoryView />
      </Suspense>
    </main>
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
