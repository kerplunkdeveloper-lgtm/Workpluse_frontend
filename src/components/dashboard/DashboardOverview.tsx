"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Award,
  ArrowRight,
  Building2,
  CalendarDays,
  Cake,
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
  BellRing,
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
import { attendanceApi, leavesApi, employeesApi, branchesApi, departmentsApi, offboardingApi } from "@/lib/api";
import UnlockPlanModal from "@/components/auth/UnlockPlanModal";
import CompanyLogo from "@/components/ui/CompanyLogo";
import PunchConfirmDialog, { PunchConfirmAction } from "@/components/attendance/PunchConfirmDialog";
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
  const [noticeSummary, setNoticeSummary] = useState<any>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Render the shell from the small, high-value requests first.
      const [summaryRes, historyRes] = await Promise.allSettled([
        attendanceApi.getSummary(),
        attendanceApi.getMyAttendance({ limit: 5, page: 1 }),
      ]);
      if (summaryRes.status === "fulfilled" && summaryRes.value) {
        setSummary(unwrapItem(summaryRes.value) || summaryRes.value);
      }
      if (historyRes.status === "fulfilled" && historyRes.value) {
        setRecentAttendance(unwrapList(historyRes.value).slice(0, 5));
      }

      // Do not block first paint on large workforce lists. These hydrate charts,
      // rosters, and people moments after the dashboard is already usable.
      setLoading(false);
      const [allAttendanceRes, leavesRes, employeesRes, branchesRes, departmentsRes] = await Promise.allSettled([
        attendanceApi.getAllAttendance({ page: 1, limit: 200 }),
        leavesApi.getAllLeaves(),
        employeesApi.list({ page: 1, limit: 200 }),
        branchesApi.list(),
        departmentsApi.list(),
      ]);

      setOrgCounts((current) => ({
        branches: branchesRes.status === "fulfilled" ? unwrapList(branchesRes.value).length : current.branches,
        departments: departmentsRes.status === "fulfilled" ? unwrapList(departmentsRes.value).length : current.departments,
      }));
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
      if (canManage) {
        try {
          const noticeRes = await offboardingApi.noticeSummary();
          setNoticeSummary(noticeRes?.data || null);
        } catch {
          // The notice-period card is optional; the rest of the dashboard still renders.
        }
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

  const genderAnalytics = useMemo(() => {
    const counts = { male: 0, female: 0, unspecified: 0 };
    allEmployees.forEach((employee: any) => {
      const gender = String(employee.gender || employee.profile?.gender || "").trim().toLowerCase();
      if (gender === "male" || gender === "m") counts.male += 1;
      else if (gender === "female" || gender === "f") counts.female += 1;
      else counts.unspecified += 1;
    });
    const total = counts.male + counts.female + counts.unspecified;
    return {
      ...counts,
      total,
      malePercent: total ? Math.round((counts.male / total) * 100) : 0,
      femalePercent: total ? Math.round((counts.female / total) * 100) : 0,
      unspecifiedPercent: total ? Math.round((counts.unspecified / total) * 100) : 0,
    };
  }, [allEmployees]);

  const hasCheckedInToday = Boolean(todayStatus?.hasCheckedIn || todayStatus?.attendance?.checkIn);
  const hasCheckedOutToday = Boolean(todayStatus?.hasCheckedOut || todayStatus?.attendance?.checkOut);
  const isCheckedIn = hasCheckedInToday && !hasCheckedOutToday;
  const todayCheckInTime = todayStatus?.attendance?.checkIn ? formatTime(todayStatus.attendance.checkIn) : null;
  const todayCheckOutTime = todayStatus?.attendance?.checkOut ? formatTime(todayStatus.attendance.checkOut) : null;
  const todayWorkingMinutes = (todayStatus?.attendance as any)?.workingMinutes ?? todayStatus?.attendance?.workMinutes;
  const todayShiftHours = todayWorkingMinutes !== null && todayWorkingMinutes !== undefined
    ? formatDurationMinutes(Number(todayWorkingMinutes))
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

  const absentCount = Math.max(0, totalEmployees - presentCount - wfhCount - leaveCount - lateCount);
  const chartTotal = Math.max(1, presentCount + wfhCount + leaveCount + lateCount + absentCount);
  const pieStops = (() => {
    const colors = ["#10b981", "#8b5cf6", "#38bdf8", "#f59e0b", "#cbd5e1"];
    const values = [presentCount, wfhCount, leaveCount, lateCount, absentCount];
    let cursor = 0;
    return values.map((value, index) => {
      const start = cursor;
      cursor += (value / chartTotal) * 360;
      return `${colors[index]} ${start}deg ${cursor}deg`;
    }).join(", ");
  })();

  const trendPoints = hourlyData.map((item, index) => {
    const max = Math.max(...hourlyData.map((entry) => entry.count), 1);
    const x = (index / Math.max(hourlyData.length - 1, 1)) * 560 + 20;
    const y = 142 - (item.count / max) * 106;
    return `${x},${y}`;
  }).join(" ");

  const peopleMoments = useMemo(() => {
    const year = currentTime.getFullYear();
    const now = new Date(year, currentTime.getMonth(), currentTime.getDate());
    const getNextDate = (value: string | Date | undefined) => {
      if (!value) return null;
      const source = new Date(value);
      if (Number.isNaN(source.getTime())) return null;
      let date = new Date(year, source.getMonth(), source.getDate());
      if (date < now) date = new Date(year + 1, source.getMonth(), source.getDate());
      return date;
    };
    const moments: Array<{ id: string; name: string; type: "Birthday" | "Work anniversary"; date: Date; month: string; day: number }> = [];
    allEmployees.forEach((employee: any, index) => {
      const name = personName(employee);
      const birthday = getNextDate(employee.dateOfBirth || employee.dob);
      const joining = getNextDate(employee.dateOfJoining || employee.joiningDate || employee.hireDate);
      if (birthday) moments.push({ id: `${employee.id || index}-birthday`, name, type: "Birthday", date: birthday, month: birthday.toLocaleDateString("en-IN", { month: "long" }), day: birthday.getDate() });
      if (joining) moments.push({ id: `${employee.id || index}-anniversary`, name, type: "Work anniversary", date: joining, month: joining.toLocaleDateString("en-IN", { month: "long" }), day: joining.getDate() });
    });
    return moments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [allEmployees, currentTime]);

  const momentMonths = useMemo(() => Array.from(new Set(peopleMoments.map((moment) => moment.month))), [peopleMoments]);
  const nextPeopleMoments = peopleMoments.slice(0, 6);
  const canSeePeopleNotifications = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const tomorrowBirthdays = peopleMoments.filter((moment) => {
    if (moment.type !== "Birthday") return false;
    const today = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    const daysUntil = Math.round((moment.date.getTime() - today.getTime()) / 86400000);
    return daysUntil === 1;
  });

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
                <span className="inline-flex translate-y-[3px] items-center gap-2 rounded-full bg-white/10 py-0.5 pl-0.5 pr-3 ring-1 ring-white/15">
                  <CompanyLogo name={user?.organization?.name || "Workspace"} logoUrl={user?.organization?.logoUrl} size="xs" className="!rounded-full" />
                  <span className="font-semibold text-white">{user?.organization?.name || "Your Workspace"}</span>
                </span>
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
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 flex-1 items-center gap-1.5 font-semibold text-slate-200">
                <MapPin className={`w-4 h-4 ${isWithinGeofence ? "text-emerald-400" : "text-amber-400"}`} />
                <span className="min-w-0 truncate">
                  {todayStatus?.attendance?.checkInLocation || locationLabel || (currentLocation ? "GPS Verified" : "Anywhere Punch")}
                </span>
              </span>

              <span
                className={`flex min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-2xl px-3 py-2 text-[11px] font-bold uppercase leading-none tracking-wider ${
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
              {todayCheckInTime && <div className="grid grid-cols-2 gap-4 text-right">
                <div><p className="text-xs uppercase font-bold tracking-wider text-slate-400">Clocked In</p><p className="text-xs font-semibold text-slate-200 font-mono mt-0.5">{todayCheckInTime}</p></div>
                {todayCheckOutTime && <div><p className="text-xs uppercase font-bold tracking-wider text-slate-400">Clocked Out</p><p className="text-xs font-semibold text-slate-200 font-mono mt-0.5">{todayCheckOutTime}</p></div>}
              </div>}
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

      <AnimatePresence>
        {activeBreakdownTab && <motion.section
          initial={{ opacity: 0, height: 0, y: -8 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -8 }}
          className="overflow-hidden rounded-3xl border border-indigo-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(79,70,229,0.5)] sm:p-6"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Selected workforce view</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{KPI_META[activeBreakdownTab].label} staff</h2><p className="mt-1 text-xs text-slate-500">{filteredRoster.length} people match this status.</p></div>
            <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search staff" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 focus:bg-white" /></div>
          </div>
          {filteredRoster.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">No staff members match this status.</p> : <div className="mt-4 grid max-h-80 grid-cols-1 gap-2.5 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">{filteredRoster.map((person) => <div key={person.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700">{person.name.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{person.name}</p><p className="truncate text-xs text-slate-500">{person.designation} · {person.department}</p></div></div><div className="shrink-0 text-right"><p className="font-mono text-xs font-bold text-slate-700">{person.checkInTime || "Not in"}</p>{person.employeeCode && <p className="font-mono text-[10px] text-slate-400">{person.employeeCode}</p>}</div></div>)}</div>}
        </motion.section>}
      </AnimatePresence>

      <section className="grid gap-4 xl:grid-cols-[0.78fr_1.42fr]" aria-label="Workforce analytics">
        <article className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Today at a glance</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Attendance mix</h2></div>
            <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">LIVE</span>
          </div>
          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${pieStops})` }}>
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-inner"><span className="text-2xl font-bold tabular-nums text-slate-950">{completionPercent}%</span><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">turnout</span></div>
            </div>
            <div className="w-full min-w-0 flex-1 space-y-2.5 sm:w-auto">
              {[{ label: "Present", value: presentCount, color: "bg-emerald-500" }, { label: "Remote", value: wfhCount, color: "bg-violet-500" }, { label: "On leave", value: leaveCount, color: "bg-sky-400" }, { label: "Late", value: lateCount, color: "bg-amber-400" }, { label: "Not started", value: absentCount, color: "bg-slate-300" }].map((item) => <div key={item.label} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-slate-600"><span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />{item.label}</span><span className="font-bold tabular-nums text-slate-900">{item.value}</span></div>)}
            </div>
          </div>
        </article>

        <article className="min-w-0 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Punch activity</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">When your team clocks in</h2></div><Link href="/reports" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">Full reports <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
          <div className="mt-5 overflow-x-auto rounded-2xl bg-slate-50/80 p-2 sm:p-3"><svg viewBox="0 0 600 180" role="img" aria-label="Punch activity by time of day" className="h-44 w-full min-w-[520px]"><defs><linearGradient id="attendance-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity=".25" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>{[35, 70, 105, 140].map((y) => <line key={y} x1="20" x2="580" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 5" />)}<polyline points={`20,142 ${trendPoints} 580,142`} fill="url(#attendance-area)" stroke="none" /><polyline points={trendPoints} fill="none" stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />{hourlyData.map((item, index) => { const max = Math.max(...hourlyData.map((entry) => entry.count), 1); const x = (index / Math.max(hourlyData.length - 1, 1)) * 560 + 20; const y = 142 - (item.count / max) * 106; return <circle key={item.time} cx={x} cy={y} r={item.peak ? 5 : 3.5} fill={item.peak ? "#10b981" : "#4f46e5"} stroke="white" strokeWidth="2" />; })}</svg><div className="flex min-w-[520px] justify-between px-2 text-[10px] font-semibold text-slate-400">{hourlyData.map((item) => <span key={item.time}>{item.time}</span>)}</div></div>
          <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-semibold text-emerald-700">Peak window</p><p className="mt-1 text-sm font-bold text-emerald-900">{hourlyData.find((item) => item.peak)?.time || "—"}</p></div><div className="rounded-xl bg-indigo-50 p-3"><p className="text-[10px] font-semibold text-indigo-700">Total punches</p><p className="mt-1 text-sm font-bold text-indigo-900">{allAttendance.length}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] font-semibold text-amber-700">Pending leave</p><p className="mt-1 text-sm font-bold text-amber-900">{pendingLeaves}</p></div></div>
        </article>

        <article className="min-w-0 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)] sm:col-span-2 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">People analytics</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Team gender distribution</h2></div>
            <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">{genderAnalytics.total} PEOPLE</span>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
            <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(#6366f1 0 ${genderAnalytics.malePercent}%, #ec4899 ${genderAnalytics.malePercent}% ${genderAnalytics.malePercent + genderAnalytics.femalePercent}%, #cbd5e1 ${genderAnalytics.malePercent + genderAnalytics.femalePercent}% 100%)` }}>
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-inner"><span className="text-2xl font-bold tabular-nums text-slate-950">{genderAnalytics.malePercent + genderAnalytics.femalePercent}%</span><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">specified</span></div>
            </div>
            <div className="space-y-4">
              {[{ label: "Male", value: genderAnalytics.male, percent: genderAnalytics.malePercent, color: "bg-indigo-500", track: "bg-indigo-100" }, { label: "Female", value: genderAnalytics.female, percent: genderAnalytics.femalePercent, color: "bg-pink-500", track: "bg-pink-100" }, { label: "Not specified", value: genderAnalytics.unspecified, percent: genderAnalytics.unspecifiedPercent, color: "bg-slate-400", track: "bg-slate-100" }].map((item) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 font-medium text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />{item.label}</span><span className="font-bold tabular-nums text-slate-900">{item.value} <span className="font-medium text-slate-400">({item.percent}%)</span></span></div><div className={`h-2 overflow-hidden rounded-full ${item.track}`}><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} /></div></div>)}
              <p className="pt-1 text-xs leading-5 text-slate-400">Based on employee profile data. Missing values remain visible as not specified.</p>
            </div>
          </div>
        </article>

        {canManage && noticeSummary && (
          <article className="min-w-0 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)] sm:col-span-2 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-600">Exits</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Employees in notice period</h2>
              </div>
              <Link href="/offboarding" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                Open offboarding <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-[10px] font-semibold text-rose-700">Serving notice</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-rose-900">{noticeSummary.inNoticeCount}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-[10px] font-semibold text-amber-700">Leaving in 7 days</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-900">{noticeSummary.endingWithin7Days}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold text-slate-600">Waiting for HR</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{noticeSummary.awaitingHrReview}</p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3">
                <p className="text-[10px] font-semibold text-indigo-700">Waiting for admin</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-900">{noticeSummary.awaitingAdminApproval}</p>
              </div>
            </div>
            {noticeSummary.employees?.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100">
                {noticeSummary.employees.slice(0, 5).map((row: any) => (
                  <li key={row.employeeId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate font-medium text-slate-800">
                      {row.name} <span className="font-mono text-xs text-indigo-700">{row.employeeCode}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">
                      {row.lastWorkingDate
                        ? row.daysLeft < 0
                          ? `${-row.daysLeft}d past LWD`
                          : row.daysLeft === 0
                            ? "Leaves today"
                            : `${row.daysLeft}d left · LWD ${row.lastWorkingDate}`
                        : "LWD not set"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-slate-400">No one is serving notice right now.</p>
            )}
          </article>
        )}
      </section>

 
      <AnimatePresence>
        {activeBreakdownTab && (
          <motion.section
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            className="hidden rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-md overflow-hidden"
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

  
      <section className="grid grid-cols-1 gap-5">
        {/* Left Column (8 cols): Hourly Attendance Rhythm & Functions */}
        <div className="space-y-5">
          {/* Premium hourly punch rhythm */}
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)]">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-100/50 blur-3xl" />
            <div className="relative border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><Activity className="h-5 w-5" /></span>
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Live workforce pulse</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Clock-in rhythm</h3><p className="mt-1 text-sm text-slate-500">When your team starts the workday today.</p></div>
                </div>
                <div className="flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live distribution</div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md"><div className="rounded-2xl bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total punches</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{allAttendance.length}</p></div><div className="rounded-2xl bg-indigo-50 px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Peak hour</p><p className="mt-1 text-lg font-bold text-indigo-900">{hourlyData.find((item) => item.peak)?.time || "No peak"}</p></div><div className="rounded-2xl bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Coverage</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{completionPercent}%</p></div></div>
            </div>
            <div className="relative p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-x-5 top-8 bottom-12 flex flex-col justify-between sm:inset-x-6"><span className="border-t border-dashed border-slate-100" /><span className="border-t border-dashed border-slate-100" /><span className="border-t border-dashed border-slate-100" /><span className="border-t border-dashed border-slate-100" /></div>
              <div className="relative flex h-56 items-end gap-2 sm:h-64 sm:gap-4">
                {hourlyData.map((item) => {
                  const maxVal = Math.max(...hourlyData.map((d) => d.count), 4);
                  const height = Math.max(item.count > 0 ? 12 : 5, Math.round((item.count / maxVal) * 100));
                  return <div key={item.time} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"><div className="mb-2 flex h-5 items-end"><span className={`text-[11px] font-bold tabular-nums transition ${item.peak ? "text-indigo-600" : "text-slate-400 opacity-0 group-hover:opacity-100"}`}>{item.count}</span></div><div className={`relative w-full max-w-[52px] rounded-t-2xl transition-all duration-500 group-hover:-translate-y-1 ${item.peak ? "bg-indigo-600 shadow-[0_12px_24px_-10px_rgba(79,70,229,0.8)]" : "bg-slate-200 group-hover:bg-indigo-200"}`} style={{ height: `${height}%` }}><span className={`absolute inset-x-1 top-1 h-1 rounded-full ${item.peak ? "bg-white/35" : "bg-white/70"}`} /></div><span className={`mt-3 text-[11px] font-semibold ${item.peak ? "text-indigo-700" : "text-slate-500"}`}>{item.time}</span></div>;
                })}
              </div>
            </div>
          </div>

          {/* People moments: birthdays and work anniversaries */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-pink-50 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600"><BellRing className="h-3.5 w-3.5" /> People moments</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Celebrate your team</h3>
                  <p className="mt-1 text-sm text-slate-500">Upcoming birthdays and work anniversaries, organised month by month.</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-3 py-2 text-right shadow-sm ring-1 ring-slate-200/70"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next 12 months</p><p className="mt-0.5 text-lg font-bold text-slate-900">{peopleMoments.length} moments</p></div>
              </div>
              {canSeePeopleNotifications && tomorrowBirthdays.length > 0 && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-pink-200 bg-pink-50 p-3.5 text-pink-950"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500 text-white"><BellRing className="h-4 w-4" /></div><div className="min-w-0"><p className="text-sm font-bold">Birthday reminder for tomorrow</p><p className="mt-0.5 text-xs leading-5 text-pink-800">{tomorrowBirthdays.map((moment) => moment.name).join(", ")} {tomorrowBirthdays.length === 1 ? "has" : "have"} a birthday tomorrow. This reminder is visible to HR and admins only.</p></div></div>}
            </div>
            {nextPeopleMoments.length > 0 ? <div className="p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {nextPeopleMoments.map((moment) => <div key={moment.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${moment.type === "Birthday" ? "bg-pink-100 text-pink-600" : "bg-indigo-100 text-indigo-600"}`}>{moment.type === "Birthday" ? <Cake className="h-5 w-5" /> : <Award className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{moment.name}</p><p className="text-xs text-slate-500">{moment.type} · {moment.month} {moment.day}</p></div></div>)}
              </div>
              {momentMonths.length > 0 && <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{momentMonths.slice(0, 6).map((month) => <span key={month} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{month} · {peopleMoments.filter((moment) => moment.month === month).length}</span>)}</div>}
            </div> : <div className="p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Cake className="h-6 w-6" /></div><p className="mt-3 text-sm font-semibold text-slate-700">No upcoming people moments yet</p><p className="mt-1 text-xs text-slate-400">Add date of birth or date of joining to employee profiles to see notifications here.</p></div>}
          </section>
        </div>

        {/* Right Column (4 cols): Shift Completion Donut & Summary */}
        <div className="grid gap-5 md:grid-cols-2">
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
      {/* 7. PUNCH CONFIRM DIALOG & UNLOCK PLAN MODAL              */}
      {/* ======================================================== */}
      <PunchConfirmDialog
        action={pendingPunch}
        loading={isActionLoading}
        locationLabel={locationLabel}
        onCancel={() => setPendingPunch(null)}
        onConfirm={async (options) => {
          const ok = pendingPunch === "CHECK_OUT" ? await checkOut() : await checkIn(options);
          if (ok) {
            setPendingPunch(null);
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
