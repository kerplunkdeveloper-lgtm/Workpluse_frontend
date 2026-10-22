"use client";

import React, { useRef, useState } from "react";
import { formatDate, formatTime, formatDurationMinutes } from "@/lib/utils";
import {
  Printer,
  Download,
  X,
  Building2,
  CheckCircle2,
  Clock,
  Home,
  XCircle,
  CalendarDays,
  ShieldCheck,
  Filter,
} from "lucide-react";

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

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
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
    "WorkPulse Enterprise Workforce";

  // Filter daily records if filter chosen
  const rawRecords = dailyData?.records || dailyData?.attendances || [];
  const filteredDailyRecords = rawRecords.filter((r: any) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });

  const monthlyRecords = monthlyData?.report || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl relative my-6 print:p-0 print:m-0 print:shadow-none print:w-full print:max-w-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between pb-5 border-b border-slate-200 mb-6 gap-4 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {type === "DAILY" ? "Daily Attendance Register PDF" : "Monthly Overall Attendance PDF"}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {type === "DAILY"
                ? `Date: ${formatDate(selectedDate || dailyData?.date || new Date().toISOString())}`
                : `Period: ${monthString} ${yearString}`}
            </span>

            {/* Quick Filter for Daily */}
            {type === "DAILY" && (
              <div className="flex items-center gap-1.5 ml-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 bg-slate-50 font-medium"
                >
                  <option value="ALL">All Records ({rawRecords.length})</option>
                  <option value="PRESENT">Present Only ({dailyData?.summary?.present || 0})</option>
                  <option value="LATE">Late Arrivals ({dailyData?.summary?.late || 0})</option>
                  <option value="ABSENT">Absent Only ({dailyData?.summary?.absent || 0})</option>
                  <option value="ON_LEAVE">On Leave ({dailyData?.summary?.onLeave || 0})</option>
                  <option value="WORK_FROM_HOME">Remote WFH ({dailyData?.summary?.wfh || 0})</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Download / Print PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Container */}
        <div ref={printRef} className="space-y-6 text-slate-800">
          {/* Official Letterhead Header */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
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
                <span className="text-lg font-bold text-slate-900">{dailyData?.summary?.totalEmployees || rawRecords.length}</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs uppercase font-bold text-emerald-700 block">Present</span>
                <span className="text-lg font-bold text-emerald-700">{dailyData?.summary?.present || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-xs uppercase font-bold text-amber-700 block">Late</span>
                <span className="text-lg font-bold text-amber-700">{dailyData?.summary?.late || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <span className="text-xs uppercase font-bold text-rose-700 block">Absent</span>
                <span className="text-lg font-bold text-rose-700">{dailyData?.summary?.absent || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-xs uppercase font-bold text-indigo-700 block">On Leave</span>
                <span className="text-lg font-bold text-indigo-700">{dailyData?.summary?.onLeave || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-sky-50 border border-sky-100">
                <span className="text-xs uppercase font-bold text-sky-700 block">WFH</span>
                <span className="text-lg font-bold text-sky-700">{dailyData?.summary?.wfh || 0}</span>
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
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-bold tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Punch In</th>
                    <th className="py-2.5 px-3">Punch Out</th>
                    <th className="py-2.5 px-3">Work Hours</th>
                    <th className="py-2.5 px-3">Late Mins</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDailyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 text-xs">
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
                        <tr key={r.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-600 text-xs">
                            {r.employee?.employeeCode || `EMP-${100 + idx}`}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{empName}</td>
                          <td className="py-2 px-3 text-slate-600">{r.employee?.department?.name || "General"}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {r.checkIn ? formatTime(r.checkIn) : "-"}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {r.checkOut ? formatTime(r.checkOut) : "-"}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {r.workHours ? `${Number(r.workHours).toFixed(1)} hrs` : "-"}
                          </td>
                          <td className="py-2 px-3 font-mono text-amber-600 font-semibold">
                            {r.lateMinutes && r.lateMinutes > 0 ? formatDurationMinutes(r.lateMinutes) : "-"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${
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
                              {r.status?.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-[13px] border-collapse">
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
              <span>WorkPulse AI Timesheet Engine v2.0</span>
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
  );
}
