'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import api from '@/lib/api';
import {
  Banknote,
  TrendingUp,
  Receipt,
  FileCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Sliders,
  CheckCircle2,
  Download,
  Calendar,
  X,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  Shield,
  Calculator,
  User,
  Check,
  Percent,
  Briefcase,
  ChevronRight,
  HelpCircle,
  FileText,
  Loader2,
  Printer,
  History,
  BarChart3,
  Building,
  FileSpreadsheet,
  Plus,
  Send,
} from 'lucide-react';

interface Payslip {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    firstName: string;
    lastName?: string;
    employeeCode: string;
    designation?: string;
    department?: { name: string };
    branch?: { name: string };
  };
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  halfDays: number;
  paidLeaves: number;
  unpaidLeaves: number;
  overtimeMinutes: number;
  baseSalary: number;
  grossSalary: number;
  allowancesTotal?: number;
  deductions: number;
  deductionsTotal?: number;
  pfDeduction?: number;
  esiDeduction?: number;
  ptDeduction?: number;
  netSalary: number;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  disbursedAt?: string;
  remarks?: string;
  createdAt: string;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName?: string;
  employeeCode: string;
  designation?: string;
}

export default function PayrollPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, 'manage:payroll');

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const [activeTab, setActiveTab] = useState<'payslips' | 'salary_config' | 'reports' | 'salary_history' | 'my'>('payslips');
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [myPayslips, setMyPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [payslipStatusFilter, setPayslipStatusFilter] = useState<string>('ALL');

  const [generating, setGenerating] = useState(false);
  const [approvingBatch, setApprovingBatch] = useState(false);
  const [disbursingBatch, setDisbursingBatch] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 2: Salary Structure State (Step 10.1 CTC & Salary Structure Spec)
  const [structureData, setStructureData] = useState({
    annualCtc: 600000,
    monthlyCtc: 50000,
    baseSalary: 25000,
    hra: 12500,
    transportAllowance: 3000,
    specialAllowance: 6500,
    otherAllowance: 0,
    pf: 1800,
    esi: 0,
    professionalTax: 200,
    overtimeMultiplier: 1.5,
  });
  const [structureSaving, setStructureSaving] = useState(false);
  const [loadingStructure, setLoadingStructure] = useState(false);

  // Tab 3: Reports State
  const [reportsData, setReportsData] = useState<any | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportSubTab, setReportSubTab] = useState<'summary' | 'bank' | 'statutory'>('summary');

  // Tab 4: Salary History State
  const [historyEmpId, setHistoryEmpId] = useState<string>('');
  const [salaryHistory, setSalaryHistory] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionForm, setRevisionForm] = useState({
    annualCtc: 720000,
    monthlyCtc: 60000,
    baseSalary: 30000,
    hra: 15000,
    transport: 3000,
    special: 8000,
    otherAllowance: 4000,
    pf: 1800,
    esi: 0,
    professionalTax: 200,
    effectiveDate: new Date().toISOString().split('T')[0],
    revisionReason: 'ANNUAL_APPRAISAL',
  });
  const [revisionSaving, setRevisionSaving] = useState(false);

  // Payslip Detailed Modal View (Printable PDF Format)
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [payslipDetails, setPayslipDetails] = useState<any | null>(null);
  const [loadingPayslipDetails, setLoadingPayslipDetails] = useState(false);

  const loadData = async () => {
    try {
      if (canManage) {
        const [slipsRes, empRes] = await Promise.all([
          api.get(`/payroll/payslips?month=${selectedMonth}&year=${selectedYear}`).catch(() => ({ data: { data: [] } })),
          api.get('/employees').catch(() => ({ data: { data: [] } })),
        ]);
        setPayslips(slipsRes.data.data || []);
        const empList = empRes.data.data || [];
        setEmployees(empList);
        if (empList.length > 0) {
          if (!selectedEmpId) setSelectedEmpId(empList[0].id);
          if (!historyEmpId) setHistoryEmpId(empList[0].id);
        }
      }

      const mySlipsRes = await api.get('/payroll/my-payslips').catch(() => ({ data: { data: [] } }));
      setMyPayslips(mySlipsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, canManage]);

  // Load selected employee's existing salary structure when chosen in Tab 2
  useEffect(() => {
    if (selectedEmpId && canManage) {
      setLoadingStructure(true);
      api
        .get(`/payroll/salary-structure/${selectedEmpId}`)
        .then((res) => {
          const s = res.data?.data;
          if (s) {
            setStructureData({
              annualCtc: s.annualCtc ? Number(s.annualCtc) : (s.monthlyCtc ? Number(s.monthlyCtc) * 12 : 600000),
              monthlyCtc: s.monthlyCtc ? Number(s.monthlyCtc) : (s.annualCtc ? Math.round(Number(s.annualCtc) / 12) : 50000),
              baseSalary: Number(s.baseSalary || 25000),
              hra: Number(s.hra || 12500),
              transportAllowance: Number(s.transport !== undefined ? s.transport : 3000),
              specialAllowance: Number(s.special !== undefined ? s.special : 6500),
              otherAllowance: Number(s.otherAllowance || 0),
              pf: Number(s.pf !== undefined ? s.pf : 1800),
              esi: Number(s.esi !== undefined ? s.esi : 0),
              professionalTax: Number(s.professionalTax !== undefined ? s.professionalTax : 200),
              overtimeMultiplier: Number(s.overtimeRate || 1.5),
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoadingStructure(false));
    }
  }, [selectedEmpId, canManage]);

  // Load Reports when Tab 3 is active or month/year changes
  const loadReports = async () => {
    if (!canManage) return;
    setLoadingReports(true);
    try {
      const res = await api.get(`/payroll/reports?month=${selectedMonth}&year=${selectedYear}`);
      setReportsData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load payroll reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  // Load Salary History when Tab 4 is active or historyEmpId changes
  const loadHistory = async () => {
    if (!historyEmpId || !canManage) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/payroll/salary-history/${historyEmpId}`);
      setSalaryHistory(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load salary history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'salary_history' && historyEmpId) {
      loadHistory();
    }
  }, [activeTab, historyEmpId]);

  // Auto-Compute Standard 50/25 CTC Split helper
  const applyStandardCtcBreakdown = (annual: number) => {
    const monthly = Math.round(annual / 12);
    const basic = Math.round(monthly * 0.5); // 50% Basic
    const hra = Math.round(basic * 0.5); // 50% of Basic / 25% of Monthly
    const transport = 3000;
    const special = Math.max(0, monthly - basic - hra - transport);
    const pf = 1800; // Standard statutory capped PF
    const esi = 0;
    const pt = 200; // Standard PT

    setStructureData({
      annualCtc: annual,
      monthlyCtc: monthly,
      baseSalary: basic,
      hra: hra,
      transportAllowance: transport,
      specialAllowance: special,
      otherAllowance: 0,
      pf: pf,
      esi: esi,
      professionalTax: pt,
      overtimeMultiplier: 1.5,
    });
  };

  // 1. Run Monthly Payroll Batch
  const handleGeneratePayroll = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await api.post('/payroll/generate', {
        month: selectedMonth,
        year: selectedYear,
      });
      setFeedback({ type: 'success', text: res.data.message || 'Payroll batch calculated and submitted for approval!' });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to generate payroll' });
    } finally {
      setGenerating(false);
    }
  };

  // 2. Batch Approve Month
  const handleBatchApprove = async () => {
    setApprovingBatch(true);
    setFeedback(null);
    try {
      const res = await api.post('/payroll/approve-batch', {
        month: selectedMonth,
        year: selectedYear,
      });
      setFeedback({ type: 'success', text: res.data.message || `Payroll approved for ${selectedMonth}/${selectedYear}!` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to approve payroll batch' });
    } finally {
      setApprovingBatch(false);
    }
  };

  // 3. Batch Disburse Month
  const handleBatchDisburse = async () => {
    setDisbursingBatch(true);
    setFeedback(null);
    try {
      const res = await api.post('/payroll/disburse-batch', {
        month: selectedMonth,
        year: selectedYear,
      });
      setFeedback({ type: 'success', text: res.data.message || `Payroll marked as disbursed for ${selectedMonth}/${selectedYear}!` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to disburse payroll batch' });
    } finally {
      setDisbursingBatch(false);
    }
  };

  // 4. Update Single Payslip Status
  const handleSingleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/payroll/payslips/${id}/status`, { status });
      setFeedback({ type: 'success', text: `Payslip marked as ${status.toLowerCase()}` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to update payslip' });
    }
  };

  // 5. Open Official Payslip PDF Modal
  const openPayslipDetails = async (id: string) => {
    setSelectedPayslipId(id);
    setLoadingPayslipDetails(true);
    try {
      const res = await api.get(`/payroll/payslips/${id}/details`);
      setPayslipDetails(res.data?.data || null);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to fetch payslip PDF details' });
      setSelectedPayslipId(null);
    } finally {
      setLoadingPayslipDetails(false);
    }
  };

  // 6. Save Salary Structure (Step 10.1)
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    setStructureSaving(true);
    setFeedback(null);
    try {
      await api.post('/payroll/salary-structure', {
        employeeId: selectedEmpId,
        annualCtc: structureData.annualCtc,
        monthlyCtc: structureData.monthlyCtc,
        baseSalary: structureData.baseSalary,
        hra: structureData.hra,
        transport: structureData.transportAllowance,
        special: structureData.specialAllowance,
        otherAllowance: structureData.otherAllowance,
        pf: structureData.pf,
        esi: structureData.esi,
        professionalTax: structureData.professionalTax,
        overtimeRate: structureData.overtimeMultiplier,
      });
      setFeedback({ type: 'success', text: 'Employee salary structure configured and saved successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to update salary structure' });
    } finally {
      setStructureSaving(false);
    }
  };

  // 7. Save Salary Revision
  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyEmpId) return;
    setRevisionSaving(true);
    setFeedback(null);
    try {
      await api.post('/payroll/salary-revision', {
        employeeId: historyEmpId,
        ...revisionForm,
      });
      setFeedback({ type: 'success', text: 'Salary revision recorded successfully!' });
      setShowRevisionModal(false);
      await loadHistory();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to record salary revision' });
    } finally {
      setRevisionSaving(false);
    }
  };

  // 8. Export Bank Advice to CSV
  const exportBankAdviceCSV = () => {
    if (!reportsData?.bankDisbursementAdvice || reportsData.bankDisbursementAdvice.length === 0) {
      setFeedback({ type: 'error', text: 'No bank disbursement records available to export' });
      return;
    }
    const headers = ['Employee Code', 'Employee Name', 'Department', 'Bank Name', 'Account Number', 'IFSC Code', 'Net Disbursed (INR)', 'Status'];
    const rows = reportsData.bankDisbursementAdvice.map((r: any) => [
      r.employeeCode,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      `"${r.bankName}"`,
      `"${r.accountNumber}"`,
      `"${r.ifsc}"`,
      r.netDisbursed,
      r.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bank_Disbursement_Advice_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const totalNet = payslips.reduce((sum, p) => sum + Number(p.netSalary), 0);
  const totalGross = payslips.reduce((sum, p) => sum + Number(p.grossSalary || (Number(p.baseSalary) + (p.allowancesTotal || 0))), 0);
  const totalDeductions = payslips.reduce((sum, p) => sum + Number(p.deductionsTotal || p.deductions || 0), 0);
  const pendingCount = payslips.filter((p) => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').length;
  const approvedCount = payslips.filter((p) => p.status === 'APPROVED').length;
  const disbursedCount = payslips.filter((p) => p.status === 'DISBURSED').length;

  const filteredPayslips = payslips.filter((p) => {
    if (payslipStatusFilter === 'ALL') return true;
    return p.status === payslipStatusFilter;
  });

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-indigo-700 backdrop-blur-md shadow-xs border border-indigo-100 mb-2">
            <Receipt className="h-3.5 w-3.5 text-indigo-600" />
            <span>End-to-End Monthly Payroll Lifecycle</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Payroll Governance & Disbursement
          </h1>
          <p className="mt-1 text-xs text-slate-600 font-medium">
            Run attendance-driven payroll, execute executive approvals, generate official payslips, and inspect statutory reports.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2.5 relative z-10">
            {/* Month & Year Pill */}
            <div className="flex items-center gap-2 rounded-2xl bg-white/95 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {[
                  { m: 1, name: 'Jan' },
                  { m: 2, name: 'Feb' },
                  { m: 3, name: 'Mar' },
                  { m: 4, name: 'Apr' },
                  { m: 5, name: 'May' },
                  { m: 6, name: 'Jun' },
                  { m: 7, name: 'Jul' },
                  { m: 8, name: 'Aug' },
                  { m: 9, name: 'Sep' },
                  { m: 10, name: 'Oct' },
                  { m: 11, name: 'Nov' },
                  { m: 12, name: 'Dec' },
                ].map((item) => (
                  <option key={item.m} value={item.m}>
                    {item.name} ({item.m})
                  </option>
                ))}
              </select>
              <span>/</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Run Batch */}
            <button
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-4 py-2 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Calculate Batch</span>
            </button>

            {/* Batch Approve Action */}
            {pendingCount > 0 && (
              <button
                onClick={handleBatchApprove}
                disabled={approvingBatch}
                className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {approvingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Approve All ({pendingCount}) ✅</span>
              </button>
            )}

            {/* Batch Disburse Action */}
            {approvedCount > 0 && (
              <button
                onClick={handleBatchDisburse}
                disabled={disbursingBatch}
                className="flex items-center gap-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold shadow-md transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {disbursingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                <span>Disburse ({approvedCount}) 💳</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-xs font-medium flex items-center justify-between border shadow-xs animate-in fade-in-50 duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 4 KPI Wave Summary Cards */}
      {canManage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Banknote className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Net Disbursed</span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">₹{totalNet.toLocaleString()}</div>
              <div className="mt-1 text-xs font-semibold text-emerald-600">
                {disbursedCount} disbursed • {approvedCount} approved
              </div>
            </div>
            <div className="mt-2 pt-2">
              <svg className="w-full h-8 text-emerald-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 25 C30 20, 60 10, 80 5 C90 2, 95 1, 100 0 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 25 C30 20, 60 10, 80 5 C90 2, 95 1, 100 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Gross Monthly Outlay</span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">₹{totalGross.toLocaleString()}</div>
              <div className="mt-1 text-xs font-semibold text-indigo-600">Base + HRA + Allowances + OT</div>
            </div>
            <div className="mt-2 pt-2">
              <svg className="w-full h-8 text-indigo-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 22 C25 18, 50 8, 75 14 C88 18, 95 10, 100 6 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 22 C25 18, 50 8, 75 14 C88 18, 95 10, 100 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Deductions & Fines</span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">₹{totalDeductions.toLocaleString()}</div>
              <div className="mt-1 text-xs font-semibold text-rose-600">PF, ESI, PT, LWP & late fines</div>
            </div>
            <div className="mt-2 pt-2">
              <svg className="w-full h-8 text-rose-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 15 C30 25, 60 5, 80 18 C90 22, 95 12, 100 8 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 15 C30 25, 60 5, 80 18 C90 22, 95 12, 100 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Receipt className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Pipeline Payslips</span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">{payslips.length}</div>
              <div className="mt-1 text-xs font-semibold text-blue-600">
                {pendingCount > 0 ? `${pendingCount} awaiting approval` : 'All approved/disbursed'}
              </div>
            </div>
            <div className="mt-2 pt-2">
              <svg className="w-full h-8 text-blue-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="inline-flex rounded-2xl bg-white p-1 border border-slate-200/80 shadow-2xs">
          {canManage && (
            <button
              onClick={() => setActiveTab('payslips')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'payslips'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Monthly Payslips & Approval ({payslips.length})</span>
            </button>
          )}

          {canManage && (
            <button
              onClick={() => setActiveTab('salary_config')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'salary_config'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>CTC & Salary Structure (10.1)</span>
            </button>
          )}

          {canManage && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Payroll Reports & Advice</span>
            </button>
          )}

          {canManage && (
            <button
              onClick={() => setActiveTab('salary_history')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'salary_history'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Salary History & Revisions</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'my'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span>My Payslips ({myPayslips.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MONTHLY RUN & APPROVAL */}
      {activeTab === 'payslips' && canManage && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Payslips' },
                { id: 'PENDING_APPROVAL', label: `Pending Approval (${pendingCount})` },
                { id: 'APPROVED', label: `Approved (${approvedCount})` },
                { id: 'DISBURSED', label: `Disbursed (${disbursedCount})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setPayslipStatusFilter(pill.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    payslipStatusFilter === pill.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadData}
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh List
            </button>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Attendance Breakdown</th>
                  <th className="py-3.5 px-6">Base Salary</th>
                  <th className="py-3.5 px-6">Gross Salary</th>
                  <th className="py-3.5 px-6">Total Deductions</th>
                  <th className="py-3.5 px-6">Net Payout</th>
                  <th className="py-3.5 px-6">Approval Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-400 font-medium">
                      No payslips found for the selected filter. Click &apos;Calculate Batch&apos; to generate payroll!
                    </td>
                  </tr>
                ) : (
                  filteredPayslips.map((slip) => (
                    <tr key={slip.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">
                          {slip.employee?.firstName} {slip.employee?.lastName || ''}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {slip.employee?.employeeCode} • {slip.employee?.department?.name || 'General'}
                        </div>
                      </td>

                      <td className="py-3.5 px-6 font-mono text-xs text-slate-700">
                        <span className="text-emerald-600 font-bold">{slip.presentDays}</span>/{slip.workingDays} Present
                        {slip.halfDays > 0 && <span className="text-purple-600 ml-1">({slip.halfDays} HD)</span>}
                        {slip.unpaidLeaves > 0 && <span className="text-rose-600 ml-1">({slip.unpaidLeaves} LWP)</span>}
                      </td>

                      <td className="py-3.5 px-6 font-mono text-slate-700 font-semibold">
                        ₹{Number(slip.baseSalary).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-6 font-mono text-indigo-600 font-semibold">
                        ₹{Number(slip.grossSalary || slip.baseSalary).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-6 font-mono text-rose-600 font-semibold">
                        -₹{Number(slip.deductionsTotal || slip.deductions || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-6 font-mono font-bold text-emerald-600 text-sm">
                        ₹{Number(slip.netSalary).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            slip.status === 'DISBURSED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : slip.status === 'APPROVED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : slip.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          <span>{slip.status.replace(/_/g, ' ')}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Action */}
                          {(slip.status === 'PENDING_APPROVAL' || slip.status === 'DRAFT') && (
                            <button
                              onClick={() => handleSingleStatusUpdate(slip.id, 'APPROVED')}
                              title="Approve Payslip"
                              className="rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 text-[11px] font-bold border border-emerald-200 transition-all"
                            >
                              Approve ✅
                            </button>
                          )}

                          {/* Disburse Action */}
                          {slip.status === 'APPROVED' && (
                            <button
                              onClick={() => handleSingleStatusUpdate(slip.id, 'DISBURSED')}
                              title="Mark Disbursed"
                              className="rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 text-[11px] font-bold border border-blue-200 transition-all"
                            >
                              Disburse 💳
                            </button>
                          )}

                          {/* View & Print PDF Slip */}
                          <button
                            onClick={() => openPayslipDetails(slip.id)}
                            className="flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 text-[11px] font-bold transition-all shadow-2xs"
                          >
                            <FileText className="h-3 w-3" />
                            <span>View PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CTC & SALARY STRUCTURE (STEP 10.1) */}
      {activeTab === 'salary_config' && canManage && (
        <div className="space-y-4">
          {/* Top Flow Stepper */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5 rounded-xl bg-indigo-50 text-indigo-700 px-3 py-1.5 border border-indigo-100 shrink-0">
              <User className="h-3.5 w-3.5" /> 1. Employee
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="flex items-center gap-1.5 rounded-xl bg-purple-50 text-purple-700 px-3 py-1.5 border border-purple-100 shrink-0">
              <DollarSign className="h-3.5 w-3.5" /> 2. Annual CTC
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="flex items-center gap-1.5 rounded-xl bg-blue-50 text-blue-700 px-3 py-1.5 border border-blue-100 shrink-0">
              <Briefcase className="h-3.5 w-3.5" /> 3. Basic & Allowances
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-700 px-3 py-1.5 border border-rose-100 shrink-0">
              <Shield className="h-3.5 w-3.5" /> 4. PF, ESI & PT
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 px-3 py-1.5 border border-emerald-100 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" /> 5. Gross & Overtime
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: HR Salary Configuration Form (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-indigo-600" />
                    <span>Configure Employee Salary Structure</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Step 10.1: Foundation for automated attendance-driven monthly payroll calculations
                  </p>
                </div>
                {loadingStructure && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveStructure} className="space-y-5">
                {/* 1. Employee Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee</label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName || ''} ({e.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. CTC Configuration */}
                <div className="rounded-2xl bg-purple-50/50 p-4 border border-purple-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-purple-600" /> CTC Setup
                    </span>
                    <button
                      type="button"
                      onClick={() => applyStandardCtcBreakdown(Number(structureData.annualCtc || 600000))}
                      className="inline-flex items-center gap-1 rounded-xl bg-purple-600 text-white px-2.5 py-1 text-[10px] font-bold shadow-xs hover:bg-purple-700 transition-all"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-Calculate Standard Split</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 mb-1">Annual CTC (₹)</label>
                      <input
                        type="number"
                        value={structureData.annualCtc}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setStructureData({
                            ...structureData,
                            annualCtc: val,
                            monthlyCtc: Math.round(val / 12),
                          });
                        }}
                        className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-bold font-mono text-purple-950 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                      />
                      <span className="text-[10px] text-purple-600 mt-0.5 block">e.g. ₹6,00,000 / year</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 mb-1">Monthly CTC (₹)</label>
                      <input
                        type="number"
                        value={structureData.monthlyCtc}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setStructureData({
                            ...structureData,
                            monthlyCtc: val,
                            annualCtc: val * 12,
                          });
                        }}
                        className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-bold font-mono text-purple-950 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                      />
                      <span className="text-[10px] text-purple-600 mt-0.5 block">e.g. ₹50,000 / month</span>
                    </div>
                  </div>
                </div>

                {/* 3. Basic Salary & Allowances */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-600" /> Basic & Monthly Allowances
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Basic Salary (₹)</label>
                      <input
                        type="number"
                        value={structureData.baseSalary}
                        onChange={(e) => setStructureData({ ...structureData, baseSalary: Number(e.target.value) })}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 50% of monthly CTC (₹25,000)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">House Rent Allowance - HRA (₹)</label>
                      <input
                        type="number"
                        value={structureData.hra}
                        onChange={(e) => setStructureData({ ...structureData, hra: Number(e.target.value) })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 50% of basic (₹12,500)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Transport Allowance (₹)</label>
                      <input
                        type="number"
                        value={structureData.transportAllowance}
                        onChange={(e) =>
                          setStructureData({ ...structureData, transportAllowance: Number(e.target.value) })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. ₹3,000</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Special Allowance (₹)</label>
                      <input
                        type="number"
                        value={structureData.specialAllowance}
                        onChange={(e) =>
                          setStructureData({ ...structureData, specialAllowance: Number(e.target.value) })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. ₹6,500</span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Other Allowance (₹)</label>
                      <input
                        type="number"
                        value={structureData.otherAllowance}
                        onChange={(e) =>
                          setStructureData({ ...structureData, otherAllowance: Number(e.target.value) })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Optional supplemental or project allowances</span>
                    </div>
                  </div>
                </div>

                {/* 4. Statutory Deductions */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-rose-600" /> Statutory Deductions (Monthly ₹)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">PF - Provident Fund (₹)</label>
                      <input
                        type="number"
                        value={structureData.pf}
                        onChange={(e) => setStructureData({ ...structureData, pf: Number(e.target.value) })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. ₹1,800 statutory cap</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ESI (₹)</label>
                      <input
                        type="number"
                        value={structureData.esi}
                        onChange={(e) => setStructureData({ ...structureData, esi: Number(e.target.value) })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">0.75% if gross ≤ ₹21,000</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Professional Tax (₹)</label>
                      <input
                        type="number"
                        value={structureData.professionalTax}
                        onChange={(e) =>
                          setStructureData({ ...structureData, professionalTax: Number(e.target.value) })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Standard ₹200 / month</span>
                    </div>
                  </div>
                </div>

                {/* 5. Overtime Policy */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Overtime Hourly Rate Multiplier
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.1"
                      value={structureData.overtimeMultiplier}
                      onChange={(e) =>
                        setStructureData({ ...structureData, overtimeMultiplier: Number(e.target.value) })
                      }
                      className="w-36 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs font-bold font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                    <span className="text-xs text-slate-500">
                      Standard is <strong>1.5x</strong> of calculated hourly wage (Base ÷ 22 days ÷ 8 hrs).
                    </span>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Saves permanently to employee profile & payslip engine
                  </span>
                  <button
                    type="submit"
                    disabled={structureSaving}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {structureSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{structureSaving ? 'Saving Structure...' : 'Save Salary Structure'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Real-Time Salary Specification Card (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-slate-50/40 to-slate-100/60 p-6 shadow-sm space-y-5 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                    <Receipt className="h-3 w-3" /> Live Payroll Foundation
                  </div>
                  <h4 className="text-base font-black text-slate-900 mt-1.5">
                    {employees.find((e) => e.id === selectedEmpId)?.firstName || 'Employee'}{' '}
                    {employees.find((e) => e.id === selectedEmpId)?.lastName || ''}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    {employees.find((e) => e.id === selectedEmpId)?.employeeCode || 'EMP-CODE'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Annual CTC</span>
                  <span className="text-base font-black text-purple-700 font-mono">
                    ₹{Number(structureData.annualCtc || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (₹{Number(structureData.monthlyCtc || 0).toLocaleString()}/mo)
                  </span>
                </div>
              </div>

              {/* Earnings Breakdown Table */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Monthly Earnings Breakdown
                </span>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span className="font-sans font-medium text-slate-600">Basic Salary</span>
                    <span className="font-bold">₹{Number(structureData.baseSalary || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span className="font-sans font-medium text-slate-600">HRA</span>
                    <span className="font-bold">₹{Number(structureData.hra || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span className="font-sans font-medium text-slate-600">Transport Allowance</span>
                    <span className="font-bold">₹{Number(structureData.transportAllowance || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span className="font-sans font-medium text-slate-600">Special Allowance</span>
                    <span className="font-bold">₹{Number(structureData.specialAllowance || 0).toLocaleString()}</span>
                  </div>
                  {Number(structureData.otherAllowance || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                      <span className="font-sans font-medium text-slate-600">Other Allowance</span>
                      <span className="font-bold">₹{Number(structureData.otherAllowance || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Gross Total Banner (Matches User Example) */}
                <div className="mt-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-3.5 text-white flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-100 block">Gross Salary</span>
                    <span className="text-[10px] text-indigo-200">Total earnings before deductions</span>
                  </div>
                  <span className="text-xl font-black font-mono">
                    ₹{(
                      Number(structureData.baseSalary || 0) +
                      Number(structureData.hra || 0) +
                      Number(structureData.transportAllowance || 0) +
                      Number(structureData.specialAllowance || 0) +
                      Number(structureData.otherAllowance || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Statutory Deductions
                </span>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span className="font-sans font-medium text-slate-600">Provident Fund (PF)</span>
                    <span className="font-bold text-rose-600">-₹{Number(structureData.pf || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span className="font-sans font-medium text-slate-600">Employee State Insurance (ESI)</span>
                    <span className="font-bold text-rose-600">-₹{Number(structureData.esi || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span className="font-sans font-medium text-slate-600">Professional Tax (PT)</span>
                    <span className="font-bold text-rose-600">-₹{Number(structureData.professionalTax || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-1 text-slate-700 font-mono">
                  <span className="font-sans text-slate-600">Total Deductions:</span>
                  <span className="text-rose-600">
                    -₹{(
                      Number(structureData.pf || 0) +
                      Number(structureData.esi || 0) +
                      Number(structureData.professionalTax || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Estimated Net Take-Home Pay */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Estimated Net Take-Home
                  </span>
                  <span className="text-[10px] text-emerald-600">Gross minus statutory deductions</span>
                </div>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  ₹{Math.max(
                    0,
                    Number(structureData.baseSalary || 0) +
                      Number(structureData.hra || 0) +
                      Number(structureData.transportAllowance || 0) +
                      Number(structureData.specialAllowance || 0) +
                      Number(structureData.otherAllowance || 0) -
                      (Number(structureData.pf || 0) +
                        Number(structureData.esi || 0) +
                        Number(structureData.professionalTax || 0))
                  ).toLocaleString()}
                </span>
              </div>

              {/* Overtime Policy Info Callout */}
              <div className="rounded-xl bg-slate-100/80 p-3 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Overtime Rate</span>
                  <span className="font-mono text-indigo-600">{structureData.overtimeMultiplier}x Base Hourly</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Calculated at ₹
                  {Math.round(
                    ((Number(structureData.baseSalary || 0) / 22) / 8) *
                      Number(structureData.overtimeMultiplier || 1.5)
                  )}
                  /hour based on a 22 working day schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYROLL REPORTS & COMPLIANCE */}
      {activeTab === 'reports' && canManage && (
        <div className="space-y-5">
          {/* Sub-tab pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setReportSubTab('summary')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  reportSubTab === 'summary' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Executive & Department Breakdown</span>
              </button>
              <button
                onClick={() => setReportSubTab('bank')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  reportSubTab === 'bank' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Bank Disbursement Advice</span>
              </button>
              <button
                onClick={() => setReportSubTab('statutory')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  reportSubTab === 'statutory' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Statutory Compliance (PF/ESI/PT)</span>
              </button>
            </div>

            {reportSubTab === 'bank' && (
              <button
                onClick={exportBankAdviceCSV}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-all shrink-0"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export Bank CSV 📥</span>
              </button>
            )}
          </div>

          {loadingReports ? (
            <div className="flex h-64 items-center justify-center rounded-3xl bg-white border border-slate-100">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : !reportsData ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-100">
              No report data available for this month. Run payroll batch first!
            </div>
          ) : (
            <>
              {/* Sub-tab 1: Executive & Department Breakdown */}
              {reportSubTab === 'summary' && (
                <div className="space-y-4">
                  {/* Department Table */}
                  <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Department-Wise Payroll Allocation ({selectedMonth}/{selectedYear})
                        </h4>
                        <p className="text-[11px] text-slate-400">Headcount and expenditure by organizational unit</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        Total Units: {reportsData.departmentBreakdown.length}
                      </span>
                    </div>

                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="py-3.5 px-6">Department Unit</th>
                          <th className="py-3.5 px-6">Employees</th>
                          <th className="py-3.5 px-6">Gross Allocation</th>
                          <th className="py-3.5 px-6">Net Payout</th>
                          <th className="py-3.5 px-6 text-right">Avg / Employee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {reportsData.departmentBreakdown.map((dept: any) => (
                          <tr key={dept.department} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-6 font-bold text-slate-900 flex items-center gap-2">
                              <Building className="h-4 w-4 text-indigo-600" />
                              <span>{dept.department}</span>
                            </td>
                            <td className="py-3.5 px-6 font-mono font-semibold text-slate-700">
                              {dept.employeeCount} staff
                            </td>
                            <td className="py-3.5 px-6 font-mono text-indigo-600 font-bold">
                              ₹{dept.grossTotal.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-6 font-mono text-emerald-600 font-bold">
                              ₹{dept.netTotal.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-6 text-right font-mono text-slate-600">
                              ₹{Math.round(dept.netTotal / dept.employeeCount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Bank Disbursement Advice */}
              {reportSubTab === 'bank' && (
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Bank NEFT / RTGS Payout Advice File
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Ready for upload to corporate banking portal (HDFC / ICICI / SBI)
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-600">
                      Disbursement Total: ₹{reportsData.executiveSummary.totalNet.toLocaleString()}
                    </span>
                  </div>

                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="py-3.5 px-6">Beneficiary Name</th>
                        <th className="py-3.5 px-6">Emp Code</th>
                        <th className="py-3.5 px-6">Bank Name</th>
                        <th className="py-3.5 px-6">Account Number</th>
                        <th className="py-3.5 px-6">IFSC Code</th>
                        <th className="py-3.5 px-6">Net Amount (₹)</th>
                        <th className="py-3.5 px-6 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-mono text-xs">
                      {reportsData.bankDisbursementAdvice.map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-sans font-bold text-slate-900">{b.employeeName}</td>
                          <td className="py-3.5 px-6 text-slate-500">{b.employeeCode}</td>
                          <td className="py-3.5 px-6 font-sans text-slate-600">{b.bankName}</td>
                          <td className="py-3.5 px-6 text-slate-900 font-bold">{b.accountNumber}</td>
                          <td className="py-3.5 px-6 text-indigo-600">{b.ifsc}</td>
                          <td className="py-3.5 px-6 text-emerald-600 font-bold text-sm">
                            ₹{Number(b.netDisbursed).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-6 text-right font-sans">
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-tab 3: Statutory Compliance (PF, ESI, PT) */}
              {reportSubTab === 'statutory' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-indigo-600" /> Employees Provident Fund (EPF)
                      </span>
                      <div className="text-2xl font-black text-slate-900 font-mono">
                        ₹{reportsData.statutoryCompliance.pfTotal.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>Employee Share (12%): ₹{reportsData.statutoryCompliance.pfEmployee.toLocaleString()}</div>
                        <div>Employer Share (12%): ₹{reportsData.statutoryCompliance.pfEmployer.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-blue-600" /> Employees State Insurance (ESIC)
                      </span>
                      <div className="text-2xl font-black text-slate-900 font-mono">
                        ₹{reportsData.statutoryCompliance.esiTotal.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>Employee (0.75%): ₹{reportsData.statutoryCompliance.esiEmployee.toLocaleString()}</div>
                        <div>Employer (3.25%): ₹{reportsData.statutoryCompliance.esiEmployer.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-purple-600" /> Professional Tax (PT)
                      </span>
                      <div className="text-2xl font-black text-slate-900 font-mono">
                        ₹{reportsData.statutoryCompliance.professionalTax.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500">State statutory tax remittance</div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-900 text-white p-5 flex items-center justify-between shadow-md">
                    <div>
                      <h4 className="text-sm font-bold">Total Monthly Statutory Deposit Liability</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Due for challan generation before 15th of next calendar month</p>
                    </div>
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      ₹{reportsData.statutoryCompliance.totalStatutoryLiability.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 4: EMPLOYEE SALARY HISTORY & REVISIONS */}
      {activeTab === 'salary_history' && canManage && (
        <div className="space-y-5">
          {/* Employee Selector & Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Choose Employee:</label>
              <select
                value={historyEmpId}
                onChange={(e) => setHistoryEmpId(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName || ''} ({e.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowRevisionModal(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Record Salary Revision / Appraisal</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex h-64 items-center justify-center rounded-3xl bg-white border border-slate-100">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : !salaryHistory ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-100">
              Select an employee to view their salary history and compensation timeline.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Current Snapshot Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100 mb-1">
                    <CheckCircle2 className="h-3 w-3" /> Active Compensation Level
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {salaryHistory.employee.name} ({salaryHistory.employee.employeeCode})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {salaryHistory.employee.designation || 'Staff'} • {salaryHistory.employee.department || 'General'}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Annual CTC</span>
                    <span className="text-lg font-black font-mono text-purple-700">
                      ₹{Number(salaryHistory.currentSalaryStructure?.annualCtc || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Base Monthly</span>
                    <span className="text-lg font-black font-mono text-slate-800">
                      ₹{Number(salaryHistory.currentSalaryStructure?.baseSalary || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Revisions Timeline & Log */}
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-4 w-4 text-indigo-600" />
                    <span>Compensation Revision History ({salaryHistory.revisions.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Formal appraisal and promotion audit log</span>
                </div>

                {salaryHistory.revisions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">
                    No historical revisions logged yet for this employee. Use &apos;Record Salary Revision&apos; above to log increments.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {salaryHistory.revisions.map((rev: any) => (
                      <div key={rev.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {rev.revisionReason.replace(/_/g, ' ')}
                            </span>
                            {rev.hikePercentage !== null && (
                              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-black font-mono">
                                +{rev.hikePercentage}% Hike
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            Effective Date: {new Date(rev.effectiveDate).toLocaleDateString()} • Logged on {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          {rev.previousAnnualCtc && (
                            <span className="text-slate-400 line-through">
                              ₹{Number(rev.previousAnnualCtc).toLocaleString()}
                            </span>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                          <span className="font-black text-indigo-700 text-sm">
                            ₹{Number(rev.annualCtc).toLocaleString()} / yr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MY PAYSLIPS */}
      {activeTab === 'my' && (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Your Personal Payslips ({myPayslips.length})
            </h3>
            <span className="text-[11px] text-slate-400">Click &apos;View PDF&apos; to inspect formal salary slip</span>
          </div>

          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-6">Pay Period</th>
                <th className="py-3.5 px-6">Attendance</th>
                <th className="py-3.5 px-6">Gross Salary</th>
                <th className="py-3.5 px-6">Deductions</th>
                <th className="py-3.5 px-6">Net Disbursed</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Pay Advice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {myPayslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-medium">
                    No payslips generated for your account yet.
                  </td>
                </tr>
              ) : (
                myPayslips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {slip.month}/{slip.year}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-700">
                      {slip.presentDays}/{slip.workingDays} Present
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-700 font-semibold">
                      ₹{Number(slip.grossSalary || slip.baseSalary).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-rose-600 font-semibold">
                      -₹{Number(slip.deductionsTotal || slip.deductions || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-emerald-600">
                      ₹{Number(slip.netSalary).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                        {slip.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => openPayslipDetails(slip.id)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        <span>View PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: OFFICIAL PRINTABLE PAYSLIP PDF VIEW */}
      {selectedPayslipId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="relative w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-7 shadow-2xl space-y-5 max-h-[92vh] flex flex-col justify-between overflow-hidden">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Official Employee Pay Advice</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{payslipDetails?.referenceNo || 'Loading pay advice...'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedPayslipId(null);
                    setPayslipDetails(null);
                  }}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loadingPayslipDetails ? (
              <div className="flex h-72 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : !payslipDetails ? (
              <div className="py-12 text-center text-xs text-rose-600">Failed to load payslip data.</div>
            ) : (
              /* Printable Pay Advice Letterhead Container */
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-sans text-slate-800 p-6 bg-slate-50/60 rounded-2xl border border-slate-200">
                {/* Letterhead */}
                <div className="flex items-start justify-between border-b border-slate-300 pb-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src="/workpulse-logo.png"
                      alt="WorkPulse Logo"
                      className="h-12 w-12 object-contain rounded-2xl border border-slate-200 bg-white p-1 shadow-2xs"
                    />
                    <div>
                      <h2 className="text-xl font-black text-indigo-950 tracking-tight">
                        {payslipDetails.organization.name}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {payslipDetails.organization.address}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block text-xs">
                      PAYSLIP FOR {payslipDetails.period.periodLabel.toUpperCase()}
                    </span>
                    <span className="font-mono text-[11px] text-indigo-600 font-bold block">
                      Ref: {payslipDetails.referenceNo}
                    </span>
                  </div>
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee Name</span>
                    <span className="font-bold text-slate-900 block">{payslipDetails.employee.name}</span>
                    <span className="text-slate-500 font-mono">{payslipDetails.employee.employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Department / Role</span>
                    <span className="font-bold text-slate-800 block">{payslipDetails.employee.designation}</span>
                    <span className="text-slate-500">{payslipDetails.employee.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Bank Details</span>
                    <span className="font-bold text-slate-800 block">{payslipDetails.employee.bankName}</span>
                    <span className="text-slate-500 font-mono">{payslipDetails.employee.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">PAN / Status</span>
                    <span className="font-bold text-slate-800 block font-mono">{payslipDetails.employee.panNumber}</span>
                    <span className="font-black text-emerald-600">{payslipDetails.governance.status}</span>
                  </div>
                </div>

                {/* Attendance Mini Bar */}
                <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-slate-200 text-[11px] font-mono">
                  <span>Working Days: <strong>{payslipDetails.attendance.workingDays}</strong></span>
                  <span>Present Days: <strong className="text-emerald-600">{payslipDetails.attendance.presentDays}</strong></span>
                  <span>Paid Leaves: <strong>{payslipDetails.attendance.paidLeaveDays}</strong></span>
                  <span>LWP: <strong className="text-rose-600">{payslipDetails.attendance.unpaidLeaveDays}</strong></span>
                  <span>Overtime: <strong>{payslipDetails.attendance.overtimeHours} hrs</strong></span>
                </div>

                {/* Earnings vs Deductions Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Earnings */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="bg-slate-100/80 px-3.5 py-1.5 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex justify-between">
                      <span>Earnings Breakdown</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-slate-100 p-2 space-y-1">
                      {payslipDetails.earnings.map((e: any) => (
                        <div key={e.label} className="flex justify-between py-1 text-[11px]">
                          <span className="text-slate-600">{e.label}</span>
                          <span className="font-mono font-semibold text-slate-900">₹{e.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-indigo-950 text-xs">
                        <span>Total Gross Earnings:</span>
                        <span className="font-mono text-indigo-600">₹{payslipDetails.totals.grossSalary.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="bg-slate-100/80 px-3.5 py-1.5 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex justify-between">
                      <span>Deductions & Fines</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-slate-100 p-2 space-y-1">
                      {payslipDetails.deductions.map((d: any) => (
                        <div key={d.label} className="flex justify-between py-1 text-[11px]">
                          <span className="text-slate-600">{d.label}</span>
                          <span className="font-mono font-semibold text-rose-600">-₹{d.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-xs">
                        <span>Total Deductions:</span>
                        <span className="font-mono text-rose-600">-₹{payslipDetails.totals.totalDeductions.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Salary Highlight */}
                <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-100 font-bold block">
                      Net Take-Home Salary Payable
                    </span>
                    <span className="text-[11px] text-emerald-100 font-medium">
                      In Words: <em>{payslipDetails.totals.netSalaryInWords}</em>
                    </span>
                  </div>
                  <span className="text-2xl font-black font-mono">
                    ₹{payslipDetails.totals.netSalary.toLocaleString()}
                  </span>
                </div>

                {/* Signatures */}
                <div className="flex items-center justify-between pt-6 text-[11px]">
                  <div className="space-y-1">
                    <div className="h-8 border-b border-slate-400 w-40"></div>
                    <span className="font-bold text-slate-900 block">Authorized HR Signatory</span>
                    <span className="text-[10px] text-slate-400">{payslipDetails.organization.name}</span>
                  </div>

                  <div className="space-y-1 text-right">
                    <div className="h-8 border-b border-slate-400 w-40 ml-auto"></div>
                    <span className="font-bold text-slate-900 block">Employee Signature</span>
                    <span className="text-[10px] text-slate-400">{payslipDetails.employee.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedPayslipId(null);
                  setPayslipDetails(null);
                }}
                className="rounded-2xl bg-slate-900 text-white px-6 py-2 text-xs font-bold hover:bg-slate-800"
              >
                Close Pay Advice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD SALARY REVISION */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Salary Revision</h3>
                  <p className="text-[11px] text-slate-400">Log appraisal, promotion, or compensation correction</p>
                </div>
              </div>
              <button onClick={() => setShowRevisionModal(false)} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRevision} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Revision Reason</label>
                <select
                  value={revisionForm.revisionReason}
                  onChange={(e) => setRevisionForm({ ...revisionForm, revisionReason: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 font-bold text-slate-800 focus:outline-none"
                >
                  <option value="ANNUAL_APPRAISAL">Annual Performance Appraisal</option>
                  <option value="PROMOTION">Promotion / Grade Revision</option>
                  <option value="MARKET_CORRECTION">Market Standard Correction</option>
                  <option value="PROBATION_CONFIRMATION">Probation Confirmation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Annual CTC (₹)</label>
                  <input
                    type="number"
                    value={revisionForm.annualCtc}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const monthly = Math.round(val / 12);
                      const basic = Math.round(monthly * 0.5);
                      setRevisionForm({
                        ...revisionForm,
                        annualCtc: val,
                        monthlyCtc: monthly,
                        baseSalary: basic,
                        hra: Math.round(basic * 0.5),
                        special: Math.max(0, monthly - basic - Math.round(basic * 0.5) - revisionForm.transport),
                      });
                    }}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={revisionForm.effectiveDate}
                    onChange={(e) => setRevisionForm({ ...revisionForm, effectiveDate: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Basic Salary (₹)</label>
                  <input
                    type="number"
                    value={revisionForm.baseSalary}
                    onChange={(e) => setRevisionForm({ ...revisionForm, baseSalary: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 font-mono text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HRA (₹)</label>
                  <input
                    type="number"
                    value={revisionForm.hra}
                    onChange={(e) => setRevisionForm({ ...revisionForm, hra: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 font-mono text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revisionSaving}
                  className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {revisionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Save Revision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
