"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Branch, Payslip } from "@/types";
import { branchesApi, employeesApi, payrollApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, unwrapList } from "@/lib/utils";
import { formatCycleDate } from "@/lib/payrollCycle";
import { Receipt, Calculator, Send, Download, Eye, CheckCircle2, AlertCircle, Loader2, DollarSign, TrendingUp, Palette, Layers, FileSpreadsheet, FileText, MapPin, Users, X } from "lucide-react";
import ExcelJS from "exceljs";
import PayslipModal from "./PayslipModal";
import dynamic from "next/dynamic";

const PayslipTemplateCustomizer = dynamic(() => import("./PayslipTemplateCustomizer"), { ssr: false });
import SalaryStructuresView from "./SalaryStructuresView";
import { toast } from "sonner";
import { confetti } from "@/lib/confetti";
import MonthYearPicker from "@/components/ui/MonthYearPicker";

export default function PayrollView() {
  const { role } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [previewRows, setPreviewRows] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Batch Generation State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [disbursingPayslipId, setDisbursingPayslipId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"RECORDS" | "SALARY" | "TEMPLATES">("RECORDS");
  const [expandedDailyId, setExpandedDailyId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [payrollEmployees, setPayrollEmployees] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("ALL");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("ALL");

  const isAdminOrManager = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
  // HR prepares payroll; only company admins finalize approval and disbursement.
  const isAdmin = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN";
  const canDisburseIndividual = isAdmin || role === "HR";
  const canGenerate = isAdminOrManager;
  const [cycle, setCycle] = useState<any>(null);

  useEffect(() => {
    if (!isAdminOrManager) return;
    payrollApi
      .getCycle(Number(selectedMonth), Number(selectedYear))
      .then((res) => setCycle(res?.data || null))
      .catch(() => setCycle(null));
  }, [selectedMonth, selectedYear, isAdminOrManager]);

  useEffect(() => {
    if (!isAdminOrManager) return;
    branchesApi.list().then((res) => setBranches(unwrapList<Branch>(res))).catch(() => setBranches([]));
    employeesApi.list({ page: 1, limit: 500, status: "WORKING" })
      .then((res) => setPayrollEmployees(unwrapList<any>(res)))
      .catch(() => setPayrollEmployees([]));
  }, [isAdminOrManager]);

  const generateLocked = Boolean(cycle && !cycle.canGenerate);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      if (isAdminOrManager) {
        const params = { month: selectedMonth, year: selectedYear };
        const res = await payrollApi.getPayslips(params);
        const generated = unwrapList<Payslip>(res);
        setPayslips(generated);

        // Show live calculated values when this month has not been generated yet.
        // These are previews only and cannot be approved or disbursed.
        if (generated.length === 0) {
          const previewRes = await payrollApi.calculatePreview(params);
          const previews = Array.isArray(previewRes?.data?.previews) ? previewRes.data.previews : [];
          setPreviewRows(
            previews.map((preview: any, index: number) => ({
              id: `preview-${preview.employee?.id || index}`,
              employeeId: preview.employee?.id || `preview-${index}`,
              month: selectedMonth,
              year: selectedYear,
              basicSalary: preview.salaryBreakdown?.baseSalary || 0,
              hra: preview.salaryBreakdown?.hra || 0,
              allowances: preview.salaryBreakdown?.allowancesTotal || 0,
              grossSalary: preview.salaryBreakdown?.grossSalary || 0,
              totalDeductions: preview.deductions?.deductionsTotal || 0,
              lopDeduction: preview.deductions?.unpaidLeaveDeduction || 0,
              unpaidLeaveDeduction: preview.deductions?.unpaidLeaveDeduction || 0,
              presentDays: preview.attendanceSummary?.presentDays || 0,
              paidLeaveDays: preview.attendanceSummary?.paidLeaveDays || 0,
              unpaidLeaveDays: preview.attendanceSummary?.unpaidLeaveDays || 0,
              overtimeHours: preview.attendanceSummary?.overtimeHours || 0,
              lateCount: preview.attendanceSummary?.lateCount || 0,
              lateDeduction: preview.deductions?.lateDeduction || 0,
              breakDeduction: preview.deductions?.breakDeduction || 0,
              lunchDeduction: preview.deductions?.lunchDeduction || 0,
              pauseDeduction: preview.deductions?.pauseDeduction || 0,
              overtimePay: preview.salaryBreakdown?.overtimePay || 0,
              netSalary: preview.netSalary || 0,
              dailyPayroll: preview.dailyPayroll || [],
              status: "DRAFT",
              createdAt: new Date().toISOString(),
              employee: {
                firstName: preview.employee?.name || "Employee",
                lastName: "",
                employeeCode: preview.employee?.employeeCode || "WP-EMP",
              },
            })),
          );
        } else {
          setPreviewRows([]);
        }
      } else {
        const res = await payrollApi.getMyPayslips();
        setPayslips(unwrapList<Payslip>(res));
        setPreviewRows([]);
      }
    } catch (err: any) {
      console.error("Failed to load payslips:", err);
      setPreviewRows([]);
      toast.error(
        err?.code === "ECONNABORTED"
          ? "Payroll preview is taking longer than expected. Please try again."
          : err?.response?.data?.message || "Could not load payroll preview",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadPayslips();
  }, [selectedMonth, selectedYear, isAdminOrManager]);

  const handleGenerateBatch = async () => {
    setIsGenerating(true);
    try {
      const res = await payrollApi.generateBatch({
        month: Number(selectedMonth),
        year: Number(selectedYear),
      });

      if (res?.success) {
        toast.success(res.message || "Monthly payroll generated successfully with live attendance calculations!");
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        loadPayslips();
      } else {
        toast.error(res?.message || "Failed to generate payroll batch");
      }
    } catch (err: any) {
      const isTimeout = err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "");
      toast.error(
        isTimeout
          ? "Payroll generation is still processing. Please wait, then refresh payroll before trying again."
          : err?.response?.data?.message || err?.message || "Failed to generate batch",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveBatch = async () => {
    setIsApproving(true);
    try {
      const res = await payrollApi.approveBatch({
        month: Number(selectedMonth),
        year: Number(selectedYear),
      });
      if (res?.success) {
        toast.success(res.message || "Payroll batch approved. Ready to disburse.");
        loadPayslips();
      } else {
        toast.error(res?.message || "Failed to approve batch");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to approve batch");
    } finally {
      setIsApproving(false);
    }
  };

  const payrollExportRows = (rows: Payslip[]) => rows.map((s) => [
    `${s.employee?.firstName || ""} ${s.employee?.lastName || ""}`.trim(),
    s.employee?.employeeCode || "",
    s.employee?.branch?.name || "Unassigned",
    s.month,
    s.year,
    s.baseSalary ?? s.basicSalary ?? 0,
    s.grossSalary ?? 0,
    s.lateDeduction ?? 0,
    s.pauseDeduction ?? s.breakDeduction ?? 0,
    s.unpaidLeaveDeduction ?? s.lopDeduction ?? 0,
    s.deductionsTotal ?? s.totalDeductions ?? 0,
    s.netSalary ?? 0,
    s.status,
  ]);

  const getExportRows = () => (displayPayslips || []).filter((s) => {
    const branchId = (s.employee as any)?.branchId;
    const branchName = (s.employee as any)?.branch?.name;
    const matchesBranch = selectedBranchId === "ALL" || branchId === selectedBranchId || branches.find((b) => b.id === selectedBranchId)?.name === branchName;
    return matchesBranch && (selectedEmployeeId === "ALL" || s.employeeId === selectedEmployeeId);
  });

  const filePart = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "all";

  const handleExportExcel = async () => {
    const exportRows = getExportRows();
    if (exportRows.length === 0) {
      toast.error("No payroll records match the selected filters");
      return;
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "WorkPulse";
    const sheet = workbook.addWorksheet("Payroll");
    sheet.columns = ["Employee", "Code", "Branch", "Month", "Year", "Basic", "Gross", "Late deduction", "Pause deduction", "LOP deduction", "Deductions", "Net take-home", "Status"].map((header) => ({ header, key: header, width: Math.max(16, header.length + 3) }));
    sheet.addRows(payrollExportRows(exportRows));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const output = await workbook.xlsx.writeBuffer();
    const blob = new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${filePart(selectedBranchId === "ALL" ? "all-branches" : branches.find((b) => b.id === selectedBranchId)?.name || "branch")}-${filePart(selectedEmployeeId === "ALL" ? "all-employees" : exportRows[0]?.employee?.employeeCode || "employee")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Excel report downloaded for ${exportRows.length} employee${exportRows.length === 1 ? "" : "s"}`);
  };

  const handleExportPdf = () => {
    const exportRows = getExportRows();
    if (exportRows.length === 0) {
      toast.error("No payroll records match the selected filters");
      return;
    }
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      toast.error("Please allow pop-ups to download the PDF report");
      return;
    }
    const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[char] || char));
    const rows = payrollExportRows(exportRows).map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
    const title = `Payroll report · ${selectedMonth}/${selectedYear}`;
    popup.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font:12px Arial,sans-serif;color:#0f172a;padding:24px}h1{font-size:20px;margin:0 0 4px}p{color:#64748b;margin:0 0 18px}table{border-collapse:collapse;width:100%;font-size:10px}th{background:#eef2ff;color:#3730a3;text-align:left}th,td{border:1px solid #cbd5e1;padding:7px;white-space:nowrap}tr:nth-child(even){background:#f8fafc}@media print{body{padding:0}@page{size:A4 landscape;margin:12mm}}</style></head><body><h1>${title}</h1><p>WorkPulse payroll export · ${escapeHtml(selectedBranchId === "ALL" ? "All branches" : branches.find((b) => b.id === selectedBranchId)?.name || "Selected branch")} · ${exportRows.length} employees</p><table><thead><tr>${["Employee", "Code", "Branch", "Month", "Year", "Basic", "Gross", "Late deduction", "Pause deduction", "LOP deduction", "Deductions", "Net take-home", "Status"].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`);
    popup.document.close();
  };

  const handleDownloadPayrollPdf = async () => {
    const exportRows = getExportRows();
    if (exportRows.length === 0) {
      toast.error("No payroll records match the selected filters");
      return;
    }
    setIsExportingPdf(true);
    try {
      const blob = await payrollApi.downloadPayrollPdf({
        month: Number(selectedMonth),
        year: Number(selectedYear),
        branchId: selectedBranchId === "ALL" ? undefined : selectedBranchId,
        employeeId: selectedEmployeeId === "ALL" ? undefined : selectedEmployeeId,
      });
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `payroll-${selectedMonth}-${selectedYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`PDF report downloaded for ${exportRows.length} employee${exportRows.length === 1 ? "" : "s"}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not download payroll PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleIndividualPdf = async (slip: Payslip) => {
    try {
      const blob = await payrollApi.downloadPayslipPdf(slip.id);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip-${filePart(`${slip.employee?.firstName || "employee"}-${slip.employee?.lastName || ""}`)}-${slip.month}-${slip.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Employee payslip PDF downloaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not download employee PDF");
    }
  };

  const handleDisburseBatch = async () => {
    setIsDisbursing(true);
    try {
      const res = await payrollApi.disburseBatch({
        month: Number(selectedMonth),
        year: Number(selectedYear),
      });

      if (res?.success) {
        toast.success(res.message || "Batch disbursed successfully! Email & WhatsApp payslips dispatched.");
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        loadPayslips();
      } else {
        toast.error(res?.message || "Failed to disburse batch");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to disburse batch");
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleDisburseIndividual = async (slip: Payslip) => {
    if (slip.status !== "APPROVED") {
      toast.error("Approve this payslip before distributing it.");
      return;
    }
    setDisbursingPayslipId(slip.id);
    try {
      const res = await payrollApi.disbursePayslip(slip.id);
      if (!res?.success) throw new Error(res?.message || "Could not distribute payslip");
      toast.success("Payslip distributed to the employee");
      await loadPayslips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not distribute payslip");
    } finally {
      setDisbursingPayslipId(null);
    }
  };

  // Exactly one header action is primary: whichever step comes next in generate → approve → disburse.
  const allApproved = payslips.length > 0 && payslips.every((p) => ["APPROVED", "PAID", "DISBURSED"].includes(String(p.status)));
  const allPaid = payslips.length > 0 && payslips.every((p) => ["PAID", "DISBURSED"].includes(String(p.status)));
  const nextStep: "GENERATE" | "APPROVE" | "DISBURSE" | null = payslips.length === 0 ? "GENERATE" : !allApproved ? "APPROVE" : !allPaid ? "DISBURSE" : null;
  const stepTone = (step: "GENERATE" | "APPROVE" | "DISBURSE") => (nextStep === step ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/25" : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs");

  const allDisplayPayslips = payslips.length > 0 ? payslips : previewRows;
  const displayPayslips = allDisplayPayslips.filter((s) => {
    const branchId = (s.employee as any)?.branchId;
    const branchName = (s.employee as any)?.branch?.name;
    const matchesBranch = selectedBranchId === "ALL" || branchId === selectedBranchId || branches.find((b) => b.id === selectedBranchId)?.name === branchName;
    return matchesBranch && (selectedEmployeeId === "ALL" || s.employeeId === selectedEmployeeId);
  });
  const employeeOptions = Array.from(new Map(
    [
      ...payrollEmployees.map((employee) => ({
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeCode: employee.employeeCode,
        branchId: employee.branchId,
        branch: employee.branch,
      })),
      ...allDisplayPayslips.map((slip) => ({
        id: slip.employeeId || (slip.employee as any)?.id,
        firstName: (slip.employee as any)?.firstName || (slip.employee as any)?.name || "Employee",
        lastName: (slip.employee as any)?.lastName || "",
        employeeCode: (slip.employee as any)?.employeeCode,
        branchId: (slip.employee as any)?.branchId,
        branch: (slip.employee as any)?.branch,
      })),
    ]
      .filter((employee) => employee.id)
      .filter((employee) => selectedBranchId === "ALL" || employee.branchId === selectedBranchId || employee.branch?.name === branches.find((branch) => branch.id === selectedBranchId)?.name)
      .map((employee) => [employee.id, employee]),
  ).values()).sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  const showingPreview = payslips.length === 0 && previewRows.length > 0;
  const totalDisbursement = displayPayslips.reduce((acc, p) => acc + (Number(p.netSalary) || 0), 0);
  // Generated payslips store this as unpaidLeaveDeduction; preview rows use
  // lopDeduction. Support both so the KPI matches the table and payslip data.
  const totalLopDeductions = displayPayslips.reduce(
    (acc, p) => acc + (Number(p.unpaidLeaveDeduction ?? p.lopDeduction) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top Title & Batch Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Payroll
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Attendance-linked pay with PF, ESI and TDS worked out for you.
          </p>
        </div>

        {isAdminOrManager && activeSection === "RECORDS" && (
          <div className="flex flex-wrap items-center gap-3">
            <MonthYearPicker
              month={selectedMonth}
              year={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />

            {cycle?.start && cycle?.end && (
              <span className={`text-xs ${generateLocked ? "text-amber-700" : "text-slate-500"}`}>
                Cycle {formatCycleDate(new Date(`${cycle.start}T00:00:00Z`))} to {formatCycleDate(new Date(`${cycle.end}T00:00:00Z`))}
                {" · "}
                {cycle.days} days, {cycle.dayBasis === "FIXED_30" ? "fixed 30-day" : cycle.dayBasis === "WORKING_DAYS" ? "working-day" : "actual-day"} basis
                {generateLocked && ` · generate after ${formatCycleDate(new Date(`${cycle.generateAfter}T00:00:00Z`))} ends`}
                {isAdmin && (
                  <>
                    {" · "}
                    <Link href="/policy" className="font-semibold text-indigo-600 underline hover:text-indigo-800">
                      Change cycle (1–31, 20th–20th…)
                    </Link>
                  </>
                )}
              </span>
            )}

            {canGenerate ? (
              <>
            <button
              onClick={handleGenerateBatch}
              disabled={isGenerating || generateLocked}
              title={generateLocked ? `Available after the cycle ends on ${cycle.generateAfter}` : undefined}
              className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition active:scale-[0.98] disabled:opacity-50 ${stepTone("GENERATE")}`}
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
              Generate payroll
            </button>

            {isAdmin && <>
              <button
                onClick={handleApproveBatch}
                disabled={isApproving || payslips.length === 0}
                className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition active:scale-[0.98] disabled:opacity-50 ${stepTone("APPROVE")}`}
              >
                {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </button>

              <button
                onClick={handleDisburseBatch}
                disabled={isDisbursing || payslips.length === 0}
                className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition active:scale-[0.98] disabled:opacity-50 ${stepTone("DISBURSE")}`}
              >
                {isDisbursing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Disburse & notify
              </button>
            </>}
              </>
            ) : (
              <span className="text-xs font-medium text-slate-500">Payroll processing access is restricted to HR and admins.</span>
            )}

            <button
              onClick={() => void handleExportExcel()}
              disabled={displayPayslips.length === 0}
              className="px-3 py-2 rounded-xl text-emerald-700 hover:bg-emerald-50 font-semibold text-sm flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
            <button
              onClick={handleExportPdf}
              disabled={displayPayslips.length === 0}
              className="px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 font-semibold text-sm flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Admin/Manager Tab Switcher */}
      {isAdminOrManager && (
        <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 w-fit">
          <button
            onClick={() => setActiveSection("RECORDS")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
              activeSection === "RECORDS"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Payroll runs</span>
          </button>
          <button
            onClick={() => setActiveSection("SALARY")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
              activeSection === "SALARY"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Salary Structures</span>
          </button>
          <button
            onClick={() => setActiveSection("TEMPLATES")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
              activeSection === "TEMPLATES"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Payslip template</span>
          </button>
        </div>
      )}

      {activeSection === "TEMPLATES" && isAdminOrManager ? (
        <PayslipTemplateCustomizer />
      ) : activeSection === "SALARY" && isAdminOrManager ? (
        <SalaryStructuresView />
      ) : (
        <>
          {isAdminOrManager && (
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-4 shadow-xs">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Download className="h-4 w-4 text-indigo-600" />Payroll downloads</p>
                  <p className="mt-1 text-xs text-slate-500">Choose a branch or employee, then download the exact filtered view as Excel or PDF.</p>
                </div>
                {(selectedBranchId !== "ALL" || selectedEmployeeId !== "ALL") && (
                  <button type="button" onClick={() => { setSelectedBranchId("ALL"); setSelectedEmployeeId("ALL"); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-800">
                    <X className="h-3.5 w-3.5" /> Clear filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                <label className="relative block">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
                  <select value={selectedBranchId} onChange={(event) => { setSelectedBranchId(event.target.value); setSelectedEmployeeId("ALL"); }} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    <option value="ALL">All branches</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
                <label className="relative block">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
                  <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    <option value="ALL">All employees</option>
                    {employeeOptions.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeCode || "No employee code"}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => void handleExportExcel()} disabled={displayPayslips.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" /> Download Excel</button>
                <button type="button" onClick={() => void handleDownloadPayrollPdf()} disabled={displayPayslips.length === 0 || isExportingPdf} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} {isExportingPdf ? "Preparing PDF…" : "Download PDF"}</button>
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">Showing {displayPayslips.length} of {allDisplayPayslips.length} payroll records · PDF opens a print-ready report so it can be saved directly as a PDF.</p>
            </div>
          )}
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs overflow-hidden">
          <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            Total payout this month
          </p>
          <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-slate-900 truncate">{formatCurrency(totalDisbursement)}</p>
          <p className="text-xs text-slate-500 mt-1">Across {displayPayslips.length} employee records</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs overflow-hidden">
          <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            Loss-of-pay deductions
          </p>
          <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-rose-600 truncate">{formatCurrency(totalLopDeductions)}</p>
          <p className="text-xs text-slate-500 mt-1">Attendance-linked absence deduction</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs overflow-hidden">
          <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Disbursement
          </p>
          <p className="text-base font-semibold leading-snug tracking-[-0.01em] text-slate-900">Direct to bank, payslips on WhatsApp</p>
          <p className="text-xs text-slate-500 mt-1">
            Per-day basis: {cycle?.basisDays || 0} {cycle?.dayBasis === "WORKING_DAYS" ? "working" : "calendar"} days
          </p>
        </div>
      </div>

      {showingPreview && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p><span className="font-semibold">Calculated preview for {selectedMonth}/{selectedYear}.</span> Generate payroll after the cycle ends to create official payslips.</p>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[1420px] w-full whitespace-nowrap text-left text-[13px] text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Period</th>
                <th className="py-3.5 px-4">Present</th>
                <th className="py-3.5 px-4">Overtime</th>
                <th className="py-3.5 px-4">Late deduction</th>
                <th className="py-3.5 px-4">Pause deduction</th>
                <th className="py-3.5 px-4">LOP deduction</th>
                <th className="py-3.5 px-4">Basic</th>
                <th className="py-3.5 px-4">Gross</th>
                <th className="py-3.5 px-4">Deductions</th>
                <th className="py-3.5 px-4">Net Take-Home</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-slate-500">
                    Loading payroll records...
                  </td>
                </tr>
              ) : displayPayslips.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-slate-500">
                    No payslips for this cycle yet. Use "Generate payroll" to create them.
                  </td>
                </tr>
              ) : (
                displayPayslips.map((slip) => (
                  <React.Fragment key={slip.id}>
                  <tr className="hover:bg-slate-50/80 transition">
                    <td className="sticky left-0 z-[1] bg-white py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        {slip.employee?.firstName} {slip.employee?.lastName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {slip.employee?.employeeCode || "WP-EMP"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      Month {slip.month} / {slip.year}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-700">
                      {Number(slip.presentDays ?? 0)} days
                    </td>
                    <td className="py-3.5 px-4 font-mono text-indigo-700">
                      {Number(slip.overtimeHours ?? 0).toFixed(1)} hrs / {formatCurrency(Number(slip.overtimePay ?? 0))}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-amber-700">
                      {formatCurrency(Number(slip.lateDeduction ?? 0))}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-orange-600">
                      {formatCurrency(Number(slip.pauseDeduction ?? Number(slip.breakDeduction ?? 0) + Number(slip.lunchDeduction ?? 0)))}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-600">
                      {formatCurrency(Number(slip.unpaidLeaveDeduction ?? slip.lopDeduction ?? 0))}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {formatCurrency(Number(slip.baseSalary ?? slip.basicSalary ?? 0))}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {formatCurrency(slip.grossSalary)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-600">
                      {Number(slip.deductionsTotal ?? slip.totalDeductions ?? 0) > 0 ? "-" : ""}
                      {formatCurrency(Number(slip.deductionsTotal ?? slip.totalDeductions ?? 0))}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 text-sm">
                      {formatCurrency(slip.netSalary)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          slip.status === "PAID" || slip.status === "DISBURSED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : slip.status === "APPROVED"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {slip.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {showingPreview ? (
                        <button type="button" onClick={() => setExpandedDailyId(expandedDailyId === slip.id ? null : slip.id)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                          {expandedDailyId === slip.id ? "Hide daily audit" : "View daily audit"}
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPayslip(slip);
                              setModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Letterhead
                          </button>
                          <button
                            onClick={() => void handleIndividualPdf(slip)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition inline-flex items-center gap-1.5"
                            title="Download this employee's official payslip PDF"
                          >
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </button>
                          {canDisburseIndividual && slip.status === "APPROVED" && (
                            <button
                              type="button"
                              disabled={disbursingPayslipId === slip.id}
                              onClick={() => void handleDisburseIndividual(slip)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {disbursingPayslipId === slip.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Distribute
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedDailyId === slip.id && (
                    <tr>
                      <td colSpan={13} className="bg-slate-50 px-4 py-4">
                        <DailyPayrollAudit rows={(slip as any).dailyPayroll || []} />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Formatted Letterhead Payslip Modal */}
      <PayslipModal
        payslip={selectedPayslip}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

function DailyPayrollAudit({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="text-xs text-slate-500">No daily payroll rows available.</p>;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-sm font-bold text-slate-900">Daily salary audit</h3><p className="text-xs text-slate-500">Per-day salary, attendance status, late marks and LOP impact.</p></div>
        <span className="text-xs font-semibold text-slate-500">{rows.length} calendar days</span>
      </div>
      <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Working</th><th className="px-3 py-2 text-right">Per-day salary</th><th className="px-3 py-2 text-right">LOP deduction</th><th className="px-3 py-2 text-right">Late deduction</th><th className="px-3 py-2 text-right">Pause deduction</th><th className="px-3 py-2 text-right">Earned salary</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row: any) => {
              const tone = row.status === "ABSENT" || row.status.includes("UNPAID") || row.status === "HALF_DAY" ? "text-rose-700" : row.status === "LATE" ? "text-amber-700" : "text-emerald-700";
              return <tr key={row.date}>
                <td className="px-3 py-2 font-medium text-slate-700">{row.date}</td>
                <td className={`px-3 py-2 font-semibold ${tone}`}>{row.status}<span className="ml-1 font-normal text-slate-400">{row.note ? `· ${row.note}` : ""}</span></td>
                <td className="px-3 py-2 text-slate-600">{row.workingMinutes ? `${Math.floor(row.workingMinutes / 60)}h ${row.workingMinutes % 60}m` : "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(Number(row.perDaySalary || 0))}</td>
                <td className="px-3 py-2 text-right font-mono text-rose-600">{Number(row.lopDeduction || 0) ? `-${formatCurrency(Number(row.lopDeduction))}` : formatCurrency(0)}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-600">{Number(row.lateDeduction || 0) ? `-${formatCurrency(Number(row.lateDeduction))}` : formatCurrency(0)}</td>
                <td className="px-3 py-2 text-right font-mono text-orange-600">{Number(row.pauseDeduction || 0) ? `-${formatCurrency(Number(row.pauseDeduction))}` : formatCurrency(0)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">{formatCurrency(Number(row.earnedSalary || 0))}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
