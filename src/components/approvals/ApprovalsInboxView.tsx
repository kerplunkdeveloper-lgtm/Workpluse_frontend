"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { correctionsApi, leavesApi, permissionsApi, overtimeApi, expensesApi, compOffApi, dayOffWorkApi, shootRequestsApi } from "@/lib/api";
import { formatDate, formatTime, formatCurrency, unwrapList } from "@/lib/utils";
import {
  ShieldCheck,
  Clock,
  CalendarDays,
  Layers,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Sparkles,
  CalendarOff,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { confetti } from "@/lib/confetti";

type ApprovalCategory = "CORRECTIONS" | "LEAVES" | "PERMISSIONS" | "OVERTIME" | "EXPENSES" | "COMPOFF" | "DAYOFF" | "SHOOTS";

const DAY_KIND_LABEL: Record<string, string> = { WEEK_OFF: "Weekly off", HOLIDAY: "Holiday", COMPANY_LEAVE: "Company leave" };
const DAY_REASON_LABEL: Record<string, string> = { SHOOT: "Shoot", TRAVEL: "Travel", CLIENT_VISIT: "Client visit", OTHER: "Other company work" };
type CorrectionFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";
type RequestFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const CORRECTION_FILTERS: { value: CorrectionFilter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const dayOf = (value?: string | null) => (value ? formatDate(String(value).slice(0, 10)) : "—");

const minutesLabel = (minutes?: number | null) => {
  const total = Number(minutes || 0);
  if (!total) return "—";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
};

const personName = (emp: any) => `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Unknown employee";
const isShootCorrection = (correction: any) => String(correction?.attendance?.wfhNote || "").toUpperCase().startsWith("SHOOT:");

function StatusBadge({ status }: { status?: string }) {
  const tone =
    status === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "REJECTED"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tone}`}>
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "Pending"}
    </span>
  );
}

function PersonCell({ emp }: { emp: any }) {
  return (
    <td className="px-4 py-4">
      <p className="truncate font-semibold text-slate-900">{personName(emp)}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{emp?.department?.name || emp?.employeeCode || "—"}</p>
    </td>
  );
}

function ReasonCell({ text }: { text?: string | null }) {
  const reason = String(text || "No reason provided");
  return (
    <td className="px-4 py-4">
      <div className="group relative max-w-[260px]">
        <p className="truncate text-xs leading-5 text-slate-700" title={reason}>
          {reason}
        </p>
        <div
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-3rem))] rounded-xl bg-slate-950 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        >
          {reason}
          <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45 bg-slate-950" />
        </div>
      </div>
    </td>
  );
}

function ActionCell({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <td className="whitespace-nowrap px-4 py-4 text-right">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-500 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-px hover:bg-rose-100 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30"
        >
          <XCircle className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </td>
  );
}

