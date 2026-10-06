"use client";

import React, { useState, useEffect } from "react";
import { reportsApi } from "@/lib/api";
import { formatDate, formatTime, formatDurationMinutes } from "@/lib/utils";
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Home,
  XCircle,
  CalendarDays,
  Printer,
  FileText,
  Search,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import AttendanceReportPdfModal from "./AttendanceReportPdfModal";
import DatePicker from "@/components/ui/DatePicker";

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState<"DAILY" | "MONTHLY">("DAILY");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dailyStatusFilter, setDailyStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [dailyReport, setDailyReport] = useState<any>(null);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // PDF Modal State
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfModalType, setPdfModalType] = useState<"DAILY" | "MONTHLY">("DAILY");

  const loadReports = async () => {
    setLoading(true);
    try {
      const [dailyRes, monthlyRes] = await Promise.allSettled([
        reportsApi.getDaily(selectedDate),
        reportsApi.getMonthly(selectedMonth, selectedYear),
      ]);

      if (dailyRes.status === "fulfilled" && dailyRes.value?.success) {
        setDailyReport(dailyRes.value.data || dailyRes.value);
      }
      if (monthlyRes.status === "fulfilled" && monthlyRes.value?.success) {
        setMonthlyReport(monthlyRes.value.data || monthlyRes.value);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedDate, selectedMonth, selectedYear]);

  const handleExportDailyCSV = () => {
    const records = dailyReport?.records || dailyReport?.attendances || [];
    const headers = ["Employee Code", "Name", "Department", "Date", "Status", "Check In", "Check Out", "Work Hours", "Late Minutes"];
    const rows = records.map((a: any) => [
      a.employee?.employeeCode || "WP-EMP",
      `"${a.employee?.firstName || ""} ${a.employee?.lastName || ""}"`.trim(),
      `"${a.employee?.department?.name || "General"}"`,
      selectedDate,
      a.status,
      a.checkIn ? formatTime(a.checkIn) : "-",
      a.checkOut ? formatTime(a.checkOut) : "-",
      a.workHours ? Number(a.workHours).toFixed(1) : "0",
      a.lateMinutes || "0",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WorkPulse_Daily_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Daily attendance CSV exported successfully!");
  };

  const handleExportMonthlyCSV = () => {
    const reportList = monthlyReport?.report || [];
    const headers = ["Employee Code", "Name", "Department", "Present Days", "Late Days", "Leaves Taken", "Absent Days", "WFH Days", "Total Work Hours", "Overtime Hours"];
    const rows = reportList.map((m: any) => [
      m.employeeCode || "WP-EMP",
      `"${m.name}"`,
      `"${m.department}"`,
      m.presentDays,
      m.lateDays || 0,
      m.approvedLeaveDays || 0,
      m.absentDays || 0,
      m.wfhDays || 0,
      m.totalWorkingHours,
      m.overtimeHours,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WorkPulse_Monthly_Attendance_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Monthly attendance CSV exported successfully!");
  };

  const openPdfModal = (type: "DAILY" | "MONTHLY") => {
    setPdfModalType(type);
    setPdfModalOpen(true);
  };

  // Filter daily records by tab and search
  const dailyRecords = (dailyReport?.records || dailyReport?.attendances || []).filter((r: any) => {
    const matchesStatus = dailyStatusFilter === "ALL" || r.status === dailyStatusFilter;
    const fullName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
    const code = (r.employee?.employeeCode || "").toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter monthly records by search
  const monthlyRecords = (monthlyReport?.report || []).filter((m: any) => {
    const fullName = (m.name || "").toLowerCase();
    const code = (m.employeeCode || "").toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Attendance Reports & PDF Generator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View & download official PDF registers for daily records (Present, Late, Absent, Leaves) and monthly overall muster rolls
          </p>
        </div>

        {/* View Tab Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab("DAILY")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "DAILY"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab("MONTHLY")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "MONTHLY"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Monthly Overall
          </button>
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
        {/* Date / Month Picker Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "DAILY" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Select Date:</span>
              <div className="w-44">
                <DatePicker
                  value={selectedDate}
                  onChange={(val) => setSelectedDate(val)}
                  placeholder="Select date"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Select Period:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 w-48 sm:w-56"
            />
          </div>
        </div>

        {/* Action Buttons: Download PDF & Export CSV */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadReports}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => openPdfModal(activeTab)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            {activeTab === "DAILY" ? "View & Download Daily PDF" : "View & Download Monthly PDF"}
          </button>

          <button
            onClick={activeTab === "DAILY" ? handleExportDailyCSV : handleExportMonthlyCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ──────────────────────────────────────────────── */}
      {activeTab === "DAILY" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Present */}
          <button
            type="button"
            onClick={() => setDailyStatusFilter(dailyStatusFilter === "PRESENT" ? "ALL" : "PRESENT")}
            className={`bg-white rounded-2xl p-4 border text-left transition cursor-pointer shadow-xs ${
              dailyStatusFilter === "PRESENT"
                ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/40"
                : "border-slate-200 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase">Present</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{dailyReport?.summary?.present ?? 0}</p>
            <span className="text-xs text-emerald-600 font-medium">Verified On-Site</span>
          </button>

          {/* Late */}
          <button
            type="button"
            onClick={() => setDailyStatusFilter(dailyStatusFilter === "LATE" ? "ALL" : "LATE")}
            className={`bg-white rounded-2xl p-4 border text-left transition cursor-pointer shadow-xs ${
              dailyStatusFilter === "LATE"
                ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/40"
                : "border-slate-200 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase">Late Arrivals</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{dailyReport?.summary?.late ?? 0}</p>
            <span className="text-xs text-amber-700 font-medium">Exceeded Grace</span>
          </button>

          {/* Absent */}
          <button
            type="button"
            onClick={() => setDailyStatusFilter(dailyStatusFilter === "ABSENT" ? "ALL" : "ABSENT")}
            className={`bg-white rounded-2xl p-4 border text-left transition cursor-pointer shadow-xs ${
              dailyStatusFilter === "ABSENT"
                ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500/40"
                : "border-slate-200 hover:border-rose-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase">Absent</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-600">{dailyReport?.summary?.absent ?? 0}</p>
            <span className="text-xs text-rose-700 font-medium">Unexcused</span>
          </button>

          {/* On Leave */}
          <button
            type="button"
            onClick={() => setDailyStatusFilter(dailyStatusFilter === "ON_LEAVE" ? "ALL" : "ON_LEAVE")}
            className={`bg-white rounded-2xl p-4 border text-left transition cursor-pointer shadow-xs ${
              dailyStatusFilter === "ON_LEAVE"
                ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/40"
                : "border-slate-200 hover:border-indigo-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase">On Leave</span>
              <CalendarDays className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-700">{dailyReport?.summary?.onLeave ?? 0}</p>
            <span className="text-xs text-slate-500 font-medium">Approved Leaves</span>
          </button>

          {/* WFH */}
          <button
            type="button"
            onClick={() => setDailyStatusFilter(dailyStatusFilter === "WORK_FROM_HOME" ? "ALL" : "WORK_FROM_HOME")}
            className={`bg-white rounded-2xl p-4 border text-left transition cursor-pointer shadow-xs ${
              dailyStatusFilter === "WORK_FROM_HOME"
                ? "border-sky-500 bg-sky-50/50 ring-1 ring-sky-500/40"
                : "border-slate-200 hover:border-sky-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase">Remote WFH</span>
              <Home className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-bold text-sky-700">{dailyReport?.summary?.wfh ?? 0}</p>
            <span className="text-xs text-sky-700 font-medium">Telecommute</span>
          </button>

          {/* Total Staff */}
          <button
            type="button"
            onClick={() => setDailyStatusFilter("ALL")}
            className={`bg-white rounded-2xl p-4 border text-left transition cursor-pointer shadow-xs ${
              dailyStatusFilter === "ALL"
                ? "border-indigo-500 bg-indigo-50/40"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Staff</span>
              <span className="text-xs px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono">
                {dailyReport?.summary?.attendanceRate ?? 0}% rate
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dailyReport?.summary?.totalEmployees ?? 0}</p>
            <span className="text-xs text-indigo-700 font-medium">Show All Rows</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total Active Workforce</p>
            <p className="text-2xl font-bold text-slate-900">{monthlyReport?.totalEmployees ?? 0}</p>
            <span className="text-xs text-slate-500">Employees in payroll</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Standard Work Days</p>
            <p className="text-2xl font-bold text-emerald-600">26 Days</p>
            <span className="text-xs text-emerald-700">Indian Statutory Standard</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total Overtime Hours</p>
            <p className="text-2xl font-bold text-amber-600">
              {(monthlyReport?.report || [])
                .reduce((sum: number, r: any) => sum + parseFloat(r.overtimeHours || 0), 0)
                .toFixed(1)}{" "}
              hrs
            </p>
            <span className="text-xs text-amber-700">Across all departments</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Approved Leaves Taken</p>
            <p className="text-2xl font-bold text-indigo-700">
              {(monthlyReport?.report || []).reduce(
                (sum: number, r: any) => sum + Number(r.approvedLeaveDays || 0),
                0
              )}{" "}
              days
            </p>
            <span className="text-xs text-slate-500">CL, SL, EL recorded</span>
          </div>
        </div>
      )}

      {/* ── Table Container ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-slate-900">
              {activeTab === "DAILY"
                ? `Daily Attendance Register (${formatDate(selectedDate)})`
                : `Monthly Overall Muster Roll (${monthNames[selectedMonth - 1]} ${selectedYear})`}
            </h3>
            {activeTab === "DAILY" && dailyStatusFilter !== "ALL" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                Filtered: {dailyStatusFilter}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {activeTab === "DAILY" ? `${dailyRecords.length} records displayed` : `${monthlyRecords.length} staff entries`}
          </span>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "DAILY" ? (
            <table className="w-full text-left text-[13px] text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Check In</th>
                  <th className="py-3.5 px-4">Check Out</th>
                  <th className="py-3.5 px-4">Total Hours</th>
                  <th className="py-3.5 px-4">Late (Mins)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-500">
                      Loading daily attendance register...
                    </td>
                  </tr>
                ) : dailyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      No attendance logs found matching the filter for {formatDate(selectedDate)}.
                    </td>
                  </tr>
                ) : (
                  dailyRecords.map((a: any, idx: number) => {
                    const empName = `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.trim() || "Employee";
                    const isLate = a.status === "LATE";
                    const isAbsent = a.status === "ABSENT";
                    const isOnLeave = a.status === "ON_LEAVE";
                    const isPresent = a.status === "PRESENT" || a.status === "WORK_FROM_HOME";

                    return (
                      <tr key={a.id || idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-500">
                          {a.employee?.employeeCode || `WP-${100 + idx}`}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {empName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {a.employee?.department?.name || "General"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {a.checkIn ? formatTime(a.checkIn) : "-"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {a.checkOut ? formatTime(a.checkOut) : "-"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-indigo-700">
                          {a.workHours ? `${Number(a.workHours).toFixed(1)} hrs` : "-"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-amber-600">
                          {a.lateMinutes && a.lateMinutes > 0 ? formatDurationMinutes(a.lateMinutes) : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
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
                            {a.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-[13px] text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center text-emerald-700">Present Days</th>
                  <th className="py-3.5 px-4 text-center text-amber-700">Late Days</th>
                  <th className="py-3.5 px-4 text-center text-indigo-700">Leaves</th>
                  <th className="py-3.5 px-4 text-center text-rose-700">Absent Days</th>
                  <th className="py-3.5 px-4 text-center text-sky-700">WFH</th>
                  <th className="py-3.5 px-4 text-right">Work Hours</th>
                  <th className="py-3.5 px-4 text-right text-indigo-700">OT (hrs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-500">
                      Loading monthly muster roll...
                    </td>
                  </tr>
                ) : monthlyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-500">
                      No monthly attendance summaries found.
                    </td>
                  </tr>
                ) : (
                  monthlyRecords.map((m: any, idx: number) => (
                    <tr key={m.employeeId || idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {m.employeeCode || `WP-${100 + idx}`}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {m.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {m.department}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        {m.presentDays}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-amber-700">
                        {m.lateDays || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-indigo-700">
                        {m.approvedLeaveDays || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-700">
                        {m.absentDays ?? Math.max(0, 26 - m.presentDays - (m.approvedLeaveDays || 0))}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-sky-700">
                        {m.wfhDays || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        {m.totalWorkingHours} hrs
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-indigo-700">
                        {m.overtimeHours} hrs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Printable PDF Modal ─────────────────────────────────────────── */}
      <AttendanceReportPdfModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        type={pdfModalType}
        dailyData={dailyReport}
        monthlyData={monthlyReport}
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </div>
  );
}
