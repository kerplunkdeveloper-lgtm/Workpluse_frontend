"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  correctionsApi,
  leavesApi,
  permissionsApi,
  overtimeApi,
  overtimeAllocationApi,
  expensesApi,
  compOffApi,
  dayOffWorkApi,
  shootRequestsApi,
  shootSettlementsApi,
  workFromHomeApi,
  branchesApi,
  employeesApi,
} from "@/lib/api";
import {
  formatDate,
  formatTime,
  formatCurrency,
  unwrapList,
} from "@/lib/utils";
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
  Filter,
  Sparkles,
  CalendarOff,
  Clapperboard,
  Home,
  Download,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { confetti } from "@/lib/confetti";

type ApprovalCategory =
  | "CORRECTIONS"
  | "LEAVES"
  | "PERMISSIONS"
  | "OVERTIME"
  | "OT_ALLOCATIONS"
  | "EXPENSES"
  | "COMPOFF"
  | "DAYOFF"
  | "SHOOTS"
  | "SHOOT_SETTLEMENTS"
  | "WORK_FROM_HOME";

const DAY_KIND_LABEL: Record<string, string> = {
  WEEK_OFF: "Weekly off",
  HOLIDAY: "Holiday",
  COMPANY_LEAVE: "Company leave",
};
const DAY_REASON_LABEL: Record<string, string> = {
  SHOOT: "Shoot",
  TRAVEL: "Travel",
  CLIENT_VISIT: "Client visit",
  OTHER: "Other company work",
};
type CorrectionFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";
type RequestFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";
type WorkflowStatus = RequestFilter;

const CORRECTION_FILTERS: { value: CorrectionFilter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const dayOf = (value?: string | null) =>
  value ? formatDate(String(value).slice(0, 10)) : "—";

const minutesLabel = (minutes?: number | null) => {
  const total = Number(minutes || 0);
  if (!total) return "—";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
};

const personName = (emp: any) =>
  `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Unknown employee";
const isShootCorrection = (correction: any) =>
  String(correction?.attendance?.wfhNote || "")
    .toUpperCase()
    .startsWith("SHOOT:");

const workflowDate = (row: any, category: ApprovalCategory) => {
  const value =
    category === "CORRECTIONS"
      ? row.date || row.attendance?.date
      : category === "LEAVES"
        ? row.startDate || row.date
        : category === "PERMISSIONS"
          ? row.date
          : category === "OVERTIME"
            ? row.attendance?.date || row.date || row.createdAt
            : category === "EXPENSES"
              ? row.date || row.expenseDate || row.createdAt
              : category === "COMPOFF"
                ? row.referenceDate || row.createdAt
                : category === "SHOOT_SETTLEMENTS"
                  ? row.shootDate || row.createdAt
                  : row.date || row.createdAt;
  return String(value || "").slice(0, 10);
};

const workflowEmployee = (row: any) =>
  row.employee || row.compOffBalance?.employee || row.attendance?.employee;

const workflowSearchText = (row: any) =>
  [
    personName(workflowEmployee(row)),
    workflowEmployee(row)?.employeeCode,
    row.reason,
    row.note,
    row.title,
    row.category,
    row.shootName,
    row.location,
    row.leaveType?.name,
    row.reasonType,
    row.shootRequest?.shootName,
    row.shootRequest?.location,
    row.employeeNote,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const matchesWorkflowStatus = (row: any, status: WorkflowStatus) => {
  if (status === "ALL") return true;
  const rowStatus = String(row.status || "PENDING").toUpperCase();
  return status === "PENDING"
    ? ["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(rowStatus)
    : rowStatus === status;
};

const APPROVAL_LABELS: Record<ApprovalCategory, string> = {
  CORRECTIONS: "Attendance correction",
  LEAVES: "Leave request",
  PERMISSIONS: "Permission request",
  OVERTIME: "Overtime request",
  OT_ALLOCATIONS: "Monthly overtime choice",
  EXPENSES: "Expense claim",
  COMPOFF: "Comp-off request",
  DAYOFF: "Day-off work",
  SHOOTS: "Shoot request",
  SHOOT_SETTLEMENTS: "Shoot settlement",
  WORK_FROM_HOME: "Work-from-home request",
};

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const approvalDetail = (row: any, category: ApprovalCategory) => {
  if (category === "LEAVES") return `${row.leaveType?.name || "Leave"} · ${Number(row.totalDays || 1)} day(s) · ${row.reason || "No reason"}`;
  if (category === "PERMISSIONS") return `${Number(row.hours || 0)}h · ${row.reason || "No reason"}`;
  if (category === "OVERTIME") return `${minutesLabel(row.requestedMinutes)} · ${row.reason || "No reason"}`;
  if (category === "EXPENSES") return `${row.title || "Claim"} · ${formatCurrency(Number(row.amount || 0))}`;
  if (category === "COMPOFF") return `${Number(row.days || 0)} day(s) · ${row.reason || "No reason"}`;
  if (category === "SHOOTS") return `${row.shootName || "Shoot"} · ${row.location || "No location"}`;
  if (category === "SHOOT_SETTLEMENTS") return `${row.shootRequest?.shootName || "Shoot settlement"} · ${minutesLabel(row.shootMinutes)} shoot · ${minutesLabel(row.travelMinutes)} travel · ${row.employeeNote || "No note"}`;
  if (category === "WORK_FROM_HOME") return `${row.reason || "No reason"}`;
  if (category === "DAYOFF") return `${DAY_KIND_LABEL[row.dayKind] || "Day off"} · ${DAY_REASON_LABEL[row.reasonType] || row.reasonType || ""} · ${row.note || "No details"}`;
  return `${row.requestedCheckIn ? formatTime(row.requestedCheckIn) : "—"} / ${row.requestedCheckOut ? formatTime(row.requestedCheckOut) : "—"} · ${row.reason || "No reason"}`;
};

const downloadApprovalCsv = (rows: any[], category: ApprovalCategory) => {
  const lines = [
    ["Employee", "Employee Code", "Workflow", "Date", "Status", "Details"].map(csvCell).join(","),
    ...rows.map((row) => [
      personName(workflowEmployee(row)),
      workflowEmployee(row)?.employeeCode || "—",
      APPROVAL_LABELS[category],
      workflowDate(row, category) || "—",
      row.status || "PENDING",
      approvalDetail(row, category),
    ].map(csvCell).join(",")),
  ];
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  link.download = `WorkPluse_Approvals_${category.toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

const printApprovalPdf = (rows: any[], category: ApprovalCategory) => {
  const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const body = rows.length
    ? rows.map((row, index) => `<tr><td>${index + 1}</td><td><b>${esc(personName(workflowEmployee(row)))}</b><br><span>${esc(workflowEmployee(row)?.employeeCode || "—")}</span></td><td>${esc(workflowDate(row, category) || "—")}</td><td>${esc(row.status || "PENDING")}</td><td>${esc(approvalDetail(row, category))}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty">No approval requests match these filters.</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(APPROVAL_LABELS[category])}</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial;color:#0f172a}header{border-bottom:2px solid #4f46e5;margin-bottom:16px;padding-bottom:10px}h1{margin:0 0 4px;font-size:20px}p{margin:0;color:#64748b}table{width:100%;border-collapse:collapse}th{background:#eef2ff;text-align:left;font-size:10px;text-transform:uppercase}th,td{padding:7px;border-bottom:1px solid #e2e8f0;vertical-align:top}td span{color:#64748b;font-size:10px}.empty{text-align:center;color:#94a3b8;padding:18px}</style></head><body><header><h1>${esc(APPROVAL_LABELS[category])}</h1><p>WorkPluse approvals · Generated ${esc(new Date().toLocaleString("en-IN"))} · ${rows.length} request(s)</p></header><table><thead><tr><th>#</th><th>Employee</th><th>Date</th><th>Status</th><th>Details</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) { frame.remove(); throw new Error("Could not prepare the PDF."); }
  doc.open(); doc.write(html); doc.close();
  win.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 1000));
  setTimeout(() => { win.focus(); win.print(); }, 250);
};

function StatusBadge({ status }: { status?: string }) {
  const tone =
    status === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "REJECTED"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tone}`}
    >
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "Pending"}
    </span>
  );
}

