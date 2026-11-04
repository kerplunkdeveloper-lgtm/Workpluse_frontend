"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LeaveRequest, LeaveBalance, LeaveType } from "@/types";
import { leavesApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate, unwrapList } from "@/lib/utils";
import { CalendarDays, Plus, AlertCircle, Loader2, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock3, XCircle } from "lucide-react";
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

export default function LeavesView() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<"MY_LEAVES" | "PERMISSIONS" | "COMPANY_LEAVE" | "WORK_FROM_HOME" | "SHOOT_REQUESTS" | "SHOOT_SETTLEMENT" | "APPROVALS">("MY_LEAVES");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Apply Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");
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
  const canApplyLeave = selectableLeaveTypes.length > 0;

  const loadData = async () => {
    setLoading(true);
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
      if (eligibilityRes.status === "fulfilled") {
        setEligibility(eligibilityRes.value?.data || eligibilityRes.value);
      }

      if (canApprove) {
        try {
          const teamRes = await leavesApi.getAllLeaves();
          setTeamRequests(unwrapList(teamRes));
        } catch (err) {
          setLoadError("Team leave approvals are temporarily unavailable. Your personal leave data is still safe.");
          logClientError("leaves.approvals_load_failed", { error: err });
        }
      }
    } catch (err) {
      setLoadError("Leaves are temporarily unavailable. Please try again.");
      logClientError("leaves.load_failed", { error: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canApprove]);

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
        reason,
      });

      if (res?.success) {
        toast.success("Leave application submitted successfully!");
        setApplyModalOpen(false);
        setReason("");
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
            setApplyModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {paidLeaveEligibilityOpen ? "Apply for Leave" : "Apply for Unpaid Leave"}
        </button>
      </div>

      {typeof eligibility?.eligible === "boolean" && !eligibility.eligible && !isAdminRole && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="text-sm font-bold">Paid leave is not available yet</p><p className="mt-1 text-xs leading-5 text-amber-800">Paid leave and monthly permissions unlock after your {eligibility.probationMonths ?? 0}-month company eligibility period. {eligibility.remainingDays ?? 0} day(s) remain. Unpaid leave remains available for exceptional cases.</p>{!canApplyLeave && <p className="mt-2 text-xs font-bold text-amber-900">Your company has not configured an unpaid leave type yet. Please contact HR.</p>}</div></div>}
      {typeof eligibility?.eligible === "boolean" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Monthly permission</p><p className="mt-1 text-2xl font-bold text-indigo-950">{eligibility.monthlyPermissionHours ?? 0} hrs</p><p className="mt-1 text-xs text-indigo-700">Company allowance</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Eligibility status</p><p className="mt-1 text-sm font-bold text-slate-900">{eligibility.eligible ? "Active" : "Waiting period"}</p><p className="mt-1 text-xs text-slate-500">{eligibility.eligible ? "Leave and permission access is open" : `Unlocks in ${eligibility.remainingDays ?? 0} days`}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Policy window</p><p className="mt-1 text-sm font-bold text-slate-900">{eligibility.probationMonths ?? 0} months</p><p className="mt-1 text-xs text-slate-500">Configured by your company</p></div></div>}

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
            <span>Team Approvals</span>
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
                      role={day ? "button" : undefined}
                      tabIndex={day ? 0 : undefined}
                      onClick={() => {
                        if (!day || !canApplyLeave) return;
                        const selectedDay = dateKey(day);
                        setSelectedTypeId(selectableLeaveTypes[0]?.id || "");
                        setStartDate(selectedDay);
                        setEndDate(selectedDay);
                        setIsHalfDay(false);
                        setReason("");
                        setApplyModalOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (day && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          event.currentTarget.click();
                        }
                      }}
                      className={`min-h-[72px] rounded-xl border p-1.5 sm:min-h-[86px] sm:p-2 ${day ? "cursor-pointer border-slate-100 bg-slate-50/60 transition hover:border-indigo-200 hover:bg-indigo-50/50" : "border-transparent bg-transparent"} ${today ? "ring-2 ring-indigo-200" : ""} ${day && !canApplyLeave ? "cursor-not-allowed opacity-70" : ""}`}
                      title={day && canApplyLeave ? "Click to apply for leave on this date" : undefined}
                    >
                      {day && <>
                        <div className={`text-right text-xs font-bold ${today ? "text-indigo-600" : "text-slate-500"}`}>{day.getDate()}</div>
                        <div className="mt-1 space-y-1">
                          {dayRequests.slice(0, 2).map((request) => {
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
                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500"><span>{request.isHalfDay ? "Half day" : `${request.totalDays} day${Number(request.totalDays) === 1 ? "" : "s"}`}</span><span className="max-w-[65%] truncate text-right" title={request.reason}>{request.reason}</span></div>
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
                        {req.totalDays} {req.isHalfDay ? "(Half Day)" : "day(s)"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
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
                      <td className="py-3.5 px-4 text-slate-500 italic">
                        {req.reviewNote || "-"}
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
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Days</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      No team leave requests found.
                    </td>
                  </tr>
                ) : (
                  teamRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {req.employee?.firstName} {req.employee?.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {req.employee?.department?.name || req.employee?.employeeCode}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {req.leaveType?.name || "Leave"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(req.startDate)} - {formatDate(req.endDate)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">
                        {req.totalDays}d
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
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
                      <td className="py-3.5 px-4 text-right">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewAction("APPROVED");
                                setReviewModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewAction("REJECTED");
                                setReviewModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
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
      )}

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
                onClick={() => { setApplyModalOpen(false); setSelectedTypeId(""); setStartDate(""); setEndDate(""); setIsHalfDay(false); setReason(""); }}
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
                  onClick={() => { setApplyModalOpen(false); setSelectedTypeId(""); setStartDate(""); setEndDate(""); setIsHalfDay(false); setReason(""); }}
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
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-900">
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              {reviewAction === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Applicant:{" "}
              <span className="font-semibold text-slate-800">
                {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
              </span>{" "}
              ({selectedRequest.totalDays} day(s))
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Reviewer Note / Feedback
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
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs resize-none text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-5 py-2 rounded-xl text-white font-semibold text-sm transition shadow-sm ${
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