function TableShell({ heads, children }: { heads: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50/90 text-[10px] uppercase tracking-[0.14em] text-slate-500">
          <tr>
            {heads.map((head, i) => (
              <th key={head} className={`px-4 py-3 font-semibold ${i === heads.length - 1 ? "text-right" : ""}`}>
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

const rowClass = "align-middle transition-colors hover:bg-indigo-50/[0.32]";

export default function ApprovalsInboxView() {
  const searchParams = useSearchParams();
  const requestedTab = String(searchParams?.get("tab") || "").toUpperCase() as ApprovalCategory;
  const requestedStatus = String(searchParams?.get("status") || "").toUpperCase() as RequestFilter;
  const [activeTab, setActiveTab] = useState<ApprovalCategory>(() => ["CORRECTIONS", "LEAVES", "PERMISSIONS", "OVERTIME", "EXPENSES", "COMPOFF", "DAYOFF", "SHOOTS"].includes(requestedTab) ? requestedTab : "CORRECTIONS");
  const [corrFilter, setCorrFilter] = useState<CorrectionFilter>("PENDING");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>(() => ["PENDING", "APPROVED", "REJECTED", "ALL"].includes(requestedStatus) ? requestedStatus : "ALL");
  const [corrRows, setCorrRows] = useState<any[]>([]);
  const [corrCounts, setCorrCounts] = useState<Record<string, number>>({});
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrSearch, setCorrSearch] = useState("");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [compOffs, setCompOffs] = useState<any[]>([]);
  const [dayOffWork, setDayOffWork] = useState<any[]>([]);
  const [shoots, setShoots] = useState<any[]>([]);
  const [approvedOvertimeMinutes, setApprovedOvertimeMinutes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();
  const isReviewer = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER" || role === "HR";

  useEffect(() => {
    if (["CORRECTIONS", "LEAVES", "PERMISSIONS", "OVERTIME", "EXPENSES", "COMPOFF", "DAYOFF", "SHOOTS"].includes(requestedTab)) setActiveTab(requestedTab);
    if (["PENDING", "APPROVED", "REJECTED", "ALL"].includes(requestedStatus)) setRequestFilter(requestedStatus);
  }, [requestedStatus, requestedTab]);

  const pendingCorrections = corrCounts.PENDING ?? 0;

  /** Regularization requests for the chosen status, with per-status counts for the filter chips. */
  const loadCorrections = async (filter: CorrectionFilter = corrFilter) => {
    setCorrLoading(true);
    try {
      const res = await correctionsApi.getCorrections({ status: filter, limit: 500 });
      setCorrRows(unwrapList(res));
      if (res?.counts) setCorrCounts(res.counts);
    } catch {
      toast.error("Could not load regularization requests.");
    } finally {
      setCorrLoading(false);
    }
  };

  const loadAllPending = async () => {
    setLoading(true);
    try {
      const [, leaveRes, permissionRes, otRes, expRes, compRes, dayOffRes, shootRes] = await Promise.allSettled([
        loadCorrections(),
        leavesApi.getAllLeaves({ status: "ALL", limit: 200 }),
        isReviewer ? permissionsApi.list({ status: "ALL" }) : permissionsApi.my(),
        overtimeApi.getPending(),
        expensesApi.getAllClaims(),
        compOffApi.getPending(),
        dayOffWorkApi.getRequests({ status: "PENDING" }),
        isReviewer ? shootRequestsApi.getAll({ status: "ALL" }) : shootRequestsApi.getMine(),
      ]);

      if (leaveRes.status === "fulfilled") {
        setLeaves(unwrapList(leaveRes.value));
      }
      if (permissionRes.status === "fulfilled") setPermissions(unwrapList(permissionRes.value));
      if (otRes.status === "fulfilled") {
        setOvertimes(unwrapList(otRes.value));
      }
      if (expRes.status === "fulfilled") {
        setExpenses(
          unwrapList(expRes.value).filter((e: any) => ["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(e.status)),
        );
      }
      if (compRes.status === "fulfilled") setCompOffs(unwrapList(compRes.value));
      if (dayOffRes.status === "fulfilled") setDayOffWork(unwrapList(dayOffRes.value));
      if (shootRes.status === "fulfilled") setShoots(unwrapList(shootRes.value));
    } catch (err) {
      console.error("Failed to load approvals inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReviewer]);

  const changeCorrectionFilter = (filter: CorrectionFilter) => {
    setCorrFilter(filter);
    loadCorrections(filter);
  };

  const visibleCorrections = useMemo(() => {
    const q = corrSearch.trim().toLowerCase();
    if (!q) return corrRows;
    return corrRows.filter((c) =>
      `${personName(c.employee)} ${c.employee?.employeeCode || ""} ${c.reason || ""}`.toLowerCase().includes(q),
    );
  }, [corrRows, corrSearch]);

  const review = async (
    toastId: string,
    loadingText: string,
    successText: (status: string) => string,
    run: () => Promise<any>,
    status: "APPROVED" | "REJECTED",
    after: () => Promise<unknown> | void = loadAllPending,
    celebrate = false,
  ) => {
    toast.loading(loadingText, { id: toastId });
    try {
      const res = await run();
      toast.dismiss(toastId);
      if (res?.success) {
        toast.success(successText(status));
        if (celebrate) confetti({ particleCount: 50, spread: 50 });
        await after();
      } else {
        toast.error(res?.message || "Action failed");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const handleReviewCorrection = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "corr-act",
      "Processing regularization decision...",
      (s) => `Attendance record updated and marked as ${s}!`,
      () => correctionsApi.review(id, { status, reviewNote: `Decision by HR or admin (${status})` }),
      status,
      () => loadCorrections(),
      true,
    );

  const handleReviewPermission = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "permission-act",
      "Processing permission approval...",
      (s) => `Permission request ${s.toLowerCase()}!`,
      () => permissionsApi.review(id, { status, note: "Reviewed in approvals inbox" }),
      status,
    );

  const handleReviewLeave = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "leave-act",
      "Processing leave review...",
      (s) => `Leave request ${s}!`,
      () => leavesApi.review(id, { status, reviewNote: `Decision by HR or admin (${status})` }),
      status,
      loadAllPending,
      true,
    );

  const handleReviewOvertime = (id: string, status: "APPROVED" | "REJECTED", requestedMinutes?: number) =>
    review(
      "ot-act",
      "Processing overtime approval...",
      (s) => `Overtime request ${s}!`,
      () => {
        const raw = approvedOvertimeMinutes[id];
        const numericApprovedMinutes = raw !== undefined && raw !== "" ? Number(raw) : NaN;
        if (status === "APPROVED" && (!Number.isInteger(numericApprovedMinutes) || numericApprovedMinutes < 0 || numericApprovedMinutes > Number(requestedMinutes || 0))) {
          throw new Error(`Approved minutes must be between 0 and ${requestedMinutes || 0}.`);
        }
        const approvedMinutes = status === "APPROVED" ? numericApprovedMinutes : undefined;
        return overtimeApi.review(id, { status, approvedMinutes, reviewNote: "Reviewed by HR or admin" });
      },
      status,
    );

  const handleReviewExpense = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "exp-act",
      "Reviewing expense claim...",
      (s) => `Expense claim ${s}!`,
      () => expensesApi.review(id, { status, reviewNote: "Finance review completed" }),
      status,
    );

  const handleReviewCompOff = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "compoff-act",
      "Reviewing comp-off request...",
      (s) => `Comp-off request ${s}!`,
      () => compOffApi.review(id, { status, reviewNote: "Reviewed in approvals inbox" }),
      status,
    );

  const handleReviewShoot = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "shoot-act",
      "Saving shoot decision...",
      (st) => `Shoot request ${st.toLowerCase()}!`,
      () => shootRequestsApi.review(id, { status, reviewNote: "Reviewed in approvals inbox" }),
      status,
    );

  const handleReviewDayOff = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "dayoff-act",
      "Saving your decision...",
      (st) => (st === "APPROVED" ? "Approved. The employee can punch in today." : "Request not approved."),
      () => dayOffWorkApi.review(id, { status }),
      status,
    );

  const totalPending = pendingCorrections + leaves.filter((row) => row.status === "PENDING").length + permissions.filter((row) => row.status === "PENDING").length + overtimes.length + expenses.length + compOffs.length + dayOffWork.length + shoots.filter((row) => row.status === "PENDING").length;

  const filterRequests = (rows: any[]) => requestFilter === "ALL" ? rows : rows.filter((row) => row.status === requestFilter);
  const visibleLeaves = filterRequests(leaves);
  const visiblePermissions = filterRequests(permissions);
  const visibleShoots = filterRequests(shoots);
  const requestFilters: { value: RequestFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

  const tabs: { key: ApprovalCategory; label: string; icon: React.ElementType; count: number }[] = [
    { key: "CORRECTIONS", label: "Punch & Shoot Time", icon: Clock, count: pendingCorrections },
    { key: "LEAVES", label: "Leave Requests", icon: CalendarDays, count: leaves.filter((row) => row.status === "PENDING").length },
    { key: "PERMISSIONS", label: "Permission approvals", icon: Clock, count: permissions.filter((row) => row.status === "PENDING").length },
    { key: "OVERTIME", label: "Overtime Credits", icon: Layers, count: overtimes.length },
    { key: "EXPENSES", label: "Expense Claims", icon: Wallet, count: expenses.length },
    { key: "COMPOFF", label: "Comp-Off", icon: Sparkles, count: compOffs.length },
    { key: "DAYOFF", label: "Day-off work", icon: CalendarOff, count: dayOffWork.length },
  ];

  const emptyNote = (text: string) => <div className="py-12 text-center text-xs text-slate-500">{text}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            Approvals inbox
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Centralized decision hub for employee regularization, shoot-time corrections, leave, overtime, and reimbursement requests
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          <span>{totalPending} Total Requests Awaiting Review</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === key
                ? "bg-indigo-600 text-white shadow"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {count > 0 && <span className="rounded-full bg-indigo-100 px-1.5 text-xs font-bold text-indigo-700">{count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab !== "CORRECTIONS" && activeTab !== "OVERTIME" && activeTab !== "EXPENSES" && activeTab !== "COMPOFF" && activeTab !== "DAYOFF" && (
          <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Request status filter">
            {requestFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={requestFilter === filter.value}
                onClick={() => setRequestFilter(filter.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${requestFilter === filter.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-500" />
            Loading approval items...
          </div>
        ) : activeTab === "CORRECTIONS" ? (
          <div className="space-y-4">
            {/* Status filter and search: every employee's requests, not only the pending ones */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Request status" className="flex flex-wrap gap-1.5">
                {CORRECTION_FILTERS.map(({ value, label }) => {
                  const active = corrFilter === value;
                  const count = value === "ALL" ? Object.values(corrCounts).reduce((a, b) => a + b, 0) : corrCounts[value] ?? 0;
                  return (
                    <button
                      key={value}
                      role="tab"
                      aria-selected={active}
                      onClick={() => changeCorrectionFilter(value)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                      <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-white text-slate-500"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative w-full sm:w-64">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={corrSearch}
                  onChange={(e) => setCorrSearch(e.target.value)}
                  placeholder="Search name, code or reason"
                  aria-label="Search regularization requests"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {corrLoading ? (
              <div className="py-12 text-center text-slate-500">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-indigo-500" />
              </div>
            ) : visibleCorrections.length === 0 ? (
              emptyNote(
                corrSearch.trim()
                  ? "No requests match your search."
                  : corrFilter === "PENDING"
                    ? "All attendance regularization requests are clear! No pending items."
                    : "No requests found for this filter.",
              )
            ) : (
              <TableShell heads={["Employee", "Date", "Request type", "Requested time", "Reason", corrFilter === "PENDING" ? "Action" : "Status"]}>
                {visibleCorrections.map((corr) => (
                  <tr key={corr.id} className={rowClass}>
                    <PersonCell emp={corr.employee} />
                    {/* The day being corrected, not the day the request was filed */}
                    <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{dayOf(corr.date || corr.attendance?.date)}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${isShootCorrection(corr) ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>{isShootCorrection(corr) ? "Shoot time" : "Attendance"}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                      <span className="font-medium text-slate-900">In</span> {corr.requestedCheckIn ? formatTime(corr.requestedCheckIn) : "—"}
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="font-medium text-slate-900">Out</span> {corr.requestedCheckOut ? formatTime(corr.requestedCheckOut) : "—"}
                    </td>
                    <ReasonCell text={corr.reason} />
                    {corr.status === "PENDING" ? (
                      <ActionCell onApprove={() => handleReviewCorrection(corr.id, "APPROVED")} onReject={() => handleReviewCorrection(corr.id, "REJECTED")} />
                    ) : (
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <StatusBadge status={corr.status} />
                      </td>
                    )}
                  </tr>
                ))}
              </TableShell>
            )}
          </div>
        ) : activeTab === "LEAVES" ? (
          visibleLeaves.length === 0 ? (
            emptyNote(requestFilter === "PENDING" ? "No pending leave requests awaiting your decision." : "No leave requests found for this filter.")
          ) : (
            <TableShell heads={["Employee", "Leave type", "Dates", "Reason", requestFilter === "PENDING" ? "Action" : "Status"]}>
              {visibleLeaves.map((leave) => (
                <tr key={leave.id} className={rowClass}>
                  <PersonCell emp={leave.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{leave.leaveType?.name || "Leave"}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                    {dayOf(leave.startDate)}
                    {String(leave.endDate).slice(0, 10) !== String(leave.startDate).slice(0, 10) && <> to {dayOf(leave.endDate)}</>}
                    <span className="ml-1.5 font-semibold text-slate-900">
                      ({Number(leave.totalDays || 1)} {Number(leave.totalDays || 1) === 1 ? "day" : "days"})
                    </span>
                  </td>
                  <ReasonCell text={leave.reason} />
                  {leave.status === "PENDING" ? <ActionCell onApprove={() => handleReviewLeave(leave.id, "APPROVED")} onReject={() => handleReviewLeave(leave.id, "REJECTED")} /> : <td className="whitespace-nowrap px-4 py-4 text-right"><StatusBadge status={leave.status} /></td>}
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "OVERTIME" ? (
          overtimes.length === 0 ? (
            emptyNote("No pending overtime accumulation claims.")
          ) : (
            <TableShell heads={["Employee", "Date", "Overtime requested", "Approve minutes", "Reason", "Action"]}>
              {overtimes.map((ot) => (
                <tr key={ot.id} className={rowClass}>
                  <PersonCell emp={ot.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{dayOf(ot.attendance?.date || ot.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">{minutesLabel(ot.requestedMinutes)}</td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min={0}
                      max={Number(ot.requestedMinutes || 0)}
                      step={1}
                      value={approvedOvertimeMinutes[ot.id] ?? String(ot.requestedMinutes || 0)}
                      onChange={(event) => setApprovedOvertimeMinutes((current) => ({ ...current, [ot.id]: event.target.value }))}
                      className="w-24 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      aria-label={`Approved overtime minutes for ${ot.employee?.firstName || "employee"}`}
                    />
                  </td>
                  <ReasonCell text={ot.reason} />
                  <ActionCell onApprove={() => handleReviewOvertime(ot.id, "APPROVED", Number(ot.requestedMinutes || 0))} onReject={() => handleReviewOvertime(ot.id, "REJECTED", Number(ot.requestedMinutes || 0))} />
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "EXPENSES" ? (
          expenses.length === 0 ? (
            emptyNote("No reimbursement claims pending review.")
          ) : (
            <TableShell heads={["Employee", "Date", "Claim", "Amount", "Action"]}>
              {expenses.map((claim) => (
                <tr key={claim.id} className={rowClass}>
                  <PersonCell emp={claim.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{dayOf(claim.date || claim.createdAt)}</td>
                  <td className="px-4 py-4">
                    <p className="truncate text-xs font-semibold text-slate-900" title={claim.title}>{claim.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{String(claim.category || "").replace(/_/g, " ").toLowerCase()}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-slate-900">{formatCurrency(Number(claim.amount || 0))}</td>
                  <ActionCell onApprove={() => handleReviewExpense(claim.id, "APPROVED")} onReject={() => handleReviewExpense(claim.id, "REJECTED")} />
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "PERMISSIONS" ? (
          visiblePermissions.length === 0 ? (
            emptyNote(requestFilter === "PENDING" ? "No pending permission approvals." : "No permission requests found for this filter.")
          ) : (
            <TableShell heads={["Employee", "Date", "Time", "Total", "Reason", requestFilter === "PENDING" ? "Action" : "Status"]}>
              {visiblePermissions.map((request) => (
                <tr key={request.id} className={rowClass}>
                  <PersonCell emp={request.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{dayOf(request.date)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">{request.startTime && request.endTime ? `${request.startTime} - ${request.endTime}` : "Legacy hours-only"}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">{Number(request.hours || 0)}h</td>
                  <ReasonCell text={request.reason} />
                  {request.status === "PENDING" ? <ActionCell onApprove={() => handleReviewPermission(request.id, "APPROVED")} onReject={() => handleReviewPermission(request.id, "REJECTED")} /> : <td className="whitespace-nowrap px-4 py-4 text-right"><StatusBadge status={request.status} /></td>}
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "SHOOTS" ? (
          visibleShoots.length === 0 ? (
            emptyNote(requestFilter === "PENDING" ? "No pending shoot requests." : "No shoot requests found for this filter.")
          ) : (
            <TableShell heads={["Employee", "Shoot", "Date", "Location", "People", requestFilter === "PENDING" ? "Action" : "Status"]}>
              {visibleShoots.map((req) => (
                <tr key={req.id} className={rowClass}>
                  <PersonCell emp={req.employee} />
                  <td className="px-4 py-4 text-xs font-semibold text-slate-900">{req.shootName}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{dayOf(req.date)}</td>
                  <td className="px-4 py-4 text-xs text-slate-600">{req.location}</td>
                  <td className="px-4 py-4 text-xs text-slate-600">{(req.participants || []).map((p: any) => personName(p.employee)).join(", ") || personName(req.employee)}</td>
                  {req.status === "PENDING" ? <ActionCell onApprove={() => handleReviewShoot(req.id, "APPROVED")} onReject={() => handleReviewShoot(req.id, "REJECTED")} /> : <td className="whitespace-nowrap px-4 py-4 text-right"><StatusBadge status={req.status} /></td>}
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "DAYOFF" ? (
          dayOffWork.length === 0 ? (
            emptyNote("No one is waiting to work on a weekly off, holiday or company leave.")
          ) : (
            <TableShell heads={["Employee", "Day", "Working on", "Details", "Action"]}>
              {dayOffWork.map((req) => (
                <tr key={req.id} className={rowClass}>
                  <PersonCell emp={req.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs">
                    <p className="font-medium text-slate-700">{dayOf(req.date)}</p>
                    <p className="mt-1 text-slate-500">{DAY_KIND_LABEL[req.dayKind] || "Day off"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">{DAY_REASON_LABEL[req.reasonType] || req.reasonType}</td>
                  <ReasonCell text={req.note} />
                  <ActionCell onApprove={() => handleReviewDayOff(req.id, "APPROVED")} onReject={() => handleReviewDayOff(req.id, "REJECTED")} />
                </tr>
              ))}
            </TableShell>
          )
        ) : compOffs.length === 0 ? (
          emptyNote("No comp-off requests pending review.")
        ) : (
          <TableShell heads={["Employee", "Date", "Days", "Reason", "Action"]}>
            {compOffs.map((tx) => (
              <tr key={tx.id} className={rowClass}>
                <PersonCell emp={tx.compOffBalance?.employee} />
                <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{dayOf(tx.referenceDate || tx.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">{Number(tx.days || 0)}</td>
                <ReasonCell text={tx.reason} />
                <ActionCell onApprove={() => handleReviewCompOff(tx.id, "APPROVED")} onReject={() => handleReviewCompOff(tx.id, "REJECTED")} />
              </tr>
            ))}
          </TableShell>
        )}
      </div>
    </div>
  );
}
