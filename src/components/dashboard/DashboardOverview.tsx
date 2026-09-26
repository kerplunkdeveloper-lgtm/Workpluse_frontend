"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Home,
  Layers,
  MapPin,
  MessageSquare,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Lock,
  UserPlus,
  BarChart3,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import { attendanceApi, leavesApi, employeesApi } from "@/lib/api";
import UnlockPlanModal from "@/components/auth/UnlockPlanModal";
import PunchConfirmDialog, { PunchConfirmAction } from "@/components/attendance/PunchConfirmDialog";
import TeamPunchBoard from "@/components/attendance/TeamPunchBoard";
import { formatTime, formatDurationMinutes, unwrapList, unwrapItem } from "@/lib/utils";

type RosterStatus = "PRESENT" | "REMOTE" | "ON_LEAVE" | "LATE" | "ABSENT";

interface RosterPerson {
  id: string;
  name: string;
  employeeCode?: string;
  designation: string;
  department: string;
  checkInTime?: string;
  location?: string | null;
  status: RosterStatus;
}

const KPI_META: Record<Exclude<RosterStatus, "ABSENT">, { label: string; hint: string; color: string; ring: string; bar: string; iconBg: string; icon: React.ElementType }> = {
  PRESENT: { label: "Present today", hint: "On site and clocked in", color: "text-emerald-700", ring: "ring-emerald-500 border-emerald-400", bar: "bg-emerald-500", iconBg: "bg-emerald-50 text-emerald-600", icon: Users },
  REMOTE: { label: "Remote / WFH", hint: "Working away from office", color: "text-violet-700", ring: "ring-violet-500 border-violet-400", bar: "bg-violet-500", iconBg: "bg-violet-50 text-violet-600", icon: Home },
  ON_LEAVE: { label: "On leave", hint: "Approved time off today", color: "text-sky-700", ring: "ring-sky-500 border-sky-400", bar: "bg-sky-500", iconBg: "bg-sky-50 text-sky-600", icon: CalendarDays },
  LATE: { label: "Late arrivals", hint: "Clocked in after grace", color: "text-amber-700", ring: "ring-amber-500 border-amber-400", bar: "bg-amber-500", iconBg: "bg-amber-50 text-amber-600", icon: Clock },
};

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function personName(employee: any) {
  const first = employee?.firstName || employee?.user?.employee?.firstName || "";
  const last = employee?.lastName || employee?.user?.employee?.lastName || "";
  return `${first} ${last}`.trim() || employee?.workEmail || employee?.email || "Team member";
}

