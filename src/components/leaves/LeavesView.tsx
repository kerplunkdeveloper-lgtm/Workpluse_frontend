"use client";

import React, { useState, useEffect } from "react";
import { LeaveRequest, LeaveBalance, LeaveType } from "@/types";
import { leavesApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate, unwrapList } from "@/lib/utils";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Layers,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "@/components/ui/DatePicker";
import PermissionRequestsPanel from "./PermissionRequestsPanel";
import CompanyLeavePanel from "./CompanyLeavePanel";
import { confirmDialog } from "@/components/ui/confirmDialog";

export default function LeavesView() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<"MY_LEAVES" | "PERMISSIONS" | "COMPANY_LEAVE" | "APPROVALS">("MY_LEAVES");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Apply Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [submittingApply, setSubmittingApply] = useState(false);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const canApprove = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER";

  const loadData = async () => {
    setLoading(true);
    try {
      const [typesRes, balRes, myRes, eligibilityRes] = await Promise.allSettled([
        leavesApi.getTypes(),
        leavesApi.getBalances(),
        leavesApi.getMyLeaves(),
        leavesApi.getEligibility(),
      ]);

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
        const teamRes = await leavesApi.getAllLeaves();
        setTeamRequests(unwrapList(teamRes));
      }
    } catch (err) {
      console.error("Failed to load leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canApprove]);

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
        isHalfDay,
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Apply CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-indigo-600" />
            Leave Entitlements & Time Off
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track statutory leave quotas, submit time-off applications, and review team requests
          </p>
        </div>

        <button
          disabled={eligibility && !eligibility.eligible}
          onClick={() => {
            if (leaveTypes.length > 0 && !selectedTypeId) {
              setSelectedTypeId(leaveTypes[0].id);
            }
            setApplyModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {eligibility && !eligibility.eligible && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="text-sm font-bold">Leave eligibility is in progress</p><p className="mt-1 text-xs leading-5 text-amber-800">Paid leave and monthly permissions unlock after your {eligibility.probationMonths}-month company eligibility period. {eligibility.remainingDays} day(s) remain. Unpaid leave can still be requested for exceptional cases.</p></div></div>}
      {eligibility && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Monthly permission</p><p className="mt-1 text-2xl font-bold text-indigo-950">{eligibility.monthlyPermissionHours} hrs</p><p className="mt-1 text-xs text-indigo-700">Company allowance</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Eligibility status</p><p className="mt-1 text-sm font-bold text-slate-900">{eligibility.eligible ? "Active" : "Waiting period"}</p><p className="mt-1 text-xs text-slate-500">{eligibility.eligible ? "Leave and permission access is open" : `Unlocks in ${eligibility.remainingDays} days`}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Policy window</p><p className="mt-1 text-sm font-bold text-slate-900">{eligibility.probationMonths} months</p><p className="mt-1 text-xs text-slate-500">Configured by your company</p></div></div>}

      {/* Leave Quota Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.length === 0 ? (
          <>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Casual Leave (CL)</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Standard
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">12</span>
                <span className="text-xs text-slate-500">/ 12 days remaining</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Sick Leave (SL)</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Paid
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-600">10</span>
                <span className="text-xs text-slate-500">/ 10 days remaining</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Privilege / Earned (EL)</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  Accrued
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-sky-600">15</span>
                <span className="text-xs text-slate-500">/ 15 days remaining</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Comp-Off Credit</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Rest Day OT
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-600">2</span>
                <span className="text-xs text-slate-500">days accrued</span>
              </div>
            </div>
          </>
        ) : (
          balances.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">
                  {b.leaveType?.name || "Leave Quota"}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {b.leaveType?.code || "LEAVE"}
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

      {(role === "SUPER_ADMIN" || role === "COMPANY_ADMIN") && (
        <div className="bg-white rounded-2xl border p-4 flex flex-wrap gap-2 text-xs items-end">
          <input id="lt-name" placeholder="Type name" className="px-3 py-2 rounded-xl border" />
          <input id="lt-code" placeholder="Code" className="w-20 px-3 py-2 rounded-xl border" />
          <input id="lt-days" type="number" placeholder="Days" className="w-20 px-3 py-2 rounded-xl border" />
          <button
            onClick={async () => {
              const name = (document.getElementById("lt-name") as HTMLInputElement)?.value;
              const code = (document.getElementById("lt-code") as HTMLInputElement)?.value;
              const daysAllowed = Number((document.getElementById("lt-days") as HTMLInputElement)?.value || 12);
              const res = await leavesApi.createType({ name, code, daysAllowed, isPaid: true });
              if (res?.success) {
                toast.success("Leave type created");
                loadData();
              } else toast.error(res?.message || "Failed");
            }}
            className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-semibold"
          >
            Add type
          </button>
          <button
            onClick={async () => {
              const y = new Date().getFullYear();
              const res = await leavesApi.carryForward({ fromYear: y - 1, toYear: y, maxDays: 15 });
              if (res?.success) toast.success(`Carried ${res.data?.balancesUpdated || 0} balances`);
              else toast.error(res?.message || "Failed");
            }}
            className="px-3 py-2 rounded-xl border font-semibold"
          >
            Carry forward last year
          </button>
          {leaveTypes.map((t) => (
            <button
              key={t.id}
              onClick={async () => {
                if (!(await confirmDialog({ title: `Delete ${t.name}?`, message: "Existing requests keep their record, but this leave type can no longer be used.", confirmLabel: "Delete" }))) return;
                await leavesApi.deleteType(t.id);
                loadData();
              }}
              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700"
            >
              Delete {t.code}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("MY_LEAVES")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeTab === "MY_LEAVES"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          My Leave Applications ({myRequests.length})
        </button>

        <button
          onClick={() => setActiveTab("PERMISSIONS")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeTab === "PERMISSIONS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Permissions
        </button>

        <button
          onClick={() => setActiveTab("COMPANY_LEAVE")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeTab === "COMPANY_LEAVE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Company leave
        </button>

        {canApprove && (
          <button
            onClick={() => setActiveTab("APPROVALS")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
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
      {activeTab === "PERMISSIONS" && <PermissionRequestsPanel canReview={canApprove} />}

      {/* Tab Content: Company leave */}
      {activeTab === "COMPANY_LEAVE" && <CompanyLeavePanel canManage={canApprove} />}

      {/* Tab Content: My Leaves */}
      {activeTab === "MY_LEAVES" && (
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Apply for Leave
              </h3>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Select Leave Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900"
                  required
                >
                  <option value="">Select a category...</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) - {t.daysAllowed} days quota
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => {
                      setStartDate(val);
                      if (endDate && val && val > endDate) {
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
                  onChange={(e) => setIsHalfDay(e.target.checked)}
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
                  onClick={() => setApplyModalOpen(false)}
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
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
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
        </div>
      )}
    </div>
  );
}
