"use client";

import React, { useState, useEffect } from "react";
import { Payslip } from "@/types";
import { payrollApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, unwrapList } from "@/lib/utils";
import { formatCycleDate } from "@/lib/payrollCycle";
import {
  Receipt,
  Sparkles,
  Calculator,
  Send,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  Palette,
  Layers,
} from "lucide-react";
import PayslipModal from "./PayslipModal";
import PayslipTemplateCustomizer from "./PayslipTemplateCustomizer";
import SalaryStructuresView from "./SalaryStructuresView";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function PayrollView() {
  const { role } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Batch Generation State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<"RECORDS" | "SALARY" | "TEMPLATES">("RECORDS");

  const isAdminOrManager = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER";
  const [cycle, setCycle] = useState<any>(null);

  useEffect(() => {
    if (!isAdminOrManager) return;
    payrollApi
      .getCycle(Number(selectedMonth), Number(selectedYear))
      .then((res) => setCycle(res?.data || null))
      .catch(() => setCycle(null));
  }, [selectedMonth, selectedYear, isAdminOrManager]);

  const generateLocked = Boolean(cycle && !cycle.canGenerate);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      if (isAdminOrManager) {
        const res = await payrollApi.getPayslips({ month: selectedMonth, year: selectedYear });
        setPayslips(unwrapList<Payslip>(res));
      } else {
        const res = await payrollApi.getMyPayslips();
        setPayslips(unwrapList<Payslip>(res));
      }
    } catch (err: any) {
      console.error("Failed to load payslips:", err);
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
      toast.error(err.response?.data?.message || err.message || "Failed to generate batch");
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

  const handleExportCsv = () => {
    if (payslips.length === 0) {
      toast.error("No payslips to export");
      return;
    }
    const header = ["Employee", "Code", "Month", "Year", "Basic", "Gross", "Deductions", "Net", "Status"];
    const rows = payslips.map((s) => [
      `${s.employee?.firstName || ""} ${s.employee?.lastName || ""}`.trim(),
      s.employee?.employeeCode || "",
      s.month,
      s.year,
      s.basicSalary ?? "",
      s.grossSalary ?? "",
      s.totalDeductions ?? "",
      s.netSalary ?? "",
      s.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const totalDisbursement = payslips.reduce((acc, p) => acc + (Number(p.netSalary) || 0), 0);
  const totalLopDeductions = payslips.reduce((acc, p) => acc + (Number(p.lopDeduction) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Title & Batch Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Payroll Processing & Payslip Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Statutory attendance-linked payroll, automated PF/ESI/TDS calculations, and one-click salary disbursement
          </p>
        </div>

        {isAdminOrManager && activeSection === "RECORDS" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-xs px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-500">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none"
              >
                {[
                  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                ].map((m, i) => (
                  <option key={i + 1} value={i + 1} className="bg-white text-slate-800">
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none"
              >
                <option value={2026} className="bg-white text-slate-800">2026</option>
                <option value={2025} className="bg-white text-slate-800">2025</option>
              </select>
            </div>

            {cycle && (
              <span className={`text-xs ${generateLocked ? "text-amber-700" : "text-slate-500"}`}>
                Cycle {formatCycleDate(new Date(`${cycle.start}T00:00:00Z`))} to {formatCycleDate(new Date(`${cycle.end}T00:00:00Z`))}
                {" · "}
                {cycle.days} days, {cycle.dayBasis === "FIXED_30" ? "fixed 30-day" : cycle.dayBasis === "WORKING_DAYS" ? "working-day" : "actual-day"} basis
                {generateLocked && ` · generate after ${formatCycleDate(new Date(`${cycle.generateAfter}T00:00:00Z`))} ends`}
              </span>
            )}

            <button
              onClick={handleGenerateBatch}
              disabled={isGenerating || generateLocked}
              title={generateLocked ? `Available after the cycle ends on ${cycle.generateAfter}` : undefined}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Calculator className="w-3.5 h-3.5 text-white" />}
              Generate Batch
            </button>

            <button
              onClick={handleApproveBatch}
              disabled={isApproving || payslips.length === 0}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              Approve Batch
            </button>

            <button
              onClick={handleDisburseBatch}
              disabled={isDisbursing || payslips.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              {isDisbursing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Send className="w-3.5 h-3.5 text-white" />}
              Disburse & Send Alerts
            </button>

            <button
              onClick={handleExportCsv}
              disabled={payslips.length === 0}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm flex items-center gap-1.5 border border-slate-200 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
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
            <span>Payroll Records & Batches</span>
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
            <span>Payslip Template Studio</span>
          </button>
        </div>
      )}

      {activeSection === "TEMPLATES" && isAdminOrManager ? (
        <PayslipTemplateCustomizer />
      ) : activeSection === "SALARY" && isAdminOrManager ? (
        <SalaryStructuresView />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            Total Monthly Payout
          </p>
          <p className="text-2xl font-bold text-slate-900 truncate">{formatCurrency(totalDisbursement)}</p>
          <p className="text-xs text-slate-500 mt-1">Across {payslips.length} employee records</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            LOP Deductions
          </p>
          <p className="text-2xl font-bold text-rose-600 truncate">{formatCurrency(totalLopDeductions)}</p>
          <p className="text-xs text-slate-500 mt-1">Attendance-linked absence deduction</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Disbursement Mode
          </p>
          <p className="text-lg font-bold text-emerald-700 truncate">Automated Direct Bank & WhatsApp</p>
          <p className="text-xs text-slate-500 mt-1">Complies with 26 days/month standard</p>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Period</th>
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
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    Loading payroll records...
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No payslips found for this cycle. Click "Generate Batch" to create.
                  </td>
                </tr>
              ) : (
                payslips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
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
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {formatCurrency(slip.basicSalary)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {formatCurrency(slip.grossSalary)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-600">
                      -{formatCurrency(slip.totalDeductions)}
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
                    </td>
                  </tr>
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