function isSameDay(value?: string | Date | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export default function DashboardOverview() {
  const router = useRouter();
  const { user, role, refreshUser } = useAuth();
  const { todayStatus, checkIn, checkOut, isActionLoading, currentLocation, locationLabel, isWithinGeofence } = useAttendance();

  const [summary, setSummary] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showDismissAlert, setShowDismissAlert] = useState(true);
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<Exclude<RosterStatus, "ABSENT"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingPunch, setPendingPunch] = useState<PunchConfirmAction | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPlanLocked = Boolean(user?.planLocked || user?.organization?.planLocked);
  const isAdmin = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN";
  const canManage = isAdmin || role === "MANAGER";

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [summaryRes, historyRes, allAttendanceRes, leavesRes, employeesRes] = await Promise.allSettled([
          attendanceApi.getSummary(),
          attendanceApi.getMyAttendance({ limit: 5, page: 1 }),
          attendanceApi.getAllAttendance({ page: 1, limit: 200 }),
          leavesApi.getAllLeaves(),
          employeesApi.list({ page: 1, limit: 200 }),
        ]);

        if (summaryRes.status === "fulfilled" && summaryRes.value) {
          setSummary(unwrapItem(summaryRes.value) || summaryRes.value);
        }
        if (historyRes.status === "fulfilled" && historyRes.value) {
          setRecentAttendance(unwrapList(historyRes.value).slice(0, 5));
        }
        if (allAttendanceRes.status === "fulfilled" && allAttendanceRes.value) {
          setAllAttendance(unwrapList(allAttendanceRes.value));
        }
        if (leavesRes.status === "fulfilled" && leavesRes.value) {
          setAllLeaves(unwrapList(leavesRes.value));
        }
        if (employeesRes.status === "fulfilled" && employeesRes.value) {
          const list = unwrapList(employeesRes.value);
          setAllEmployees(list);
          setEmployeeTotal(employeesRes.value.total || list.length);
        }
        const failed = [summaryRes, historyRes, allAttendanceRes, leavesRes, employeesRes].filter((r) => r.status === "rejected");
        setLoadError(failed.length === 5 ? "Unable to load dashboard data." : null);
      } catch (err) {
        console.error("Dashboard data load error:", err);
        setLoadError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const roster = useMemo<RosterPerson[]>(() => {
    const onLeaveIds = new Set(
      allLeaves
        .filter((leave) => leave.status === "APPROVED" && (isSameDay(leave.startDate) || isSameDay(leave.fromDate) || isSameDay(leave.date)))
        .map((leave) => leave.employeeId || leave.employee?.id)
        .filter(Boolean)
    );

    const attendanceByEmployee = new Map<string, any>();
    allAttendance.forEach((row) => {
      const id = row.employeeId || row.employee?.id;
      if (id) attendanceByEmployee.set(id, row);
    });

    return allEmployees.map((employee) => {
      const att = attendanceByEmployee.get(employee.id);
      let status: RosterStatus = "ABSENT";
      if (onLeaveIds.has(employee.id)) status = "ON_LEAVE";
      else if (att?.status === "LATE" || (att?.lateMinutes && att.lateMinutes > 0)) status = "LATE";
      else if (att?.status === "WORK_FROM_HOME" || att?.isWorkFromHome) status = "REMOTE";
      else if (att?.status === "PRESENT" || att?.checkIn) status = "PRESENT";

      return {
        id: employee.id,
        name: personName(employee),
        employeeCode: employee.employeeCode,
        designation: employee.designation || employee.role || "Staff",
        department: employee.department?.name || employee.department || "General",
        checkInTime: att?.checkIn ? formatTime(att.checkIn) : undefined,
        location: att?.checkInLocation || att?.branch?.name || null,
        status,
      };
    });
  }, [allAttendance, allEmployees, allLeaves]);

  const countFrom = (keys: string[], fallback: number) => {
    for (const key of keys) {
      const n = Number(summary?.[key]);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  };

  const totalEmployees = countFrom(["totalEmployees", "total"], employeeTotal || allEmployees.length || 0);
  const presentCount = countFrom(["present", "presentCount"], roster.filter((p) => p.status === "PRESENT").length);
  const wfhCount = countFrom(["wfh", "wfhCount"], roster.filter((p) => p.status === "REMOTE").length);
  const leaveCount = countFrom(["onLeave", "leaveCount"], roster.filter((p) => p.status === "ON_LEAVE").length);
  const lateCount = countFrom(["late", "lateCount"], roster.filter((p) => p.status === "LATE").length);
  const pendingLeaves = allLeaves.filter((leave) => leave.status === "PENDING").length;

  const pct = (count: number) => (totalEmployees > 0 ? ((count / totalEmployees) * 100).toFixed(1) : "0.0");
  const presentPercentage = pct(presentCount);
  const wfhPercentage = pct(wfhCount);
  const leavePercentage = pct(leaveCount);
  const latePercentage = pct(lateCount);

  const completedCount = presentCount + lateCount;
  const inProgressCount = wfhCount;
  const notStartedCount = Math.max(0, totalEmployees - completedCount - inProgressCount - leaveCount);
  const completionPercent =
    Number.isFinite(Number(summary?.attendanceRate))
      ? Math.round(Number(summary.attendanceRate))
      : totalEmployees > 0
        ? Math.round((completedCount / totalEmployees) * 100)
        : 0;

  const displayName = user?.employee?.firstName || user?.email?.split("@")[0] || "User";
  const formattedDate = currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formattedTime = currentTime.toLocaleTimeString("en-IN", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const totalBranches = (user?.organization as any)?.branches?.length || 1;
  const uniqueDepartments = useMemo(() => {
    const names = new Set<string>();
    allEmployees.forEach((employee: any) => {
      if (employee.department?.name) names.add(employee.department.name);
      else if (typeof employee.department === "string") names.add(employee.department);
    });
    return names.size || 1;
  }, [allEmployees]);

  const hasCheckedInToday = Boolean(todayStatus?.hasCheckedIn || todayStatus?.attendance?.checkIn);
  const hasCheckedOutToday = Boolean(todayStatus?.hasCheckedOut || todayStatus?.attendance?.checkOut);
  const isCheckedIn = hasCheckedInToday && !hasCheckedOutToday;
  const todayCheckInTime = todayStatus?.attendance?.checkIn ? formatTime(todayStatus.attendance.checkIn) : null;
  const todayCheckOutTime = todayStatus?.attendance?.checkOut ? formatTime(todayStatus.attendance.checkOut) : null;
  const todayShiftHours = todayStatus?.attendance?.workMinutes
    ? formatDurationMinutes(todayStatus.attendance.workMinutes)
    : isCheckedIn
    ? "Active"
    : "0 hrs";

  const filteredRoster = useMemo(() => {
    if (!activeBreakdownTab) return [];
    const q = searchQuery.trim().toLowerCase();
    return roster.filter((person) => {
      if (person.status !== activeBreakdownTab) return false;
      if (!q) return true;
      return (
        person.name.toLowerCase().includes(q) ||
        person.department.toLowerCase().includes(q) ||
        (person.employeeCode || "").toLowerCase().includes(q)
      );
    });
  }, [activeBreakdownTab, roster, searchQuery]);

  const hourlyData = useMemo(() => {
    const buckets = [
      { time: "6am", hour: 6, count: 0 },
      { time: "8am", hour: 8, count: 0 },
      { time: "10am", hour: 10, count: 0 },
      { time: "12pm", hour: 12, count: 0 },
      { time: "2pm", hour: 14, count: 0 },
      { time: "4pm", hour: 16, count: 0 },
      { time: "6pm", hour: 18, count: 0 },
      { time: "8pm", hour: 20, count: 0 },
    ];
    allAttendance.forEach((att) => {
      if (!att.checkIn) return;
      const hour = new Date(att.checkIn).getHours();
      const bucket = buckets.reduce((prev, curr) => (Math.abs(curr.hour - hour) < Math.abs(prev.hour - hour) ? curr : prev));
      if (bucket) bucket.count += 1;
    });
    const maxCount = Math.max(...buckets.map((b) => b.count), 0);
    return buckets.map((b) => ({ ...b, peak: maxCount > 0 && b.count === maxCount }));
  }, [allAttendance]);

  const kpis = [
    { key: "PRESENT" as const, count: presentCount, percent: presentPercentage },
    { key: "REMOTE" as const, count: wfhCount, percent: wfhPercentage },
    { key: "ON_LEAVE" as const, count: leaveCount, percent: leavePercentage },
    { key: "LATE" as const, count: lateCount, percent: latePercentage },
  ];

  const quickActions = [
    { href: "/attendance", label: "Attendance", hint: "Punch history", icon: Clock, tone: "bg-indigo-50 text-indigo-600" },
    { href: "/leaves", label: "Leaves", hint: pendingLeaves ? `${pendingLeaves} pending` : "Apply or review", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-600" },
    { href: "/payroll", label: "Payroll", hint: "Payslips", icon: Receipt, tone: "bg-sky-50 text-sky-600" },
    { href: "/expenses", label: "Expenses", hint: "Claims", icon: FileText, tone: "bg-amber-50 text-amber-600" },
    { href: "/chat", label: "Team chat", hint: "Messages", icon: MessageSquare, tone: "bg-violet-50 text-violet-600" },
    { href: "/overtime", label: "Overtime", hint: "Extra hours", icon: Layers, tone: "bg-rose-50 text-rose-600" },
    ...(canManage
      ? [
          { href: "/approvals", label: "Approvals", hint: pendingLeaves ? `${pendingLeaves} waiting` : "Inbox", icon: ShieldCheck, tone: "bg-teal-50 text-teal-700" },
          { href: "/employees", label: "People", hint: `${totalEmployees} staff`, icon: Users, tone: "bg-blue-50 text-blue-600" },
          { href: "/reports", label: "Reports", hint: "Exports", icon: BarChart3, tone: "bg-slate-100 text-slate-700" },
        ]
      : []),
    ...(isAdmin ? [{ href: "/onboarding", label: "Onboarding", hint: "New joiners", icon: UserPlus, tone: "bg-fuchsia-50 text-fuchsia-600" }] : []),
    { href: "/loans", label: "Loans", hint: "Advances", icon: Wallet, tone: "bg-lime-50 text-lime-700" },
  ];

  if (loading) {
    return (
      <div className="space-y-5 max-w-[1440px] mx-auto animate-pulse">
        <div className="h-44 rounded-3xl skeleton-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-3xl skeleton-shimmer" />
          ))}
        </div>
        <div className="h-80 rounded-3xl skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto pb-24 lg:pb-2">
      {loadError && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">{loadError}</div>
      )}

      {isPlanLocked && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Workspace is locked</p>
              <p className="text-xs text-amber-100">Enter your unlock code to turn on payroll, approvals, and reports.</p>
            </div>
          </div>
          <button onClick={() => setShowUnlockModal(true)} className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-amber-700">
            Enter unlock code
          </button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-sky-50 p-5 sm:p-7">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_280px] items-start">
          <div className="min-w-0 space-y-4">
            <p className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-2">
              <span>{formattedDate}</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="font-mono font-semibold text-indigo-700 bg-white/80 px-2 py-0.5 rounded-md border border-indigo-100">{formattedTime}</span>
            </p>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                {greetingFor(currentTime)}, {displayName}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5 max-w-xl">
                Attendance, leaves, payroll, and people — live for {user?.organization?.name || "your workspace"}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Users, value: totalEmployees, label: "People" },
                { icon: Building2, value: totalBranches, label: "Branches" },
                { icon: Layers, value: uniqueDepartments, label: "Departments" },
                { icon: Activity, value: `${completionPercent}%`, label: "In today" },
              ].map((chip) => (
                <div key={chip.label} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80">
                  <chip.icon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-900">{chip.value}</span>
                  <span className="text-[11px] text-slate-500">{chip.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className={`w-3.5 h-3.5 ${isWithinGeofence ? "text-emerald-500" : "text-amber-500"}`} />
                {todayStatus?.attendance?.checkInLocation || locationLabel || (currentLocation ? "Location ready" : "Punch from anywhere")}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCheckedIn ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {isCheckedIn ? "On shift" : hasCheckedOutToday ? "Done" : "Not in"}
              </span>
            </div>
            {!isCheckedIn ? (
              <button
                onClick={() => setPendingPunch("CHECK_IN")}
                disabled={isActionLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {hasCheckedOutToday ? "Already clocked out" : "Clock in"}
              </button>
            ) : (
              <button
                onClick={() => setPendingPunch("CHECK_OUT")}
                disabled={isActionLoading}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                Clock out
              </button>
            )}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Link href="/leaves" className="rounded-xl border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700 hover:border-indigo-300">
                Apply leave
              </Link>
              <Link href="/payroll" className="rounded-xl border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700 hover:border-indigo-300">
                Payslips
              </Link>
            </div>
          </div>
        </div>
      </section>

      {showDismissAlert && (isCheckedIn || hasCheckedOutToday) && (
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{isCheckedIn ? "Clock-in saved." : "Clock-out saved."}</span>{" "}
              {isCheckedIn
                ? `You punched in at ${todayCheckInTime || "today"}.`
                : `You punched out at ${todayCheckOutTime || "today"}. Hours are on your timesheet.`}
            </p>
          </div>
          <button onClick={() => setShowDismissAlert(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const meta = KPI_META[kpi.key];
          const Icon = meta.icon;
          const active = activeBreakdownTab === kpi.key;
          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveBreakdownTab(active ? null : kpi.key);
              }}
              className={`text-left p-4 rounded-2xl bg-white border transition shadow-sm hover:shadow-md ${active ? `ring-2 ${meta.ring}` : "border-slate-200"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${meta.iconBg}`}>
                  {kpi.key === "LATE" || kpi.key === "ON_LEAVE" ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {kpi.percent}%
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">{meta.label}</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900">{kpi.count}</span>
                {kpi.key === "PRESENT" && <span className="text-xs text-slate-400">/ {totalEmployees}</span>}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${kpi.percent}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{meta.hint}</p>
            </button>
          );
        })}
      </section>

      <TeamPunchBoard />

      <AnimatePresence>
        {activeBreakdownTab && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-slate-900">{KPI_META[activeBreakdownTab].label}</h2>
                <p className="text-xs text-slate-500">{filteredRoster.length} people in this list</p>
              </div>
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, code, department"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-400"
                />
              </div>
            </div>
            {filteredRoster.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No one matches this filter yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                {filteredRoster.map((person) => (
                  <div key={person.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{person.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {person.location || person.department}
                        {person.employeeCode ? ` · ${person.employeeCode}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-600 shrink-0">{person.checkInTime || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-900">Today&apos;s punch pattern</h2>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">Today</span>
            </div>
            <div className="h-48 sm:h-56 flex items-end gap-2 sm:gap-3 px-1">
              {hourlyData.map((item) => {
                const maxVal = Math.max(...hourlyData.map((d) => d.count), 4);
                const height = Math.max(item.count > 0 ? 14 : 6, Math.round((item.count / maxVal) * 100));
                return (
                  <div key={item.time} className="flex-1 h-full flex flex-col items-center justify-end group">
                    <span className="text-[10px] font-semibold text-slate-500 mb-1 opacity-0 group-hover:opacity-100">{item.count}</span>
                    <div
                      className={`w-full max-w-[40px] rounded-t-lg ${item.peak ? "bg-gradient-to-t from-indigo-700 to-violet-500" : "bg-indigo-400/80"}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-2">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Open a function
              </h3>
              <span className="text-[11px] text-slate-400">All workspace tools</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-indigo-300 hover:shadow-md transition"
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.tone}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <p className="mt-2.5 text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{action.label}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      {action.hint}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Shift completion</h3>
            <div className="flex items-center gap-5">
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="12" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10B981"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - completionPercent / 100)}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">{completionPercent}%</span>
                  <span className="text-[10px] text-slate-400">in</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-600">Completed</span><span className="font-bold">{completedCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Remote</span><span className="font-bold">{inProgressCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Not started</span><span className="font-bold">{notStartedCount}</span></div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Your day</h3>
            {[
              { icon: Clock, label: "Time now", value: formattedTime },
              { icon: CheckCircle2, label: "Punch in", value: todayCheckInTime || "-- : --" },
              { icon: Clock, label: "Hours", value: todayShiftHours },
              { icon: Building2, label: "Mode", value: todayStatus?.attendance?.isWorkFromHome ? "Work from home" : "Office" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="flex items-center gap-2 text-xs text-slate-600">
                  <row.icon className="w-4 h-4 text-indigo-500" />
                  {row.label}
                </span>
                <span className="text-xs font-semibold text-slate-900">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Recent punches</h3>
              <Link href="/attendance" className="text-xs font-semibold text-indigo-600">View all</Link>
            </div>
            <div className="space-y-2">
              {recentAttendance.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No punches yet.{" "}
                  <button type="button" onClick={() => setPendingPunch("CHECK_IN")} className="text-indigo-600 font-semibold">
                    Clock in
                  </button>
                </p>
              ) : (
                recentAttendance.map((rec, idx) => {
                  const out = Boolean(rec.checkOut);
                  const when = new Date(out ? rec.checkOut : rec.checkIn);
                  return (
                    <div key={rec.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{out ? "Clocked out" : "Clocked in"}</p>
                        <p className="text-[10px] text-slate-400">
                          {when.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${out ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>
                        {out ? "Done" : "Active"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 p-3 bg-white/95 border-t border-slate-200 backdrop-blur">
        {!isCheckedIn ? (
          <button
            onClick={() => setPendingPunch("CHECK_IN")}
            disabled={isActionLoading || hasCheckedOutToday}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Clock in
          </button>
        ) : (
          <button onClick={() => setPendingPunch("CHECK_OUT")} disabled={isActionLoading} className="w-full py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold">
            Clock out
          </button>
        )}
      </div>

      <PunchConfirmDialog
        action={pendingPunch}
        loading={isActionLoading}
        locationLabel={locationLabel}
        onCancel={() => setPendingPunch(null)}
        onConfirm={async () => {
          const ok = pendingPunch === "CHECK_OUT" ? await checkOut() : await checkIn();
          if (ok) setPendingPunch(null);
        }}
      />

      {showUnlockModal && (
        <UnlockPlanModal
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          onSuccess={() => {
            setShowUnlockModal(false);
            refreshUser();
          }}
        />
      )}
    </div>
  );
}
