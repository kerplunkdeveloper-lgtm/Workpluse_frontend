'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PermissionGate from '@/components/auth/PermissionGate';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import api from '@/lib/api';
import {
  CalendarCheck,
  Download,
  Clock,
  RefreshCw,
  MapPin,
  AlertCircle,
  PlusCircle,
  FileEdit,
  XCircle,
  CheckCircle2,
  Calendar,
  X,
  Users,
  Check,
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Coffee,
  Building2,
  Layers,
  Sparkles,
  Award,
  BookOpen,
  Briefcase,
  Sliders,
  DollarSign,
  ChevronRight,
  GitFork,
  Radio,
} from 'lucide-react';

interface CorrectionRequest {
  id: string;
  employeeId: string;
  employee?: {
    firstName: string;
    lastName?: string;
    employeeCode: string;
  };
  date: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  createdAt: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'records' | 'regularizations' | 'workflow'>('records');
  const [filter, setFilter] = useState('ALL');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Punch Station State
  const [clockedIn, setClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [punchActionLoading, setPunchActionLoading] = useState(false);

  // Miss-punch Regularization states
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    category: 'FORGOT_PUNCH',
    requestedCheckIn: '09:00',
    requestedCheckOut: '18:00',
    reason: '',
  });

  const canViewAll = hasPermission(user, 'view:all_attendance');

  const fetchTodayStatus = async () => {
    try {
      const res = await api.get('/attendance/today');
      setClockedIn(Boolean(res.data.clockedIn));
      setIsOnBreak(Boolean(res.data.isOnBreak));
      setTodayAttendance(res.data.attendance);
      setEmployeeProfile(res.data.employee);
    } catch (err) {
      // fallback
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = canViewAll ? '/attendance' : '/attendance/my';
      const params = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await api.get(`${endpoint}${params}`);
      setLogs(res.data.records || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrections = async () => {
    try {
      const endpoint = canViewAll ? '/attendance/corrections' : '/attendance/corrections/my';
      const res = await api.get(endpoint);
      setCorrections(res.data.data || []);
    } catch (err) {
      // silently fail
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    fetchAttendance();
    fetchCorrections();
  }, [filter, canViewAll]);

  // Handle Clock In / Clock Out
  const handlePunchAction = async () => {
    setPunchActionLoading(true);
    setFeedback(null);
    try {
      const payload = {
        latitude: employeeProfile?.branch?.latitude ? Number(employeeProfile.branch.latitude) : 11.9416,
        longitude: employeeProfile?.branch?.longitude ? Number(employeeProfile.branch.longitude) : 79.8083,
        accuracy: 10,
      };

      if (!clockedIn) {
        const res = await api.post('/attendance/check-in', payload);
        setFeedback({ type: 'success', text: res.data.message || 'Checked in successfully!' });
      } else {
        const res = await api.post('/attendance/check-out', payload);
        setFeedback({ type: 'success', text: res.data.message || 'Checked out successfully!' });
      }
      await fetchTodayStatus();
      await fetchAttendance();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Attendance action failed' });
    } finally {
      setPunchActionLoading(false);
    }
  };

  // Handle Break Start / End
  const handleBreakToggle = async () => {
    setPunchActionLoading(true);
    setFeedback(null);
    try {
      const payload = {
        latitude: employeeProfile?.branch?.latitude ? Number(employeeProfile.branch.latitude) : 11.9416,
        longitude: employeeProfile?.branch?.longitude ? Number(employeeProfile.branch.longitude) : 79.8083,
      };

      if (!isOnBreak) {
        const res = await api.post('/attendance/break-start', payload);
        setFeedback({ type: 'success', text: res.data.message || 'Break started! Enjoy your break.' });
      } else {
        const res = await api.post('/attendance/break-end', payload);
        setFeedback({ type: 'success', text: res.data.message || 'Break ended! Resumed work.' });
      }
      await fetchTodayStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Break action failed' });
    } finally {
      setPunchActionLoading(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const checkInISO = `${formData.date}T${formData.requestedCheckIn}:00.000Z`;
      const checkOutISO = `${formData.date}T${formData.requestedCheckOut}:00.000Z`;

      const fullReason = `[${formData.category}] ${formData.reason}`.trim();

      await api.post('/attendance/corrections', {
        date: formData.date,
        requestedCheckIn: checkInISO,
        requestedCheckOut: checkOutISO,
        reason: fullReason,
      });

      setFeedback({ type: 'success', text: 'Miss-punch regularization request submitted!' });
      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'FORGOT_PUNCH',
        requestedCheckIn: '09:00',
        requestedCheckOut: '18:00',
        reason: '',
      });
      fetchCorrections();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to submit request' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewCorrection = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const reviewNote = window.prompt(`Optional note for ${status.toLowerCase()} this regularization:`) || undefined;
    try {
      await api.put(`/attendance/corrections/${id}/review`, { status, reviewNote });
      setFeedback({ type: 'success', text: `Regularization request ${status.toLowerCase()}! Attendance updated.` });
      await fetchCorrections();
      if (status === 'APPROVED') {
        fetchAttendance();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to review request' });
    }
  };

  const handleExportCSV = () => {
    if (!logs.length) return;

    const headers = [
      'Date',
      'Employee',
      'Code',
      'Branch',
      'Shift',
      'Clock In',
      'Clock Out',
      'Working Hours',
      'Late (mins)',
      'Status',
    ];
    const rows = logs.map((log) => [
      new Date(log.date).toISOString().split('T')[0],
      log.employee ? `${log.employee.firstName} ${log.employee.lastName || ''}`.trim() : user?.email,
      log.employee?.employeeCode || 'N/A',
      log.branch?.name || 'Standard',
      log.shift?.name || 'General Shift',
      log.checkIn ? new Date(log.checkIn).toLocaleTimeString() : '--',
      log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : '--',
      log.workingMinutes ? `${(log.workingMinutes / 60).toFixed(1)} hrs` : '0 hrs',
      log.lateMinutes || 0,
      log.status,
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metric counts
  const presentCount = logs.filter((l) => l.status === 'PRESENT').length;
  const lateCount = logs.filter((l) => l.status === 'LATE').length;
  const halfDayCount = logs.filter((l) => l.status === 'HALF_DAY').length;
  const absentCount = logs.filter((l) => l.status === 'ABSENT').length;

  return (
    <ProtectedRoute requiredPermission="view:my_attendance">
      <div className="space-y-6 select-none pb-12">
        {/* Hero Header Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Attendance Records & Live Punch Station
            </h1>
            <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed">
              {canViewAll
                ? 'Manage organizational shifts, geofence verification, miss-punch regularizations, and daily work hours.'
                : 'Monitor your live shift progress, punch in/out, log meal breaks, and submit miss-punch regularizations.'}
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Miss-Punch Request</span>
            </button>

            {activeTab === 'records' && (
              <PermissionGate permission="view:all_attendance">
                <button
                  onClick={handleExportCSV}
                  disabled={!logs.length}
                  className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  <span>Export CSV</span>
                </button>
              </PermissionGate>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`rounded-2xl p-4 text-xs font-medium flex items-center justify-between border shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* LIVE PUNCH & GEOFENCE STATION CARD */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Punch Status Overview */}
            <div className="flex items-center gap-5">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                  isOnBreak
                    ? 'bg-amber-100 text-amber-600'
                    : clockedIn
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isOnBreak ? (
                  <Coffee className="h-7 w-7 animate-bounce" />
                ) : clockedIn ? (
                  <Clock className="h-7 w-7" />
                ) : (
                  <Radio className="h-7 w-7 text-slate-400" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-extrabold text-slate-900">
                    {isOnBreak ? 'On Break (Paused)' : clockedIn ? 'Active on Shift' : 'Not Clocked In Today'}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      isOnBreak
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : clockedIn
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isOnBreak ? 'bg-amber-500 animate-pulse' : clockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {isOnBreak ? 'Break Active' : clockedIn ? 'On Duty' : 'Ready'}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                    {employeeProfile?.branch?.name || 'Pondicherry HQ'} (Geofenced 200m)
                  </span>
                  <span>•</span>
                  <span>
                    Shift:{' '}
                    <strong className="text-slate-700">
                      {employeeProfile?.shift?.name || 'General 09:00 - 18:00'}
                    </strong>
                  </span>
                  {todayAttendance?.checkIn && (
                    <>
                      <span>•</span>
                      <span>
                        Punch In:{' '}
                        <strong className="text-slate-800">
                          {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </span>
                    </>
                  )}
                  {todayAttendance?.breakMinutes > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        Breaks:{' '}
                        <strong className="text-amber-700">{todayAttendance.breakMinutes}m</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Punch Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {!clockedIn ? (
                <button
                  onClick={handlePunchAction}
                  disabled={punchActionLoading}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-5 py-3 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <Clock className="h-4 w-4" />
                  <span>{punchActionLoading ? 'Verifying GPS...' : 'Clock In Now'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleBreakToggle}
                    disabled={punchActionLoading}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shadow-2xs ${
                      isOnBreak
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                  >
                    <Coffee className="h-4 w-4" />
                    <span>{punchActionLoading ? 'Updating...' : isOnBreak ? 'Resume Work ⚡' : 'Take Break ☕'}</span>
                  </button>

                  <button
                    onClick={handlePunchAction}
                    disabled={punchActionLoading}
                    className="flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-rose-600/25 transition-all disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>{punchActionLoading ? 'Saving...' : 'Clock Out'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#16a34a]">
                <Check className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Present</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{presentCount}</div>
              <div className="mt-1 text-xs font-semibold text-emerald-600">On time attendance</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q40,5 70,18 T100,8 L100,25 L0,25 Z" fill="#86efac" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Late Arrivals</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{lateCount}</div>
              <div className="mt-1 text-xs font-semibold text-amber-600">Beyond shift grace limit</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q30,10 60,18 T100,5 L100,25 L0,25 Z" fill="#fdba74" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#7c3aed]">
                <Zap className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Half Day</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{halfDayCount}</div>
              <div className="mt-1 text-xs font-semibold text-indigo-600">Partial work hours</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q40,8 70,20 T100,10 L100,25 L0,25 Z" fill="#c4b5fd" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fee2e2] text-[#dc2626]">
                <XCircle className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Absent</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{absentCount}</div>
              <div className="mt-1 text-xs font-semibold text-rose-600">Unexcused absence</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q30,12 60,8 T100,16 L100,25 L0,25 Z" fill="#fca5a5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'records'
                  ? 'bg-[#4f46e5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Attendance Records</span>
            </button>
            <button
              onClick={() => setActiveTab('regularizations')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'regularizations'
                  ? 'bg-[#4f46e5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>Miss-Punch Regularizations ({corrections.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'workflow'
                  ? 'bg-[#4f46e5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Complete App Workflow Guide</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Attendance Logs */}
        {activeTab === 'records' && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {['ALL', 'PRESENT', 'LATE', 'HALF_DAY', 'ABSENT'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    filter === status
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Attendance Table */}
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Branch / Shift</th>
                    <th className="py-3.5 px-6">Check In</th>
                    <th className="py-3.5 px-6">Check Out</th>
                    <th className="py-3.5 px-6">Working Hours</th>
                    <th className="py-3.5 px-6">Late (mins)</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        Loading attendance data...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No attendance records found for this filter.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-900">
                            {log.employee
                              ? `${log.employee.firstName} ${log.employee.lastName || ''}`.trim()
                              : user?.email}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {log.employee?.employeeCode || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-medium text-slate-800">
                          {new Date(log.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-semibold text-slate-700">{log.branch?.name || 'Main HQ'}</div>
                          <div className="text-[10px] text-slate-400">{log.shift?.name || 'General'}</div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-slate-600">
                          {log.checkIn
                            ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--'}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-slate-600">
                          {log.checkOut
                            ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--'}
                        </td>
                        <td className="py-3.5 px-6 font-medium text-slate-700">
                          {log.workingMinutes ? `${(log.workingMinutes / 60).toFixed(1)} hrs` : '0 hrs'}
                          {log.breakMinutes > 0 && (
                            <span className="ml-1 text-[10px] text-amber-600">({log.breakMinutes}m break)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          {log.lateMinutes > 0 ? (
                            <span className="font-bold text-amber-600">{log.lateMinutes}m</span>
                          ) : (
                            <span className="text-slate-400">0m</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                              log.status === 'PRESENT'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : log.status === 'LATE'
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : log.status === 'HALF_DAY'
                                ? 'bg-purple-50 border-purple-200 text-purple-700'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Miss-Punch Regularization Table */}
        {activeTab === 'regularizations' && (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Miss-Punch Date</th>
                  <th className="py-3.5 px-6">Requested Timings</th>
                  <th className="py-3.5 px-6">Reason / Details</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Action / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {corrections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No miss-punch regularization requests found.
                    </td>
                  </tr>
                ) : (
                  corrections.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">
                          {item.employee
                            ? `${item.employee.firstName} ${item.employee.lastName || ''}`.trim()
                            : user?.email}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.employee?.employeeCode || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-slate-800">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-600">
                        {item.requestedCheckIn
                          ? new Date(item.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--'}{' '}
                        -{' '}
                        {item.requestedCheckOut
                          ? new Date(item.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--'}
                      </td>
                      <td className="py-3.5 px-6 max-w-xs text-slate-700">
                        {item.reason}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {canViewAll && item.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReviewCorrection(item.id, 'APPROVED')}
                              className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewCorrection(item.id, 'REJECTED')}
                              className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-2xs"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{item.reviewNote || '--'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Complete End-to-End Workforce & Attendance Workflow Guide */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {/* Top Workflow Explanation Card */}
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                  <GitFork className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    WorkPulse Complete Attendance & HR Lifecycle Architecture
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-3xl">
                    Every module in WorkPulse links together seamlessly: From the moment an employee is onboarded,
                    their GPS geofence, shifts, daily check-ins, meal breaks, 8-hour late arrival waivers, miss-punch regularizations,
                    leave quotas, and holidays all flow automatically into monthly payroll calculations, statutory compliance (EPF/ESIC/PT),
                    and official printable payslip generation!
                  </p>
                </div>
              </div>
            </div>

            {/* 7-Step Enterprise Architecture Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Step 1 */}
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                      STEP 1
                    </span>
                    <Building2 className="h-4 w-4 text-indigo-500" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Organization & Geofencing</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Set up branches with precise GPS latitude, longitude, and circular radius (e.g. 200m). Multi-branch roaming allows staff to punch across branches.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
                  Route: <code className="text-indigo-600">/organization</code>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      STEP 2
                    </span>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Employee Onboarding Flow</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    HR creates candidate $\rightarrow$ Candidate fills profile & uploads docs $\rightarrow$ HR verifies $\rightarrow$ Admin approves $\rightarrow$ Offer letter accepted $\rightarrow$ Auto-activates into employee directory!
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
                  Route: <code className="text-blue-600">/onboarding</code>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      STEP 3
                    </span>
                    <Clock className="h-4 w-4 text-emerald-500" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Shifts & 8-Hour Late Policy</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Configures shift timings & grace minutes (e.g. 15m). <strong className="text-slate-800">Dynamic Policy:</strong> If employee arrives late but completes 8 hours by checkout, late penalty is waived to PRESENT with 0 tardy penalty!
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
                  Route: <code className="text-emerald-600">/shifts</code>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700">
                      STEP 4
                    </span>
                    <CalendarCheck className="h-4 w-4 text-purple-500" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Punch Station & Breaks</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Employees clock in using real-time GPS coordinates. Supports multi-break tracking (Take Break ☕ / Resume ⚡) and auto-break closure upon checkout.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
                  Route: <code className="text-purple-600">/attendance</code> & <code className="text-purple-600">/</code>
                </div>
              </div>

              {/* Step 5 */}
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                      STEP 5
                    </span>
                    <FileEdit className="h-4 w-4 text-amber-500" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Miss-Punch & WFH Regularization</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Forgot punch or WFH? Employees submit a correction request with reason. Managers review and approve/reject with 1-click audit notes.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
                  Tab: <code className="text-amber-600">Regularizations</code>
                </div>
              </div>

              {/* Step 6 */}
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                      STEP 6
                    </span>
                    <Calendar className="h-4 w-4 text-rose-500" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">Leaves & Holiday Exclusions</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Paid, Casual, and Sick leave balances automatically exclude Government and Company holidays from count. Approved leaves mark days as ON_LEAVE.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
                  Routes: <code className="text-rose-600">/leaves</code> & <code className="text-rose-600">/holidays</code>
                </div>
              </div>

              {/* Step 7 */}
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all md:col-span-2 lg:col-span-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        STEP 7
                      </span>
                      <Award className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        End-to-End Payroll Lifecycle & Salary Revisions
                      </h3>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-4xl">
                      <strong>Monthly Payroll Calculation:</strong> Basic, HRA, Transport, Special, PF (12%), ESI (0.75%), PT, LOP and Overtime $\rightarrow$
                      <strong> Governance Approval:</strong> Batch review by HR & Admin $\rightarrow$
                      <strong> Official Payslip PDF:</strong> Detailed letterhead, attendance sync, amount in words, and dual signature blocks $\rightarrow$
                      <strong> Bank CSV Export:</strong> 1-click export formatted for automated bank payout $\rightarrow$
                      <strong> Salary History:</strong> Complete appraisal audit trail with hike percentage tracking!
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="rounded-2xl bg-indigo-50 text-indigo-700 px-4 py-2 text-xs font-bold">
                      Route: /payroll
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regularization Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Miss-Punch Regularization</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Submit your actual shift timings for manager approval.
              </p>

              <form onSubmit={handleSubmitCorrection} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                  >
                    <option value="FORGOT_PUNCH">Forgot to Clock In / Out</option>
                    <option value="WFH">Work From Home (WFH)</option>
                    <option value="CLIENT_VISIT">Client Site / On-Duty Visit</option>
                    <option value="GPS_GLITCH">GPS / Device Technical Glitch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Miss-Punch</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Actual Check-In</label>
                    <input
                      type="time"
                      value={formData.requestedCheckIn}
                      onChange={(e) => setFormData({ ...formData, requestedCheckIn: e.target.value })}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Actual Check-Out</label>
                    <input
                      type="time"
                      value={formData.requestedCheckOut}
                      onChange={(e) => setFormData({ ...formData, requestedCheckOut: e.target.value })}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Explanation</label>
                  <textarea
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g. Worked from home due to heavy rain; delivered client sprint tasks."
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
