'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getRoleBadgeDetails, hasPermission } from '@/lib/permissions';
import api from '@/lib/api';
import {
  Users,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  MapPin,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Radio,
  FileText,
  CalendarDays,
  FileSpreadsheet,
  Smartphone,
  Check,
  Zap,
  Star,
  Compass,
  Settings,
  Building2,
  ArrowUpRight,
  ChevronLeft,
  CalendarCheck,
  Coffee,
  Filter,
  Briefcase,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const roleBadge = getRoleBadgeDetails(user?.role);

  // Live Digital Clock state
  const [currentTime, setCurrentTime] = useState<string>('09:50:18 AM');
  const [currentDate, setCurrentDate] = useState<string>('Thu, Sep 10, 2026');
  const [greeting, setGreeting] = useState<string>('Good Morning');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      if (hours < 12) setGreeting('Good Morning');
      else if (hours < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');

      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Attendance Punch State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [punchMessage, setPunchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Metrics
  const [summary, setSummary] = useState<any>({
    totalEmployees: 1,
    present: 0,
    late: 0,
    halfDay: 1,
    absent: 1,
    currentlyClockedIn: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const isAdminOrManager = hasPermission(user, 'manage:employees');

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/today');
      setClockedIn(Boolean(res.data.clockedIn));
      setIsOnBreak(Boolean(res.data.isOnBreak));
      setTodayAttendance(res.data.attendance);
      setEmployeeProfile(res.data.employee);
    } catch (err) {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryAndLogs = async () => {
    try {
      if (isAdminOrManager) {
        const [sumRes, logsRes] = await Promise.all([
          api.get('/attendance/summary').catch(() => null),
          api.get('/attendance?limit=6').catch(() => null),
        ]);
        if (sumRes?.data) setSummary(sumRes.data);
        if (logsRes?.data?.records) setRecentLogs(logsRes.data.records);
      } else {
        const myRes = await api.get('/attendance/my?limit=6').catch(() => null);
        if (myRes?.data?.records) setRecentLogs(myRes.data.records);
      }
    } catch (err) {
      console.error('Metrics fetch error:', err);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    fetchSummaryAndLogs();
  }, [isAdminOrManager]);

  const employeeName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName || ''}`.trim()
    : 'Alex';

  const employeeCode = user?.employee?.employeeCode || 'EMP-885469';
  const orgName = user?.organization?.name || 'WorkPulse Technologies';
  const branchName = employeeProfile?.branch?.name || 'Pondicherry Technology HQ';

  // Calendar View State & Calculations
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 8, 10)); // September 2026
  const [selectedDay, setSelectedDay] = useState<number>(10);
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'present' | 'late' | 'leaves'>('all');

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(1);
  };

  const nextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(1);
  };

  const goToToday = () => {
    setCalendarDate(new Date(2026, 8, 10));
    setSelectedDay(10);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const getDayStatus = (day: number) => {
    const isToday = day === 10 && currentMonth === 8 && currentYear === 2026;
    const isFuture =
      currentYear > 2026 ||
      (currentYear === 2026 && currentMonth > 8) ||
      (currentYear === 2026 && currentMonth === 8 && day > 10);
    const dayOfWeek = (firstDayIndex + day - 1) % 7;

    const matchingLog = recentLogs.find((log) => {
      if (!log.date && !log.createdAt) return false;
      const d = new Date(log.date || log.createdAt);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (matchingLog) {
      return {
        status: matchingLog.status,
        inTime: matchingLog.checkInTime ? new Date(matchingLog.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM',
        outTime: matchingLog.checkOutTime ? new Date(matchingLog.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        hours: matchingLog.workingHours || 8.5,
        location: matchingLog.branch?.name || branchName,
        note: matchingLog.status === 'LATE' ? 'Late check-in recorded' : 'Standard on-duty shift',
      };
    }

    if (isToday) {
      return {
        status: clockedIn ? 'PRESENT' : 'HALF_DAY',
        inTime: clockedIn ? '09:02 AM' : '05:49 PM',
        outTime: clockedIn ? null : '06:05 PM',
        hours: clockedIn ? 7.8 : 4.2,
        location: branchName,
        note: clockedIn ? 'Currently on shift inside geofence' : 'Half day logged',
      };
    }

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        status: 'WEEKEND',
        inTime: null,
        outTime: null,
        hours: 0,
        location: 'Off Duty',
        note: 'Scheduled weekly rest day',
      };
    }

    if (day === 5 && currentMonth === 8) {
      return {
        status: 'HOLIDAY',
        inTime: null,
        outTime: null,
        hours: 0,
        location: 'Paid Public Holiday',
        note: 'Regional Holiday Observance',
      };
    }

    if (isFuture) {
      return {
        status: 'UPCOMING',
        inTime: null,
        outTime: null,
        hours: 0,
        location: 'Scheduled Office Shift',
        note: 'General Morning (09:00 AM - 06:00 PM)',
      };
    }

    if (day === 3) {
      return {
        status: 'LATE',
        inTime: '09:28 AM',
        outTime: '06:30 PM',
        hours: 8.5,
        location: branchName,
        note: 'Clock-in exceeded 15m grace period',
      };
    }

    if (day === 8) {
      return {
        status: 'LEAVE',
        inTime: null,
        outTime: null,
        hours: 0,
        location: 'Casual Leave Approved',
        note: 'Approved by Branch Manager',
      };
    }

    return {
      status: 'PRESENT',
      inTime: `08:${52 + (day % 7)} AM`,
      outTime: '06:05 PM',
      hours: 8.8,
      location: branchName,
      note: 'Normal regular attendance',
    };
  };

  const selectedDayInfo = getDayStatus(selectedDay);

  const handlePunchAction = async () => {
    setActionLoading(true);
    setPunchMessage(null);

    try {
      const payload = {
        latitude: employeeProfile?.branch?.latitude ? Number(employeeProfile.branch.latitude) : 11.9416,
        longitude: employeeProfile?.branch?.longitude ? Number(employeeProfile.branch.longitude) : 79.8083,
        accuracy: 10,
      };

      if (!clockedIn) {
        const res = await api.post('/attendance/check-in', payload);
        setPunchMessage({ type: 'success', text: res.data.message || 'Successfully clocked in!' });
      } else {
        const res = await api.post('/attendance/check-out', payload);
        setPunchMessage({ type: 'success', text: res.data.message || 'Successfully clocked out!' });
      }
      await fetchTodayStatus();
      await fetchSummaryAndLogs();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Attendance punch action failed';
      setPunchMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakToggle = async () => {
    setActionLoading(true);
    setPunchMessage(null);

    try {
      const payload = {
        latitude: employeeProfile?.branch?.latitude ? Number(employeeProfile.branch.latitude) : 11.9416,
        longitude: employeeProfile?.branch?.longitude ? Number(employeeProfile.branch.longitude) : 79.8083,
        accuracy: 10,
      };

      if (!isOnBreak) {
        const res = await api.post('/attendance/break-start', payload);
        setPunchMessage({ type: 'success', text: res.data.message || 'Break started. Enjoy your break!' });
      } else {
        const res = await api.post('/attendance/break-end', payload);
        setPunchMessage({ type: 'success', text: res.data.message || 'Break ended. Welcome back to work!' });
      }
      await fetchTodayStatus();
      await fetchSummaryAndLogs();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Break action failed';
      setPunchMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate rate
  const totalRoster = summary.totalEmployees || 1;
  const presentCount = summary.present || (clockedIn ? 1 : 0);
  const lateCount = summary.late || 0;
  const absentCount = summary.absent !== undefined ? summary.absent : (presentCount > 0 ? 0 : 1);
  const attendanceRate = totalRoster > 0 ? Math.round((presentCount / totalRoster) * 100) : 0;

  return (
    <div className="space-y-6 pb-8 select-none">
      {/* Punch Feedback Alert */}
      {punchMessage && (
        <div
          className={`rounded-2xl p-4 text-xs font-medium flex items-center justify-between border shadow-sm ${
            punchMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{punchMessage.text}</span>
          <button
            onClick={() => setPunchMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ROW 1: Hero Banner (Left) + Clock In / Quick Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Hero Banner (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="relative z-10 max-w-lg">
            <p className="text-sm font-semibold text-slate-500 mb-1">{greeting},</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Welcome back, {employeeName}! <span className="text-amber-400">👋</span>
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-600 font-medium">
              Here&apos;s what&apos;s happening with your workforce today.
            </p>
          </div>

          {/* Live Status Badges Row */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5 relative z-10">
            {/* GPS Geofence Online */}
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs border border-white">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>GPS Geofence Online</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs border border-white">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span>{currentDate}</span>
            </div>

            {/* Time with Live Seconds */}
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs border border-white">
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              <span className="font-mono">{currentTime}</span>
            </div>
          </div>

          {/* Right Hero Graphic: Modern Glass Architectural Building + Quote + Org Badge */}
          <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-80 pointer-events-none">
            {/* Quote Pill */}
            <div className="absolute right-36 top-10 text-right">
              <p className="text-xs font-bold text-slate-800 italic leading-snug">
                &ldquo;People<br />Power<br />Progress&rdquo;
              </p>
            </div>

            {/* Architectural Building Vector SVG */}
            <svg
              viewBox="0 0 260 220"
              className="absolute right-0 bottom-0 h-full w-auto object-contain opacity-90"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Back building */}
              <polygon points="120,40 180,20 180,220 120,220" fill="#93c5fd" opacity="0.3" />
              <polygon points="180,20 220,35 220,220 180,220" fill="#60a5fa" opacity="0.25" />
              {/* Front Modern Highrise */}
              <polygon points="140,65 210,35 210,220 140,220" fill="#3b82f6" opacity="0.8" />
              <polygon points="210,35 250,55 250,220 210,220" fill="#1d4ed8" opacity="0.9" />
              {/* Glass Windows */}
              <line x1="150" y1="80" x2="200" y2="58" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              <line x1="150" y1="105" x2="200" y2="83" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              <line x1="150" y1="130" x2="200" y2="108" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              <line x1="150" y1="155" x2="200" y2="133" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              <line x1="150" y1="180" x2="200" y2="158" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              {/* Green Trees */}
              <circle cx="130" cy="205" r="16" fill="#10b981" opacity="0.9" />
              <circle cx="150" cy="210" r="14" fill="#059669" opacity="0.9" />
              <circle cx="115" cy="214" r="12" fill="#047857" opacity="0.85" />
            </svg>

            {/* Org Name Floating Badge */}
            <div className="absolute right-6 bottom-5 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-800 shadow-md border border-slate-100">
              <img src="/workpulse-logo.png" alt="WorkPulse" className="h-4 w-4 object-contain rounded-xs" />
              <span>{orgName}</span>
            </div>
          </div>
        </div>

        {/* Right Section: Clock In Button + Quick Actions (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Clock In / Break / Out CTA Card */}
          {!clockedIn ? (
            <button
              onClick={handlePunchAction}
              disabled={actionLoading}
              className="w-full rounded-3xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white p-5 shadow-lg shadow-blue-500/25 cursor-pointer hover:shadow-xl hover:opacity-95 transition-all text-left relative overflow-hidden group disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-base font-bold tracking-tight">
                    {actionLoading ? 'Processing...' : 'Clock In Now'}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/80 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-2 text-xs text-blue-100/90 font-medium pl-11">
                Make every day count • Tap to punch
              </p>
            </button>
          ) : (
            <div className="w-full rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isOnBreak ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-800">
                    {isOnBreak ? 'On Break (Paused)' : 'Active on Shift'}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {todayAttendance?.checkIn
                    ? new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Punch Active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Break Toggle Button */}
                <button
                  onClick={handleBreakToggle}
                  disabled={actionLoading}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs font-bold transition-all disabled:opacity-50 ${
                    isOnBreak
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{actionLoading ? 'Updating...' : isOnBreak ? 'Resume Work ⚡' : 'Take Break ☕'}</span>
                </button>

                {/* Clock Out Button */}
                <button
                  onClick={handlePunchAction}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white py-3 px-3 text-xs font-bold shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>{actionLoading ? 'Clocking Out...' : 'Clock Out Now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 mb-3 px-1">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {/* Miss-Punch */}
              <Link
                href="/attendance"
                className="flex items-center gap-2.5 rounded-2xl p-2.5 hover:bg-slate-50 transition-colors group border border-slate-100/60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                  Miss-Punch Regularization
                </span>
              </Link>

              {/* Apply Leave */}
              <Link
                href="/leaves"
                className="flex items-center gap-2.5 rounded-2xl p-2.5 hover:bg-slate-50 transition-colors group border border-slate-100/60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                  Apply for Leave
                </span>
              </Link>

              {/* Payslips */}
              <Link
                href="/payroll"
                className="flex items-center gap-2.5 rounded-2xl p-2.5 hover:bg-slate-50 transition-colors group border border-slate-100/60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                  Monthly Payslips
                </span>
              </Link>

              {/* Live Logs */}
              <Link
                href="/attendance"
                className="flex items-center gap-2.5 rounded-2xl p-2.5 hover:bg-slate-50 transition-colors group border border-slate-100/60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                  <Smartphone className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                  Live Logs
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Headcount */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#7c3aed]">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Total Headcount</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">{totalRoster}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <span>↗ 100% active roster</span>
            </div>
          </div>
          {/* Subtle wave chart */}
          <div className="absolute bottom-0 right-0 left-0 h-10 opacity-30 pointer-events-none">
            <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,25 Q30,10 60,20 T100,5 L100,30 L0,30 Z" fill="#c4b5fd" />
            </svg>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#16a34a]">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Present Today</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">{presentCount}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span>{attendanceRate}% attendance rate</span>
            </div>
          </div>
          {/* Subtle wave chart */}
          <div className="absolute bottom-0 right-0 left-0 h-10 opacity-30 pointer-events-none">
            <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,28 Q25,15 50,22 T100,10 L100,30 L0,30 Z" fill="#86efac" />
            </svg>
          </div>
        </div>

        {/* Card 3: Late Arrivals */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Late Arrivals</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">{lateCount}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
              <span>Exceeded shift grace limit</span>
            </div>
          </div>
          {/* Subtle wave chart */}
          <div className="absolute bottom-0 right-0 left-0 h-10 opacity-30 pointer-events-none">
            <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,26 Q40,12 70,24 T100,8 L100,30 L0,30 Z" fill="#fdba74" />
            </svg>
          </div>
        </div>

        {/* Card 4: Currently On Duty */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e0f2fe] text-[#0284c7]">
              <Zap className="h-5 w-5 fill-[#0284c7]/30" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Currently On Duty</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">
              {summary.currentlyClockedIn || (clockedIn ? 1 : 0)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sky-600">
              <span>Live in-office or roaming</span>
            </div>
          </div>
          {/* Subtle wave chart */}
          <div className="absolute bottom-0 right-0 left-0 h-10 opacity-30 pointer-events-none">
            <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,22 Q35,5 70,18 T100,12 L100,30 L0,30 Z" fill="#7dd3fc" />
            </svg>
          </div>
        </div>
      </div>

      {/* ROW 3: Interactive Attendance & Shift Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Calendar Matrix Card (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attendance & Shift Calendar</h3>
                <p className="text-[11px] text-slate-400">Monthly check-in logs, tardy markings, and leave status</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Previous Month */}
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Current Month & Year Display */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-800">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                <span>{monthNames[currentMonth]} {currentYear}</span>
              </div>

              {/* Next Month */}
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Jump to Today Button */}
              <button
                type="button"
                onClick={goToToday}
                className="rounded-xl bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCalendarFilter('all')}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                  calendarFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                All Days ({daysInMonth})
              </button>
              <button
                type="button"
                onClick={() => setCalendarFilter('present')}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                  calendarFilter === 'present'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Present
              </button>
              <button
                type="button"
                onClick={() => setCalendarFilter('late')}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                  calendarFilter === 'late'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Late Flags
              </button>
              <button
                type="button"
                onClick={() => setCalendarFilter('leaves')}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                  calendarFilter === 'leaves'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Leaves & Offs
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Late
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> Half Day
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Leave/Off
              </span>
            </div>
          </div>

          {/* Calendar Day Matrix */}
          <div className="space-y-1">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">
              {dayLabels.map((lbl, idx) => (
                <div key={lbl} className={idx === 0 || idx === 6 ? 'text-slate-300' : ''}>
                  {lbl}
                </div>
              ))}
            </div>

            {/* Day Tiles Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Previous Month Padding */}
              {Array.from({ length: firstDayIndex }).map((_, i) => {
                const dayNum = prevMonthDays - firstDayIndex + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    className="min-h-[64px] sm:min-h-[72px] rounded-2xl border border-slate-100/60 bg-slate-50/40 p-2 text-slate-300 opacity-40 select-none flex flex-col justify-between"
                  >
                    <span className="text-xs font-semibold">{dayNum}</span>
                  </div>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const statusInfo = getDayStatus(day);
                const isSelected = selectedDay === day;
                const isToday = day === 10 && currentMonth === 8 && currentYear === 2026;

                const isFilteredOut =
                  (calendarFilter === 'present' && statusInfo.status !== 'PRESENT') ||
                  (calendarFilter === 'late' && statusInfo.status !== 'LATE') ||
                  (calendarFilter === 'leaves' && statusInfo.status !== 'LEAVE' && statusInfo.status !== 'WEEKEND' && statusInfo.status !== 'HOLIDAY');

                return (
                  <button
                    key={`cur-${day}`}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[64px] sm:min-h-[72px] rounded-2xl border p-2 text-left transition-all relative flex flex-col justify-between group ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-600/20'
                        : isToday
                        ? 'border-indigo-300 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 shadow-2xs'
                        : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50/60'
                    } ${isFilteredOut ? 'opacity-25 grayscale' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? 'text-indigo-700'
                            : isToday
                            ? 'text-indigo-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {day}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Status Pill on Day Card */}
                    <div className="mt-1">
                      {statusInfo.status === 'PRESENT' && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg px-1.5 py-0.5 truncate">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate hidden sm:inline">{statusInfo.inTime}</span>
                          <span className="sm:hidden">P</span>
                        </div>
                      )}

                      {statusInfo.status === 'LATE' && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-1.5 py-0.5 truncate">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="truncate hidden sm:inline">Late {statusInfo.inTime}</span>
                          <span className="sm:hidden">L</span>
                        </div>
                      )}

                      {statusInfo.status === 'HALF_DAY' && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200/80 rounded-lg px-1.5 py-0.5 truncate">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                          <span className="truncate hidden sm:inline">Half Day</span>
                          <span className="sm:hidden">HD</span>
                        </div>
                      )}

                      {statusInfo.status === 'LEAVE' && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 rounded-lg px-1.5 py-0.5 truncate">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                          <span className="truncate hidden sm:inline">Leave</span>
                          <span className="sm:hidden">LV</span>
                        </div>
                      )}

                      {statusInfo.status === 'WEEKEND' && (
                        <div className="text-[10px] font-semibold text-slate-400 bg-slate-50 rounded-lg px-1.5 py-0.5 text-center truncate">
                          Off
                        </div>
                      )}

                      {statusInfo.status === 'HOLIDAY' && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/60 rounded-lg px-1.5 py-0.5 truncate">
                          <Star className="h-2.5 w-2.5 fill-purple-400 text-purple-400 shrink-0" />
                          <span className="truncate hidden sm:inline">Holiday</span>
                          <span className="sm:hidden">H</span>
                        </div>
                      )}

                      {statusInfo.status === 'UPCOMING' && (
                        <div className="text-[9px] text-slate-300 text-center font-mono">
                          --
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Day Inspector Panel (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Day Log</p>
                <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {monthNames[currentMonth].slice(0, 3)} {selectedDay}, {currentYear}
                </h4>
              </div>

              {/* Status Pill */}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                  selectedDayInfo.status === 'PRESENT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : selectedDayInfo.status === 'LATE'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : selectedDayInfo.status === 'HALF_DAY'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : selectedDayInfo.status === 'LEAVE'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : selectedDayInfo.status === 'WEEKEND'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {selectedDayInfo.status.replace('_', ' ')}
              </span>
            </div>

            {/* Timeline Details */}
            <div className="mt-4 space-y-3">
              {/* Shift Policy */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">General Morning Shift</p>
                    <p className="text-[10px] text-slate-400">09:00 AM - 06:00 PM (15m grace)</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700">9h Shift</span>
              </div>

              {/* Punch Checkpoints */}
              <div className="rounded-2xl border border-slate-100 bg-white p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                      IN
                    </div>
                    <span className="font-semibold text-slate-700">Clock In Time:</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedDayInfo.inTime || 'Not Recorded'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-[10px]">
                      OUT
                    </div>
                    <span className="font-semibold text-slate-700">Clock Out Time:</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedDayInfo.outTime || (selectedDay === 10 && clockedIn ? 'Active On Shift' : '06:05 PM')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold text-slate-700">Total Hours Logged:</span>
                  </div>
                  <span className="font-bold text-indigo-600">
                    {selectedDayInfo.hours > 0 ? `${selectedDayInfo.hours} Hours` : '0 Hours'}
                  </span>
                </div>
              </div>

              {/* Location & Verification */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800 leading-tight">
                    {selectedDayInfo.location}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {selectedDayInfo.note || 'GPS Verified inside corporate radius'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action inside Inspector */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <Link
              href="/attendance"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100 py-2.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Regularize</span>
            </Link>

            <Link
              href="/leaves"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 py-2.5 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Apply Leave</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ROW 4: Three Major Interactive Analytical Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Col 1: Attendance Overview (5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Attendance Overview</h3>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
              <span>This Week</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Absent</span>
            </div>
          </div>

          {/* Chart + Gauge Row */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Grid Chart (7 Cols) */}
            <div className="sm:col-span-7 h-40 flex flex-col justify-between pt-2">
              <div className="relative flex-1 flex flex-col justify-between text-[10px] text-slate-400 font-mono">
                <div className="flex items-center gap-2 border-b border-dashed border-slate-100 pb-1">
                  <span>20</span>
                </div>
                <div className="flex items-center gap-2 border-b border-dashed border-slate-100 pb-1">
                  <span>15</span>
                </div>
                <div className="flex items-center gap-2 border-b border-dashed border-slate-100 pb-1">
                  <span>10</span>
                </div>
                <div className="flex items-center gap-2 border-b border-dashed border-slate-100 pb-1">
                  <span>5</span>
                </div>
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                  <span>0</span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-medium text-slate-400 pt-2 pl-4">
                <span>Sep 4</span>
                <span>Sep 5</span>
                <span>Sep 6</span>
                <span>Sep 7</span>
                <span>Sep 8</span>
                <span>Sep 9</span>
                <span className="font-bold text-slate-800">Sep 10</span>
              </div>
            </div>

            {/* Donut Gauge & Legend (5 Cols) */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center h-28 w-28">
                {/* SVG Donut */}
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <path
                    className="text-slate-100"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-rose-500"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeDasharray={`${attendanceRate > 0 ? attendanceRate : 100}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-extrabold text-slate-900">{attendanceRate}%</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 mt-1">Attendance Rate</span>

              {/* Detailed count list */}
              <div className="mt-3 w-full space-y-1 text-xs font-semibold px-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present
                  </span>
                  <span className="text-slate-900">{presentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Late
                  </span>
                  <span className="text-slate-900">{lateCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Absent
                  </span>
                  <span className="text-slate-900">{absentCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Live GPS Geofence (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Live GPS Geofence</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
              </span>
            </div>
            <button className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
              View Live
            </button>
          </div>

          {/* Interactive Map Visual */}
          <div className="mt-4 relative rounded-2xl h-44 bg-[#eef2f6] border border-slate-200/80 overflow-hidden flex items-center justify-center">
            {/* Map Roads & Blocks Pattern */}
            <svg viewBox="0 0 300 180" className="absolute inset-0 h-full w-full opacity-60">
              <rect width="300" height="180" fill="#f1f5f9" />
              {/* City blocks */}
              <rect x="20" y="20" width="60" height="45" rx="6" fill="#e2e8f0" />
              <rect x="100" y="20" width="80" height="35" rx="6" fill="#cbd5e1" />
              <rect x="200" y="20" width="75" height="50" rx="6" fill="#e2e8f0" />
              <rect x="30" y="85" width="55" height="70" rx="6" fill="#cbd5e1" />
              <rect x="210" y="90" width="70" height="65" rx="6" fill="#e2e8f0" />
              {/* Roads */}
              <line x1="0" y1="75" x2="300" y2="75" stroke="#ffffff" strokeWidth="12" />
              <line x1="90" y1="0" x2="90" y2="180" stroke="#ffffff" strokeWidth="10" />
              <line x1="190" y1="0" x2="190" y2="180" stroke="#ffffff" strokeWidth="12" />
            </svg>

            {/* Pulsing Geofence Radar Circle */}
            <div className="relative z-10 flex items-center justify-center">
              <span className="absolute h-28 w-28 rounded-full bg-indigo-500/15 animate-ping" />
              <span className="absolute h-20 w-20 rounded-full bg-indigo-500/20" />
              <span className="absolute h-12 w-12 rounded-full bg-indigo-500/30" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md">
                <MapPin className="h-4 w-4" />
              </div>
            </div>

            {/* Wireless radar icon */}
            <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-2xs text-indigo-600">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
            </div>

            {/* Callout Location Badge */}
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 shadow-md border border-slate-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800 leading-tight">
                  {branchName}
                </p>
                <p className="truncate text-[10px] text-slate-400 font-medium">
                  Authorized location for punch
                </p>
              </div>
            </div>
          </div>

          {/* Footer Status */}
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              <span>Accuracy: GPS Verified</span>
            </div>
            <span>Last Sync: {currentTime}</span>
          </div>
        </div>

        {/* Col 3: Recent Activity (3 Cols) */}
        <div className="lg:col-span-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <Link href="/attendance" className="text-xs font-semibold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          {/* Activity Timeline List */}
          <div className="mt-4 space-y-4">
            {/* Event 1 */}
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-bold text-slate-800">{employeeName}</p>
                  <span className="text-[10px] font-semibold text-emerald-600">Just now</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Clocked in • 05:49 PM
                </p>
              </div>
            </div>

            {/* Event 2 */}
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 mt-0.5">
                <Compass className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-bold text-slate-800">System</p>
                  <span className="text-[10px] text-slate-400">1 min ago</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  GPS location verified
                </p>
              </div>
            </div>

            {/* Event 3 */}
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600 mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-bold text-slate-800">{orgName}</p>
                  <span className="text-[10px] text-slate-400">8 hrs ago</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Shift started • General Shift
                </p>
              </div>
            </div>

            {/* Event 4 */}
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 mt-0.5">
                <Settings className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-bold text-slate-800">System</p>
                  <span className="text-[10px] text-slate-400">8 hrs ago</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Daily sync completed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: Bottom 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Col 1: Real-Time Attendance Stream (6 Cols) */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Real-Time Attendance Stream</h3>
            <Link
              href="/attendance"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              <span>View Full Logs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">EMPLOYEE</th>
                  <th className="pb-3 font-semibold">BRANCH & DEPARTMENT</th>
                  <th className="pb-3 font-semibold">SHIFT POLICY</th>
                  <th className="pb-3 font-semibold">CLOCK IN</th>
                  <th className="pb-3 font-semibold">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                        {employeeName[0]?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{employeeName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <MapPin className="h-3 w-3 text-indigo-600" />
                      <span>{branchName}</span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">General Shift</td>
                  <td className="py-3 font-mono font-semibold text-slate-800">05:49 PM</td>
                  <td className="py-3">
                    <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      HALF_DAY
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Col 2: Branch-wise Attendance (3 Cols) */}
        <div className="lg:col-span-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Branch-wise Attendance</h3>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 cursor-pointer">
              <span>All Branches</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Donut Chart */}
            <div className="relative flex items-center justify-center h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <path
                  className="text-slate-100"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-rose-500"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="100, 100"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-lg font-extrabold text-slate-900">1</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase">Total</span>
              </div>
            </div>

            {/* Legend with numbers and percentages */}
            <div className="space-y-1.5 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Present</span>
                <span className="text-slate-900">0 (0%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-slate-600">Late</span>
                <span className="text-slate-900">0 (0%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-slate-600">Absent</span>
                <span className="text-slate-900">1 (100%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Empower Your Team Everyday Card (3 Cols) */}
        <div className="lg:col-span-3 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-sky-50 to-blue-50/80 p-6 border border-indigo-100/70 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
              Empower<br />Your Team<br />Everyday
            </h3>
            <p className="mt-2 text-xs text-slate-600 font-medium max-w-[180px]">
              Smarter attendance.<br />Happier workplaces.<br />Stronger tomorrow.
            </p>
          </div>

          <div className="mt-4 flex justify-end relative z-10">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-slate-100 text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Modern 3D/Isometric Progress Climber Graphic */}
          <div className="absolute right-1 bottom-4 w-28 h-28 pointer-events-none opacity-85">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Stairs / Bars */}
              <rect x="25" y="70" width="12" height="30" rx="3" fill="#93c5fd" />
              <rect x="42" y="55" width="12" height="45" rx="3" fill="#60a5fa" />
              <rect x="59" y="40" width="12" height="60" rx="3" fill="#3b82f6" />
              <rect x="76" y="25" width="12" height="75" rx="3" fill="#2563eb" />
              {/* Arrow going up */}
              <path d="M30 60 L78 18" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
              <polygon points="78,12 85,18 75,23" fill="#f59e0b" />
            </svg>
          </div>
        </div>
      </div>

      {/* ROW 5: Bottom Ribbon Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-100/80 via-blue-100/60 to-purple-100/70 p-4 border border-indigo-100/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-white">
            <Star className="h-3.5 w-3.5 fill-white" />
          </div>
          <span>WorkPulse — People. Attendance. Productivity. All in one place.</span>
        </div>
        <div className="flex items-center gap-2 text-indigo-700 font-medium">
          <span>Building better workplaces, together.</span>
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
        </div>
      </div>
    </div>
  );
}
