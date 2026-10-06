"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Lock,
  UserPlus,
  BarChart3,
  Wallet,
  Sparkles,
  RefreshCw,
  Compass,
  ArrowUpRight,
  Shield,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import { attendanceApi, leavesApi, employeesApi, branchesApi, departmentsApi } from "@/lib/api";
import UnlockPlanModal from "@/components/auth/UnlockPlanModal";
import SetupChecklist from "@/components/onboarding/SetupChecklist";
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

interface QuickAction {
  href: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  tone: string;
  details: string[];
}

const KPI_META: Record<
  Exclude<RosterStatus, "ABSENT">,
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
    hint: "On site & clocked in",
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
    hint: "Clocked after grace time",
    color: "text-amber-700",
    ring: "ring-amber-500 border-amber-400 bg-amber-50/30",
    bar: "bg-amber-500",
    iconBg: "bg-amber-100/80 text-amber-700",
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    icon: Clock,
  },
};

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeContextBadge(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return { text: "Morning Velocity", icon: "☀️", color: "text-amber-400 bg-amber-950/40 border-amber-500/30" };
  if (hour < 17) return { text: "Afternoon Focus", icon: "🌤️", color: "text-sky-400 bg-sky-950/40 border-sky-500/30" };
  return { text: "Evening Operations", icon: "🌙", color: "text-indigo-400 bg-indigo-950/40 border-indigo-500/30" };
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
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function DashboardOverview() {
  const { user, role, refreshUser } = useAuth();
  const {
    todayStatus,
    checkIn,
    checkOut,
    isActionLoading,
    currentLocation,
    locationLabel,
    isWithinGeofence,
  } = useAttendance();

  const [summary, setSummary] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showDismissAlert, setShowDismissAlert] = useState(false);
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<Exclude<RosterStatus, "ABSENT"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [orgCounts, setOrgCounts] = useState<{ branches: number | null; departments: number | null }>({ branches: null, departments: null });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingPunch, setPendingPunch] = useState<PunchConfirmAction | null>(null);
  const [selectedQuickAction, setSelectedQuickAction] = useState<QuickAction | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPlanLocked = Boolean(user?.planLocked || user?.organization?.planLocked);
  const isAdmin = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN";
  const canManage = isAdmin || role === "MANAGER";

  const loadDashboardData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [summaryRes, historyRes, allAttendanceRes, leavesRes, employeesRes, branchesRes, departmentsRes] =
        await Promise.allSettled([
          attendanceApi.getSummary(),
          attendanceApi.getMyAttendance({ limit: 5, page: 1 }),
          attendanceApi.getAllAttendance({ page: 1, limit: 200 }),
          leavesApi.getAllLeaves(),
          employeesApi.list({ page: 1, limit: 200 }),
          branchesApi.list(),
          departmentsApi.list(),
        ]);

      // Real totals from the source lists. The login payload carries no branch
      // list and the employee page is capped at 200, so neither can be counted from them.
      setOrgCounts((current) => ({
        branches: branchesRes.status === "fulfilled" ? unwrapList(branchesRes.value).length : current.branches,
        departments: departmentsRes.status === "fulfilled" ? unwrapList(departmentsRes.value).length : current.departments,
      }));

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
        const empList = unwrapList(employeesRes.value);
        setAllEmployees(empList);
        setEmployeeTotal((employeesRes.value as any)?.total || empList.length);
      }
    } catch (err: any) {
      console.error("Dashboard data load error:", err);
      setLoadError("Could not load latest live metrics. Please refresh.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  // Build live Roster
  const roster: RosterPerson[] = useMemo(() => {
    if (!allEmployees.length) return [];

    const attendanceByEmpId = new Map<string, any>();
    allAttendance.forEach((att) => {
      if (isSameDay(att.date || att.checkIn)) {
        attendanceByEmpId.set(att.employeeId, att);
      }
    });

    const leaveByEmpId = new Map<string, any>();
    allLeaves.forEach((leave) => {
      if (leave.status === "APPROVED" && isSameDay(leave.startDate)) {
        leaveByEmpId.set(leave.employeeId, leave);
      }
    });

    return allEmployees.map((emp) => {
      const att = attendanceByEmpId.get(emp.id);
      const leave = leaveByEmpId.get(emp.id);

      let status: RosterStatus = "ABSENT";
      let checkInTime: string | undefined;

      if (att) {
        checkInTime = att.checkIn ? formatTime(att.checkIn) : undefined;
        if (att.status === "LATE") status = "LATE";
        else if (att.status === "WORK_FROM_HOME" || att.isWfh) status = "REMOTE";
        else status = "PRESENT";
      } else if (leave) {
        status = "ON_LEAVE";
      }

      return {
        id: emp.id,
        name: personName(emp),
        employeeCode: emp.employeeCode || emp.code,
        designation: emp.designation || "Staff",
        department: emp.department?.name || (typeof emp.department === "string" ? emp.department : "General"),
        checkInTime,
        location: att?.checkInLocation || att?.location || null,
        status,
      };
    });
  }, [allEmployees, allAttendance, allLeaves]);

  const countFrom = (keys: string[], fallback: number) => {
    if (!summary || typeof summary !== "object") return fallback;
    for (const key of keys) {
      const val = summary[key];
      if (typeof val === "number" && !Number.isNaN(val)) return val;
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
  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const totalBranches = orgCounts.branches ?? ((user?.organization as any)?.branches?.length || 1);
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
      const bucket = buckets.reduce((prev, curr) =>
        Math.abs(curr.hour - hour) < Math.abs(prev.hour - hour) ? curr : prev
      );
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

  const quickActions: QuickAction[] = [
    {
      href: "/attendance",
      label: "Attendance",
      hint: "Punch history",
      icon: Clock,
      tone: "bg-indigo-50 text-indigo-600 border border-indigo-100",
      details: [
        "View daily check-in and check-out records",
        "Review work hours and attendance history",
        "Track location and work-from-home punches",
      ],
    },
    {
      href: "/leaves",
      label: "Leaves",
      hint: pendingLeaves ? `${pendingLeaves} pending` : "Apply or review",
      icon: CalendarDays,
      tone: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      details: [
        "Apply for planned or emergency leave",
        "See leave balances and approval status",
        "Review the team leave calendar",
      ],
    },
    {
      href: "/payroll",
      label: "Payroll",
      hint: "Payslips",
      icon: Receipt,
      tone: "bg-sky-50 text-sky-600 border border-sky-100",
      details: [
        "View monthly salary and payslip records",
        "Review earnings, deductions, and net pay",
        "Download available payslips in PDF",
      ],
    },
    {
      href: "/expenses",
      label: "Expenses",
      hint: "Claims",
      icon: FileText,
      tone: "bg-amber-50 text-amber-600 border border-amber-100",
      details: [
        "Submit reimbursement claims with receipts",
        "Track pending, approved, and rejected claims",
        "Review expense history and payment status",
      ],
    },
    {
      href: "/chat",
      label: "Team Chat",
      hint: "Channels & DMs",
      icon: MessageSquare,
      tone: "bg-violet-50 text-violet-600 border border-violet-100",
      details: [
        "Direct messages with colleagues",
        "Dedicated department channels",
        "Live team notifications",
      ],
    },
    {
      href: "/overtime",
      label: "Overtime",
      hint: "Extra hours",
      icon: Layers,
      tone: "bg-rose-50 text-rose-600 border border-rose-100",
      details: [
        "Record extra working hours",
        "Submit overtime for approval",
        "Track approved overtime and comp-off balances",
      ],
    },
    ...(canManage
      ? [
          {
            href: "/approvals",
            label: "Approvals",
            hint: pendingLeaves ? `${pendingLeaves} waiting` : "HR inbox",
            icon: ShieldCheck,
            tone: "bg-teal-50 text-teal-700 border border-teal-100",
            details: [
              "Review pending leave and expense requests",
              "Approve, reject, or request corrections",
              "Keep an audited record of manager decisions",
            ],
          },
          {
            href: "/employees",
            label: "People Directory",
            hint: `${totalEmployees} staff`,
            icon: Users,
            tone: "bg-blue-50 text-blue-600 border border-blue-100",
            details: [
              "Full employee directory with search & filters",
              "Bulk import staff via Excel / CSV",
              "Manage roles, departments, shifts, and branches",
            ],
          },
          {
            href: "/reports",
            label: "Reports",
            hint: "PDF & CSV",
            icon: BarChart3,
            tone: "bg-slate-100 text-slate-800 border border-slate-200",
            details: [
              "Review attendance and workforce summaries",
              "Filter records by employee, branch, or date",
              "Export monthly muster rolls and daily attendance",
            ],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: "/onboarding",
            label: "Onboarding",
            hint: "New joiners",
            icon: UserPlus,
            tone: "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100",
            details: [
              "Track new-hire onboarding progress",
              "Collect joining documents and credentials",
              "Monitor offer, review, and account activation stages",
            ],
          },
        ]
      : []),
    {
      href: "/loans",
      label: "Salary Loans",
      hint: "EMI Advances",
      icon: Wallet,
      tone: "bg-lime-50 text-lime-700 border border-lime-100",
      details: [
        "Submit salary advance requests",
        "Track repayment schedules and EMI deductions",
        "Review approval status and balances",
      ],
    },
  ];

  const timeBadge = timeContextBadge(currentTime);

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto animate-pulse">
        <div className="h-56 rounded-3xl bg-slate-200/80" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-3xl bg-slate-200/80" />
          ))}
        </div>
        <div className="h-96 rounded-3xl bg-slate-200/80" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-6">
      {/* Load error banner if any */}
      {loadError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
          <span>{loadError}</span>
          <button
            onClick={handleManualRefresh}
            className="underline font-semibold hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Plan lock warning */}
      {isPlanLocked && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-xl shadow-orange-500/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Enterprise Workspace Requires Plan Unlock</p>
              <p className="text-xs text-white/90">
                Enter your subscription unlock code to activate payroll, multi-branch geofencing, and muster roll PDF exports.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowUnlockModal(true)}
            className="px-4 py-2.5 text-sm font-semibold rounded-2xl bg-white text-orange-700 shadow-md hover:bg-orange-50 transition"
          >
            Enter Unlock Code
          </button>
        </div>
      )}

      {isAdmin && (
        <SetupChecklist
          organizationId={user?.organizationId}
          isPlanLocked={isPlanLocked}
          onUnlock={() => setShowUnlockModal(true)}
        />
      )}

      {/* ======================================================== */}
      {/* 1. HERO COMMAND CENTER: Executive Workspace Overview    */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-2xl border border-slate-800">
        {/* Subtle decorative background glow patterns */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_330px] items-center">
          {/* Left Column: Greeting, Time, Workspace Statistics */}
          <div className="space-y-5 min-w-0">
            {/* Top pill bar */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-slate-200 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Workspace
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${timeBadge.color}`}>
                <span>{timeBadge.icon}</span>
                {timeBadge.text}
              </span>

              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="text-slate-400 text-xs">{formattedDate}</span>
              <span className="font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-700/50 text-xs">
                {formattedTime}
              </span>

              <button
                type="button"
                onClick={handleManualRefresh}
                title="Refresh metrics"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition ml-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
              </button>
            </div>

            {/* Title & Organization Subtitle */}
            <div>
              <h1 className="font-serif text-2xl sm:text-[28px] font-bold tracking-tight text-white flex items-center gap-3">
                {greetingFor(currentTime)}, {displayName}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
                Workforce operations, real-time presence, and team payroll — active for{" "}
                <span className="text-white font-semibold underline decoration-indigo-400 underline-offset-2">
                  {user?.organization?.name || "Your Workspace"}
                </span>
                .
              </p>
            </div>

            {/* Metric Snapshot Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {[
                { icon: Users, value: totalEmployees, label: "Total Staff", color: "text-indigo-400" },
                { icon: Building2, value: totalBranches, label: "Branches", color: "text-emerald-400" },
                { icon: Layers, value: orgCounts.departments ?? uniqueDepartments, label: "Departments", color: "text-amber-400" },
                { icon: Activity, value: `${completionPercent}%`, label: "Turnout Today", color: "text-sky-400" },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 hover:bg-white/[0.12] transition"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <chip.icon className={`w-4 h-4 ${chip.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-bold text-white leading-tight">{chip.value}</p>
                    <p className="text-xs text-slate-400 font-medium truncate">{chip.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Personal Attendance & Punch Action Widget */}
          <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <MapPin className={`w-4 h-4 ${isWithinGeofence ? "text-emerald-400" : "text-amber-400"}`} />
                <span className="truncate max-w-[180px]">
                  {todayStatus?.attendance?.checkInLocation || locationLabel || (currentLocation ? "GPS Verified" : "Anywhere Punch")}
                </span>
              </span>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isCheckedIn
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : hasCheckedOutToday
                    ? "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {isCheckedIn ? "On Shift" : hasCheckedOutToday ? "Shift Ended" : "Not In"}
              </span>
            </div>

            {/* Active shift hours tracker */}
            <div className="p-3 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Shift Elapsed</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">{todayShiftHours}</p>
              </div>
              {todayCheckInTime && (
                <div className="text-right">
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Clocked In</p>
                  <p className="text-xs font-semibold text-slate-200 font-mono mt-0.5">{todayCheckInTime}</p>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            {!isCheckedIn ? (
              <button
                type="button"
                onClick={() => setPendingPunch("CHECK_IN")}
                disabled={isActionLoading || hasCheckedOutToday}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {hasCheckedOutToday ? "Shift Already Completed" : "Clock In to Shift"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPendingPunch("CHECK_OUT")}
                disabled={isActionLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-semibold text-sm uppercase tracking-wider shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Clock Out of Shift
              </button>
            )}

            {/* Quick Staff Fast-Links */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <Link
                href="/leaves"
                className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-center font-bold text-slate-200 transition"
              >
                Apply Leave {pendingLeaves > 0 && `(${pendingLeaves})`}
              </Link>
              <Link
                href="/payroll"
                className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-center font-bold text-slate-200 transition"
              >
                My Payslips
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation banner after punch */}
      {showDismissAlert && (isCheckedIn || hasCheckedOutToday) && (
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-800">
              <span className="font-bold text-emerald-950">
                {isCheckedIn ? "Clock-in verified." : "Clock-out registered."}
              </span>{" "}
              {isCheckedIn
                ? `You successfully punched in at ${todayCheckInTime || "just now"}.`
                : `You clocked out at ${todayCheckOutTime || "just now"}. Hours recorded to timesheet.`}
            </p>
          </div>
          <button
            onClick={() => setShowDismissAlert(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-100"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. EXECUTIVE METRIC KPI CARDS (4 Interactive Tiles)     */}
      {/* ======================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
              className={`text-left p-5 rounded-3xl bg-white border transition-all duration-200 shadow-sm hover:shadow-lg relative overflow-hidden group ${
                active ? `ring-2 ${meta.ring} shadow-md` : "border-slate-200/90 hover:border-slate-300"
              }`}
            >
              {/* Subtle background gradient on active */}
              {active && (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} pointer-events-none`}
                />
              )}

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${meta.iconBg} shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${meta.iconBg}`}
                  >
                    {kpi.key === "LATE" || kpi.key === "ON_LEAVE" ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5" />
                    )}
                    {kpi.percent}%
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{meta.label}</p>

                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 tracking-tight">{kpi.count}</span>
                  {kpi.key === "PRESENT" && (
                    <span className="text-xs font-medium text-slate-400">/ {totalEmployees} total</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
                    style={{ width: `${Math.min(100, Math.max(4, Number(kpi.percent)))}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                  <span>{meta.hint}</span>
                  <span className={`font-semibold ${active ? "text-indigo-600" : "group-hover:text-slate-600"}`}>
                    {active ? "Hide List ▴" : "View Staff ▾"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* ======================================================== */}
      {/* 3. EXPANDING LIVE STAFF BREAKDOWN (When KPI is clicked)  */}
      {/* ======================================================== */}
      <AnimatePresence>
        {activeBreakdownTab && (
          <motion.section
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-md overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    {KPI_META[activeBreakdownTab].label} Staff Roster
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filteredRoster.length} workforce members matching this status
                </p>
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name, code, dept..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {filteredRoster.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400 italic">
                No staff members currently match this filter.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredRoster.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 transition"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {person.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{person.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {person.designation} • {person.department}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-700 block">
                        {person.checkInTime || "—"}
                      </span>
                      {person.employeeCode && (
                        <span className="text-xs text-slate-400 font-mono">{person.employeeCode}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 4. TEAM PUNCH BOARD (Live Attendance Strip)              */}
      {/* ======================================================== */}
      <TeamPunchBoard />

      {/* ======================================================== */}
      {/* 5. WORKFORCE ANALYTICS & QUICK LAUNCH TOOLS              */}
      {/* ======================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Hourly Attendance Rhythm & Functions */}
        <div className="lg:col-span-8 space-y-5">
          {/* Hourly Punch Rhythm Bar Visualizer */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Today&apos;s Clock-In Rush Pattern
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hourly distribution of employee check-ins across the workforce
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-3 py-1 rounded-xl">
                Live Distribution
              </span>
            </div>

            <div className="h-44 sm:h-52 flex items-end gap-2 sm:gap-4 px-2">
              {hourlyData.map((item) => {
                const maxVal = Math.max(...hourlyData.map((d) => d.count), 4);
                const height = Math.max(item.count > 0 ? 14 : 6, Math.round((item.count / maxVal) * 100));

                return (
                  <div key={item.time} className="flex-1 h-full flex flex-col items-center justify-end group">
                    <span className="text-xs font-bold text-indigo-600 mb-1 opacity-0 group-hover:opacity-100 transition">
                      {item.count}
                    </span>
                    <div
                      className={`w-full max-w-[44px] rounded-t-xl transition-all duration-300 ${
                        item.peak
                          ? "bg-gradient-to-t from-indigo-700 to-indigo-500 shadow-md shadow-indigo-500/20"
                          : "bg-slate-200 hover:bg-indigo-300"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-slate-500 font-semibold mt-2.5">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Launchpad ("Open a Function") */}
          <div>
            <div className="flex items-center justify-between px-1 mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  Workspace Launchpad
                </h3>
                <p className="text-xs text-slate-400">Direct access to daily operational tools</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.href}
                    type="button"
                    onClick={() => setSelectedQuickAction(action)}
                    className="group rounded-3xl bg-white border border-slate-200/90 p-4 text-left hover:border-indigo-400 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-9 h-9 rounded-2xl flex items-center justify-center ${action.tone}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition">
                      {action.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{action.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Shift Completion Donut & Summary */}
        <div className="lg:col-span-4 space-y-5">
          {/* Shift completion gauge */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Workforce Shift Coverage
            </h3>

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
                  <span className="text-2xl font-bold text-slate-900">{completionPercent}%</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Punched In</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-xs">
                <div className="flex justify-between items-center p-1.5 rounded-xl bg-slate-50">
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Present On-Site
                  </span>
                  <span className="font-bold text-slate-900">{completedCount}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-xl bg-slate-50">
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    Remote / WFH
                  </span>
                  <span className="font-bold text-slate-900">{inProgressCount}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-xl bg-slate-50">
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    Not Clocked Yet
                  </span>
                  <span className="font-bold text-slate-900">{notStartedCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Manager / Admin Live Summary Card */}
          {canManage && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-lg space-y-3 border border-indigo-800">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Management Clearance
                </span>
                <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded-md">Realtime</span>
              </div>

              <div>
                <p className="text-sm font-bold text-white">Pending Requests</p>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {pendingLeaves > 0
                    ? `${pendingLeaves} leave applications await manager review.`
                    : "All employee leave and expense requests are currently cleared."}
                </p>
              </div>

              <Link
                href="/approvals"
                className="inline-flex items-center gap-2 w-full justify-center py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-indigo-50 transition shadow-sm"
              >
                Open Clearance Inbox
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. QUICK ACTION PREVIEW MODAL                            */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedQuickAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
            >
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white relative">
                <button
                  type="button"
                  onClick={() => setSelectedQuickAction(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-2">
                  <selectedQuickAction.icon className="w-5 h-5 text-indigo-300" />
                </div>
                <h3 className="text-base font-semibold">{selectedQuickAction.label}</h3>
                <p className="text-xs text-indigo-200 mt-0.5">{selectedQuickAction.hint}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Features Included</p>
                  <div className="space-y-2">
                    {selectedQuickAction.details.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedQuickAction(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                  <Link
                    href={selectedQuickAction.href}
                    onClick={() => setSelectedQuickAction(null)}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold text-center transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                  >
                    Open Page
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 7. PUNCH CONFIRM DIALOG & UNLOCK PLAN MODAL              */}
      {/* ======================================================== */}
      <PunchConfirmDialog
        action={pendingPunch}
        loading={isActionLoading}
        locationLabel={locationLabel}
        onCancel={() => setPendingPunch(null)}
        onConfirm={async () => {
          const ok = pendingPunch === "CHECK_OUT" ? await checkOut() : await checkIn();
          if (ok) {
            setPendingPunch(null);
            setShowDismissAlert(true);
            loadDashboardData();
          }
        }}
      />

      {showUnlockModal && (
        <UnlockPlanModal
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          onSuccess={() => {
            setShowUnlockModal(false);
            refreshUser();
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
