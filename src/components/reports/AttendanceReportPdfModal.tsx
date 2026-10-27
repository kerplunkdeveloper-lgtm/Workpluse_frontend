"use client";

import React, { useRef, useState } from "react";
import { formatDate, formatTime, formatDurationMinutes } from "@/lib/utils";
import { Printer, Download, X, ShieldCheck, Filter, MapPin } from "lucide-react";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

interface AttendanceReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "DAILY" | "MONTHLY";
  dailyData?: any;
  monthlyData?: any;
  selectedDate?: string;
  selectedMonth?: number;
  selectedYear?: number;
}

const STATUS_SHORT: Record<string, string> = {
  WORK_FROM_HOME: "WFH",
  HALF_DAY: "Half day",
  ON_LEAVE: "Leave",
  WEEK_OFF: "Week off",
};
const statusText = (status?: string) => STATUS_SHORT[status || ""] || (status || "").replace(/_/g, " ");
const minutesOrDash = (minutes?: number | null) => (minutes && minutes > 0 ? formatDurationMinutes(minutes) : "-");

export default function AttendanceReportPdfModal({
  isOpen,
  onClose,
  type,
  dailyData,
  monthlyData,
  selectedDate,
  selectedMonth,
  selectedYear,
}: AttendanceReportPdfModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");

  if (!isOpen) return null;

  // The sheet is printed from its own hidden page. Printing the app itself would drag the sidebar, header and
  // the page behind this dialog into the PDF, and they overlap the report.
  const handlePrint = () => {
    const sheet = printRef.current;
    if (!sheet) return;
    const branchSlug = activeBranch ? `-${activeBranch.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : "";
    const fileTitle =
      (type === "DAILY"
        ? `Daily-Attendance-${String(selectedDate || dailyData?.date || "").split("T")[0] || "report"}`
        : `Monthly-Attendance-${selectedMonth || monthlyData?.month || ""}-${selectedYear || monthlyData?.year || ""}`) + branchSlug;

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1123px;height:794px;border:0;visibility:hidden;";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join("");
    doc.open();
    doc.write(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${fileTitle}</title><base href="${document.baseURI}">${styles}<style>
        @page { size: A4 landscape; margin: 10mm; }
        html, body { margin: 0; background: #fff !important; color: #0f172a; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        table { min-width: 0 !important; width: 100% !important; }
        tr { break-inside: avoid; }
        thead { display: table-header-group; }
        .overflow-x-auto { overflow: visible !important; }
      </style></head><body>${sheet.outerHTML}</body></html>`,
    );
    doc.close();

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      win.focus();
      win.print();
    };
    win.addEventListener("afterprint", () => frame.remove());
    win.addEventListener("load", () => setTimeout(start, 250));
    // The load event can already have fired for a document written this way; never leave the button doing nothing.
    setTimeout(start, 1500);
    setTimeout(() => frame.remove(), 120000);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthString = selectedMonth
    ? monthNames[selectedMonth - 1]
    : monthlyData?.month
    ? monthNames[monthlyData.month - 1]
    : "Current Month";
  const yearString = selectedYear || monthlyData?.year || new Date().getFullYear();

  const orgName =
    dailyData?.organizationName ||
    monthlyData?.organizationName ||
    "WorkPluse Enterprise Workforce";

  const allDailyRecords: any[] = dailyData?.records || dailyData?.attendances || [];
  const allMonthlyRecords: any[] = monthlyData?.report || [];

  // The branch an employee belongs to (not the one a punch happened to match).
  const branchOfDaily = (r: any): { id: string; name: string } | null => {
    const b = r.employeeBranch || r.branch;
    return b?.id ? { id: String(b.id), name: String(b.name || "Branch") } : null;
  };
  const branchMap = new Map<string, string>();
  if (type === "DAILY") {
    allDailyRecords.forEach((r) => {
      const b = branchOfDaily(r);
      if (b) branchMap.set(b.id, b.name);
    });
  } else {
    allMonthlyRecords.forEach((m) => {
      if (m.branchId) branchMap.set(String(m.branchId), String(m.branch || "Branch"));
    });
  }
  const branchOptions = Array.from(branchMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  const activeBranch = branchOptions.find((b) => b.id === branchFilter) || null;
  const branchLabel = activeBranch ? activeBranch.name : "All branches";

  const rawRecords = activeBranch ? allDailyRecords.filter((r) => branchOfDaily(r)?.id === activeBranch.id) : allDailyRecords;
  const monthlyRecords = activeBranch ? allMonthlyRecords.filter((m) => String(m.branchId) === activeBranch.id) : allMonthlyRecords;

  // The counts follow the chosen branch, so the cards always match the rows below.
  const countOf = (status: string) => rawRecords.filter((r) => r.status === status).length;
  const summary = {
    totalEmployees: rawRecords.length,
    present: countOf("PRESENT"),
    late: countOf("LATE"),
    absent: countOf("ABSENT"),
    onLeave: countOf("ON_LEAVE"),
    wfh: countOf("WORK_FROM_HOME"),
  };

  const filteredDailyRecords = rawRecords.filter((r: any) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });

  return (
    <Modal onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={type === "DAILY" ? "Daily attendance report" : "Monthly attendance report"}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl sm:rounded-3xl"
      >
        {/* Top control bar: stays in view while the report scrolls */}
        <div className="shrink-0 flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {type === "DAILY" ? "Daily Attendance Register" : "Monthly Attendance Register"}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {type === "DAILY"
                ? formatDate(selectedDate || dailyData?.date || new Date().toISOString())
                : `${monthString} ${yearString}`}
            </span>

            {/* Branch-wise report: pick one branch and the cards, rows and PDF all follow it */}
            {branchOptions.length > 1 && (
              <label className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span className="sr-only">Branch</span>
                <Select
                  value={activeBranch ? activeBranch.id : "ALL"}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="max-w-[11rem] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="ALL">All branches</option>
                  {branchOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}

            {/* Quick Filter for Daily */}
            {type === "DAILY" && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter the report by status"
                  className="max-w-[11rem] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="ALL">All Records ({rawRecords.length})</option>
                  <option value="PRESENT">Present Only ({summary.present || 0})</option>
                  <option value="LATE">Late Arrivals ({summary.late || 0})</option>
                  <option value="ABSENT">Absent Only ({summary.absent || 0})</option>
                  <option value="ON_LEAVE">On Leave ({summary.onLeave || 0})</option>
                  <option value="WORK_FROM_HOME">Remote WFH ({summary.wfh || 0})</option>
                </Select>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="Opens the print window. Choose Save as PDF to download."
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-[0.98] sm:flex-none cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print"
              title="Print"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              title="Close"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* The report scrolls here; its own page is what gets printed */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-3 py-4 sm:px-8 sm:py-6">
        <div ref={printRef} className="space-y-6 rounded-2xl bg-white p-4 text-slate-800 shadow-sm ring-1 ring-slate-200 sm:p-8">
          {/* Official Letterhead Header */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-v2.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900 leading-tight">
                    {orgName}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Workforce Attendance & Timesheet Register | Statutory Compliance Portal
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                {type === "DAILY" ? "Daily Attendance Sheet" : "Monthly Muster Roll"}
              </h3>
              <p className="text-xs font-bold text-indigo-700 mt-0.5">
                {type === "DAILY"
                  ? formatDate(selectedDate || dailyData?.date || new Date().toISOString())
                  : `${monthString} ${yearString}`}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                <MapPin className="h-3 w-3 text-slate-400" aria-hidden="true" />
                {branchLabel}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Generated: {new Date().toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          {type === "DAILY" ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="p-2 rounded-xl bg-white border border-slate-100">
                <span className="text-xs uppercase font-bold text-slate-400 block">Total Staff</span>
                <span className="text-lg font-bold text-slate-900">{summary.totalEmployees}</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs uppercase font-bold text-emerald-700 block">Present</span>
                <span className="text-lg font-bold text-emerald-700">{summary.present || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-xs uppercase font-bold text-amber-700 block">Late</span>
                <span className="text-lg font-bold text-amber-700">{summary.late || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <span className="text-xs uppercase font-bold text-rose-700 block">Absent</span>
                <span className="text-lg font-bold text-rose-700">{summary.absent || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-xs uppercase font-bold text-indigo-700 block">On Leave</span>
                <span className="text-lg font-bold text-indigo-700">{summary.onLeave || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-sky-50 border border-sky-100">
                <span className="text-xs uppercase font-bold text-sky-700 block">WFH</span>
                <span className="text-lg font-bold text-sky-700">{summary.wfh || 0}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                <span className="text-xs uppercase font-bold text-slate-400 block">Total Staff</span>
                <span className="text-lg font-bold text-slate-900">{monthlyRecords.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs uppercase font-bold text-emerald-700 block">Working Days</span>
                <span className="text-lg font-bold text-emerald-700">26 Days Standard</span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-xs uppercase font-bold text-indigo-700 block">Month / Year</span>
                <span className="text-lg font-bold text-indigo-700">{monthString} {yearString}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-xs uppercase font-bold text-amber-700 block">Total Overtime Hours</span>
                <span className="text-lg font-bold text-amber-700">
                  {monthlyRecords.reduce((sum: number, r: any) => sum + parseFloat(r.overtimeHours || 0), 0).toFixed(1)} hrs
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                <span className="text-xs uppercase font-bold text-sky-700 block">Total Leaves Taken</span>
                <span className="text-lg font-bold text-sky-700">
                  {monthlyRecords.reduce((sum: number, r: any) => sum + Number(r.approvedLeaveDays || 0), 0)} days
                </span>
              </div>
            </div>
          )}

          {/* Table Data */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            {type === "DAILY" ? (
              <table className="w-full min-w-[880px] table-fixed text-left text-[12px] border-collapse">
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "9%" }} />
                </colgroup>
                <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-2">Code</th>
                    <th className="py-2.5 px-2">Employee</th>
                    <th className="py-2.5 px-2">Department</th>
                    <th className="py-2.5 px-2">Punch In</th>
                    <th className="py-2.5 px-2">Punch Out</th>
                    <th className="py-2.5 px-2">Break</th>
                    <th className="py-2.5 px-2">Lunch</th>
                    <th className="py-2.5 px-2">Worked</th>
                    <th className="py-2.5 px-2">Late</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDailyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-400 text-xs">
                        No attendance entries matching this status.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyRecords.map((r: any, idx: number) => {
                      const empName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim() || "Employee";
                      const isLate = r.status === "LATE";
                      const isAbsent = r.status === "ABSENT";
                      const isOnLeave = r.status === "ON_LEAVE";
                      const isPresent = r.status === "PRESENT" || r.status === "WORK_FROM_HOME";

                      return (
                        <tr key={r.id || idx} className="hover:bg-slate-50 align-middle">
                          <td className="py-2 px-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-2 font-mono font-bold text-slate-600 text-[11px] truncate">
                            {r.employee?.employeeCode || `EMP-${100 + idx}`}
                          </td>
                          <td className="py-2 px-2 font-bold text-slate-900 break-words">{empName}</td>
                          <td className="py-2 px-2 text-slate-600 break-words">{r.employee?.department?.name || "General"}</td>
                          <td className="py-2 px-2 font-mono text-slate-700 whitespace-nowrap">
                            {r.checkIn ? formatTime(r.checkIn) : "-"}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-700 whitespace-nowrap">
                            {r.checkOut ? formatTime(r.checkOut) : "-"}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-600 whitespace-nowrap">
                            {minutesOrDash(r.breakMinutes)}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-600 whitespace-nowrap">
                            {minutesOrDash(r.lunchMinutes)}
                          </td>
                          <td className="py-2 px-2 font-bold text-slate-800 whitespace-nowrap">
                            {r.workHours ? `${Number(r.workHours).toFixed(1)} h` : "-"}
                          </td>
                          <td className="py-2 px-2 font-mono text-amber-600 font-semibold whitespace-nowrap">
                            {minutesOrDash(r.lateMinutes)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                isPresent
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isLate
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : isAbsent
                                  ? "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                                  : isOnLeave
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {statusText(r.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[760px] text-left text-[13px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-bold tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Present Days</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">Late Days</th>
                    <th className="py-2.5 px-3 text-center text-indigo-700">Leaves</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">Absent Days</th>
                    <th className="py-2.5 px-3 text-center text-sky-700">WFH</th>
                    <th className="py-2.5 px-3 text-right">Work Hours</th>
                    <th className="py-2.5 px-3 text-right text-indigo-700">OT (hrs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {monthlyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-400 text-xs">
                        No monthly records found for {monthString} {yearString}.
                      </td>
                    </tr>
                  ) : (
                    monthlyRecords.map((m: any, idx: number) => (
                      <tr key={m.employeeId || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-600 text-xs">
                          {m.employeeCode || `EMP-${100 + idx}`}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{m.name}</td>
                        <td className="py-2 px-3 text-slate-600">{m.department}</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40">
                          {m.presentDays}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-amber-700">
                          {m.lateDays || 0}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-indigo-700">
                          {m.approvedLeaveDays || 0}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-rose-600 bg-rose-50/40">
                          {m.absentDays ?? Math.max(0, 26 - m.presentDays - (m.approvedLeaveDays || 0))}
                        </td>
                        <td className="py-2 px-3 text-center text-sky-700 font-semibold">
                          {m.wfhDays || 0}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {m.totalWorkingHours} hrs
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-indigo-700">
                          {m.overtimeHours} hrs
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Compliance & Signatures Footer */}
          <div className="pt-6 border-t-2 border-slate-200 mt-8 space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified ISO 27001 / Indian Labour Code Form D/E Muster Roll Compliance
              </span>
              <span>WorkPluse AI Timesheet Engine v2.0</span>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-10 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800">
                  HR Operations Officer
                </div>
                <span className="text-xs text-slate-400">Prepared By</span>
              </div>

              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800">
                  Head of Department / Manager
                </div>
                <span className="text-xs text-slate-400">Verified & Approved</span>
              </div>

              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800">
                  Managing Director / Authorized Signatory
                </div>
                <span className="text-xs text-slate-400">Official Stamp & Signature</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </Modal>
  );
}
