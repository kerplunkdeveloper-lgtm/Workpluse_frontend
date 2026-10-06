"use client";

import React, { useState, useEffect } from "react";
import { Attendance, AttendanceStatus } from "@/types";
import { attendanceApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatTime, formatDurationMinutes, roleLabel, unwrapList } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import {
  Filter,
  CheckCircle2,
  Clock,
  Home,
  Plus,
  RefreshCw,
  Edit3,
  ChevronDown,
  CalendarDays,
  Search,
  TrendingUp,
  FileText,
  AlertTriangle,
  MoreVertical,
} from "lucide-react";
import RegularizationModal from "./RegularizationModal";
import TimeSelect from "@/components/ui/TimeSelect";
import DatePicker from "@/components/ui/DatePicker";
import { toast } from "sonner";

export default function AttendanceHistoryView() {
  const { user, role } = useAuth();
  const isTeamView = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const searchParams = useSearchParams();
  const statusParam = searchParams?.get("status");

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<boolean>(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [regularizationModalOpen, setRegularizationModalOpen] = useState<boolean>(false);
  const [adminMarkModalOpen, setAdminMarkModalOpen] = useState<boolean>(false);

  // Sync URL search param if present (e.g. /attendance?status=ON_LEAVE or /attendance?status=LATE)
  useEffect(() => {
    if (statusParam) {
      setFilterStatus(statusParam.toUpperCase());
    }
  }, [statusParam]);

  // Admin mark state
  const [adminEmployeeId, setAdminEmployeeId] = useState("");
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split("T")[0]);
  const [adminStatus, setAdminStatus] = useState<AttendanceStatus>("PRESENT");
  const [adminInTime, setAdminInTime] = useState("09:00");
  const [adminOutTime, setAdminOutTime] = useState("18:00");
  const [adminReason, setAdminReason] = useState("");
  const [submittingAdminMark, setSubmittingAdminMark] = useState(false);

  const fetchHistory = async (nextPage = page) => {
    setLoading(true);
    try {
      const params = {
        page: nextPage,
        limit: 20,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
      };
      const res = isTeamView
        ? await attendanceApi.getAllAttendance(params)
        : await attendanceApi.getMyAttendance(params);
      setAttendances(unwrapList<Attendance>(res));
      setTotalPages(res?.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to load attendance logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStatus, role]);

  const handleAdminMarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdminMark(true);
    try {
      const targetEmp = adminEmployeeId || user?.employee?.id;
      if (!targetEmp) {
        toast.error("Employee ID is required");
        return;
      }
      const res = await attendanceApi.adminMarkAttendance({
        employeeId: targetEmp,
        date: adminDate,
        status: adminStatus,
        checkIn: `${adminDate}T${adminInTime}:00Z`,
        checkOut: `${adminDate}T${adminOutTime}:00Z`,
        reason: adminReason || "Direct Administrative Manual Entry",
      });

      if (res?.success) {
        toast.success("Attendance marked successfully by Admin!");
        setAdminMarkModalOpen(false);
        fetchHistory();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to mark attendance");
    } finally {
      setSubmittingAdminMark(false);
    }
  };

  const filteredLogs = attendances.filter((att) => {
    if (filterStatus !== "ALL" && att.status !== filterStatus) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const dateStr = att.date ? String(att.date).toLowerCase() : "";
      const statusStr = att.status ? att.status.toLowerCase() : "";
      const noteStr = att.wfhNote ? att.wfhNote.toLowerCase() : "";
      return dateStr.includes(q) || statusStr.includes(q) || noteStr.includes(q);
    }
    return true;
  });

  const totalPresent = attendances.filter((a) => a.status === "PRESENT" || a.status === "WORK_FROM_HOME").length;
  const totalLate = attendances.filter((a) => a.status === "LATE" || (a.lateMinutes && a.lateMinutes > 0)).length;
  const totalWfh = attendances.filter((a) => a.isWorkFromHome || a.status === "WORK_FROM_HOME").length;
  const totalWorkHours = attendances.reduce((acc, a) => acc + (Number(a.workHours) || 0), 0);
  const totalRecords = attendances.length;
  const presentPct = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
  const latePct = totalRecords > 0 ? Math.round((totalLate / totalRecords) * 100) : 0;
  const wfhPct = totalRecords > 0 ? Math.round((totalWfh / totalRecords) * 100) : 0;
  const avgHours = totalPresent > 0 ? (totalWorkHours / totalPresent).toFixed(1) : "0.0";

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LATE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "HALF_DAY":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "WORK_FROM_HOME":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "ON_LEAVE":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ABSENT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-5">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. 4 Metric Stat Cards (Matching dashboard_design_2.png)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present Days */}
        <div
          onClick={() => setFilterStatus(filterStatus === "PRESENT" ? "ALL" : "PRESENT")}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:border-emerald-300 ${
            filterStatus === "PRESENT" ? "ring-2 ring-emerald-500 border-emerald-500" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>{presentPct}%</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mb-0.5">Present Days</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{totalPresent}</p>
          <p className="text-xs text-slate-400 font-medium">{presentPct}% of logged records</p>
        </div>

        {/* Late Clock-ins */}
        <div
          onClick={() => setFilterStatus(filterStatus === "LATE" ? "ALL" : "LATE")}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:border-amber-300 ${
            filterStatus === "LATE" ? "ring-2 ring-amber-500 border-amber-500" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>{latePct}%</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mb-0.5">Late Clock-ins</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{totalLate}</p>
          <p className="text-xs text-slate-400 font-medium">{latePct}% of logged records</p>
        </div>

        {/* WFH / Remote Days */}
        <div
          onClick={() => setFilterStatus(filterStatus === "WORK_FROM_HOME" ? "ALL" : "WORK_FROM_HOME")}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:border-sky-300 ${
            filterStatus === "WORK_FROM_HOME" ? "ring-2 ring-sky-500 border-sky-500" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-0.5 text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>{wfhPct}%</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mb-0.5">WFH / Remote Days</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{totalWfh}</p>
          <p className="text-xs text-slate-400 font-medium">{wfhPct}% of logged records</p>
        </div>

        {/* Total Hours */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-0.5 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>{formatDurationMinutes(Math.round(Number(avgHours) * 60))}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mb-0.5">Total Hours</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{totalWorkHours.toFixed(1)} hrs</p>
          <p className="text-xs text-slate-400 font-medium">Avg. {formatDurationMinutes(Math.round(Number(avgHours) * 60))} / day</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. Control Bar: Filter By Status + Search + Manual Mark (Admin)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Left: Filter By Status + Search Input */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Filter By Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present Today</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="LATE">Late Arrivals</option>
              <option value="WORK_FROM_HOME">Work From Home</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          {/* Search by date or note */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by date, status or notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {filterStatus !== "ALL" && (
            <button
              onClick={() => setFilterStatus("ALL")}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Reset
            </button>
          )}
        </div>

        {/* Right: Refresh & Admin Action Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => fetchHistory()}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {(role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER") && (
            <button
              onClick={() => setAdminMarkModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Mark (Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. Attendance Logs Table (Matching dashboard_design_2.png)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 font-bold">
              <tr className="whitespace-nowrap">
                {isTeamView && <th className="py-3.5 px-5">EMPLOYEE</th>}
                <th className="py-3.5 px-5">DATE</th>
                <th className="py-3.5 px-4">PUNCH IN</th>
                {isTeamView && <th className="py-3.5 px-4">BRANCH</th>}
                <th className="py-3.5 px-4">LOCATION</th>
                <th className="py-3.5 px-4">PUNCH OUT</th>
                <th className="py-3.5 px-4">WORK HOURS</th>
                <th className="py-3.5 px-4">BREAKS</th>
                <th className="py-3.5 px-4 relative">
                  <div
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    className="flex items-center gap-1 hover:text-slate-800 transition cursor-pointer select-none"
                  >
                    <span>STATUS</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">REGULARIZATION</th>
                <th className="py-3.5 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isTeamView ? 11 : 9} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading attendance records...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                /* Empty state matching dashboard_design_2.png */
                <tr>
                  <td colSpan={isTeamView ? 11 : 9} className="text-center py-16 px-4">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      {/* Document with Magnifier Icon Graphic */}
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                        <FileText className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">No attendance records found</h4>
                      <p className="text-xs text-slate-500 text-center leading-relaxed">
                        Attendance records will appear here once you start punching in.
                      </p>
                      <button
                        onClick={() => fetchHistory()}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold flex items-center gap-2 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition whitespace-nowrap">
                    {isTeamView && (
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          {log.employee?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={log.employee.avatarUrl}
                              alt={`${log.employee.firstName} ${log.employee.lastName || ""}`.trim()}
                              className="h-9 w-9 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700"
                            >
                              {`${log.employee?.firstName?.[0] || "?"}${log.employee?.lastName?.[0] || ""}`.toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {log.employee
                                ? `${log.employee.firstName} ${log.employee.lastName || ""}`.trim()
                                : "Unknown employee"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {[log.employee?.employeeCode, log.employee?.designation || log.employee?.department?.name]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                            {log.employee?.user?.role && (
                              <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                                {roleLabel(log.employee.user.role)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      {formatDate(log.date)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {formatTime(log.checkIn)}
                    </td>
                    {isTeamView && (
                      <td className="py-3.5 px-4 text-slate-700">{log.branch?.name || "—"}</td>
                    )}
                    <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate" title={log.checkInLocation || log.branch?.name || ""}>
                      {log.checkInLocation || log.branch?.name || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {formatTime(log.checkOut)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600">
                      {log.workHours ? `${log.workHours.toFixed(1)} hrs` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {log.totalBreakMinutes ? formatDurationMinutes(log.totalBreakMinutes) : "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                          log.status
                        )}`}
                      >
                        {log.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => {
                          setSelectedAttendance(log);
                          setRegularizationModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-600" />
                        <span>Regularize</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => {
                          setSelectedAttendance(log);
                          setRegularizationModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Regularization Request Modal */}
      <RegularizationModal
        isOpen={regularizationModalOpen}
        attendance={selectedAttendance}
        onClose={() => setRegularizationModalOpen(false)}
        onSuccess={fetchHistory}
      />

      {/* Admin Manual Mark Modal */}
      {adminMarkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Administrative Attendance Override</h3>
            <p className="text-xs text-slate-500 mb-4">
              Directly mark or correct attendance for any employee (bypasses geofence)
            </p>

            <form onSubmit={handleAdminMarkSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">
                  Employee ID / Code
                </label>
                <input
                  type="text"
                  value={adminEmployeeId}
                  onChange={(e) => setAdminEmployeeId(e.target.value)}
                  placeholder="Enter Employee UUID or leave empty for self"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Date</label>
                  <DatePicker
                    value={adminDate}
                    onChange={(val) => setAdminDate(val)}
                    placeholder="Select date"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={adminStatus}
                    onChange={(e) => setAdminStatus(e.target.value as AttendanceStatus)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900"
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="LATE">LATE</option>
                    <option value="HALF_DAY">HALF_DAY</option>
                    <option value="WORK_FROM_HOME">WORK_FROM_HOME</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="ABSENT">ABSENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">In Time</label>
                  <TimeSelect
                    value={adminInTime}
                    onChange={setAdminInTime}
                    defaultPeriod="AM"
                    ariaLabel="In time"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Out Time</label>
                  <TimeSelect
                    value={adminOutTime}
                    onChange={setAdminOutTime}
                    defaultPeriod="PM"
                    ariaLabel="Out time"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Admin Reason</label>
                <input
                  type="text"
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  placeholder="e.g. Approved manual check-in or regularized"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminMarkModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdminMark}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition"
                >
                  {submittingAdminMark ? "Submitting..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
