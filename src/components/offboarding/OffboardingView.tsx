"use client";

import React, { useState, useEffect } from "react";
import { EmployeeExit, Employee } from "@/types";
import { offboardingApi, employeesApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/** Readable pipeline status: who has to act next while a resignation is pending. */
const exitStatusLabel = (status: string) =>
  status === "RESIGNED" ? "AWAITING HR" : status === "UNDER_HR_REVIEW" ? "AWAITING ADMIN" : status.replace(/_/g, " ");
import { formatCurrency, formatDate } from "@/lib/utils";
import ExitDocumentsModal from "./ExitDocumentsModal";
import {
  UserMinus,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  ChevronRight,
  Loader2,
  Calculator,
  Printer,
  Award,
  ScrollText,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Send,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function OffboardingView() {
  const { role } = useAuth();
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const [noticeSummary, setNoticeSummary] = useState<any>(null);
  const [exits, setExits] = useState<EmployeeExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Exit Detail Modal State
  const [selectedExit, setSelectedExit] = useState<EmployeeExit | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "OVERVIEW" | "CLEARANCES" | "SETTLEMENT" | "INTERVIEW" | "DOCUMENTS"
  >("OVERVIEW");
  const [detailLoading, setDetailLoading] = useState(false);

  // Initiate Exit Modal State
  const [initiateModalOpen, setInitiateModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [initiateEmployeeId, setInitiateEmployeeId] = useState("");
  const [initiateExitType, setInitiateExitType] = useState<string>("RESIGNATION");
  const [initiateReason, setInitiateReason] = useState("");
  const [initiateComments, setInitiateComments] = useState("");
  const [initiateNoticeDays, setInitiateNoticeDays] = useState("30");
  const [initiateLwd, setInitiateLwd] = useState("");
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);

  // Documents Modal State
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [activeDocType, setActiveDocType] = useState<
    "FF_STATEMENT" | "CLEARANCE_CERTIFICATE" | "RELIEVING_LETTER" | "EXPERIENCE_LETTER"
  >("FF_STATEMENT");

  // HR Review Action State
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [approvedLwdInput, setApprovedLwdInput] = useState("");
  const [noticeDaysInput, setNoticeDaysInput] = useState("30");
  const [isNoticeWaivedInput, setIsNoticeWaivedInput] = useState(false);
  const [hrNotesInput, setHrNotesInput] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Settlement Override Form State
  const [leaveEncashmentDaysInput, setLeaveEncashmentDaysInput] = useState("");
  const [lopDaysInput, setLopDaysInput] = useState("0");
  const [reimbursementsInput, setReimbursementsInput] = useState("");
  const [gratuityInput, setGratuityInput] = useState("0");
  const [otherDeductionsInput, setOtherDeductionsInput] = useState("0");
  const [isCalculatingSettlement, setIsCalculatingSettlement] = useState(false);

  // Disburse & Terminate State
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [paymentReferenceInput, setPaymentReferenceInput] = useState("");
  const [disburseRemarksInput, setDisburseRemarksInput] = useState("");
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Exit Interview State
  const [reasonCategoryInput, setReasonCategoryInput] = useState("BETTER_OFFER");
  const [whatWeDidWellInput, setWhatWeDidWellInput] = useState("");
  const [whatCanWeImproveInput, setWhatCanWeImproveInput] = useState("");
  const [interviewNotesInput, setInterviewNotesInput] = useState("");
  const [managementScore, setManagementScore] = useState("5");
  const [cultureScore, setCultureScore] = useState("5");
  const [payScore, setPayScore] = useState("4");
  const [isSavingInterview, setIsSavingInterview] = useState(false);

  const loadExits = async () => {
    setLoading(true);
    try {
      const res = await offboardingApi.list({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      if (res?.success && res.data) {
        setExits(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load exit pipeline");
    } finally {
      setLoading(false);
    }
    try {
      const summary = await offboardingApi.noticeSummary();
      setNoticeSummary(summary?.data || null);
    } catch {
      setNoticeSummary(null);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeesApi.list();
      if (res?.success) {
        setEmployees((res.data || res.employees || []).filter((e: Employee) => e.status === "ACTIVE"));
      }
    } catch (err) {
      console.warn("Could not fetch active employees for dropdown:", err);
    }
  };

  useEffect(() => {
    loadExits();
  }, [statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const openExitDetails = async (exitId: string) => {
    setDetailLoading(true);
    try {
      const res = await offboardingApi.getById(exitId);
      if (res?.success && res.data) {
        const exit = res.data;
        setSelectedExit(exit);
        setApprovedLwdInput(
          exit.approvedLastWorkingDate
            ? exit.approvedLastWorkingDate.split("T")[0]
            : exit.preferredLastWorkingDate
            ? exit.preferredLastWorkingDate.split("T")[0]
            : ""
        );
        setNoticeDaysInput(String(exit.noticePeriodDays || 30));
        setIsNoticeWaivedInput(Boolean(exit.isNoticeWaived));
        setHrNotesInput(exit.hrNotes || "");

        // Set settlement defaults if available
        if (exit.finalSettlement) {
          setLeaveEncashmentDaysInput(String(exit.finalSettlement.leaveEncashmentDays || 0));
          setLopDaysInput(String(exit.finalSettlement.lopDays || 0));
          setReimbursementsInput(String(exit.finalSettlement.pendingReimbursements || 0));
          setGratuityInput(String(exit.finalSettlement.gratuityOrBonus || 0));
          setOtherDeductionsInput(String(exit.finalSettlement.otherDeductions || 0));
        }

        // Set interview defaults
        if (exit.interview) {
          setReasonCategoryInput(exit.interview.reasonCategory || "BETTER_OFFER");
          setWhatWeDidWellInput(exit.interview.whatWeDidWell || "");
          setWhatCanWeImproveInput(exit.interview.whatCanWeImprove || "");
          setInterviewNotesInput(exit.interview.notes || "");
          if (exit.interview.feedbackRatings) {
            setManagementScore(String(exit.interview.feedbackRatings.managementRating || 5));
            setCultureScore(String(exit.interview.feedbackRatings.cultureRating || 5));
            setPayScore(String(exit.interview.feedbackRatings.payRating || 4));
          }
        }
      }
    } catch (err: any) {
      toast.error("Failed to load exit details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInitiateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initiateEmployeeId || !initiateReason) {
      toast.error("Please select an employee and state the reason");
      return;
    }

    setIsSubmittingExit(true);
    try {
      const res = await offboardingApi.initiate({
        employeeId: initiateEmployeeId,
        exitType: initiateExitType,
        reason: initiateReason,
        employeeComments: initiateComments,
        noticePeriodDays: Number(initiateNoticeDays) || 30,
        preferredLastWorkingDate: initiateLwd || undefined,
      });

      if (res?.success) {
        toast.success("Exit process initiated with department clearances");
        setInitiateModalOpen(false);
        setInitiateEmployeeId("");
        setInitiateReason("");
        setInitiateComments("");
        loadExits();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to initiate exit");
    } finally {
      setIsSubmittingExit(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedExit) return;
    setIsReviewing(true);
    try {
      // HR forwards to an admin; only an admin approves or rejects.
      const action = isAdmin ? reviewAction : "FORWARD";
      const res = await offboardingApi.review(selectedExit.id, {
        action,
        approvedLastWorkingDate: approvedLwdInput || undefined,
        noticePeriodDays: Number(noticeDaysInput) || 30,
        isNoticeWaived: isNoticeWaivedInput,
        hrNotes: hrNotesInput,
      });

      if (res?.success) {
        toast.success(
          action === "FORWARD"
            ? "Forwarded to admin for approval"
            : action === "APPROVE"
              ? "Resignation approved & notice active"
              : "Resignation rejected",
        );
        setHrNotesInput("");
        openExitDetails(selectedExit.id);
        loadExits();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record HR review");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleClearanceChange = async (clearanceId: string, status: any, recoveryAmount: number, remarks: string) => {
    if (!selectedExit) return;
    try {
      const res = await offboardingApi.updateClearance(selectedExit.id, clearanceId, {
        status,
        recoveryAmount,
        remarks,
      });
      if (res?.success) {
        toast.success("Clearance updated");
        openExitDetails(selectedExit.id);
        loadExits();
      }
    } catch (err: any) {
      toast.error("Failed to update clearance");
    }
  };

  const handleCalculateSettlement = async () => {
    if (!selectedExit) return;
    setIsCalculatingSettlement(true);
    try {
      const res = await offboardingApi.calculateSettlement(selectedExit.id, {
        leaveEncashmentDays: leaveEncashmentDaysInput ? Number(leaveEncashmentDaysInput) : undefined,
        lopDays: lopDaysInput ? Number(lopDaysInput) : undefined,
        pendingReimbursements: reimbursementsInput ? Number(reimbursementsInput) : undefined,
        gratuityOrBonus: gratuityInput ? Number(gratuityInput) : undefined,
        otherDeductions: otherDeductionsInput ? Number(otherDeductionsInput) : undefined,
      });

      if (res?.success) {
        toast.success("Full & Final settlement updated");
        openExitDetails(selectedExit.id);
        loadExits();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Settlement calculation error");
    } finally {
      setIsCalculatingSettlement(false);
    }
  };

  const handleDisburseAndTerminate = async () => {
    if (!selectedExit) return;
    setIsDisbursing(true);
    try {
      const res = await offboardingApi.disburseAndTerminate(selectedExit.id, {
        paymentReference: paymentReferenceInput || `NEFT-WP-${Date.now().toString().slice(-6)}`,
        remarks: disburseRemarksInput,
      });

      if (res?.success) {
        toast.success("Settlement disbursed and employee terminated");
        setDisburseModalOpen(false);
        openExitDetails(selectedExit.id);
        loadExits();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Termination disbursement failed");
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExit) return;
    setIsSavingInterview(true);
    try {
      const res = await offboardingApi.saveInterview(selectedExit.id, {
        reasonCategory: reasonCategoryInput,
        feedbackRatings: {
          managementRating: Number(managementScore),
          cultureRating: Number(cultureScore),
          payRating: Number(payScore),
        },
        whatWeDidWell: whatWeDidWellInput,
        whatCanWeImprove: whatCanWeImproveInput,
        notes: interviewNotesInput,
      });

      if (res?.success) {
        toast.success("Exit interview saved");
        openExitDetails(selectedExit.id);
      }
    } catch (err: any) {
      toast.error("Failed to save exit interview");
    } finally {
      setIsSavingInterview(false);
    }
  };

  const openDocumentsModal = (type: any) => {
    setActiveDocType(type);
    setDocsModalOpen(true);
  };

  // Metrics calculation
  const totalExits = exits.length;
  const inNoticeCount = exits.filter((e) => e.status === "NOTICE_PERIOD").length;
  const underReviewCount = exits.filter((e) => e.status === "RESIGNED" || e.status === "UNDER_HR_REVIEW").length;
  const readySettlementCount = exits.filter((e) => e.status === "SETTLEMENT_CALCULATED").length;
  const terminatedCount = exits.filter((e) => e.status === "TERMINATED" || e.status === "SETTLED").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <span>Management & Workforce</span>
            <span>•</span>
            <span>Exit Lifecycle & Separation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <UserMinus className="w-6 h-6" />
            </span>
            Offboarding & Full & Final (F&F) Settlement
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end separation pipeline: Resignation review, notice period, department clearances, payroll-integrated F&F, and formal documentation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadExits}
            className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
            title="Refresh pipeline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setInitiateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-white" />
            Initiate Exit / Resignation
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Exits</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalExits}</p>
          <p className="text-xs text-slate-400 mt-0.5">Active & Historical</p>
        </div>

        <div className="rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Resignations</p>
          <p className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-amber-600" />
            {noticeSummary ? noticeSummary.awaitingHrReview + noticeSummary.awaitingAdminApproval : underReviewCount}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {noticeSummary
              ? `${noticeSummary.awaitingHrReview} with HR · ${noticeSummary.awaitingAdminApproval} with admin`
              : "New resignations"}
          </p>
        </div>

        <div className="rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Notice Period</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1 flex items-center gap-1.5">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {noticeSummary?.inNoticeCount ?? inNoticeCount}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {noticeSummary ? `${noticeSummary.endingWithin7Days} leaving within 7 days` : "Serving notice"}
          </p>
        </div>

        <div className="rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">F&F Ready / Pending</p>
          <p className="text-2xl font-bold text-sky-600 mt-1 flex items-center gap-1.5">
            <Calculator className="w-5 h-5 text-sky-600" />
            {readySettlementCount}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Clearances cleared</p>
        </div>

        <div className="rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Terminated & Settled</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {terminatedCount}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Accounts closed</p>
        </div>
      </div>

      {/* Who is serving notice right now */}
      {noticeSummary?.employees?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">
              Serving notice ({noticeSummary.inNoticeCount})
            </p>
            {noticeSummary.pastLastWorkingDay > 0 && (
              <span className="text-[11px] font-semibold text-rose-600">
                {noticeSummary.pastLastWorkingDay} past last working day: complete their exit
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {noticeSummary.employees.map((row: any) => (
              <li key={row.employeeId} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => row.exitId && openExitDetails(row.exitId)}
                    className="font-semibold text-slate-900 hover:text-indigo-600 text-left"
                  >
                    {row.name}
                  </button>
                  <span className="ml-2 font-mono text-indigo-700">{row.employeeCode}</span>
                  {row.department && <span className="ml-2 text-slate-400">{row.department}</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-500">
                    LWD {row.lastWorkingDate ? formatDate(row.lastWorkingDate) : "not set"}
                  </span>
                  {row.daysLeft !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold border ${
                        row.daysLeft < 0
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : row.daysLeft <= 7
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {row.daysLeft < 0 ? `${-row.daysLeft}d overdue` : row.daysLeft === 0 ? "Leaves today" : `${row.daysLeft}d left`}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pipeline Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs overflow-x-auto w-full sm:w-auto">
          {(
            [
              { key: "ALL", label: "All Pipeline" },
              { key: "RESIGNED", label: "Awaiting HR" },
              { key: "UNDER_HR_REVIEW", label: "Awaiting Admin" },
              { key: "NOTICE_PERIOD", label: "Notice Period" },
              { key: "CLEARANCE_IN_PROGRESS", label: "Clearances" },
              { key: "SETTLEMENT_CALCULATED", label: "Settlement Ready" },
              { key: "TERMINATED", label: "Terminated" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === t.key
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadExits()}
            placeholder="Search employee or code..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Exit Cases Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Resignation Date</th>
                <th className="py-3.5 px-4">Approved LWD</th>
                <th className="py-3.5 px-4">Clearance Status</th>
                <th className="py-3.5 px-4">Net F&F Payable</th>
                <th className="py-3.5 px-4">Stage / Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading offboarding cases...
                  </td>
                </tr>
              ) : exits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    <UserMinus className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <p className="font-medium text-slate-500">No offboarding cases found in this category.</p>
                  </td>
                </tr>
              ) : (
                exits.map((exit) => (
                  <tr key={exit.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                          {exit.employee?.firstName?.[0] || "E"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {exit.employee?.firstName} {exit.employee?.lastName || ""}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            {exit.employee?.employeeCode} • {exit.employee?.department?.name || "General"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(exit.resignationDate)}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {exit.approvedLastWorkingDate
                        ? formatDate(exit.approvedLastWorkingDate)
                        : exit.preferredLastWorkingDate
                        ? `${formatDate(exit.preferredLastWorkingDate)} (Proposed)`
                        : "Pending HR"}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="w-36">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>{exit.metrics?.clearedCount || 0} / {exit.metrics?.totalClearances || 0} Cleared</span>
                          <span className="font-bold text-indigo-700">{exit.metrics?.clearanceProgress || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (exit.metrics?.clearanceProgress || 0) === 100
                                ? "bg-emerald-500"
                                : "bg-gradient-to-r from-amber-500 to-indigo-500"
                            }`}
                            style={{ width: `${exit.metrics?.clearanceProgress || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      {exit.metrics?.netSettlementPayable !== null && exit.metrics?.netSettlementPayable !== undefined
                        ? `₹${exit.metrics.netSettlementPayable.toLocaleString("en-IN")}`
                        : "Drafting..."}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          exit.status === "TERMINATED"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : exit.status === "SETTLEMENT_CALCULATED"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : exit.status === "CLEARANCE_IN_PROGRESS"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : exit.status === "NOTICE_PERIOD"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {exitStatusLabel(exit.status)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openExitDetails(exit.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-semibold transition cursor-pointer"
                      >
                        Manage Exit
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── INITIATE EXIT MODAL ──────────────────────────────────────────────── */}
      {initiateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <UserMinus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Initiate Employee Separation</h3>
                  <p className="text-xs text-slate-500">Launch offboarding, notice period & clearances</p>
                </div>
              </div>
              <button
                onClick={() => setInitiateModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInitiateSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Employee *</label>
                <select
                  value={initiateEmployeeId}
                  onChange={(e) => setInitiateEmployeeId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Choose active workforce member --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName || ""} ({emp.employeeCode}) • {emp.department?.name || "General"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Exit Type</label>
                  <select
                    value={initiateExitType}
                    onChange={(e) => setInitiateExitType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                  >
                    <option value="RESIGNATION">Voluntary Resignation</option>
                    <option value="TERMINATION">Involuntary Termination</option>
                    <option value="MUTUAL_SEPARATION">Mutual Separation</option>
                    <option value="RETIREMENT">Retirement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Notice Days</label>
                  <input
                    type="number"
                    value={initiateNoticeDays}
                    onChange={(e) => setInitiateNoticeDays(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Preferred Last Working Day (Optional)</label>
                <input
                  type="date"
                  value={initiateLwd}
                  onChange={(e) => setInitiateLwd(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reason for Separation *</label>
                <textarea
                  value={initiateReason}
                  onChange={(e) => setInitiateReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="e.g. Better opportunity / Relocation / Education"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Additional Notes (Optional)</label>
                <textarea
                  value={initiateComments}
                  onChange={(e) => setInitiateComments(e.target.value)}
                  rows={2}
                  placeholder="Handovers, successor details, or special agreements"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInitiateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExit}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingExit && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                  Submit Separation Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EXIT DETAIL DRAWER / MODAL ───────────────────────────────────────── */}
      {selectedExit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[94vh]">
            {/* Drawer Header */}
            <div className="shrink-0 p-6 bg-slate-50 border-b border-slate-200 relative">
              <button
                onClick={() => setSelectedExit(null)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-bold text-2xl flex items-center justify-center shadow-md">
                    {selectedExit.employee?.firstName?.[0] || "E"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-semibold text-slate-900">
                        {selectedExit.employee?.firstName} {selectedExit.employee?.lastName || ""}
                      </h2>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        {selectedExit.employee?.employeeCode}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {exitStatusLabel(selectedExit.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedExit.employee?.department?.name || "General"} • Resigned: {formatDate(selectedExit.resignationDate)} • Reason: {selectedExit.reason}
                    </p>
                  </div>
                </div>

                {/* Quick Print Dropdown / Button */}
                <button
                  onClick={() => openDocumentsModal("FF_STATEMENT")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  Print Official Letters
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 mt-6 border-t border-slate-200 pt-4 overflow-x-auto shrink-0">
                {(
                  [
                    { key: "OVERVIEW", label: "Overview & HR Review", icon: Clock },
                    { key: "CLEARANCES", label: `Department Clearances (${selectedExit.metrics?.clearedCount || 0}/${selectedExit.metrics?.totalClearances || 0})`, icon: ShieldCheck },
                    { key: "SETTLEMENT", label: "Full & Final Settlement", icon: Calculator },
                    { key: "INTERVIEW", label: "Exit Interview", icon: MessageSquare },
                    { key: "DOCUMENTS", label: "Generated Letters", icon: FileText },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveDetailTab(tab.key)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        activeDetailTab === tab.key
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Body Content */}
            <div className="p-6 overflow-y-auto min-h-0 flex-1 space-y-6">
              {/* ─── TAB 1: OVERVIEW & HR REVIEW ───────────────────────────────── */}
              {activeDetailTab === "OVERVIEW" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Case Summary */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-600" />
                      Separation Case Details
                    </h3>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Exit Type:</span>
                        <span className="font-semibold text-slate-800">{selectedExit.exitType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Resignation Date:</span>
                        <span className="text-slate-800">{formatDate(selectedExit.resignationDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Notice Period:</span>
                        <span className="text-slate-800">{selectedExit.noticePeriodDays} Days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Proposed LWD:</span>
                        <span className="text-slate-800 font-medium">
                          {selectedExit.preferredLastWorkingDate
                            ? formatDate(selectedExit.preferredLastWorkingDate)
                            : "Not specified"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Approved LWD:</span>
                        <span className="text-indigo-700 font-bold">
                          {selectedExit.approvedLastWorkingDate
                            ? formatDate(selectedExit.approvedLastWorkingDate)
                            : "Pending HR Approval"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Notice Waiver:</span>
                        <span className="text-slate-800">{selectedExit.isNoticeWaived ? "Waived by HR" : "Mandatory"}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-500 mb-1">Reason Statement:</p>
                      <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                        "{selectedExit.reason}"
                      </p>
                    </div>

                    {selectedExit.employeeComments && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-1">Employee Comments:</p>
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          {selectedExit.employeeComments}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: HR Action / Decision Box */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      {isAdmin ? "Admin Decision & Last Working Day" : "HR Review"}
                    </h3>

                    {!["RESIGNED", "UNDER_HR_REVIEW"].includes(selectedExit.status) ? (
                      <div className="text-xs text-slate-600 space-y-2">
                        <p>
                          Decision recorded: <span className="font-semibold text-slate-900">{exitStatusLabel(selectedExit.status)}</span>
                        </p>
                        {selectedExit.hrNotes && (
                          <p className="whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200">{selectedExit.hrNotes}</p>
                        )}
                      </div>
                    ) : !isAdmin && selectedExit.status === "UNDER_HR_REVIEW" ? (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        HR has forwarded this resignation. It is waiting for an admin to approve or reject it.
                      </p>
                    ) : (
                    <div className="space-y-3 text-xs">
                      {isAdmin && selectedExit.hrNotes && (
                        <div>
                          <p className="text-slate-700 font-medium mb-1">HR notes</p>
                          <p className="whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                            {selectedExit.hrNotes}
                          </p>
                        </div>
                      )}
                      {!isAdmin && (
                        <p className="text-slate-500">
                          Review the request and forward it with your notes. An admin gives the final approval.
                        </p>
                      )}
                      {isAdmin && (
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Review Decision</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setReviewAction("APPROVE")}
                            className={`py-2 rounded-xl font-semibold transition border cursor-pointer ${
                              reviewAction === "APPROVE"
                                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            Approve Resignation
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewAction("REJECT")}
                            className={`py-2 rounded-xl font-semibold transition border cursor-pointer ${
                              reviewAction === "REJECT"
                                ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            Reject Request
                          </button>
                        </div>
                      </div>
                      )}

                      {isAdmin && reviewAction === "APPROVE" && (
                        <>
                          <div>
                            <label className="block text-slate-700 font-medium mb-1">Approved Last Working Date (LWD)</label>
                            <input
                              type="date"
                              value={approvedLwdInput}
                              onChange={(e) => setApprovedLwdInput(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <p className="font-bold text-slate-800">Waive Remaining Notice Period?</p>
                              <p className="text-xs text-slate-500">Relieve employee earlier without notice shortfall penalty</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={isNoticeWaivedInput}
                              onChange={(e) => setIsNoticeWaivedInput(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          {isAdmin ? "Decision notes" : "HR notes for the admin"}
                        </label>
                        <textarea
                          value={hrNotesInput}
                          onChange={(e) => setHrNotesInput(e.target.value)}
                          rows={3}
                          placeholder="Document handover instructions, supervisor notes, or retention discussion outcome"
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        onClick={handleReviewSubmit}
                        disabled={isReviewing}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        {isReviewing && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                        {isAdmin ? "Save Decision" : "Forward to Admin for Approval"}
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB 2: DEPARTMENT CLEARANCES ──────────────────────────────── */}
              {activeDetailTab === "CLEARANCES" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Departmental Handover & Clearance Sign-offs</h3>
                      <p className="text-xs text-slate-500">
                        IT assets, manager KT, finance advances, and HR facilities must be cleared before settlement.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      {selectedExit.metrics?.clearedCount} of {selectedExit.metrics?.totalClearances} Complete
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedExit.clearances?.map((clearance) => (
                      <div
                        key={clearance.id}
                        className={`rounded-2xl p-4 border transition ${
                          clearance.status === "CLEARED" || clearance.status === "WAIVED"
                            ? "border-emerald-200 bg-emerald-50/60"
                            : clearance.status === "RECOVERABLE_DUE"
                            ? "border-rose-200 bg-rose-50/60"
                            : "border-slate-200 bg-white shadow-xs"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                                {clearance.department.replace(/_/g, " ")}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900">{clearance.itemName}</h4>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{clearance.itemDescription}</p>
                            {clearance.clearedBy && (
                              <p className="text-xs text-emerald-700 font-semibold mt-1">
                                Endorsed by {clearance.clearedBy} on {formatDate(clearance.clearedAt!)}
                              </p>
                            )}
                          </div>

                          {/* Status and Recovery Controls */}
                          <div className="flex items-center gap-2">
                            <select
                              value={clearance.status}
                              onChange={(e) =>
                                handleClearanceChange(
                                  clearance.id,
                                  e.target.value,
                                  clearance.recoveryAmount,
                                  clearance.remarks || ""
                                )
                              }
                              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="PENDING">Pending Handover</option>
                              <option value="CLEARED">Cleared & Verified</option>
                              <option value="RECOVERABLE_DUE">Dues / Recovery Charge</option>
                              <option value="WAIVED">Waived</option>
                            </select>

                            {clearance.status === "RECOVERABLE_DUE" && (
                              <input
                                type="number"
                                placeholder="Fee ₹"
                                defaultValue={clearance.recoveryAmount}
                                onBlur={(e) =>
                                  handleClearanceChange(
                                    clearance.id,
                                    clearance.status,
                                    Number(e.target.value) || 0,
                                    clearance.remarks || ""
                                  )
                                }
                                className="w-24 bg-white border border-rose-300 rounded-xl px-2 py-1 text-xs text-rose-700 font-mono"
                                title="Recovery amount to deduct in F&F"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TAB 3: FULL & FINAL SETTLEMENT ─────────────────────────────── */}
              {activeDetailTab === "SETTLEMENT" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Full & Final Mathematical Statement Engine</h3>
                      <p className="text-xs text-slate-500">
                        Formula: Final Salary + Overtime + Leave Encashment + Reimbursements - LOP - Notice Shortfall - Recoveries
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCalculateSettlement}
                        disabled={isCalculatingSettlement}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
                      >
                        {isCalculatingSettlement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                        Recalculate Statement
                      </button>

                      {selectedExit.finalSettlement?.status !== "DISBURSED" && (
                        <button
                          onClick={() => setDisburseModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Disburse & Terminate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Settlement Worksheet Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: Earnings */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
                      <h4 className="font-bold text-emerald-700 border-b border-slate-100 pb-2">
                        Gross Entitlements (+)
                      </h4>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Final Month Salary:</span>
                        <span className="font-mono font-bold text-slate-800">
                          ₹{selectedExit.finalSettlement?.finalSalaryPayable.toLocaleString("en-IN") || 0}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Leave Encashment (Days):</span>
                        <input
                          type="number"
                          value={leaveEncashmentDaysInput}
                          onChange={(e) => setLeaveEncashmentDaysInput(e.target.value)}
                          placeholder="Days"
                          className="w-20 bg-white border border-slate-200 rounded-lg p-1 text-right font-mono text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="text-right text-xs text-emerald-700 font-mono font-semibold">
                        Amt: ₹{selectedExit.finalSettlement?.leaveEncashmentAmount.toLocaleString("en-IN") || 0}
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Pending Expense Reimbursements:</span>
                        <input
                          type="number"
                          value={reimbursementsInput}
                          onChange={(e) => setReimbursementsInput(e.target.value)}
                          placeholder="₹"
                          className="w-28 bg-white border border-slate-200 rounded-lg p-1 text-right font-mono text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Gratuity / Ex-Gratia Bonus:</span>
                        <input
                          type="number"
                          value={gratuityInput}
                          onChange={(e) => setGratuityInput(e.target.value)}
                          placeholder="₹"
                          className="w-28 bg-white border border-slate-200 rounded-lg p-1 text-right font-mono text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-emerald-700">
                        <span>Total Earnings (A):</span>
                        <span className="font-mono text-sm">
                          ₹{selectedExit.finalSettlement?.grossEarnings.toLocaleString("en-IN") || 0}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Deductions */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
                      <h4 className="font-bold text-rose-700 border-b border-slate-100 pb-2">
                        Deductions & Recoveries (-)
                      </h4>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Loss of Pay (LOP Days):</span>
                        <input
                          type="number"
                          value={lopDaysInput}
                          onChange={(e) => setLopDaysInput(e.target.value)}
                          className="w-20 bg-white border border-slate-200 rounded-lg p-1 text-right font-mono text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="text-right text-xs text-rose-700 font-mono font-semibold">
                        Deduction: ₹{selectedExit.finalSettlement?.lopDeduction.toLocaleString("en-IN") || 0}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Notice Period Shortfall:</span>
                        <span className="font-mono text-rose-700 font-semibold">
                          ₹{selectedExit.finalSettlement?.noticeShortfallDeduction.toLocaleString("en-IN") || 0}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Unreturned Assets Recovery:</span>
                        <span className="font-mono text-rose-700 font-semibold">
                          ₹{selectedExit.finalSettlement?.assetRecoveryAmount.toLocaleString("en-IN") || 0}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Loans / Other Deductions:</span>
                        <input
                          type="number"
                          value={otherDeductionsInput}
                          onChange={(e) => setOtherDeductionsInput(e.target.value)}
                          className="w-28 bg-white border border-slate-200 rounded-lg p-1 text-right font-mono text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-rose-700">
                        <span>Total Deductions (B):</span>
                        <span className="font-mono text-sm">
                          ₹{selectedExit.finalSettlement?.totalDeductions.toLocaleString("en-IN") || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Banner */}
                  <div className="rounded-2xl p-6 border-2 border-indigo-200 bg-indigo-50/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Net Final Settlement (A - B)</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Disbursement Status:{" "}
                        <strong
                          className={
                            selectedExit.finalSettlement?.status === "DISBURSED"
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }
                        >
                          {selectedExit.finalSettlement?.status || "DRAFT"}
                        </strong>
                        {selectedExit.finalSettlement?.paymentReference
                          ? ` (Ref: ${selectedExit.finalSettlement.paymentReference})`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white font-mono">
                        ₹{(selectedExit.finalSettlement?.netPayable || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 4: EXIT INTERVIEW ─────────────────────────────────────── */}
              {activeDetailTab === "INTERVIEW" && (
                <form onSubmit={handleSaveInterview} className="space-y-4 max-w-2xl text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Primary Exit Factor</label>
                    <select
                      value={reasonCategoryInput}
                      onChange={(e) => setReasonCategoryInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    >
                      <option value="BETTER_OFFER">External Better Compensation / Offer</option>
                      <option value="CAREER_GROWTH">Career Growth & Learning Opportunities</option>
                      <option value="HIGHER_EDUCATION">Higher Education / Academic Pursuits</option>
                      <option value="PERSONAL">Personal or Family Reasons</option>
                      <option value="RELOCATION">Geographical Relocation</option>
                      <option value="WORK_CULTURE">Workplace Culture & Dynamics</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Management Rating (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={managementScore}
                        onChange={(e) => setManagementScore(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Culture Rating (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={cultureScore}
                        onChange={(e) => setCultureScore(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Pay & Benefits (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={payScore}
                        onChange={(e) => setPayScore(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">What did the company do well?</label>
                    <textarea
                      value={whatWeDidWellInput}
                      onChange={(e) => setWhatWeDidWellInput(e.target.value)}
                      rows={2}
                      placeholder="Positive highlights..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">What can the company improve?</label>
                    <textarea
                      value={whatCanWeImproveInput}
                      onChange={(e) => setWhatCanWeImproveInput(e.target.value)}
                      rows={2}
                      placeholder="Constructive feedback..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingInterview}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2"
                  >
                    {isSavingInterview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Exit Interview Record
                  </button>
                </form>
              )}

              {/* ─── TAB 5: GENERATED DOCUMENTS ────────────────────────────────── */}
              {activeDetailTab === "DOCUMENTS" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 inline-block mb-3 border border-indigo-200">
                        <FileText className="w-6 h-6" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Full & Final Settlement Statement</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Detailed earnings, deductions, leave encashment, and net separation invoice.
                      </p>
                    </div>
                    <button
                      onClick={() => openDocumentsModal("FF_STATEMENT")}
                      className="mt-4 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5 text-white" />
                      View & Print Statement
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 inline-block mb-3 border border-emerald-200">
                        <ShieldCheck className="w-6 h-6" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">No-Dues Clearance Certificate</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Verified multi-department sign-off certifying company asset and financial handover.
                      </p>
                    </div>
                    <button
                      onClick={() => openDocumentsModal("CLEARANCE_CERTIFICATE")}
                      className="mt-4 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      View & Print Certificate
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="p-2 rounded-xl bg-amber-50 text-amber-700 inline-block mb-3 border border-amber-200">
                        <ScrollText className="w-6 h-6" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Relieving Letter</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Formal relieving order certifying departure from organizational duties.
                      </p>
                    </div>
                    <button
                      onClick={() => openDocumentsModal("RELIEVING_LETTER")}
                      className="mt-4 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      View & Print Letter
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="p-2 rounded-xl bg-sky-50 text-sky-700 inline-block mb-3 border border-sky-200">
                        <Award className="w-6 h-6" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Experience Certificate</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Official tenure certificate with designation, conduct, and length of service.
                      </p>
                    </div>
                    <button
                      onClick={() => openDocumentsModal("EXPERIENCE_LETTER")}
                      className="mt-4 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      View & Print Certificate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── DISBURSE SETTLEMENT & TERMINATE MODAL ────────────────────────────── */}
      {disburseModalOpen && selectedExit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <DollarSign className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Disburse Settlement & Terminate</h3>
                <p className="text-xs text-slate-500">Final operational separation step</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <p className="text-slate-600">Net Amount to Credit:</p>
              <p className="text-2xl font-bold text-emerald-600 font-mono mt-0.5">
                ₹{(selectedExit.finalSettlement?.netPayable || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                ⚠️ Confirming will update the employee's status to <strong>TERMINATED</strong>, deactivate user credentials, and mark F&F disbursed.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Bank Payment Reference (NEFT / UTR)</label>
                <input
                  type="text"
                  value={paymentReferenceInput}
                  onChange={(e) => setPaymentReferenceInput(e.target.value)}
                  placeholder="e.g. NEFT-HDFC-99182371"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Disbursement Remarks</label>
                <textarea
                  rows={2}
                  value={disburseRemarksInput}
                  onChange={(e) => setDisburseRemarksInput(e.target.value)}
                  placeholder="e.g. Account settled in full"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDisburseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisburseAndTerminate}
                disabled={isDisbursing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                {isDisbursing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Disbursement & Terminate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE DOCUMENTS MODAL ────────────────────────────────────────── */}
      {selectedExit && (
        <ExitDocumentsModal
          exitId={selectedExit.id}
          isOpen={docsModalOpen}
          defaultDocType={activeDocType}
          onClose={() => setDocsModalOpen(false)}
        />
      )}
    </div>
  );
}
