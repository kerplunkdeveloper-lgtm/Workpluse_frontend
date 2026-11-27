"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { LeaveRequest, LeaveBalance, LeaveType } from "@/types";
import { leavesApi, employeesApi, branchesApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate, unwrapList } from "@/lib/utils";
import { CalendarDays, Plus, AlertCircle, Loader2, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock3, XCircle, Users, WalletCards, RefreshCw, Filter, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/clientLogger";
import { motion } from "framer-motion";
import DatePicker from "@/components/ui/DatePicker";
import PermissionRequestsPanel from "./PermissionRequestsPanel";
import CompanyLeavePanel from "./CompanyLeavePanel";
import WorkFromHomePanel from "./WorkFromHomePanel";
import ShootRequestsPanel from "./ShootRequestsPanel";
import ShootSettlementPanel from "./ShootSettlementPanel";
import { confirmDialog } from "@/components/ui/confirmDialog";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import AuthenticatedImage from "@/components/ui/AuthenticatedImage";

const employeeDisplayName = (employee?: LeaveRequest["employee"]) =>
  `${employee?.firstName || "Employee"} ${employee?.lastName || ""}`.trim();

const employeeInitials = (employee?: LeaveRequest["employee"]) =>
  employeeDisplayName(employee).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function EmployeeAvatar({ employee, size = "sm" }: { employee?: LeaveRequest["employee"]; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-12 w-12 rounded-2xl text-sm" : "h-5 w-5 rounded-md text-[8px]";
  const fallback = <span className={`${sizeClass} inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white ring-1 ring-indigo-200`} aria-hidden="true">{employeeInitials(employee)}</span>;
  if (!employee?.avatarUrl) return fallback;

  return (
    <span className={`relative inline-flex shrink-0 ${sizeClass}`}>
      <span className="absolute inset-0">{fallback}</span>
      <AuthenticatedImage
        src={employee.avatarUrl}
        alt={employeeDisplayName(employee)}
        className={`${sizeClass} relative shrink-0 object-cover ring-1 ring-white`}
      />
    </span>
  );
}

const parseDateOnly = (value: string) => {
  const [year, month, day] = String(value || "").slice(0, 10).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day);
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const requestCoversDate = (request: LeaveRequest, date: Date) => {
  const start = parseDateOnly(request.startDate);
  const end = parseDateOnly(request.endDate);
  if (!start || !end) return false;
  return date >= start && date <= end;
};

const statusTone = (status: LeaveRequest["status"]) => {
  if (status === "APPROVED") return { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Approved", icon: CheckCircle2 };
  if (status === "REJECTED") return { dot: "bg-rose-400", badge: "bg-rose-50 text-rose-700 border-rose-200", label: "Rejected", icon: XCircle };
  return { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending", icon: Clock3 };
};

const isPaidLeaveRequest = (request: LeaveRequest) => request.leaveType?.isPaid !== false;

const balanceRemainingForType = (row: any, type: LeaveType) => {
  const code = String(type.code || "").toUpperCase();
  return Number(row?.remainingByLeaveType?.[code] ?? row?.[`${code}RemainingDays`] ?? 0);
};

export default function LeavesView() {
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"MY_LEAVES" | "PERMISSIONS" | "COMPANY_LEAVE" | "WORK_FROM_HOME" | "SHOOT_REQUESTS" | "SHOOT_SETTLEMENT" | "APPROVALS">("MY_LEAVES");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [organizationEmployees, setOrganizationEmployees] = useState<any[]>([]);
  const [organizationBranches, setOrganizationBranches] = useState<any[]>([]);
  const [teamLeaveBalances, setTeamLeaveBalances] = useState<any[]>([]);
  const [selectedBalanceEmployeeId, setSelectedBalanceEmployeeId] = useState("");
  const [balanceEmployeeSearch, setBalanceEmployeeSearch] = useState("");
  const [balanceBranchFilter, setBalanceBranchFilter] = useState("ALL");
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState<any>(null);
  const [teamPaidLeaveRemaining, setTeamPaidLeaveRemaining] = useState<Record<string, number | null>>({});
  const [loadingEmployeeBalance, setLoadingEmployeeBalance] = useState(false);
  const [loadingTeamBalances, setLoadingTeamBalances] = useState(false);
  const [balanceRefresh, setBalanceRefresh] = useState(0);
  const [departmentConflict, setDepartmentConflict] = useState<any>(null);
  const [myDateChanges, setMyDateChanges] = useState<any[]>([]);
  const [dateChanges, setDateChanges] = useState<any[]>([]);
  const [dateChangeRequest, setDateChangeRequest] = useState<LeaveRequest | null>(null);
  const [dateChangeStart, setDateChangeStart] = useState("");
  const [dateChangeEnd, setDateChangeEnd] = useState("");
  const [dateChangeReason, setDateChangeReason] = useState("");
  const [submittingDateChange, setSubmittingDateChange] = useState(false);
  const [dateChangeReview, setDateChangeReview] = useState<any | null>(null);
  const [dateChangeReviewAction, setDateChangeReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [dateChangeReviewNote, setDateChangeReviewNote] = useState("");
  const [submittingDateChangeReview, setSubmittingDateChangeReview] = useState(false);
  const [draggedLeaveId, setDraggedLeaveId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Apply Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<"MORNING" | "AFTERNOON">("MORNING");
  const [reason, setReason] = useState("");
  const [applyEmployeeId, setApplyEmployeeId] = useState("");
  const [applyAudience, setApplyAudience] = useState<"SELF" | "EMPLOYEE">("SELF");
  const [submittingApply, setSubmittingApply] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeCode, setNewTypeCode] = useState("");
  const [newTypeDays, setNewTypeDays] = useState("12");
  const [newTypeIsPaid, setNewTypeIsPaid] = useState(true);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState(false);
  const [carryingForward, setCarryingForward] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [teamCalendarMonth, setTeamCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [teamCalendarDate, setTeamCalendarDate] = useState("");
  const [teamCalendarStatus, setTeamCalendarStatus] = useState("ALL");
  const [teamCalendarDepartment, setTeamCalendarDepartment] = useState("ALL");
  const [teamCalendarBranch, setTeamCalendarBranch] = useState("ALL");
  const [selectedTeamLeave, setSelectedTeamLeave] = useState<LeaveRequest | null>(null);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const canApprove = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
  const isAdminRole = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN";
  const paidLeaveEligibilityOpen = eligibility?.eligible !== false;
  const unpaidLeaveTypes = leaveTypes.filter((type) => type.isPaid === false);
  const selectableLeaveTypes = paidLeaveEligibilityOpen ? leaveTypes : unpaidLeaveTypes;
  // Keep the balance cards consistent with the categories that can actually be
  // submitted. Paid leave is blocked by the API during the eligibility period,
  // so showing paid balances here is misleading (and used to show a fake CL card).
  const visibleBalances = balances.filter((balance) => paidLeaveEligibilityOpen || balance.leaveType?.isPaid === false);
  const paidLeaveSummary = balances.find((balance) => balance.monthlyPaidLeave)?.monthlyPaidLeave || null;
  const canApplyLeave = selectableLeaveTypes.length > 0;

  useEffect(() => {
    if (canApprove && searchParams.get("tab") === "COMPANY_LEAVE") setActiveTab("COMPANY_LEAVE");
    if (canApprove && searchParams.get("tab") === "APPROVALS") setActiveTab("APPROVALS");
  }, [canApprove, searchParams]);

  const loadData = async () => {
    setLoading(true);
    if (canApprove) setLoadingTeamBalances(true);
    setLoadError(null);
    try {
      const [typesRes, balRes, myRes, eligibilityRes] = await Promise.allSettled([
        leavesApi.getTypes(),
        leavesApi.getBalances(),
        leavesApi.getMyLeaves(),
        leavesApi.getEligibility(),
      ]);

      const failedCoreRequests = [typesRes, balRes, myRes, eligibilityRes].filter((result) => result.status === "rejected");
      if (failedCoreRequests.length === 4) {
        setLoadError("Leaves are temporarily unavailable. Please try again.");
        logClientError("leaves.load_failed", { failedRequests: failedCoreRequests.length });
      }

      if (typesRes.status === "fulfilled") {
        setLeaveTypes(unwrapList(typesRes.value));
      }
      if (balRes.status === "fulfilled") {
        setBalances(unwrapList(balRes.value));
      }
      if (myRes.status === "fulfilled") {
        setMyRequests(unwrapList(myRes.value));
      }
      try {
        setMyDateChanges(unwrapList(await leavesApi.getMyDateChanges()));
      } catch { setMyDateChanges([]); }
      if (eligibilityRes.status === "fulfilled") {
        setEligibility(eligibilityRes.value?.data || eligibilityRes.value);
      }

      if (canApprove) {
        const [teamResult, employeeResult, changeResult, balanceResult, branchResult] = await Promise.allSettled([
          leavesApi.getAllLeaves(),
          employeesApi.getAll({ status: "ALL", limit: 500 }),
          leavesApi.getDateChanges("PENDING"),
          leavesApi.getTeamBalances(),
          branchesApi.list(),
        ]);

        if (teamResult.status === "fulfilled") {
          const nextTeamRequests = unwrapList(teamResult.value);
          setTeamRequests(nextTeamRequests);
          const employeeIds = [...new Set(nextTeamRequests.map((request: any) => request.employeeId || request.employee?.id).filter(Boolean))] as string[];
          // This enrichment is not needed to render the employee balance list.
          // Keep it off the critical path so the list can appear immediately.
          void Promise.all(employeeIds.map(async (employeeId) => {
            try {
              const response = await leavesApi.getEmployeeBalances(employeeId);
              const payload = response?.data || response;
              const paidRemaining = (payload?.balances || [])
                .filter((balance: any) => balance.leaveType?.isPaid === true)
                .reduce((sum: number, balance: any) => sum + Number(balance.remainingDays || 0), 0);
              return [employeeId, paidRemaining] as const;
            } catch {
              return [employeeId, null] as const;
            }
          })).then((paidLeaveEntries) => setTeamPaidLeaveRemaining(Object.fromEntries(paidLeaveEntries)));
        } else {
          setLoadError("Team leave approvals are temporarily unavailable. Your personal leave data is still safe.");
          logClientError("leaves.approvals_load_failed", { request: "leave-requests", error: teamResult.reason });
        }
        if (employeeResult.status === "fulfilled") {
          const employees = unwrapList(employeeResult.value);
          setOrganizationEmployees(employees);
        } else {
          logClientError("leaves.approvals_load_failed", { request: "employees", error: employeeResult.reason });
        }
        if (branchResult.status === "fulfilled") {
          setOrganizationBranches(unwrapList(branchResult.value));
        } else {
          logClientError("leaves.approvals_load_failed", { request: "branches", error: branchResult.reason });
        }
        if (balanceResult.status === "fulfilled") {
          const rows = unwrapList(balanceResult.value);
          setTeamLeaveBalances(rows);
          setLoadingTeamBalances(false);
          // The balance response is self-contained, so the panel still works
          // when an older employee-list response is empty or unavailable.
          if (employeeResult.status !== "fulfilled" || !unwrapList(employeeResult.value).length) {
            setOrganizationEmployees(rows.map((row: any) => row.employee).filter(Boolean));
          }
        } else {
          setLoadingTeamBalances(false);
          logClientError("leaves.approvals_load_failed", { request: "leave-balances", error: balanceResult.reason });
        }
        if (changeResult.status === "fulfilled") {
          setDateChanges(unwrapList(changeResult.value));
        } else {
          // Date-change approvals are an optional feed. Older databases may
          // not have its table yet; leave approvals must still load normally.
          setDateChanges([]);
        }
      }
    } catch (err) {
      setLoadError("Leaves are temporarily unavailable. Please try again.");
      logClientError("leaves.load_failed", { error: err });
    } finally {
      setLoading(false);
      if (canApprove) setLoadingTeamBalances(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canApprove]);

  useEffect(() => {
    if (!canApprove || !selectedBalanceEmployeeId) {
      setSelectedEmployeeBalance(null);
      return;
    }
    let cancelled = false;
    setLoadingEmployeeBalance(true);
    leavesApi.getEmployeeBalances(selectedBalanceEmployeeId)
      .then((res) => { if (!cancelled) setSelectedEmployeeBalance(res?.data || res); })
      .catch(() => { if (!cancelled) toast.error("Could not load this employee's leave balance"); })
      .finally(() => { if (!cancelled) setLoadingEmployeeBalance(false); });
    return () => { cancelled = true; };
  }, [canApprove, selectedBalanceEmployeeId, balanceRefresh]);

  useEffect(() => {
    const conflictEmployeeId = applyEmployeeId || user?.employee?.id;
    if (!applyModalOpen || !startDate || !endDate || !conflictEmployeeId) {
      setDepartmentConflict(null);
      return;
    }
    let cancelled = false;
    leavesApi.getDepartmentConflicts(startDate, endDate, conflictEmployeeId)
      .then((res) => { if (!cancelled) setDepartmentConflict(res?.data || res); })
      .catch(() => { if (!cancelled) setDepartmentConflict(null); });
    return () => { cancelled = true; };
  }, [applyModalOpen, startDate, endDate, applyEmployeeId, user?.employee?.id]);

  const handleCreateLeaveType = async () => {
    const name = newTypeName.trim();
    const code = newTypeCode.trim().toUpperCase();
    const daysAllowed = Number(newTypeDays || 12);
    if (!name || !code) {
      toast.error("Leave type name and code are required");
      return;
    }
    if (!Number.isInteger(daysAllowed) || daysAllowed < 1 || daysAllowed > 366) {
      toast.error("Allowed days must be a whole number from 1 to 366");
      return;
    }

    setCreatingType(true);
    try {
      const res = editingTypeId
        ? await leavesApi.updateType(editingTypeId, { name, code, daysAllowed, isPaid: newTypeIsPaid })
        : await leavesApi.createType({ name, code, daysAllowed, isPaid: newTypeIsPaid });
      if (!res?.success) {
        toast.error(res?.message || "Could not create leave type");
        return;
      }
      toast.success(editingTypeId ? "Leave type updated" : "Leave type created");
      setNewTypeName("");
      setNewTypeCode("");
      setNewTypeDays("12");
      setNewTypeIsPaid(true);
      setEditingTypeId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not create leave type");
    } finally {
      setCreatingType(false);
    }
  };

  const handleSetLeaveTypePaid = async (type: LeaveType, isPaid: boolean) => {
    try {
      const result = await leavesApi.updateType(type.id, {
        name: type.name,
        code: type.code,
        daysAllowed: type.daysAllowed,
        isPaid,
      });
      if (result?.success) {
        toast.success(`${type.name} set as ${isPaid ? "paid" : "unpaid"} leave`);
        await loadData();
      } else toast.error(result?.message || "Could not update leave type");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not update leave type");
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId || !startDate || !endDate || !reason) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmittingApply(true);
    try {
      const res = await leavesApi.apply({
        leaveTypeId: selectedTypeId,
        startDate,
        endDate,
        totalDays: isHalfDay ? 0.5 : undefined,
        halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
        reason,
        ...(canApprove && applyEmployeeId ? { employeeId: applyEmployeeId } : {}),
      });

      if (res?.success) {
        toast.success("Leave application submitted successfully!");
        setApplyModalOpen(false);
        setReason("");
        setHalfDayPeriod("MORNING");
        loadData();
      } else {
        toast.error(res?.message || "Failed to apply for leave");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to apply for leave");
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (reviewAction === "REJECTED" && !reviewNote.trim()) {
      toast.error("Add a rejection reason so the employee understands the decision.");
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await leavesApi.review(selectedRequest.id, {
        status: reviewAction,
        reviewNote: reviewNote || undefined,
      });

      if (res?.success) {
        toast.success(`Leave request marked as ${reviewAction}!`);
        setReviewModalOpen(false);
        setReviewNote("");
        loadData();
      } else {
        toast.error(res?.message || "Failed to review request");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to review request");
    } finally {
      setSubmittingReview(false);
    }
  };

  const pendingApprovals = teamRequests.filter((r) => r.status === "PENDING");

  const teamCalendarEmployees = useMemo(() => {
    const employees = new Map<string, any>();
    organizationEmployees.forEach((employee) => {
      if (employee?.id) employees.set(String(employee.id), employee);
    });
    teamRequests.forEach((request) => {
      const employee = request.employee;
      if (employee?.id && !employees.has(String(employee.id))) employees.set(String(employee.id), employee);
    });
    return employees;
  }, [organizationEmployees, teamRequests]);

  const teamDepartments = useMemo(() => {
    const departments = new Map<string, string>();
    teamCalendarEmployees.forEach((employee) => {
      const department = employee?.department;
      if (department?.id && department.name) departments.set(department.id, department.name);
    });
    return [...departments.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [teamCalendarEmployees]);

  const teamBranches = useMemo(() => {
    const branches = new Map<string, string>();
    organizationBranches.forEach((branch) => {
      if (branch?.id && branch?.name) branches.set(String(branch.id), String(branch.name));
    });
    teamCalendarEmployees.forEach((employee) => {
      const id = employee?.branchId || employee?.branch?.id;
      const name = employee?.branch?.name;
      if (id && name) branches.set(String(id), name);
    });
    return [...branches.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [organizationBranches, teamCalendarEmployees]);

  const filteredTeamLeave = useMemo(() => teamRequests.filter((request) => {
    const employee = request.employee || teamCalendarEmployees.get(String(request.employeeId));
    const statusMatches = teamCalendarStatus === "ALL" || request.status === teamCalendarStatus;
    const departmentMatches = teamCalendarDepartment === "ALL" || employee?.departmentId === teamCalendarDepartment || employee?.department?.id === teamCalendarDepartment;
    const branchId = employee?.branchId || employee?.branch?.id;
    const branchMatches = teamCalendarBranch === "ALL" || String(branchId || "") === teamCalendarBranch;
    const dateMatches = !teamCalendarDate || requestCoversDate(request, parseDateOnly(teamCalendarDate) || new Date(0));
    return statusMatches && departmentMatches && branchMatches && dateMatches;
  }), [teamRequests, teamCalendarStatus, teamCalendarDepartment, teamCalendarBranch, teamCalendarDate, teamCalendarEmployees]);

  const balanceBranches = useMemo(() => {
    const branches = new Map<string, string>();
    teamLeaveBalances.forEach((row) => {
      const employee = row.employee || row;
      const id = employee.branchId || employee.branch?.id;
      const name = employee.branch?.name;
      if (id && name) branches.set(id, name);
    });
    return [...branches.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [teamLeaveBalances]);

  const filteredBalanceEmployees = useMemo(() => {
    const query = balanceEmployeeSearch.trim().toLowerCase();
    return organizationEmployees.filter((employee) => {
      if (["SUPER_ADMIN", "COMPANY_ADMIN"].includes(String(employee.user?.role || "").toUpperCase())) return false;
      const name = `${employee.firstName || ""} ${employee.lastName || ""}`.trim().toLowerCase();
      const matchesSearch = !query || name.includes(query) || String(employee.employeeCode || "").toLowerCase().includes(query);
      const branchId = employee.branchId || employee.branch?.id;
      return matchesSearch && (balanceBranchFilter === "ALL" || branchId === balanceBranchFilter);
    });
  }, [organizationEmployees, balanceEmployeeSearch, balanceBranchFilter]);

  const filteredTeamLeaveBalances = useMemo(() => {
    const query = balanceEmployeeSearch.trim().toLowerCase();
    return teamLeaveBalances.filter((row) => {
      const employee = row.employee || row;
      if (["SUPER_ADMIN", "COMPANY_ADMIN"].includes(String(employee.user?.role || row.user?.role || "").toUpperCase())) return false;
      const name = `${employee.firstName || ""} ${employee.lastName || ""}`.trim().toLowerCase();
      const code = String(employee.employeeCode || "").toLowerCase();
      const branchId = employee.branchId || employee.branch?.id;
      return (!query || name.includes(query) || code.includes(query)) &&
        (balanceBranchFilter === "ALL" || branchId === balanceBranchFilter);
    });
  }, [teamLeaveBalances, balanceEmployeeSearch, balanceBranchFilter]);

  const selectedBalanceSummary = useMemo(() => (selectedEmployeeBalance?.balances || []).reduce((summary: { remaining: number; used: number; pending: number; total: number }, balance: any) => ({
    remaining: summary.remaining + Number(balance.remainingDays || 0),
    used: summary.used + Number(balance.usedDays || 0),
    pending: summary.pending + Number(balance.pendingDays || 0),
    total: summary.total + Number(balance.allocatedDays || balance.totalDays || 0),
  }), { remaining: 0, used: 0, pending: 0, total: 0 }), [selectedEmployeeBalance]);

  const paidLeaveRemainingFor = (request: LeaveRequest) => {
    const employeeId = request.employeeId || request.employee?.id;
    const remaining = employeeId ? teamPaidLeaveRemaining[employeeId] : null;
    return typeof remaining === "number" ? remaining : null;
  };

  const teamCalendarDays = useMemo(() => {
    const firstDay = new Date(teamCalendarMonth.getFullYear(), teamCalendarMonth.getMonth(), 1);
    const daysInMonth = new Date(teamCalendarMonth.getFullYear(), teamCalendarMonth.getMonth() + 1, 0).getDate();
    return Array.from({ length: firstDay.getDay() + daysInMonth }, (_, index) => {
      if (index < firstDay.getDay()) return null;
      return new Date(teamCalendarMonth.getFullYear(), teamCalendarMonth.getMonth(), index - firstDay.getDay() + 1);
    });
  }, [teamCalendarMonth]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    return Array.from({ length: firstDay.getDay() + daysInMonth }, (_, index) => {
      if (index < firstDay.getDay()) return null;
      return new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index - firstDay.getDay() + 1);
    });
  }, [calendarMonth]);

  const upcomingLeave = useMemo(() => {
    const today = parseDateOnly(dateKey(new Date())) || new Date();
    return myRequests
      .filter((request) => request.status !== "REJECTED")
      .filter((request) => {
        const end = parseDateOnly(request.endDate);
        return end && end >= today;
      })
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  }, [myRequests]);

  const submitDateChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dateChangeRequest || !dateChangeStart || !dateChangeEnd || !dateChangeReason.trim()) return;
    setSubmittingDateChange(true);
    try {
      const response = await leavesApi.requestDateChange(dateChangeRequest.id, { newStartDate: dateChangeStart, newEndDate: dateChangeEnd, reason: dateChangeReason.trim() });
      if (!response?.success) throw new Error(response?.message || "Could not request date change");
      toast.success("Date-change request sent for approval");
      setDateChangeRequest(null);
      setDateChangeReason("");
      await loadData();
    } catch (err: any) { toast.error(err?.response?.data?.message || err?.message || "Could not request date change"); }
    finally { setSubmittingDateChange(false); }
  };

  const submitDateChangeReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dateChangeReview) return;
    if (dateChangeReviewAction === "REJECTED" && !dateChangeReviewNote.trim()) {
      toast.error("Add a rejection reason so the employee understands the decision.");
      return;
    }
    setSubmittingDateChangeReview(true);
    try {
      const response = await leavesApi.reviewDateChange(dateChangeReview.id, { status: dateChangeReviewAction, reviewNote: dateChangeReviewNote.trim() || undefined });
      if (!response?.success) throw new Error(response?.message || "Could not review date change");
      toast.success(dateChangeReviewAction === "APPROVED" ? "Leave dates updated" : "Date-change request rejected");
      setDateChangeReview(null);
      setDateChangeReviewNote("");
      await loadData();
    } catch (err: any) { toast.error(err?.response?.data?.message || err?.message || "Could not review date change"); }
    finally { setSubmittingDateChangeReview(false); }
  };

  const openDateChangeFromDrop = (request: LeaveRequest, targetDay: Date) => {
    if (request.status !== "APPROVED") return;
    const tomorrow = dateKey(addDays(new Date(), 1));
    const targetStart = dateKey(targetDay);
    if (targetStart < tomorrow) {
      toast.error("Approved leave can only be moved to tomorrow or a later date.");
      return;
    }
    const currentStart = parseDateOnly(request.startDate);
    const currentEnd = parseDateOnly(request.endDate);
    const duration = currentStart && currentEnd
      ? Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / 86400000) + 1)
      : Math.max(1, Number(request.totalDays) || 1);
    setDateChangeRequest(request);
    setDateChangeStart(targetStart);
    setDateChangeEnd(dateKey(addDays(targetDay, duration - 1)));
    setDateChangeReason("");
    setDragOverDate(null);
  };

  if (loadError && loading === false && myRequests.length === 0 && leaveTypes.length === 0 && balances.length === 0) {
    return (
      <div role="alert" className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-amber-950">Leaves could not be loaded</h2>
        <p className="mt-2 text-sm text-amber-800">{loadError}</p>
        <button type="button" onClick={loadData} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Apply CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-indigo-600" />
            Leaves
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track statutory leave quotas, submit time-off applications, and review team requests
          </p>
        </div>

        <button
          disabled={!canApplyLeave}
          onClick={() => {
            if (selectableLeaveTypes.length > 0) {
              setSelectedTypeId(selectableLeaveTypes[0].id);
            }
            setApplyEmployeeId(canApprove ? "" : user?.employee?.id || "");
            setApplyModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {paidLeaveEligibilityOpen ? "Apply for Leave" : "Apply for Unpaid Leave"}
        </button>
      </div>

      {typeof eligibility?.eligible === "boolean" && !eligibility.eligible && !isAdminRole && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="text-sm font-bold">Paid leave is not available yet</p><p className="mt-1 text-xs leading-5 text-amber-800">Paid leave and monthly permissions unlock after your {eligibility.probationMonths ?? 0}-month company eligibility period. {eligibility.remainingDays ?? 0} day(s) remain. Unpaid leave remains available for exceptional cases.</p>{!canApplyLeave && <p className="mt-2 text-xs font-bold text-amber-900">Your company has not configured an unpaid leave type yet. Please contact HR.</p>}</div></div>}
      {typeof eligibility?.eligible === "boolean" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Monthly permission</p><p className="mt-1 text-2xl font-bold text-indigo-950">{eligibility.monthlyPermissionHours ?? 0} hrs</p><p className="mt-1 text-xs text-indigo-700">Company allowance</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Eligibility status</p><p className="mt-1 text-sm font-bold text-slate-900">{eligibility.eligible ? "Active" : "Waiting period"}</p><p className="mt-1 text-xs text-slate-500">{eligibility.eligible ? "Leave and permission access is open" : `Unlocks in ${eligibility.remainingDays ?? 0} days`}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Policy window</p><p className="mt-1 text-sm font-bold text-slate-900">{eligibility.probationMonths ?? 0} months</p><p className="mt-1 text-xs text-slate-500">Configured by your company</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Paid leave carry-forward</p><p className="mt-1 text-2xl font-bold text-emerald-950">{paidLeaveSummary?.remainingDays ?? 0} days</p><p className="mt-1 text-xs text-emerald-700">{paidLeaveSummary?.monthlyAllowance ?? 1} day(s) earned monthly{paidLeaveSummary?.carryForward === false ? "; no carry-forward" : "; unused days carry forward"}</p></div></div>}

      {/* Leave Quota Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleBalances.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            {loading ? "Loading leave balances..." : canApplyLeave ? "No leave balance is available to display yet." : "No unpaid leave type is configured. Please contact HR."}
          </div>
        ) : (
          visibleBalances.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">
                  {b.leaveType?.name || "Leave Quota"}
                </span>
                <span className="flex items-center gap-2">
                  {canApprove && b.leaveType && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTypeId(b.leaveType!.id);
                        setNewTypeName(b.leaveType!.name);
                        setNewTypeCode(b.leaveType!.code);
                        setNewTypeDays(String(b.leaveType!.daysAllowed));
                        setNewTypeIsPaid(b.leaveType!.isPaid !== false);
                        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >Edit</button>
                  )}
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {b.leaveType?.code || "LEAVE"}
                  </span>
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{b.remainingDays}</span>
                <span className="text-xs text-slate-500">/ {b.totalDays} days</span>
              </div>
            </div>
          ))
        )}
      </div>

      {(role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "HR") && (
        <div className="bg-white rounded-2xl border p-4 flex flex-wrap gap-2 text-xs items-end">
          <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Type name" className="px-3 py-2 rounded-xl border" />
          <input value={newTypeCode} onChange={(e) => setNewTypeCode(e.target.value)} placeholder="Code" maxLength={20} className="w-20 px-3 py-2 rounded-xl border uppercase" />
          <input value={newTypeDays} onChange={(e) => setNewTypeDays(e.target.value)} type="number" min={1} max={366} placeholder="Days" className="w-20 px-3 py-2 rounded-xl border" />
          <Select value={newTypeIsPaid ? "PAID" : "UNPAID"} onChange={(e) => setNewTypeIsPaid(e.target.value === "PAID")} className="px-3 py-2 rounded-xl border">
            <option value="PAID">Paid leave</option>
            <option value="UNPAID">Unpaid leave</option>
          </Select>
          <button
            type="button"
            onClick={() => void handleCreateLeaveType()}
            disabled={creatingType}
            className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingType ? (editingTypeId ? "Saving..." : "Adding...") : (editingTypeId ? "Save changes" : "Add type")}
          </button>
          {editingTypeId && <button type="button" onClick={() => { setEditingTypeId(null); setNewTypeName(""); setNewTypeCode(""); setNewTypeDays("12"); setNewTypeIsPaid(true); }} className="px-3 py-2 rounded-xl border font-semibold">Cancel</button>}
          <button
            type="button"
            disabled={carryingForward}
            onClick={async () => {
              const y = new Date().getFullYear();
              setCarryingForward(true);
              try {
                const res = await leavesApi.carryForward({ fromYear: y - 1, toYear: y, maxDays: 15 });
                if (res?.success) toast.success(`Carried ${res.data?.balancesUpdated || 0} balances`);
                else toast.error(res?.message || "Could not carry forward balances");
              } catch (err: any) {
                toast.error(err?.response?.data?.message || err?.message || "Could not carry forward balances");
              } finally {
                setCarryingForward(false);
              }
            }}
            className="px-3 py-2 rounded-xl border font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carryingForward ? "Carrying..." : "Carry forward last year"}
          </button>
          {leaveTypes.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => void handleSetLeaveTypePaid(t, false)}
                disabled={t.isPaid === false}
                className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 disabled:cursor-default disabled:opacity-50"
              >
                Set {t.code} unpaid
              </button>
              <button
                type="button"
                onClick={() => void handleSetLeaveTypePaid(t, true)}
                disabled={t.isPaid !== false}
                className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 disabled:cursor-default disabled:opacity-50"
              >
                Set paid
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!(await confirmDialog({ title: `Remove ${t.name}?`, message: "If this leave type has history, it will be archived so existing requests remain safe. New requests will no longer use it.", confirmLabel: "Remove leave type" }))) return;
                  try {
                    const result = await leavesApi.deleteType(t.id);
                    if (result?.success) { toast.success(result.message || "Leave type removed"); await loadData(); }
                    else toast.error(result?.message || "Could not remove leave type");
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || err?.message || "Could not remove leave type");
                  }
                }}
                className="px-2 py-1 rounded-md bg-rose-50 text-rose-700"
              >
                Delete
              </button>
            </span>
          ))}
        </div>
      )}

      {canApprove && activeTab === "APPROVALS" && (
        <section className="hidden wp-leave-balance-panel rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 text-white shadow-xl shadow-indigo-950/10 sm:p-6" aria-labelledby="employee-balance-title">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="hidden">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><WalletCards className="h-5 w-5 text-indigo-200" /></span>
              <div className="min-w-0 flex-1">
                <label className="mb-1.5 block text-[13px] font-medium text-indigo-100">Apply leave for</label>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1" role="group" aria-label="Choose leave applicant">
                  <button type="button" onClick={() => { setApplyAudience("SELF"); setApplyEmployeeId(""); }} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${applyAudience === "SELF" ? "bg-white text-slate-900 shadow-sm" : "text-indigo-100 hover:bg-white/10"}`}>My leave</button>
                  <button type="button" onClick={() => setApplyAudience("EMPLOYEE")} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${applyAudience === "EMPLOYEE" ? "bg-white text-slate-900 shadow-sm" : "text-indigo-100 hover:bg-white/10"}`}>For employee</button>
                </div>
                {applyAudience === "EMPLOYEE" && <Select value={applyEmployeeId} onChange={(event) => setApplyEmployeeId(event.target.value)} className="mt-2 w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900">
                  <option value="">Select employee</option>
                  {filteredBalanceEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName || ""} · {employee.employeeCode || "No code"}</option>)}
                </Select>}
                <p className="mt-1 text-[11px] text-slate-400">Admin requests follow the normal approval workflow.</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">Workforce insight</p>
              <h2 id="employee-balance-title" className="mt-1 text-lg font-bold">Employee leave balance</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-300">Select an employee to review paid leave balance, used days, pending requests and total allocation before approving.</p>
            </div>
            <div className="w-full min-w-0 space-y-2 xl:max-w-2xl">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input aria-label="Search employee for leave balance" value={balanceEmployeeSearch} onChange={(event) => setBalanceEmployeeSearch(event.target.value)} placeholder="Search name or employee code" className="wp-leave-balance-search w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-500 focus:border-indigo-300" />
                <Select aria-label="Filter leave balance by branch" value={balanceBranchFilter} onChange={(event) => setBalanceBranchFilter(event.target.value)} className="w-full !border-white/20 !bg-slate-800 !text-white px-3 py-2.5 text-xs font-semibold outline-none [&>option]:bg-white [&>option]:text-slate-900">
                  <option value="ALL">All branches</option>
                  {balanceBranches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0 text-indigo-200" />
                <Select aria-label="Select employee for leave balance" value={selectedBalanceEmployeeId} onChange={(event) => setSelectedBalanceEmployeeId(event.target.value)} className="w-full !border-white/20 !bg-slate-800 !text-white px-3 py-2.5 text-xs font-semibold outline-none [&>option]:bg-white [&>option]:text-slate-900">
                  <option value="">{loadingTeamBalances ? "Loading employees..." : `Select an employee (${filteredTeamLeaveBalances.length})`}</option>
                  {filteredTeamLeaveBalances.map((row: any) => { const employee = row.employee || row; return <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName || ""} · {employee.employeeCode || "No code"}</option>; })}
                </Select>
                {selectedBalanceEmployeeId && <button type="button" onClick={() => setBalanceRefresh((value) => value + 1)} className="rounded-xl p-2 text-indigo-200 hover:bg-white/10" aria-label="Refresh selected employee balance"><RefreshCw className={`h-4 w-4 ${loadingEmployeeBalance ? "animate-spin" : ""}`} /></button>}
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
                <div className="grid gap-1 border-b border-white/10 px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-indigo-200 sm:gap-2 sm:px-3" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${leaveTypes.length}, minmax(64px, 1fr))` }}>
                  <span>Employee / code</span>{leaveTypes.map((type) => <span key={type.id} className="truncate text-center" title={type.name}>{type.code || type.name}</span>)}
                </div>
                <div className="max-h-[216px] divide-y divide-white/10 overflow-y-auto">
                  {loadingTeamBalances ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading employees...</div>
                  ) : filteredTeamLeaveBalances.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-slate-300">No employees match this search or branch.</p>
                  ) : filteredTeamLeaveBalances.map((row: any) => {
                    const employee = row.employee || row;
                    const employeeId = employee.id;
                    const selected = selectedBalanceEmployeeId === employeeId;
                    return (
                      <button
                        key={employeeId}
                        type="button"
                        onClick={() => setSelectedBalanceEmployeeId(employeeId)}
                        className={`grid w-full items-center gap-1 px-2 py-2.5 text-left transition sm:gap-2 sm:px-3 ${selected ? "bg-indigo-400/20" : "hover:bg-white/10"}`}
                        style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${leaveTypes.length}, minmax(64px, 1fr))` }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-white">{employee.firstName} {employee.lastName || ""}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-300">{employee.employeeCode || "No employee code"}</span>
                        </span>
                        {leaveTypes.map((type) => <span key={type.id} className="text-center text-sm font-bold tabular-nums text-emerald-200">{balanceRemainingForType(row, type)} d</span>)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {!selectedBalanceEmployeeId ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-center text-xs text-slate-300">Choose an employee to view their current leave balance and pending reservations.</div>
          ) : loadingEmployeeBalance ? (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-5 text-xs text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading balance...</div>
          ) : (
            <div className="mt-5 space-y-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Available</p><p className="mt-2 text-2xl font-bold">{selectedBalanceSummary.remaining}<span className="ml-1 text-xs font-medium text-slate-400">days</span></p><p className="mt-1 text-[11px] text-slate-400">Across leave types</p></div>
              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Used</p><p className="mt-2 text-2xl font-bold">{selectedBalanceSummary.used}<span className="ml-1 text-xs font-medium text-slate-400">days</span></p><p className="mt-1 text-[11px] text-slate-400">Already consumed</p></div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Pending</p><p className="mt-2 text-2xl font-bold">{selectedBalanceSummary.pending}<span className="ml-1 text-xs font-medium text-slate-400">days</span></p><p className="mt-1 text-[11px] text-slate-400">Reserved for approval</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total allocation</p><p className="mt-2 text-2xl font-bold">{selectedBalanceSummary.total}<span className="ml-1 text-xs font-medium text-slate-400">days</span></p><p className="mt-1 text-[11px] text-slate-400">Configured yearly quota</p></div>
            </div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(selectedEmployeeBalance?.balances || []).map((balance: any) => <div key={balance.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-bold">{balance.leaveType?.name || "Leave"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${balance.leaveType?.isPaid ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>{balance.leaveType?.isPaid ? "PAID" : "UNPAID"}</span></div><p className="mt-4 text-2xl font-bold">{balance.remainingDays}<span className="ml-1 text-xs font-medium text-slate-400">days</span></p><p className="mt-1 text-[11px] text-slate-400">{balance.usedDays} used · {balance.pendingDays || 0} pending · {balance.allocatedDays} total</p></div>)}
            </div></div>
          )}
        </section>
      )}

      {canApprove && activeTab === "APPROVALS" && (
        <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 text-white shadow-xl shadow-indigo-950/10 sm:p-6" aria-labelledby="employee-balance-title">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">Workforce insight</p>
            <h2 id="employee-balance-title" className="mt-1 text-lg font-bold">Employee leave balance</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-300">Click an employee to view their balance, usage and pending requests.</p>
          </div>

          <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.6fr)] xl:items-start">
            <div className="min-w-0 space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <input aria-label="Search employee for leave balance" value={balanceEmployeeSearch} onChange={(event) => setBalanceEmployeeSearch(event.target.value)} placeholder="Search name or employee code" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-500 focus:border-indigo-300" />
                <Select aria-label="Filter leave balance by branch" value={balanceBranchFilter} onChange={(event) => setBalanceBranchFilter(event.target.value)} className="w-full !border-white/20 !bg-slate-800 !text-white px-3 py-2.5 text-xs font-semibold outline-none [&>option]:bg-white [&>option]:text-slate-900">
                  <option value="ALL">All branches</option>
                  {balanceBranches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </Select>
              </div>
               <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-indigo-200"><span className="flex items-center gap-2"><Users className="h-4 w-4" />Employees</span><span>{loadingTeamBalances ? <Loader2 className="h-3 w-3 animate-spin" aria-label="Loading employees" /> : filteredTeamLeaveBalances.length}</span></div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
                <div className="grid gap-1 border-b border-white/10 px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-indigo-200 sm:gap-2 sm:px-3" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${leaveTypes.length}, minmax(52px, 1fr))` }}><span>Employee / code</span>{leaveTypes.map((type) => <span key={type.id} className="truncate text-center" title={type.name}>{type.code || type.name}</span>)}</div>
                <div className="max-h-[420px] divide-y divide-white/10 overflow-y-auto">
                  {loadingTeamBalances ? <div className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading employees...</div> : filteredTeamLeaveBalances.length === 0 ? <p className="px-3 py-4 text-xs text-slate-300">No employees match this search or branch.</p> : filteredTeamLeaveBalances.map((row: any) => {
                    const employee = row.employee || row;
                    const selected = selectedBalanceEmployeeId === employee.id;
                    return <button key={employee.id} type="button" onClick={() => setSelectedBalanceEmployeeId(employee.id)} className={`grid w-full items-center gap-1 px-2 py-3 text-left transition sm:gap-2 sm:px-3 ${selected ? "bg-indigo-400/20" : "hover:bg-white/10"}`} style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${leaveTypes.length}, minmax(52px, 1fr))` }}><span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{employee.firstName} {employee.lastName || ""}</span><span className="mt-0.5 block truncate text-[10px] text-slate-300">{employee.employeeCode || "No employee code"}</span></span>{leaveTypes.map((type) => <span key={type.id} className="text-center text-sm font-bold tabular-nums text-emerald-200">{balanceRemainingForType(row, type)} d</span>)}</button>;
                  })}
                </div>
              </div>
            </div>

            <div className="min-w-0">
              {!selectedBalanceEmployeeId ? <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 text-center text-xs text-slate-300">Click an employee to view the result.</div> : loadingEmployeeBalance ? <div className="flex min-h-[320px] items-center justify-center gap-2 rounded-2xl bg-white/5 text-xs text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading balance...</div> : <div className="space-y-3">
                <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Selected employee</p><p className="truncate text-base font-bold">{selectedEmployeeBalance?.employee?.firstName} {selectedEmployeeBalance?.employee?.lastName || ""}</p></div><button type="button" onClick={() => setBalanceRefresh((value) => value + 1)} className="rounded-xl p-2 text-indigo-200 hover:bg-white/10" aria-label="Refresh selected employee balance"><RefreshCw className="h-4 w-4" /></button></div>
                <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Available</p><p className="mt-2 text-2xl font-bold">{selectedBalanceSummary.remaining}<span className="ml-1 text-xs text-slate-400">days</span></p></div><div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Used</p><p className="mt-2 text-2xl font-bold">{selectedBalanceSummary.used}<span className="ml-1 text-xs text-slate-400">days</span></p></div><div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Pending</p><p className="mt-2 text-2xl font-bold">{selectedBalanceSummary.pending}<span className="ml-1 text-xs text-slate-400">days</span></p></div><div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total allocation</p><p className="mt-2 text-2xl font-bold">{selectedBalanceSummary.total}<span className="ml-1 text-xs text-slate-400">days</span></p></div></div>
                <div className="grid gap-3 sm:grid-cols-2">{(selectedEmployeeBalance?.balances || []).map((balance: any) => <div key={balance.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-bold">{balance.leaveType?.name || "Leave"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${balance.leaveType?.isPaid ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>{balance.leaveType?.isPaid ? "PAID" : "UNPAID"}</span></div><p className="mt-4 text-2xl font-bold">{balance.remainingDays}<span className="ml-1 text-xs text-slate-400">days</span></p><p className="mt-1 text-[11px] text-slate-400">{balance.usedDays} used · {balance.pendingDays || 0} pending · {balance.allocatedDays} total</p></div>)}</div>
              </div>}
            </div>
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("MY_LEAVES")}
          className={`whitespace-nowrap pb-3 px-3 text-sm font-semibold border-b-2 transition sm:px-4 ${
            activeTab === "MY_LEAVES"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          My Leave Applications ({myRequests.length})
        </button>

        <button
          onClick={() => setActiveTab("PERMISSIONS")}
          className={`whitespace-nowrap pb-3 px-3 text-sm font-semibold border-b-2 transition sm:px-4 ${
            activeTab === "PERMISSIONS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Permissions
        </button>

        <button
          onClick={() => setActiveTab("WORK_FROM_HOME")}
          className="whitespace-nowrap pb-3 px-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition sm:px-4"
        >
          Work From Home
        </button>

        <button
          onClick={() => setActiveTab("COMPANY_LEAVE")}
          className={`whitespace-nowrap pb-3 px-3 text-sm font-semibold border-b-2 transition sm:px-4 ${
            activeTab === "COMPANY_LEAVE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Company leave
        </button>

        {!canApprove && (
          <button
            onClick={() => setActiveTab("SHOOT_REQUESTS")}
            className={`whitespace-nowrap pb-3 px-3 text-sm font-semibold border-b-2 transition sm:px-4 ${
              activeTab === "SHOOT_REQUESTS"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Shoot requests
          </button>
        )}
        <button
          onClick={() => setActiveTab("SHOOT_SETTLEMENT")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeTab === "SHOOT_SETTLEMENT"
              ? "border-violet-600 text-violet-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Shoot settlement
        </button>
        {canApprove && (
          <button
            onClick={() => setActiveTab("APPROVALS")}
          className={`whitespace-nowrap pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 sm:px-4 ${
              activeTab === "APPROVALS"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Leave Management</span>
            {pendingApprovals.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                {pendingApprovals.length} Pending
              </span>
            )}
          </button>
        )}
      </div>

      {/* Tab Content: Permissions */}
      {activeTab === "PERMISSIONS" && <PermissionRequestsPanel canReview={canApprove} eligible={paidLeaveEligibilityOpen} eligibility={eligibility} />}

      {/* Tab Content: Work From Home */}
      {activeTab === "WORK_FROM_HOME" && <WorkFromHomePanel />}

      {/* Tab Content: Shoot requests */}
      {activeTab === "SHOOT_REQUESTS" && !canApprove && <ShootRequestsPanel canReview={false} />}

      {/* Tab Content: Shoot settlement and payroll-ready review */}
      {activeTab === "SHOOT_SETTLEMENT" && <ShootSettlementPanel canReview={canApprove} />}

      {/* Tab Content: Company leave */}
      {activeTab === "COMPANY_LEAVE" && <CompanyLeavePanel canManage={canApprove} />}

      {/* Tab Content: My Leaves */}
      {activeTab === "MY_LEAVES" && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5" aria-labelledby="leave-calendar-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Personal planner</p>
                  <h2 id="leave-calendar-title" className="mt-1 text-lg font-bold text-slate-900">My leave calendar</h2>
                  <p className="mt-1 text-xs text-slate-500">See all your leave applications month by month.</p>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button type="button" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => { const today = new Date(); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-white">Today</button>
                  <button type="button" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Approved</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Pending</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Rejected</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day.slice(0, 2)}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarDays.map((day, index) => {
                  const dayRequests = day ? myRequests.filter((request) => requestCoversDate(request, day)) : [];
                  const today = day && dateKey(day) === dateKey(new Date());
                  return (
                    <div
                      key={day ? dateKey(day) : `blank-${index}`}
                      draggable={Boolean(day && dayRequests.filter((request) => request.status === "APPROVED").length === 1)}
                      onDragStart={() => {
                        const approved = dayRequests.find((request) => request.status === "APPROVED");
                        if (approved) setDraggedLeaveId(approved.id);
                      }}
                      onDragEnd={() => { setDraggedLeaveId(null); setDragOverDate(null); }}
                      role={day ? "button" : undefined}
                      tabIndex={day ? 0 : undefined}
                      onClick={() => {
                        if (!day || !canApplyLeave) return;
                        const selectedDay = dateKey(day);
                        setSelectedTypeId(selectableLeaveTypes[0]?.id || "");
                        setStartDate(selectedDay);
                        setEndDate(selectedDay);
                        setIsHalfDay(false);
                        setHalfDayPeriod("MORNING");
                        setReason("");
                        setApplyModalOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (day && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          event.currentTarget.click();
                        }
                      }}
                      onDragOver={(event) => {
                        if (day && draggedLeaveId) {
                          event.preventDefault();
                          setDragOverDate(dateKey(day));
                        }
                      }}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        const requestId = draggedLeaveId || event.dataTransfer.getData("text/plain");
                        const request = myRequests.find((item) => item.id === requestId);
                        if (day && request) openDateChangeFromDrop(request, day);
                        setDraggedLeaveId(null);
                      }}
                      className={`min-h-[72px] rounded-xl border p-1.5 sm:min-h-[86px] sm:p-2 ${day ? "cursor-pointer border-slate-100 bg-slate-50/60 transition hover:border-indigo-200 hover:bg-indigo-50/50" : "border-transparent bg-transparent"} ${today ? "ring-2 ring-indigo-200" : ""} ${dragOverDate === (day && dateKey(day)) ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300" : ""} ${day && !canApplyLeave ? "cursor-not-allowed opacity-70" : ""}`}
                      title={day && canApplyLeave ? "Click to apply for leave on this date" : undefined}
                    >
                      {day && <>
                        <div className={`text-right text-xs font-bold ${today ? "text-indigo-600" : "text-slate-500"}`}>{day.getDate()}</div>
                        <div className="mt-1 space-y-1">
                          {dayRequests.filter((request) => request.status === "APPROVED").slice(0, 2).map((request) => <button type="button" key={`drag-${request.id}`} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", request.id); setDraggedLeaveId(request.id); }} onDragEnd={() => { setDraggedLeaveId(null); setDragOverDate(null); }} onClick={(event) => { event.stopPropagation(); setDateChangeRequest(request); setDateChangeStart(String(request.startDate).slice(0, 10)); setDateChangeEnd(String(request.endDate).slice(0, 10)); setDateChangeReason(""); }} title="Drag approved leave to another date" className="flex w-full cursor-grab items-center gap-1 truncate rounded-md bg-emerald-50 px-1 py-0.5 text-left text-[9px] font-semibold text-emerald-700 active:cursor-grabbing"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /><span className="truncate">{request.leaveType?.code || request.leaveType?.name || "Leave"}</span></button>)}
                          {dayRequests.filter((request) => request.status !== "APPROVED").slice(0, 2).map((request) => {
                            const tone = statusTone(request.status);
                            return <div key={request.id} title={`${request.leaveType?.name || "Leave"} · ${tone.label}`} className={`flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-[9px] font-semibold ${tone.badge}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} /><span className="truncate">{request.leaveType?.code || request.leaveType?.name || "Leave"}</span></div>;
                          })}
                          {dayRequests.length > 2 && <div className="px-1 text-[9px] font-bold text-slate-400">+{dayRequests.length - 2} more</div>}
                        </div>
                      </>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5" aria-labelledby="upcoming-leave-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Next time off</p>
                  <h2 id="upcoming-leave-title" className="mt-1 text-lg font-bold text-slate-900">Upcoming leave</h2>
                  <p className="mt-1 text-xs text-slate-500">Approved and pending leave from today onward.</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{upcomingLeave.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {upcomingLeave.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">No upcoming leave. Your calendar is clear.</div> : upcomingLeave.slice(0, 6).map((request) => {
                  const tone = statusTone(request.status);
                  const StatusIcon = tone.icon;
                  return <div key={request.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{request.leaveType?.name || "Leave"}</p><p className="mt-1 text-xs font-medium text-slate-500">{formatDate(request.startDate)}{request.startDate !== request.endDate ? ` – ${formatDate(request.endDate)}` : ""}</p></div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${tone.badge}`}><StatusIcon className="h-3 w-3" />{tone.label}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500"><span>{request.halfDayPeriod ? `${request.halfDayPeriod === "MORNING" ? "Morning" : "Afternoon"} half day` : `${request.totalDays} day${Number(request.totalDays) === 1 ? "" : "s"}`}</span><span className="max-w-[65%] truncate text-right" title={request.reason}>{request.reason}</span></div>
                    {request.status === "APPROVED" && !myDateChanges.some((change) => change.leaveRequestId === request.id && change.status === "PENDING") && <button type="button" onClick={() => { setDateChangeRequest(request); setDateChangeStart(String(request.startDate).slice(0, 10)); setDateChangeEnd(String(request.endDate).slice(0, 10)); setDateChangeReason(""); }} className="mt-3 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-50">Request date change</button>}
                  </div>;
                })}
                {upcomingLeave.length > 6 && <p className="text-center text-xs font-semibold text-indigo-600">See all details in My Leave Applications below.</p>}
              </div>
            </section>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Days</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Review Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      Loading leave applications...
                    </td>
                  </tr>
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      No leave requests submitted yet. Click "Apply for Leave" above.
                    </td>
                  </tr>
                ) : (
                  myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {req.leaveType?.name || "Leave"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(req.startDate)} to {formatDate(req.endDate)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-indigo-600">
                        {req.totalDays} {req.halfDayPeriod ? `(${req.halfDayPeriod === "MORNING" ? "Morning" : "Afternoon"} Half Day)` : "day(s)"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={req.reason || "No reason provided."}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            req.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : req.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {req.status === "REJECTED" && req.reviewNote ? (
                          <div className="max-w-xs rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2 text-xs text-rose-800">
                            <p className="font-bold uppercase tracking-wide text-[10px] text-rose-600">Why it was rejected</p>
                            <p className="mt-1 leading-5">{req.reviewNote}</p>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-500">{req.reviewNote || "-"}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {/* Tab Content: Team Approvals */}
      {activeTab === "APPROVALS" && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5" aria-labelledby="team-leave-calendar-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Workforce availability</p>
                <h2 id="team-leave-calendar-title" className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900"><CalendarDays className="h-5 w-5 text-indigo-600" />Team leave calendar</h2>
                <p className="mt-1 text-xs text-slate-500">See who is taking leave, why, and which departments are affected.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button type="button" onClick={() => setTeamCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => { const today = new Date(); setTeamCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setTeamCalendarDate(dateKey(today)); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-white">Today</button>
                  <button type="button" onClick={() => setTeamCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><Filter className="h-3.5 w-3.5" /><span className="sr-only">Leave status</span><Select value={teamCalendarStatus} onChange={(event) => setTeamCalendarStatus(event.target.value)} className="w-full border-0 bg-transparent p-0 text-xs font-semibold shadow-none"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></Select></label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><Building2 className="h-3.5 w-3.5" /><span className="sr-only">Department</span><Select value={teamCalendarDepartment} onChange={(event) => setTeamCalendarDepartment(event.target.value)} className="w-full border-0 bg-transparent p-0 text-xs font-semibold shadow-none"><option value="ALL">All departments</option>{teamDepartments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /><span className="sr-only">Branch</span><Select value={teamCalendarBranch} onChange={(event) => setTeamCalendarBranch(event.target.value)} className="w-full border-0 bg-transparent p-0 text-xs font-semibold shadow-none"><option value="ALL">All branches</option>{teamBranches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><Calendar className="h-3.5 w-3.5" /><span className="sr-only">Same-day filter</span><input type="date" value={teamCalendarDate} onChange={(event) => setTeamCalendarDate(event.target.value)} className="min-w-0 w-full bg-transparent text-xs font-semibold text-slate-700 outline-none" /></label>
              <button type="button" onClick={() => { setTeamCalendarDate(""); setTeamCalendarStatus("ALL"); setTeamCalendarDepartment("ALL"); setTeamCalendarBranch("ALL"); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Clear filters</button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">{teamCalendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">{filteredTeamLeave.length} matching request{filteredTeamLeave.length === 1 ? "" : "s"}</span>
            </div>
            {teamCalendarDate && filteredTeamLeave.length > 0 && <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900" role="status">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p><span className="font-bold">Same-day leave activity:</span> {filteredTeamLeave.length} leave request{filteredTeamLeave.length === 1 ? "" : "s"} {teamCalendarDepartment === "ALL" ? "match" : "from the selected department match"} {formatDate(teamCalendarDate)}. Review coverage before approving another request.</p>
            </div>}
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:gap-2">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day.slice(0, 2)}</div>)}</div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {teamCalendarDays.map((day, index) => {
                const dayRequests = day ? filteredTeamLeave.filter((request) => requestCoversDate(request, day)) : [];
                const today = day && dateKey(day) === dateKey(new Date());
                return <div key={day ? dateKey(day) : `team-blank-${index}`} className={`min-h-[82px] rounded-xl border p-1.5 sm:min-h-[100px] sm:p-2 ${day ? "border-slate-100 bg-slate-50/60" : "border-transparent"} ${today ? "ring-2 ring-indigo-200" : ""}`}>
                  {day && <><div className={`text-right text-xs font-bold ${today ? "text-indigo-600" : "text-slate-500"}`}>{day.getDate()}</div><div className="mt-1 space-y-1">{dayRequests.slice(0, 3).map((request) => <button type="button" key={request.id} onClick={() => setSelectedTeamLeave(request)} className={`flex w-full items-center gap-1.5 truncate rounded-lg border px-1 py-1 text-left text-[9px] font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow ${request.status === "APPROVED" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : request.status === "REJECTED" ? "border-rose-100 bg-rose-50 text-rose-700" : "border-amber-100 bg-amber-50 text-amber-700"}`} title={`View ${employeeDisplayName(request.employee)} profile and leave reason`}><EmployeeAvatar employee={request.employee} /><span className="min-w-0 truncate">{employeeDisplayName(request.employee)}</span></button>)}{dayRequests.length > 3 && <button type="button" onClick={() => setTeamCalendarDate(dateKey(day))} className="w-full rounded-md px-1 py-1 text-left text-[9px] font-bold text-indigo-600 hover:bg-indigo-50">+{dayRequests.length - 3} more people</button>}</div></>}
                </div>;
              })}
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">{teamCalendarDate ? `Leave on ${formatDate(teamCalendarDate)}` : "Matching leave requests"}</h3>{filteredTeamLeave.length > 0 && <span className="text-[11px] font-semibold text-slate-500">Showing all {filteredTeamLeave.length} request{filteredTeamLeave.length === 1 ? "" : "s"} · scroll to view</span>}</div>
              {filteredTeamLeave.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">No leave requests match these filters.</p> : <div className="max-h-[min(55vh,390px)] space-y-2 overflow-y-auto overscroll-contain pr-1" aria-label="Matching leave requests" role="list">{filteredTeamLeave.map((request) => <button type="button" key={`detail-${request.id}`} onClick={() => setSelectedTeamLeave(request)} className="flex min-h-[66px] w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40" role="listitem"><span className="flex min-w-0 items-center gap-2.5"><EmployeeAvatar employee={request.employee} /><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-900">{employeeDisplayName(request.employee)} · {request.leaveType?.name || "Leave"}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{formatDate(request.startDate)} – {formatDate(request.endDate)} · {request.employee?.department?.name || "No department"}</span></span></span><span className="shrink-0 text-[11px] font-semibold text-indigo-600">View profile</span></button>)}</div>}
            </div>
          </section>

          {dateChanges.length > 0 && <section className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-xs sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Schedule changes</p><h2 className="mt-1 text-lg font-bold text-slate-900">Date-change approvals</h2><p className="mt-1 text-xs text-slate-600">Review employee requests to move an already-approved leave. The original leave remains unchanged until approval.</p></div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700">{dateChanges.length} pending</span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {dateChanges.map((change) => <article key={change.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{change.employee?.firstName} {change.employee?.lastName}</p><p className="mt-0.5 text-[11px] text-slate-500">{change.employee?.department?.name || "Department"} · {change.leaveRequest?.leaveType?.name || "Leave"}</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">PENDING</span></div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Current</p><p className="mt-1 font-semibold text-slate-700">{formatDate(change.oldStartDate)} – {formatDate(change.oldEndDate)}</p></div><span className="text-indigo-500">→</span><div><p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">Requested</p><p className="mt-1 font-semibold text-indigo-700">{formatDate(change.newStartDate)} – {formatDate(change.newEndDate)}</p></div></div>
                <p className="mt-3 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs leading-5 text-slate-600"><span className="font-bold text-slate-800">Reason: </span>{change.reason}</p>
                <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setDateChangeReview(change); setDateChangeReviewAction("REJECTED"); setDateChangeReviewNote(""); }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">Reject</button><button type="button" onClick={() => { setDateChangeReview(change); setDateChangeReviewAction("APPROVED"); setDateChangeReviewNote(""); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500">Approve change</button></div>
              </article>)}
            </div>
          </section>}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] table-auto text-left text-[13px] text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="whitespace-nowrap py-3.5 px-4">Employee</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Leave Type</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Dates</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Days</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Paid balance</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Reason</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Status</th>
                  <th className="whitespace-nowrap py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      No team leave requests found.
                    </td>
                  </tr>
                ) : (
                  teamRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition">
                      <td className="min-w-[170px] py-3.5 px-4">
                        <div className="whitespace-nowrap font-semibold text-slate-900">
                          {req.employee?.firstName} {req.employee?.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {req.employee?.department?.name || req.employee?.employeeCode}
                        </div>
                      </td>
                      <td className="min-w-[145px] py-3.5 px-4 font-medium text-slate-700">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span>{req.leaveType?.name || "Leave"}</span>
                          <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isPaidLeaveRequest(req) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                            {isPaidLeaveRequest(req) ? "Paid" : "Unpaid"}
                          </span>
                        </div>
                      </td>
                      <td className="min-w-[190px] whitespace-nowrap py-3.5 px-4 text-slate-600">
                        {formatDate(req.startDate)} - {formatDate(req.endDate)}
                      </td>
                      <td className="whitespace-nowrap py-3.5 px-4 font-bold text-indigo-600">
                        {req.totalDays}d
                      </td>
                      <td className="whitespace-nowrap py-3.5 px-4">
                        {!isPaidLeaveRequest(req) ? <span className="text-xs font-medium text-slate-400">Not applicable</span> : paidLeaveRemainingFor(req) === null ? <span className="text-xs text-slate-400">—</span> : <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{paidLeaveRemainingFor(req)}d</span>}
                      </td>
                      <td className="max-w-[260px] min-w-[180px] truncate py-3.5 px-4 text-slate-500" title={req.reason || "No reason provided."}>
                        {req.reason}
                      </td>
                      <td className="whitespace-nowrap py-3.5 px-4">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            req.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : req.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="min-w-[176px] whitespace-nowrap py-3.5 px-4 text-right">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewAction("APPROVED");
                                setReviewNote("");
                                setReviewModalOpen(true);
                              }}
                              className="inline-flex min-h-9 min-w-[74px] items-center justify-center whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewAction("REJECTED");
                                setReviewNote("");
                                setReviewModalOpen(true);
                              }}
                              className="inline-flex min-h-9 min-w-[68px] items-center justify-center whitespace-nowrap rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {selectedTeamLeave && (
        <Modal>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><EmployeeAvatar employee={selectedTeamLeave.employee} size="lg" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Employee leave profile</p><h2 className="mt-1 truncate text-lg font-bold">{employeeDisplayName(selectedTeamLeave.employee)}</h2><p className="mt-1 truncate text-xs text-slate-500">{selectedTeamLeave.employee?.employeeCode || "No employee code"} · {selectedTeamLeave.employee?.department?.name || "No department"}</p><p className="mt-1 truncate text-[11px] text-slate-400">{selectedTeamLeave.employee?.designation || "Employee"}{selectedTeamLeave.employee?.workEmail ? ` · ${selectedTeamLeave.employee.workEmail}` : ""}</p></div></div>
              <button type="button" onClick={() => setSelectedTeamLeave(null)} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">×</button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">Leave type</p><p className="mt-1 font-bold text-slate-900">{selectedTeamLeave.leaveType?.name || "Leave"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">Status</p><p className="mt-1 font-bold text-slate-900">{selectedTeamLeave.status}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">Dates</p><p className="mt-1 font-bold text-slate-900">{formatDate(selectedTeamLeave.startDate)} – {formatDate(selectedTeamLeave.endDate)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">Duration</p><p className="mt-1 font-bold text-slate-900">{selectedTeamLeave.totalDays} day{Number(selectedTeamLeave.totalDays) === 1 ? "" : "s"}</p></div></div>
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-slate-700"><p className="font-bold text-indigo-900">Reason</p><p className="mt-1">{selectedTeamLeave.reason || "No reason provided."}</p></div>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => setSelectedTeamLeave(null)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500">Close</button></div>
          </motion.div>
        </Modal>
      )}

      {/* Employee date-change request */}
      {dateChangeRequest && <Modal>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl text-slate-900">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Schedule change</p><h3 className="mt-1 text-lg font-bold">Move approved leave</h3><p className="mt-1 text-xs text-slate-500">Your HR/manager will review this change. Submit at least one day before the new leave date.</p></div><button type="button" onClick={() => setDateChangeRequest(null)} className="text-slate-400 hover:text-slate-700">×</button></div>
          <form onSubmit={submitDateChange} className="mt-5 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">Current dates: <span className="font-bold text-slate-900">{formatDate(dateChangeRequest.startDate)} – {formatDate(dateChangeRequest.endDate)}</span><br /><span className="text-[11px]">The number of leave days must remain the same.</span></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold text-slate-700">New start date</label><DatePicker value={dateChangeStart} onChange={setDateChangeStart} min={dateKey(addDays(new Date(), 1))} required /></div><div><label className="mb-1.5 block text-xs font-semibold text-slate-700">New end date</label><DatePicker value={dateChangeEnd} onChange={setDateChangeEnd} min={dateChangeStart || dateKey(addDays(new Date(), 1))} required /></div></div>
            <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason for change <span className="text-rose-500">*</span></label><Select value="" onChange={(event) => { if (event.target.value) setDateChangeReason(event.target.value); }} className="mb-2 w-full text-xs"><option value="">Choose a reason (optional)</option><option value="Personal emergency">Personal emergency</option><option value="Medical appointment">Medical appointment</option><option value="Family commitment">Family commitment</option><option value="Travel change">Travel change</option><option value="Work or handover requirement">Work or handover requirement</option><option value="Other">Other</option></Select><textarea value={dateChangeReason} onChange={(event) => setDateChangeReason(event.target.value.slice(0, 500))} rows={4} required placeholder="Explain why you need to move these dates" className="w-full resize-none rounded-xl border border-slate-300 p-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /><p className="mt-1 text-right text-[10px] text-slate-400">{dateChangeReason.length}/500</p></div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setDateChangeRequest(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={submittingDateChange || !dateChangeReason.trim()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">{submittingDateChange && <Loader2 className="h-4 w-4 animate-spin" />}Send for approval</button></div>
          </form>
        </motion.div>
      </Modal>}

      {/* HR/manager date-change review */}
      {dateChangeReview && <Modal>
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Schedule change review</p><h3 className="mt-1 text-lg font-bold">{dateChangeReviewAction === "APPROVED" ? "Approve date change" : "Reject date change"}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{dateChangeReview.employee?.firstName} {dateChangeReview.employee?.lastName} · {formatDate(dateChangeReview.oldStartDate)} – {formatDate(dateChangeReview.oldEndDate)} → {formatDate(dateChangeReview.newStartDate)} – {formatDate(dateChangeReview.newEndDate)}</p><form onSubmit={submitDateChangeReview} className="mt-4 space-y-4"><div><label className="mb-1.5 block text-xs font-semibold text-slate-700">{dateChangeReviewAction === "REJECTED" ? "Rejection reason" : "Reviewer note"}{dateChangeReviewAction === "REJECTED" && <span className="text-rose-500"> *</span>}</label><textarea value={dateChangeReviewNote} onChange={(event) => setDateChangeReviewNote(event.target.value.slice(0, 500))} rows={3} required={dateChangeReviewAction === "REJECTED"} placeholder={dateChangeReviewAction === "REJECTED" ? "Explain what needs to be corrected" : "Optional handover or scheduling note"} className="w-full resize-none rounded-xl border border-slate-300 p-3 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setDateChangeReview(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={submittingDateChangeReview || (dateChangeReviewAction === "REJECTED" && !dateChangeReviewNote.trim())} className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${dateChangeReviewAction === "APPROVED" ? "bg-emerald-600" : "bg-rose-600"}`}>{submittingDateChangeReview ? "Saving..." : `Confirm ${dateChangeReviewAction === "APPROVED" ? "approval" : "rejection"}`}</button></div></form></div>
      </Modal>}

      {/* Apply Leave Modal */}
      {applyModalOpen && (
        <Modal>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-2xl text-slate-900"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Apply for Leave
              </h3>
              <button
                onClick={() => { setApplyModalOpen(false); setSelectedTypeId(""); setStartDate(""); setEndDate(""); setIsHalfDay(false); setHalfDayPeriod("MORNING"); setReason(""); }}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplySubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Select Leave Category <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900"
                  required
                >
                  <option value="">Select a category...</option>
                  {selectableLeaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) - {t.daysAllowed} days quota
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => {
                      setStartDate(val);
                      if (isHalfDay && val) {
                        setEndDate(val);
                      } else if (endDate && val && val > endDate) {
                        setEndDate(val);
                      }
                    }}
                    placeholder="Select start date"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    min={startDate}
                    disabled={isHalfDay}
                    placeholder="Select end date"
                    required
                  />
                </div>
              </div>

              {departmentConflict?.department && (departmentConflict.approvedCount > 0 || departmentConflict.pendingCount > 0) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
                  <div className="flex items-start gap-2.5"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><p className="text-sm font-bold">Department availability notice</p><p className="mt-1 text-xs leading-5 text-amber-800">{departmentConflict.approvedCount} approved and {departmentConflict.pendingCount} pending leave request(s) from {departmentConflict.department.name || "your department"} overlap these dates. HR/Manager approval may require a handover plan.</p></div></div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={isHalfDay}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsHalfDay(checked);
                    if (checked && startDate) {
                      setEndDate(startDate);
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="halfDay" className="text-[13px] text-slate-700 font-medium cursor-pointer">
                  This is a Half-Day Leave (0.5 day)
                </label>
              </div>

              {isHalfDay && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Half-Day Timing <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={halfDayPeriod}
                    onChange={(e) => setHalfDayPeriod(e.target.value as "MORNING" | "AFTERNOON")}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900"
                    required
                  >
                    <option value="MORNING">Morning half-day — punch in after the company-hours midpoint</option>
                    <option value="AFTERNOON">Afternoon half-day — punch out by the company-hours midpoint</option>
                  </Select>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    The exact opening/closing time is calculated from your assigned shift hours.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Reason for Time-Off <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Family function, medical appointment, urgent personal work..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs resize-none text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setApplyModalOpen(false); setSelectedTypeId(""); setStartDate(""); setEndDate(""); setIsHalfDay(false); setHalfDayPeriod("MORNING"); setReason(""); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center gap-2 shadow-sm"
                >
                  {submittingApply && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Application
                </button>
              </div>
            </form>
          </motion.div>
        </Modal>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedRequest && (
        <Modal>
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${reviewAction === "APPROVED" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                {reviewAction === "APPROVED" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  {reviewAction === "APPROVED" ? "Approve leave request" : "Reject leave request"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  <span className="font-semibold text-slate-800">{selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}</span>
                  <span className="mx-1.5 text-slate-300">·</span>{selectedRequest.totalDays} day(s)
                </p>
              </div>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  {reviewAction === "REJECTED" ? "Why is this request being rejected?" : "Reviewer Note / Feedback"}
                  {reviewAction === "REJECTED" && <span className="ml-1 text-rose-600">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewAction === "APPROVED"
                      ? "e.g. Approved. Please ensure handoff of active tasks."
                      : "e.g. Rejected due to critical project release deadline."
                  }
                  className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview || (reviewAction === "REJECTED" && !reviewNote.trim())}
                  className={`inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                    reviewAction === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {submittingReview ? "Processing..." : `Confirm ${reviewAction}`}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
