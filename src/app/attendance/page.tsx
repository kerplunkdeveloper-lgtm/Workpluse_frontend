"use client";

import React, { Suspense, useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PunchClockCard from "@/components/attendance/PunchClockCard";
import AttendanceHistoryView from "@/components/attendance/AttendanceHistoryView";
import TeamPunchBoard from "@/components/attendance/TeamPunchBoard";
import { ChevronRight, Calendar, Clock } from "lucide-react";
import Link from "next/link";

export default function AttendancePage() {
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentDateStr(
        d.toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
      setCurrentTimeStr(
        d.toLocaleTimeString("en-US", {
          hour12: true,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6 max-w-[1680px] mx-auto">
          {/* Breadcrumb & Header Section matching dashboard_design_2.png */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Link href="/dashboard" className="hover:text-slate-800 transition">
                  WorkPulse
                </Link>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="text-slate-800 font-semibold">Smart Punch & Clock</span>
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Smart Punch & Timesheet
              </h1>
              <p className="text-xs text-slate-500 font-medium max-w-2xl">
                Punch from anywhere. Your location is saved and shown to everyone on the team.
              </p>
            </div>

            {/* Right Banner & Date/Time Badge */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-serif italic font-bold text-indigo-700 leading-tight">
                  Accurate Attendance
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Stronger Teams • Brighter Tomorrow</p>
              </div>

              {/* Live Clock & Date Pill */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                <div className="flex items-center gap-1.5 text-indigo-600">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span className="font-mono font-extrabold text-slate-900">{currentTimeStr || "--:--:--"}</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{currentDateStr || "Today"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Master Punch & Clock Widget + Today's Details Panel */}
          <PunchClockCard />

          <TeamPunchBoard />

          {/* Attendance Log Table & 4 Metric Cards */}
          <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading attendance view...</div>}>
            <AttendanceHistoryView />
          </Suspense>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
