"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAttendance, PunchOptions } from "@/context/AttendanceContext";
import { useAuth } from "@/context/AuthContext";
import {
  Clock,
  MapPin,
  CheckCircle2,
  Briefcase,
  Building2,
  Play,
  Square,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Wifi,
  WifiOff,
  Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime, formatDurationMinutes } from "@/lib/utils";

export type WorkMode = "OFFICE" | "SHOOT" | "WORK_FROM_HOME" | "CLIENT_VISIT" | "TRAVEL";

export default function PunchClockCard() {
  const { user } = useAuth();
  const {
    todayStatus,
    currentLocation,
    locationLabel,
    distanceToBranch,
    checkIn,
    checkOut,
    isActionLoading,
    isOnline,
    pendingPunchCount,
    isWithinGeofence,
  } = useAttendance();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedWorkMode, setSelectedWorkMode] = useState<WorkMode>("OFFICE");
  const [punchNote, setPunchNote] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCheckedIn = Boolean(
    todayStatus?.hasCheckedIn ||
    todayStatus?.attendance?.checkIn ||
    (todayStatus as any)?.clockedIn
  ) && !Boolean(
    todayStatus?.hasCheckedOut ||
    todayStatus?.attendance?.checkOut
  );

  const hasCheckedOut = Boolean(
    todayStatus?.hasCheckedOut ||
    todayStatus?.attendance?.checkOut
  );

  const isOnBreak = todayStatus?.isOnBreak;
  const shift = user?.employee?.shift;

  const punchInTimeString = todayStatus?.attendance?.checkIn
    ? formatTime(todayStatus.attendance.checkIn)
    : "-- : --";

  const punchOutTimeString = todayStatus?.attendance?.checkOut
    ? formatTime(todayStatus.attendance.checkOut)
    : "-- : --";

  const shiftHoursString = todayStatus?.attendance?.workMinutes
    ? formatDurationMinutes(todayStatus.attendance.workMinutes)
    : isCheckedIn
    ? "Active"
    : "0 hrs";

  const punchedLocation =
    todayStatus?.attendance?.checkInLocation ||
    todayStatus?.attendance?.checkOutLocation ||
    locationLabel ||
    null;

  const handlePunchClick = (action: "CHECK_IN" | "CHECK_OUT") => {
    setPendingAction(action);
    setConfirmModalOpen(true);
  };

  const handleConfirmPunch = async () => {
    const options: PunchOptions = {
      workMode: selectedWorkMode as any,
      note: punchNote.trim() || undefined,
      locationLabel: locationLabel || undefined,
    };

    let ok = false;
    if (pendingAction === "CHECK_IN") {
      ok = await checkIn(options);
    } else {
      ok = await checkOut(options);
    }

    if (ok) {
      setConfirmModalOpen(false);
      setPunchNote("");
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      const dateStr = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
      setPunchAlertData({
        action: pendingAction,
        time: timeStr,
        date: dateStr,
        workMode: selectedWorkMode,
        isWithinGeofence: isWithinGeofence,
        distanceMeters: distanceToBranch,
        locationLabel: locationLabel || punchedLocation,
        shiftName: shift ? `${shift.name} (${shift.startTime} - ${shift.endTime})` : "Standard General Shift (09:00 - 18:00)",
      });
    }
  };

  // State for post-punch confirmation alert modal
  const [punchAlertData, setPunchAlertData] = useState<{
    action: "CHECK_IN" | "CHECK_OUT";
    time: string;
    date: string;
    workMode: WorkMode;
    isWithinGeofence: boolean;
    distanceMeters: number | null;
    locationLabel?: string | null;
    shiftName: string;
  } | null>(null);

  // Format digital clock
  const hours = currentTime.getHours();
  const minutes = String(currentTime.getMinutes()).padStart(2, "0");
  const seconds = String(currentTime.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = String(hours % 12 || 12).padStart(2, "0");

  const fullDateFormatted = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDayIndex = (today.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    type DayStatus = "PRESENT" | "HALF_DAY" | "TODAY" | "WEEK_OFF" | "UPCOMING";

    return dayLabels.map((label, idx): { label: string; status: DayStatus } => {
      let status: DayStatus = "UPCOMING";
      if (idx === currentDayIndex) {
        status = "TODAY";
      } else if (idx === 5 || idx === 6) {
        status = "WEEK_OFF";
      } else if (idx < currentDayIndex) {
        status = "PRESENT";
      }
      return { label, status };
    });
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. Hero Timekeeper Card (Deep Dark Navy with Glowing Radar) - 8 cols
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="hero-timekeeper keep-white xl:col-span-8 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-600 p-6 sm:p-7 text-white shadow-2xl border border-blue-800 relative overflow-hidden flex flex-col justify-between">
        {/* Subtle radial light effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Digital Clock & Assigned Shift */}
          <div className="md:col-span-5 space-y-4">
            {/* Live Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/10 text-[11px] font-bold tracking-[0.16em] text-indigo-200">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>LIVE TIMEKEEPER</span>
            </div>

            {/* Huge Monospace Digital Clock */}
            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold tracking-tight flex items-baseline gap-2">
                <span className="text-white drop-shadow-md">{displayHours}</span>
                <span className="text-indigo-300 font-bold animate-pulse">:</span>
                <span className="text-white drop-shadow-md">{minutes}</span>
                <span className="text-indigo-300 font-bold animate-pulse">:</span>
                <span className="text-white drop-shadow-md">{seconds}</span>
                <span className="text-base sm:text-lg font-extrabold text-indigo-100 ml-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 tracking-wider font-sans">{ampm}</span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-2 flex items-center gap-1.5">
                <span>{fullDateFormatted}</span>
              </p>
            </div>

            {/* Assigned Shift Card */}
            <div className="p-3 rounded-2xl bg-black/30 border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-slate-300 mb-0.5">
                <Clock className="w-3.5 h-3.5 text-indigo-300" />
                <span className="font-semibold text-[11px] text-slate-300">Assigned Shift</span>
              </div>
              <p className="font-bold text-white drop-shadow-xs">
                {shift ? `${shift.name} (${shift.startTime} - ${shift.endTime})` : "General Morning (09:00 - 18:00)"}
              </p>
            </div>
          </div>

          {/* Center Column: Status Ring Badge */}
          <div className="md:col-span-3 flex flex-col items-center justify-center text-center py-2">
            {/* Pulsing Glowing Ring */}
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping opacity-25" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-white drop-shadow-xs">
              {hasCheckedOut
                ? "Shift Completed Today"
                : isCheckedIn
                ? "Currently Clocked In"
                : "Ready to Clock In"}
            </h3>
            <p className="text-[11px] text-slate-300 mt-1 max-w-[170px] leading-relaxed">
              {hasCheckedOut
                ? "You have clocked out for today. See you tomorrow!"
                : isCheckedIn
                ? "Shift active • Punch from any location."
                : "Tap Punch In to record your daily attendance."}
            </p>
          </div>

          {/* Right Column: Action Buttons & GPS Radar Status */}
          <div className="md:col-span-4 space-y-3">
            {/* Primary Punch In Button */}
            <button
              onClick={() => handlePunchClick("CHECK_IN")}
              disabled={isCheckedIn || isActionLoading}
              className={`w-full py-3 px-5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
                isCheckedIn
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Punch In</span>
            </button>

            {/* Secondary Punch Out Button */}
            <button
              onClick={() => handlePunchClick("CHECK_OUT")}
              disabled={!isCheckedIn || isActionLoading}
              className={`w-full py-3 px-5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all border cursor-pointer ${
                !isCheckedIn
                  ? "bg-black/40 text-slate-500 border-white/10 cursor-not-allowed"
                  : "bg-slate-800/90 hover:bg-rose-600 hover:border-rose-500 text-slate-200 hover:text-white border-slate-700 hover:scale-[1.02]"
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Punch Out</span>
            </button>

            {/* GPS Verified Status Badge */}
            <div className="p-2.5 rounded-2xl bg-black/30 border border-white/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="leading-tight min-w-0 flex-1">
                <p className={`text-xs font-bold truncate ${currentLocation || punchedLocation ? "text-emerald-400" : "text-slate-200"}`}>
                  {punchedLocation || locationLabel || (currentLocation ? "Location ready" : "Detecting location…")}
                </p>
                <p className="text-[10px] text-slate-300">
                  {pendingPunchCount > 0
                    ? `${pendingPunchCount} punch${pendingPunchCount === 1 ? "" : "es"} waiting to sync.`
                    : punchedLocation
                      ? "Saved on your punch and visible to the team."
                      : "Clock in from anywhere. Your place name is shared with the team."}
                </p>
              </div>
              <span className={`shrink-0 ${isOnline ? "text-emerald-400" : "text-amber-300"}`} title={isOnline ? "Online" : "Offline"}>
                {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. Today's Details & Mini Heatmap (Right Column) - 4 cols
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="xl:col-span-4 rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Today&apos;s Details</h3>
            <span className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-0.5">
              <span>View Timeline</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <div className="space-y-2.5 min-w-0">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/90 border border-slate-100 min-w-0">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 truncate mr-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="font-medium text-slate-700">Punch In Time</span>
              </div>
              <span className="font-mono text-xs font-extrabold text-slate-900 shrink-0 ml-auto">{punchInTimeString}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/90 border border-slate-100 min-w-0">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 truncate mr-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="font-medium text-slate-700">Punch Out Time</span>
              </div>
              <span className="font-mono text-xs font-extrabold text-slate-900 shrink-0 ml-auto">{punchOutTimeString}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/90 border border-slate-100 min-w-0">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 truncate mr-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="font-medium text-slate-700">Shift Hours</span>
              </div>
              <span className="font-mono text-xs font-extrabold text-slate-900 shrink-0 ml-auto">{shiftHoursString}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/90 border border-slate-100 min-w-0">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 truncate mr-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-medium text-slate-700">Work Mode</span>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2.5 py-1 rounded-lg shrink-0 ml-auto">
                {todayStatus?.attendance?.isWorkFromHome ? "Work From Home" : "Office HQ"}
              </span>
            </div>
          </div>
        </div>

        {/* This Week Mini Heatmap Tracker */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">This Week</span>
            <span className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-0.5">
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-semibold">{d.label}</span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    d.status === "PRESENT"
                      ? "bg-emerald-500 text-white"
                      : d.status === "HALF_DAY"
                      ? "bg-amber-400 text-white"
                      : d.status === "TODAY"
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {d.status === "TODAY" ? "●" : "✓"}
                </div>
              </div>
            ))}
          </div>

          {/* Mini Legend */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Half Day
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600" /> Today
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Confirm {pendingAction === "CHECK_IN" ? "Clock In" : "Clock Out"}
            </h3>
            <p className="text-xs text-slate-500">
              {pendingAction === "CHECK_IN"
                ? `Your punch will record this time and place${locationLabel ? `: ${locationLabel}` : ""}. The team can see where you clocked in.`
                : "Ending your work shift. Total hours will be automatically saved to your payroll timesheet."}
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Work Mode</label>
              <select
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value as WorkMode)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="OFFICE">Office HQ</option>
                <option value="WORK_FROM_HOME">Work From Home (Remote)</option>
                <option value="SHOOT">On-Site Shoot</option>
                <option value="CLIENT_VISIT">Client Visit</option>
                <option value="TRAVEL">Travel / Transit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Optional Note</label>
              <input
                type="text"
                value={punchNote}
                onChange={(e) => setPunchNote(e.target.value)}
                placeholder="e.g. Regular punch or client meeting..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPunch}
                disabled={isActionLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition"
              >
                {isActionLoading ? "Recording..." : "Confirm & Punch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Visibility Confirmation Alert Modal (Check-in & Check-out) */}
      {punchAlertData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 text-slate-900 relative overflow-hidden"
          >
            {/* Ambient top decoration */}
            <div
              className={`absolute top-0 left-0 right-0 h-2.5 ${
                punchAlertData.action === "CHECK_IN"
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                  : "bg-gradient-to-r from-indigo-500 via-sky-500 to-blue-600"
              }`}
            />

            {/* Center Animated Icon Badge */}
            <div className="flex flex-col items-center text-center pt-2">
              <div
                className={`relative w-20 h-20 rounded-3xl flex items-center justify-center mb-3 shadow-lg ${
                  punchAlertData.action === "CHECK_IN"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-emerald-500/20"
                    : "bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-indigo-500/20"
                }`}
              >
                <div
                  className={`absolute inset-0 rounded-3xl animate-ping opacity-20 ${
                    punchAlertData.action === "CHECK_IN" ? "bg-emerald-400" : "bg-indigo-400"
                  }`}
                />
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <span
                className={`px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-1 ${
                  punchAlertData.action === "CHECK_IN"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-indigo-100 text-indigo-800"
                }`}
              >
                {punchAlertData.action === "CHECK_IN" ? "Shift Activated" : "Shift Completed"}
              </span>

              <h3 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">
                {punchAlertData.action === "CHECK_IN" ? "Check-In Confirmed!" : "Check-Out Confirmed!"}
              </h3>

              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                {punchAlertData.action === "CHECK_IN"
                  ? "Your daily attendance timestamp and geofenced coordinates have been securely locked into the enterprise timesheet."
                  : "Shift concluded successfully! Working hours have been compiled and credited to your payroll ledger."}
              </p>
            </div>

            {/* Punch Details Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Recorded Timestamp
                </span>
                <span className="font-extrabold text-slate-900 text-sm">{punchAlertData.time}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Work Mode
                </span>
                <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-white border border-slate-200 text-slate-800">
                  {punchAlertData.workMode === "OFFICE"
                    ? "Office HQ"
                    : punchAlertData.workMode === "WORK_FROM_HOME"
                    ? "Work From Home (Remote)"
                    : punchAlertData.workMode === "SHOOT"
                    ? "On-Site Shoot"
                    : punchAlertData.workMode === "CLIENT_VISIT"
                    ? "Client Visit"
                    : "Field Travel"}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Location
                </span>
                <span className="flex items-center gap-1 font-bold text-emerald-600 text-[11px] text-right max-w-[200px]">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{punchAlertData.locationLabel || "Location saved"}</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  Schedule
                </span>
                <span className="font-semibold text-slate-700 text-[11px] truncate max-w-[200px]">
                  {punchAlertData.shiftName}
                </span>
              </div>
            </div>

            {/* Bottom Dismiss Button */}
            <div className="pt-1">
              <button
                onClick={() => setPunchAlertData(null)}
                className={`w-full py-3 rounded-2xl font-bold text-xs text-white shadow-lg transition flex items-center justify-center gap-2 ${
                  punchAlertData.action === "CHECK_IN"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25"
                }`}
              >
                <span>Awesome, Got It!</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