function PersonCell({ emp }: { emp: any }) {
  return (
    <td className="px-4 py-4">
      <p className="truncate font-semibold text-slate-900">{personName(emp)}</p>
      <p className="mt-1 truncate text-xs text-slate-500">
        {emp?.department?.name || emp?.employeeCode || "—"}
      </p>
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

function ActionCell({
  onApprove,
  onReject,
}: {
  onApprove: () => void;
  onReject: () => void;
}) {
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

function TableShell({
  heads,
  children,
}: {
  heads: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50/90 text-[10px] uppercase tracking-[0.14em] text-slate-500">
          <tr>
            {heads.map((head, i) => (
              <th
                key={head}
                className={`px-4 py-3 font-semibold ${i === heads.length - 1 ? "text-right" : ""}`}
              >
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
  const requestedTab = String(
    searchParams?.get("tab") || "",
  ).toUpperCase() as ApprovalCategory;
  const requestedStatus = String(
    searchParams?.get("status") || "",
  ).toUpperCase() as RequestFilter;
  const [activeTab, setActiveTab] = useState<ApprovalCategory>(() =>
    [
      "CORRECTIONS",
      "LEAVES",
      "PERMISSIONS",
      "OVERTIME",
      "EXPENSES",
      "COMPOFF",
      "DAYOFF",
      "SHOOTS",
      "WORK_FROM_HOME",
    ].includes(requestedTab)
      ? requestedTab
      : "CORRECTIONS",
  );
  const [corrFilter, setCorrFilter] = useState<CorrectionFilter>("PENDING");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>(() =>
    ["PENDING", "APPROVED", "REJECTED", "ALL"].includes(requestedStatus)
      ? requestedStatus
      : "ALL",
  );
  const [corrRows, setCorrRows] = useState<any[]>([]);
  const [corrCounts, setCorrCounts] = useState<Record<string, number>>({});
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrSearch, setCorrSearch] = useState("");
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [employeeBranchMap, setEmployeeBranchMap] = useState<Record<string, string | null>>({});
  const [workflowFrom, setWorkflowFrom] = useState("");
  const [workflowTo, setWorkflowTo] = useState("");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [overtimeAllocations, setOvertimeAllocations] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [compOffs, setCompOffs] = useState<any[]>([]);
  const [dayOffWork, setDayOffWork] = useState<any[]>([]);
  const [shoots, setShoots] = useState<any[]>([]);
  const [shootSettlements, setShootSettlements] = useState<any[]>([]);
  const [workFromHomeRequests, setWorkFromHomeRequests] = useState<any[]>([]);
  const [approvedOvertimeMinutes, setApprovedOvertimeMinutes] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"CSV" | "PDF" | null>(null);
  const { role } = useAuth();
  const isReviewer =
    role === "SUPER_ADMIN" ||
    role === "COMPANY_ADMIN" ||
    role === "MANAGER" ||
    role === "HR";

  useEffect(() => {
    if (
      [
        "CORRECTIONS",
        "LEAVES",
        "PERMISSIONS",
        "OVERTIME",
        "OT_ALLOCATIONS",
        "EXPENSES",
        "COMPOFF",
        "DAYOFF",
        "SHOOTS",
        "WORK_FROM_HOME",
      ].includes(requestedTab)
    )
      setActiveTab(requestedTab);
    if (["PENDING", "APPROVED", "REJECTED", "ALL"].includes(requestedStatus))
      setRequestFilter(requestedStatus);
  }, [requestedStatus, requestedTab]);

  const pendingCorrections = corrCounts.PENDING ?? 0;

  /** Regularization requests for the chosen status, with per-status counts for the filter chips. */
  const loadCorrections = async (filter: CorrectionFilter = corrFilter) => {
    setCorrLoading(true);
    try {
      const res = await correctionsApi.getCorrections({
        status: filter,
        limit: 500,
      });
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
      const [
        ,
        leaveRes,
        permissionRes,
        otRes,
        otAllocationRes,
        expRes,
        compRes,
        dayOffRes,
        shootRes,
        shootSettlementRes,
        wfhRes,
        branchRes,
        employeeRes,
      ] = await Promise.allSettled([
        loadCorrections(),
        leavesApi.getAllLeaves({ status: "ALL", limit: 200 }),
        isReviewer
          ? permissionsApi.list({ status: "ALL" })
          : permissionsApi.my(),
        isReviewer ? overtimeApi.getAll({ status: "ALL" }) : overtimeApi.getMy(),
        isReviewer ? overtimeAllocationApi.getAll({ status: "ALL" }) : Promise.resolve(null),
        expensesApi.getAllClaims(),
        isReviewer ? compOffApi.getAll() : compOffApi.getHistory(),
        dayOffWorkApi.getRequests({ status: "ALL" }),
        isReviewer
          ? shootRequestsApi.getAll({ status: "ALL" })
          : shootRequestsApi.getMine(),
        isReviewer
          ? shootSettlementsApi.getAll("ALL")
          : shootSettlementsApi.getMine(),
        isReviewer
          ? workFromHomeApi.getAll({ status: "ALL" })
          : Promise.resolve(null),
        isReviewer ? branchesApi.list() : Promise.resolve(null),
        isReviewer ? employeesApi.list({ limit: 500 }) : Promise.resolve(null),
      ]);

      if (leaveRes.status === "fulfilled") {
        setLeaves(unwrapList(leaveRes.value));
      }
      if (permissionRes.status === "fulfilled")
        setPermissions(unwrapList(permissionRes.value));
      if (otRes.status === "fulfilled") {
        setOvertimes(unwrapList(otRes.value));
      }
      if (otAllocationRes.status === "fulfilled" && otAllocationRes.value)
        setOvertimeAllocations(unwrapList(otAllocationRes.value));
      if (expRes.status === "fulfilled") {
        setExpenses(unwrapList(expRes.value));
      }
      if (compRes.status === "fulfilled")
        setCompOffs(unwrapList(compRes.value));
      if (dayOffRes.status === "fulfilled")
        setDayOffWork(unwrapList(dayOffRes.value));
      if (shootRes.status === "fulfilled")
        setShoots(unwrapList(shootRes.value));
      if (shootSettlementRes.status === "fulfilled")
        setShootSettlements(unwrapList(shootSettlementRes.value));
      if (wfhRes.status === "fulfilled" && wfhRes.value)
        setWorkFromHomeRequests(unwrapList(wfhRes.value));
      if (branchRes.status === "fulfilled" && branchRes.value)
        setBranchOptions(unwrapList(branchRes.value));
      if (employeeRes.status === "fulfilled" && employeeRes.value) {
        const branchMap: Record<string, string | null> = {};
        unwrapList(employeeRes.value).forEach((employee: any) => {
          branchMap[employee.id] = employee.branchId || employee.branch?.id || null;
        });
        setEmployeeBranchMap(branchMap);
      }
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

  const workflowBranchId = (row: any) => {
    const employee = workflowEmployee(row);
    return employee?.branchId || employee?.branch?.id || employeeBranchMap[employee?.id] || "UNASSIGNED";
  };

  const filterWorkflowRows = (rows: any[], category: ApprovalCategory) =>
    rows.filter((row) => {
      const date = workflowDate(row, category);
      const search = workflowSearch.trim().toLowerCase();
      return (
        matchesWorkflowStatus(row, workflowStatus) &&
        (branchFilter === "ALL" || workflowBranchId(row) === branchFilter) &&
        (!search || workflowSearchText(row).includes(search)) &&
        (!workflowFrom || !date || date >= workflowFrom) &&
        (!workflowTo || !date || date <= workflowTo)
      );
    });

  const visibleCorrections = useMemo(() => {
    const q = corrSearch.trim().toLowerCase();
    return filterWorkflowRows(corrRows, "CORRECTIONS").filter((c) =>
      !q || `${personName(c.employee)} ${c.employee?.employeeCode || ""} ${c.reason || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [corrRows, corrSearch, workflowSearch, workflowStatus, branchFilter, employeeBranchMap, workflowFrom, workflowTo]);

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
      toast.error(
        err.response?.data?.message || err.message || "Action failed",
      );
    }
  };

  const handleReviewCorrection = (
    id: string,
    status: "APPROVED" | "REJECTED",
  ) =>
    review(
      "corr-act",
      "Processing regularization decision...",
      (s) => `Attendance record updated and marked as ${s}!`,
      () =>
        correctionsApi.review(id, {
          status,
          reviewNote: `Decision by HR or admin (${status})`,
        }),
      status,
      () => loadCorrections(),
      true,
    );

  const handleReviewPermission = (
    id: string,
    status: "APPROVED" | "REJECTED",
  ) =>
    review(
      "permission-act",
      "Processing permission approval...",
      (s) => `Permission request ${s.toLowerCase()}!`,
      () =>
        permissionsApi.review(id, {
          status,
          note: "Reviewed in approvals inbox",
        }),
      status,
    );

  const handleReviewLeave = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "leave-act",
      "Processing leave review...",
      (s) => `Leave request ${s}!`,
      () =>
        leavesApi.review(id, {
          status,
          reviewNote: `Decision by HR or admin (${status})`,
        }),
      status,
      loadAllPending,
      true,
    );

  const handleReviewOvertime = (
    id: string,
    status: "APPROVED" | "REJECTED",
    requestedMinutes?: number,
  ) =>
    review(
      "ot-act",
      "Processing overtime approval...",
      (s) => `Overtime request ${s}!`,
      () => {
        const raw = approvedOvertimeMinutes[id];
        // The approval input is shown in hours for people, but the API and
        // payroll ledger remain minute-based.  Convert only at this boundary.
        const requested = Number(requestedMinutes || 0);
        const numericApprovedHours =
          raw !== undefined && raw !== "" ? Number(raw) : requested / 60;
        const numericApprovedMinutes = Number.isFinite(numericApprovedHours)
          ? Math.round(numericApprovedHours * 60)
          : NaN;
        if (
          status === "APPROVED" &&
          (!Number.isFinite(numericApprovedHours) ||
            numericApprovedHours < 0 ||
            !Number.isInteger(numericApprovedMinutes) ||
            numericApprovedMinutes < 0 ||
            numericApprovedMinutes > requested)
        ) {
          throw new Error(
            `Approved time must be between 0 and ${minutesLabel(requested)} (${(requested / 60).toFixed(2)} hours).`,
          );
        }
        const approvedMinutes =
          status === "APPROVED" ? numericApprovedMinutes : undefined;
        return overtimeApi.review(id, {
          status,
          approvedMinutes,
          reviewNote: "Reviewed by HR or admin",
        });
      },
      status,
    );

  const handleReviewExpense = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "exp-act",
      "Reviewing expense claim...",
      (s) => `Expense claim ${s}!`,
      () =>
        expensesApi.review(id, {
          status,
          reviewNote: "Finance review completed",
        }),
      status,
    );

  const handleReviewCompOff = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "compoff-act",
      "Reviewing comp-off request...",
      (s) => `Comp-off request ${s}!`,
      () =>
        compOffApi.review(id, {
          status,
          reviewNote: "Reviewed in approvals inbox",
        }),
      status,
    );

  const handleReviewShoot = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "shoot-act",
      "Saving shoot decision...",
      (st) => `Shoot request ${st.toLowerCase()}!`,
      () =>
        shootRequestsApi.review(id, {
          status,
          reviewNote: "Reviewed in approvals inbox",
        }),
      status,
    );

  const handleReviewShootSettlement = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "shoot-settlement-act",
      "Saving shoot settlement decision...",
      (st) => `Shoot settlement ${st.toLowerCase()}!`,
      () => shootSettlementsApi.review(id, { status, reviewNote: "Reviewed in approvals inbox" }),
      status,
    );

  const handleReviewShootSettlementOvertime = (
    id: string,
    kind: "SHOOT" | "TRAVEL",
    status: "APPROVED" | "REJECTED",
    minutes: number,
  ) => {
    if (kind === "TRAVEL" && status === "APPROVED") {
      const enteredHours = window.prompt(
        "Enter approved travel OT hours (for example, 2.5 = 2h 30m). You can correct this later.",
        minutes > 0 ? String(minutes / 60) : "0",
      );
      if (enteredHours === null) return;
      const hours = Number(enteredHours);
      if (!Number.isFinite(hours) || hours < 0) {
        toast.error("Enter a valid non-negative travel OT amount.");
        return;
      }
      minutes = Math.round(hours * 60);
    }
    const reviewNote = status === "REJECTED"
      ? window.prompt(`Reason for rejecting ${kind.toLowerCase()} overtime`)
      : undefined;
    if (status === "REJECTED" && !reviewNote?.trim()) return;
    return review(
      `shoot-${kind.toLowerCase()}-ot-act`,
      `Saving ${kind.toLowerCase()} overtime decision...`,
      (st) => `${kind === "TRAVEL" ? "Travel" : "Shoot"} overtime ${st.toLowerCase()}!`,
      () => shootSettlementsApi.reviewOvertime(id, {
        kind,
        status,
        reviewNote,
        approvedShootOtMinutes: kind === "SHOOT" ? minutes : undefined,
        approvedTravelOtMinutes: kind === "TRAVEL" ? minutes : undefined,
      }),
      status,
    );
  };

  const handleReviewWorkFromHome = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "wfh-act",
      "Saving WFH decision...",
      (st) => `Work-from-home request ${st.toLowerCase()}!`,
      () => workFromHomeApi.review(id, { status, reviewNote: "Reviewed in approvals inbox" }),
      status,
    );

  const handleReviewDayOff = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "dayoff-act",
      "Saving your decision...",
      (st) =>
        st === "APPROVED"
          ? "Approved. The employee can punch in today."
          : "Request not approved.",
      () => dayOffWorkApi.review(id, { status }),
      status,
    );

  const totalPending =
    pendingCorrections +
    leaves.filter((row) => row.status === "PENDING").length +
    permissions.filter((row) => row.status === "PENDING").length +
    overtimes.filter((row) => row.status === "PENDING").length +
    overtimeAllocations.filter((row) => row.status === "PENDING").length +
    expenses.filter((row) => ["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(String(row.status))).length +
    compOffs.filter((row) => row.status === "PENDING").length +
    dayOffWork.filter((row) => row.status === "PENDING").length +
    shoots.filter((row) => row.status === "PENDING").length +
    shootSettlements.filter((row) => row.status === "PENDING").length +
    workFromHomeRequests.filter((row) => row.status === "PENDING").length;

  const filterRequests = (rows: any[]) =>
    requestFilter === "ALL"
      ? rows
      : rows.filter((row) => String(row.status || "PENDING").toUpperCase() === requestFilter);
  const visibleLeaves = filterWorkflowRows(filterRequests(leaves), "LEAVES");
  const visiblePermissions = filterWorkflowRows(filterRequests(permissions), "PERMISSIONS");
  const visibleShoots = filterWorkflowRows(filterRequests(shoots), "SHOOTS");
  const visibleShootSettlements = filterWorkflowRows(filterRequests(shootSettlements), "SHOOT_SETTLEMENTS");
  const visibleWorkFromHome = filterWorkflowRows(filterRequests(workFromHomeRequests), "WORK_FROM_HOME");
  const visibleOvertimes = filterWorkflowRows(filterRequests(overtimes), "OVERTIME");
  const visibleOvertimeAllocations = filterWorkflowRows(filterRequests(overtimeAllocations), "OT_ALLOCATIONS");
  const visibleExpenses = filterWorkflowRows(filterRequests(expenses), "EXPENSES");
  const visibleCompOffs = filterWorkflowRows(filterRequests(compOffs), "COMPOFF");
  const visibleDayOffWork = filterWorkflowRows(filterRequests(dayOffWork), "DAYOFF");
  const visibleApprovalRows = activeTab === "CORRECTIONS"
    ? visibleCorrections
    : activeTab === "LEAVES"
      ? visibleLeaves
      : activeTab === "PERMISSIONS"
        ? visiblePermissions
        : activeTab === "OVERTIME"
          ? visibleOvertimes
      : activeTab === "OT_ALLOCATIONS"
        ? visibleOvertimeAllocations
          : activeTab === "EXPENSES"
            ? visibleExpenses
            : activeTab === "COMPOFF"
              ? visibleCompOffs
              : activeTab === "DAYOFF"
                ? visibleDayOffWork
                : activeTab === "SHOOTS"
                  ? visibleShoots
                  : activeTab === "SHOOT_SETTLEMENTS"
                    ? visibleShootSettlements
                  : visibleWorkFromHome;

  const exportApprovals = (kind: "CSV" | "PDF") => {
    setExporting(kind);
    try {
      if (kind === "CSV") downloadApprovalCsv(visibleApprovalRows, activeTab);
      else printApprovalPdf(visibleApprovalRows, activeTab);
      toast.success(kind === "CSV" ? "Approval list CSV downloaded." : "PDF print dialog opened. Choose Save as PDF.");
    } catch (error: any) {
      toast.error(error?.message || "Could not export approval list.");
    } finally {
      setExporting(null);
    }
  };
  const requestFilters: { value: RequestFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

  const tabs: {
    key: ApprovalCategory;
    label: string;
    icon: React.ElementType;
    count: number;
  }[] = [
    {
      key: "CORRECTIONS",
      label: "Punch & Correction Time",
      icon: Clock,
      count: pendingCorrections,
    },
    {
      key: "SHOOTS",
      label: "Shoot requests",
      icon: Clapperboard,
      count: shoots.filter((row) => row.status === "PENDING").length,
    },
    {
      key: "WORK_FROM_HOME",
      label: "Work from home",
      icon: Home,
      count: workFromHomeRequests.filter((row) => row.status === "PENDING").length,
    },
    {
      key: "LEAVES",
      label: "Leave Requests",
      icon: CalendarDays,
      count: leaves.filter((row) => row.status === "PENDING").length,
    },
    {
      key: "PERMISSIONS",
      label: "Permission approvals",
      icon: Clock,
      count: permissions.filter((row) => row.status === "PENDING").length,
    },
    {
      key: "OVERTIME",
      label: "Overtime Credits",
      icon: Layers,
      count: overtimes.filter((row) => row.status === "PENDING").length,
    },
    {
      key: "OT_ALLOCATIONS",
      label: "Monthly OT choices",
      icon: Wallet,
      count: overtimeAllocations.filter((row) => row.status === "PENDING").length,
    },
    {
      key: "EXPENSES",
      label: "Expense Claims",
      icon: Wallet,
      count: expenses.filter((row) => ["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(String(row.status))).length,
    },
    {
      key: "COMPOFF",
      label: "Comp-Off",
      icon: Sparkles,
      count: compOffs.filter((row) => row.status === "PENDING").length,
    },
    {
      key: "DAYOFF",
      label: "Day-off work",
      icon: CalendarOff,
      count: dayOffWork.filter((row) => row.status === "PENDING").length,
    },
  ];

  const emptyNote = (text: string) => (
    <div className="py-12 text-center text-xs text-slate-500">{text}</div>
  );

  const handleReviewOvertimeAllocation = (id: string, status: "APPROVED" | "REJECTED") =>
    review(
      "overtime-allocation-act",
      "Saving monthly overtime choice...",
      (st) => `Monthly overtime choice ${st.toLowerCase()}!`,
      () => overtimeAllocationApi.review(id, { status, reviewNote: "Reviewed in approvals inbox" }),
      status,
    );

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
            Centralized decision hub for employee regularization, shoot-time
            corrections, leave, overtime, and reimbursement requests
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isReviewer && (
            <>
              <button type="button" onClick={() => exportApprovals("CSV")} disabled={Boolean(exporting)} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
                <Download className="h-3.5 w-3.5" /> {exporting === "CSV" ? "Preparing…" : "Download CSV"}
              </button>
              <button type="button" onClick={() => exportApprovals("PDF")} disabled={Boolean(exporting)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">
                <FileDown className="h-3.5 w-3.5" /> Download PDF
              </button>
            </>
          )}
          <div className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            <span>{totalPending} Total Requests Awaiting Review</span>
          </div>
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
            {count > 0 && (
              <span className="rounded-full bg-indigo-100 px-1.5 text-xs font-bold text-indigo-700">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isReviewer && (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/45 p-4" aria-label="Approval workflow filters">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Filter className="h-4 w-4 text-indigo-600" />
              Find approval work
            </div>
            {(workflowSearch || workflowStatus !== "ALL" || branchFilter !== "ALL" || workflowFrom || workflowTo) && (
              <button
                type="button"
                onClick={() => { setWorkflowSearch(""); setWorkflowStatus("ALL"); setBranchFilter("ALL"); setWorkflowFrom(""); setWorkflowTo(""); }}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1.5fr)_minmax(150px,.8fr)_minmax(150px,.8fr)_minmax(145px,.65fr)_minmax(145px,.65fr)]">
            <label className="relative block">
              <span className="sr-only">Search approvals</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={workflowSearch} onChange={(event) => setWorkflowSearch(event.target.value)} placeholder="Search employee, reason, request..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="block">
              <span className="sr-only">Workflow status</span>
              <select value={workflowStatus} onChange={(event) => setWorkflowStatus(event.target.value as WorkflowStatus)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="ALL">All statuses</option>
                <option value="PENDING">Needs action</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Branch</span>
              <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} aria-label="Filter approvals by branch" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="ALL">All branches</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
                <option value="UNASSIGNED">No branch assigned</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">From date</span>
              <input type="date" value={workflowFrom} onChange={(event) => setWorkflowFrom(event.target.value)} aria-label="Filter approvals from date" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="block">
              <span className="sr-only">To date</span>
              <input type="date" value={workflowTo} onChange={(event) => setWorkflowTo(event.target.value)} aria-label="Filter approvals to date" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Filters apply to the selected approval workflow tab and keep your role-based approval actions unchanged.</p>
        </section>
      )}

      {/* Tab Panels */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab !== "CORRECTIONS" && (
            <div
              className="mb-4 flex flex-wrap items-center gap-2"
              role="tablist"
              aria-label="Request status filter"
            >
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
              <div
                role="tablist"
                aria-label="Request status"
                className="flex flex-wrap gap-1.5"
              >
                {CORRECTION_FILTERS.map(({ value, label }) => {
                  const active = corrFilter === value;
                  const count =
                    value === "ALL"
                      ? Object.values(corrCounts).reduce((a, b) => a + b, 0)
                      : (corrCounts[value] ?? 0);
                  return (
                    <button
                      key={value}
                      role="tab"
                      aria-selected={active}
                      onClick={() => changeCorrectionFilter(value)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                      <span
                        className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-white text-slate-500"}`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative w-full sm:w-64">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
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
              <TableShell
                heads={[
                  "Employee",
                  "Date",
                  "Request type",
                  "Requested time",
                  "Reason",
                  corrFilter === "PENDING" ? "Action" : "Status",
                ]}
              >
                {visibleCorrections.map((corr) => (
                  <tr key={corr.id} className={rowClass}>
                    <PersonCell emp={corr.employee} />
                    {/* The day being corrected, not the day the request was filed */}
                    <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                      {dayOf(corr.date || corr.attendance?.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${isShootCorrection(corr) ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}
                      >
                        {isShootCorrection(corr) ? "Shoot time" : "Attendance"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                      <span className="font-medium text-slate-900">In</span>{" "}
                      {corr.requestedCheckIn
                        ? formatTime(corr.requestedCheckIn)
                        : "—"}
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="font-medium text-slate-900">
                        Out
                      </span>{" "}
                      {corr.requestedCheckOut
                        ? formatTime(corr.requestedCheckOut)
                        : "—"}
                    </td>
                    <ReasonCell text={corr.reason} />
                    {corr.status === "PENDING" ? (
                      <ActionCell
                        onApprove={() =>
                          handleReviewCorrection(corr.id, "APPROVED")
                        }
                        onReject={() =>
                          handleReviewCorrection(corr.id, "REJECTED")
                        }
                      />
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
            emptyNote(
              requestFilter === "PENDING"
                ? "No pending leave requests awaiting your decision."
                : "No leave requests found for this filter.",
            )
          ) : (
            <TableShell
              heads={[
                "Employee",
                "Leave type",
                "Dates",
                "Reason",
                requestFilter === "PENDING" ? "Action" : "Status",
              ]}
            >
              {visibleLeaves.map((leave) => (
                <tr key={leave.id} className={rowClass}>
                  <PersonCell emp={leave.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                    {leave.leaveType?.name || "Leave"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                    {dayOf(leave.startDate)}
                    {String(leave.endDate).slice(0, 10) !==
                      String(leave.startDate).slice(0, 10) && (
                      <> to {dayOf(leave.endDate)}</>
                    )}
                    <span className="ml-1.5 font-semibold text-slate-900">
                      ({Number(leave.totalDays || 1)}{" "}
                      {Number(leave.totalDays || 1) === 1 ? "day" : "days"})
                    </span>
                  </td>
                  <ReasonCell text={leave.reason} />
                  {leave.status === "PENDING" ? (
                    <ActionCell
                      onApprove={() => handleReviewLeave(leave.id, "APPROVED")}
                      onReject={() => handleReviewLeave(leave.id, "REJECTED")}
                    />
                  ) : (
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <StatusBadge status={leave.status} />
                    </td>
                  )}
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "OVERTIME" ? (
          visibleOvertimes.length === 0 ? (
            emptyNote("No pending overtime accumulation claims.")
          ) : (
            <TableShell
              heads={[
                "Employee",
                "Date",
                "Overtime requested",
                "Approve hours",
                "Reason",
                requestFilter === "PENDING" ? "Action" : "Status",
              ]}
            >
              {visibleOvertimes.map((ot) => (
                <tr key={ot.id} className={rowClass}>
                  <PersonCell emp={ot.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                    {dayOf(ot.attendance?.date || ot.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">
                    {minutesLabel(ot.requestedMinutes)}
                    <span className="ml-1 text-slate-500">({(Number(ot.requestedMinutes || 0) / 60).toFixed(2)}h)</span>
                  </td>
                  {String(ot.status || "PENDING").toUpperCase() === "PENDING" ? (
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min={0}
                        max={Number(ot.requestedMinutes || 0) / 60}
                        step={0.25}
                        value={
                          approvedOvertimeMinutes[ot.id] ??
                          String((Number(ot.requestedMinutes || 0) / 60).toFixed(2))
                        }
                        onChange={(event) =>
                          setApprovedOvertimeMinutes((current) => ({
                            ...current,
                            [ot.id]: event.target.value,
                          }))
                        }
                        className="w-24 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        aria-label={`Approved overtime hours for ${ot.employee?.firstName || "employee"}`}
                      />
                    </td>
                  ) : (
                    <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-emerald-700">
                      {String(ot.status || "").toUpperCase() === "APPROVED"
                        ? `${(Number(ot.approvedMinutes ?? ot.requestedMinutes ?? 0) / 60).toFixed(2)}h`
                        : "—"}
                    </td>
                  )}
                  <ReasonCell text={ot.reason} />
                  {String(ot.status || "PENDING").toUpperCase() === "PENDING" ? (
                    <ActionCell
                      onApprove={() =>
                        handleReviewOvertime(
                          ot.id,
                          "APPROVED",
                          Number(ot.requestedMinutes || 0),
                        )
                      }
                      onReject={() =>
                        handleReviewOvertime(
                          ot.id,
                          "REJECTED",
                          Number(ot.requestedMinutes || 0),
                        )
                      }
                    />
                  ) : (
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <StatusBadge status={ot.status} />
                    </td>
                  )}
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "OT_ALLOCATIONS" ? (
          visibleOvertimeAllocations.length === 0 ? (
            emptyNote("No monthly overtime choices for this filter.")
          ) : (
            <TableShell heads={["Employee", "Month", "Approved OT", "Permission", "Leave", "Comp-off", "Cash payroll", "Action"]}>
              {visibleOvertimeAllocations.map((allocation) => (
                <tr key={allocation.id} className={rowClass}>
                  <PersonCell emp={allocation.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{allocation.month}/{allocation.year}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-indigo-700">{minutesLabel(allocation.approvedMinutes)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{minutesLabel(allocation.permissionMinutes)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{minutesLabel(allocation.leaveMinutes)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{minutesLabel(allocation.compOffMinutes)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-emerald-700">{minutesLabel(allocation.cashMinutes)}</td>
                  <td className="px-4 py-4 text-right">{allocation.status === "PENDING" ? <ActionCell onApprove={() => handleReviewOvertimeAllocation(allocation.id, "APPROVED")} onReject={() => handleReviewOvertimeAllocation(allocation.id, "REJECTED")} /> : <StatusBadge status={allocation.status} />}</td>
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "EXPENSES" ? (
          visibleExpenses.length === 0 ? (
            emptyNote("No reimbursement claims pending review.")
          ) : (
            <TableShell
              heads={["Employee", "Date", "Claim", "Amount", "Action"]}
            >
              {visibleExpenses.map((claim) => (
                <tr key={claim.id} className={rowClass}>
                  <PersonCell emp={claim.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                    {dayOf(claim.date || claim.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <p
                      className="truncate text-xs font-semibold text-slate-900"
                      title={claim.title}
                    >
                      {claim.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {String(claim.category || "")
                        .replace(/_/g, " ")
                        .toLowerCase()}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-slate-900">
                    {formatCurrency(Number(claim.amount || 0))}
                  </td>
                  <ActionCell
                    onApprove={() => handleReviewExpense(claim.id, "APPROVED")}
                    onReject={() => handleReviewExpense(claim.id, "REJECTED")}
                  />
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "PERMISSIONS" ? (
          visiblePermissions.length === 0 ? (
            emptyNote(
              requestFilter === "PENDING"
                ? "No pending permission approvals."
                : "No permission requests found for this filter.",
            )
          ) : (
            <TableShell
              heads={[
                "Employee",
                "Date",
                "Time",
                "Total",
                "Reason",
                requestFilter === "PENDING" ? "Action" : "Status",
              ]}
            >
              {visiblePermissions.map((request) => (
                <tr key={request.id} className={rowClass}>
                  <PersonCell emp={request.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                    {dayOf(request.date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">
                    {request.startTime && request.endTime
                      ? `${request.startTime} - ${request.endTime}`
                      : "Legacy hours-only"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">
                    {Number(request.hours || 0)}h
                  </td>
                  <ReasonCell text={request.reason} />
                  {request.status === "PENDING" ? (
                    <ActionCell
                      onApprove={() =>
                        handleReviewPermission(request.id, "APPROVED")
                      }
                      onReject={() =>
                        handleReviewPermission(request.id, "REJECTED")
                      }
                    />
                  ) : (
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <StatusBadge status={request.status} />
                    </td>
                  )}
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "SHOOTS" ? (
          visibleShoots.length === 0 ? (
            emptyNote(
              requestFilter === "PENDING"
                ? "No pending shoot requests."
                : "No shoot requests found for this filter.",
            )
          ) : (
            <TableShell
              heads={[
                "Employee",
                "Shoot",
                "Date",
                "Location",
                "People",
                requestFilter === "PENDING" ? "Action" : "Status",
              ]}
            >
              {visibleShoots.map((req) => (
                <tr key={req.id} className={rowClass}>
                  <PersonCell emp={req.employee} />
                  <td className="px-4 py-4 text-xs font-semibold text-slate-900">
                    {req.shootName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                    {dayOf(req.date)}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    {req.location}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    {(req.participants || [])
                      .map((p: any) => personName(p.employee))
                      .join(", ") || personName(req.employee)}
                  </td>
                  {req.status === "PENDING" ? (
                    <ActionCell
                      onApprove={() => handleReviewShoot(req.id, "APPROVED")}
                      onReject={() => handleReviewShoot(req.id, "REJECTED")}
                    />
                  ) : (
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <StatusBadge status={req.status} />
                    </td>
                  )}
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "SHOOT_SETTLEMENTS" ? (
          visibleShootSettlements.length === 0 ? (
            emptyNote(
              requestFilter === "PENDING"
                ? "No pending shoot settlements."
                : "No shoot settlements found for this filter.",
            )
          ) : (
            <TableShell heads={["Employee", "Shoot", "Date", "Shoot time", "Travel", "Claims", "Status / action"]}>
              {visibleShootSettlements.map((settlement) => (
                <tr key={settlement.id} className={rowClass}>
                  <PersonCell emp={settlement.employee} />
                  <td className="px-4 py-4 text-xs font-semibold text-slate-900">
                    <p>{settlement.shootRequest?.shootName || "Shoot settlement"}</p>
                    <p className="mt-1 font-normal text-slate-500">{settlement.shootRequest?.location || "No location"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{dayOf(settlement.shootDate)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                    {settlement.shootStart && settlement.shootEnd ? `${formatTime(settlement.shootStart)} - ${formatTime(settlement.shootEnd)}` : minutesLabel(settlement.shootMinutes)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{minutesLabel(settlement.travelMinutes)}{settlement.returnedNextDay ? " · next day" : ""}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                    {formatCurrency(Number(settlement.approvedAllowanceAmount ?? 0) + Number(settlement.approvedExpenseAmount ?? 0))}
                    {settlement.employeeNote && <p className="mt-1 max-w-40 truncate text-[11px] text-slate-400" title={settlement.employeeNote}>{settlement.employeeNote}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <div className="flex min-w-56 flex-col items-end gap-2">
                      {settlement.status === "PENDING" && <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleReviewShootSettlement(settlement.id, "APPROVED")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" />Approve settlement</button>
                        <button type="button" onClick={() => handleReviewShootSettlement(settlement.id, "REJECTED")} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"><XCircle className="h-3.5 w-3.5" />Reject settlement</button>
                      </div>}
                      {settlement.shootOvertimeStatus === "PENDING" && <div className="flex items-center justify-end gap-2 text-[11px]">
                        <span className="font-semibold text-violet-700">Shoot OT {minutesLabel(settlement.shootOvertimeMinutes)}</span>
                        <button type="button" onClick={() => handleReviewShootSettlementOvertime(settlement.id, "SHOOT", "APPROVED", Number(settlement.shootOvertimeMinutes || 0))} className="font-bold text-emerald-700 hover:underline">Approve</button>
                        <button type="button" onClick={() => handleReviewShootSettlementOvertime(settlement.id, "SHOOT", "REJECTED", 0)} className="font-bold text-rose-700 hover:underline">Reject</button>
                      </div>}
                      {settlement.travelOvertimeStatus !== "REJECTED" && settlement.status !== "REJECTED" && <div className="flex items-center justify-end gap-2 text-[11px]">
                        <span className="font-semibold text-orange-700">Travel {minutesLabel(settlement.travelMinutes)} · approved OT {minutesLabel(settlement.approvedTravelOtMinutes || 0)}</span>
                        <button type="button" onClick={() => handleReviewShootSettlementOvertime(settlement.id, "TRAVEL", "APPROVED", Number(settlement.approvedTravelOtMinutes || 0))} className="font-bold text-emerald-700 hover:underline">{settlement.travelOvertimeStatus === "APPROVED" ? "Correct OT" : "Enter OT"}</button>
                        {settlement.travelOvertimeStatus === "PENDING" && <button type="button" onClick={() => handleReviewShootSettlementOvertime(settlement.id, "TRAVEL", "REJECTED", 0)} className="font-bold text-rose-700 hover:underline">Reject</button>}
                      </div>}
                      {settlement.status !== "PENDING" && settlement.shootOvertimeStatus !== "PENDING" && settlement.travelOvertimeStatus !== "PENDING" && <StatusBadge status={settlement.status} />}
                    </div>
                  </td>
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "WORK_FROM_HOME" ? (
          visibleWorkFromHome.length === 0 ? (
            emptyNote(
              requestFilter === "PENDING"
                ? "No pending work-from-home requests."
                : "No work-from-home requests found for this filter.",
            )
          ) : (
            <TableShell heads={["Employee", "Dates", "Reason", "Status / action"]}>
              {visibleWorkFromHome.map((request) => (
                <tr key={request.id} className={rowClass}>
                  <PersonCell emp={request.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                    {dayOf(request.startDate)}{String(request.endDate).slice(0, 10) !== String(request.startDate).slice(0, 10) && <> to {dayOf(request.endDate)}</>}
                  </td>
                  <ReasonCell text={request.reason} />
                  {request.status === "PENDING" ? (
                    <ActionCell
                      onApprove={() => handleReviewWorkFromHome(request.id, "APPROVED")}
                      onReject={() => handleReviewWorkFromHome(request.id, "REJECTED")}
                    />
                  ) : (
                    <td className="whitespace-nowrap px-4 py-4 text-right"><StatusBadge status={request.status} /></td>
                  )}
                </tr>
              ))}
            </TableShell>
          )
        ) : activeTab === "DAYOFF" ? (
          visibleDayOffWork.length === 0 ? (
            emptyNote(
              "No one is waiting to work on a weekly off, holiday or company leave.",
            )
          ) : (
            <TableShell
              heads={["Employee", "Day", "Working on", "Details", "Action"]}
            >
              {visibleDayOffWork.map((req) => (
                <tr key={req.id} className={rowClass}>
                  <PersonCell emp={req.employee} />
                  <td className="whitespace-nowrap px-4 py-4 text-xs">
                    <p className="font-medium text-slate-700">
                      {dayOf(req.date)}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {DAY_KIND_LABEL[req.dayKind] || "Day off"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">
                    {DAY_REASON_LABEL[req.reasonType] || req.reasonType}
                  </td>
                  <ReasonCell text={req.note} />
                  <ActionCell
                    onApprove={() => handleReviewDayOff(req.id, "APPROVED")}
                    onReject={() => handleReviewDayOff(req.id, "REJECTED")}
                  />
                </tr>
              ))}
            </TableShell>
          )
        ) : visibleCompOffs.length === 0 ? (
          emptyNote("No comp-off requests pending review.")
        ) : (
          <TableShell heads={["Employee", "Date", "Days", "Reason", "Action"]}>
            {visibleCompOffs.map((tx) => (
              <tr key={tx.id} className={rowClass}>
                <PersonCell emp={tx.compOffBalance?.employee} />
                <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                  {dayOf(tx.referenceDate || tx.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-900">
                  {Number(tx.days || 0)}
                </td>
                <ReasonCell text={tx.reason} />
                <ActionCell
                  onApprove={() => handleReviewCompOff(tx.id, "APPROVED")}
                  onReject={() => handleReviewCompOff(tx.id, "REJECTED")}
                />
              </tr>
            ))}
          </TableShell>
        )}
      </div>
    </div>
  );
}
