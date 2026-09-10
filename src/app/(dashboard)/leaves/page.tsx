'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import api from '@/lib/api';
import {
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  PlusCircle,
  AlertCircle,
  FileText,
  Palmtree,
  RefreshCw,
  X,
  Check,
  XCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  daysAllowed: number;
  isPaid: boolean;
}

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName?: string;
    employeeCode: string;
    department?: { name: string };
  };
  leaveTypeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  createdAt: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  isOptional: boolean;
}

export default function LeavesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my' | 'approvals' | 'holidays'>('my');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    text: string;
    time?: string;
  } | null>(null);

  // Auto-dismiss sticky top-right notification toast
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Apply Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Holiday Modal state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayData, setHolidayData] = useState({
    name: '',
    date: '',
    isOptional: false,
  });

  const canManage = hasPermission(user, 'manage:leaves');

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, typesRes, myRes, holRes] = await Promise.all([
        api.get('/leaves/balances').catch(() => ({ data: { data: [] } })),
        api.get('/leaves/types').catch(() => ({ data: { data: [] } })),
        api.get('/leaves/my').catch(() => ({ data: { data: [] } })),
        api.get('/leaves/holidays').catch(() => ({ data: { data: [] } })),
      ]);

      setBalances(balRes.data.data || []);
      const availTypes = typesRes.data.data || [];
      setTypes(availTypes);
      if (availTypes.length > 0 && !formData.leaveTypeId) {
        setFormData((prev) => ({ ...prev, leaveTypeId: availTypes[0].id }));
      }
      setMyRequests(myRes.data.data || []);
      setHolidays(holRes.data.data || []);

      if (canManage) {
        const appRes = await api.get('/leaves/requests?status=PENDING').catch(() => ({ data: { data: [] } }));
        setPendingApprovals(appRes.data.data || []);
      }
    } catch (err: unknown) {
      console.error('Failed to load leave records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canManage]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/leaves/apply', formData);
      setShowApplyModal(false);
      setFeedback({
        type: 'success',
        title: 'Leave Application Submitted',
        text: 'Your time-off request has been forwarded to HR management for review.',
        time: 'Just now',
      });
      setFormData({
        leaveTypeId: types[0]?.id || '',
        startDate: '',
        endDate: '',
        reason: '',
      });
      loadData();
    } catch (err: any) {
      let errorMsg = 'Failed to submit leave application. Please verify selected dates and leave balance.';
      const raw = err.response?.data?.message;
      if (raw && typeof raw === 'string') {
        if (!raw.includes('/api/') && !raw.includes('Cannot POST') && !raw.includes('prisma')) {
          errorMsg = raw;
        }
      }
      setFeedback({
        type: 'error',
        title: 'Leave Application Notice',
        text: errorMsg,
        time: 'Just now',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const reviewNote = window.prompt(`Note for ${status.toLowerCase()} this leave request (optional):`);
    try {
      await api.put(`/leaves/requests/${id}/review`, { status, reviewNote: reviewNote || undefined });
      setFeedback({
        type: 'success',
        title: `Leave Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        text: `The leave request has been successfully marked as ${status.toLowerCase()}.`,
        time: 'Just now',
      });
      loadData();
    } catch (err: any) {
      const raw = err.response?.data?.message;
      setFeedback({
        type: 'error',
        title: 'Review Action Alert',
        text: raw && typeof raw === 'string' && !raw.includes('/api/') ? raw : 'Failed to update leave request status.',
        time: 'Just now',
      });
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leaves/holidays', holidayData);
      setShowHolidayModal(false);
      setHolidayData({ name: '', date: '', isOptional: false });
      setFeedback({
        type: 'success',
        title: 'Holiday Registered',
        text: 'Company calendar has been updated with the new holiday.',
        time: 'Just now',
      });
      loadData();
    } catch (err: any) {
      const raw = err.response?.data?.message;
      setFeedback({
        type: 'error',
        title: 'Calendar Update Notice',
        text: raw && typeof raw === 'string' && !raw.includes('/api/') ? raw : 'Failed to add holiday.',
        time: 'Just now',
      });
    }
  };

  const pendingApprovalsCount = pendingApprovals.length;

  return (
    <div className="space-y-6 select-none">
      {/* Hero Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Leave & Time-Off Management
          </h1>
          <p className="mt-1 text-xs text-slate-600 font-medium">
            Manage your paid time off, track available leave balances, submit leave applications, and view holiday calendars.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all relative z-10"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Sticky Notification Toast - Top Right Corner matching Navbar notification format */}
      {feedback && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md transition-all ${
              feedback.type === 'success'
                ? 'border-emerald-200/90 bg-white/98 text-slate-900 shadow-emerald-500/10'
                : 'border-rose-200/90 bg-white/98 text-slate-900 shadow-rose-500/10'
            }`}
          >
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs font-bold truncate ${
                    feedback.type === 'success' ? 'text-emerald-950' : 'text-rose-950'
                  }`}
                >
                  {feedback.title}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-medium text-slate-400">
                    {feedback.time || 'Just now'}
                  </span>
                  <button
                    onClick={() => setFeedback(null)}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed break-words">
                {feedback.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leave Quota Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {balances.map((b) => (
          <div
            key={b.id}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {b.leaveType.name} ({b.leaveType.code})
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  b.leaveType.isPaid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                {b.leaveType.isPaid ? 'PAID' : 'UNPAID'}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{b.remainingDays}</span>
              <span className="text-xs font-semibold text-slate-400">days left</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3">
              <span>Used: <strong className="text-slate-900">{b.usedDays}</strong></span>
              <span>Quota: <strong className="text-slate-900">{b.allocatedDays}</strong></span>
            </div>

            {/* Wave sparkline */}
            <div className="absolute bottom-0 right-0 left-0 h-6 opacity-20 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q35,5 70,18 T100,8 L100,25 L0,25 Z" fill="#818cf8" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-2xl bg-white p-1 border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'my'
                ? 'bg-[#4f46e5] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>My Requests ({myRequests.length})</span>
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'approvals'
                  ? 'bg-[#4f46e5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Approvals Inbox</span>
              {pendingApprovalsCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('holidays')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'holidays'
                ? 'bg-[#4f46e5] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palmtree className="h-3.5 w-3.5" />
            <span>Holidays ({holidays.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: My Requests */}
      {activeTab === 'my' && (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Leave Request History</h3>
            <button onClick={loadData} className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-6">Leave Type</th>
                <th className="py-3.5 px-6">Dates</th>
                <th className="py-3.5 px-6">Days</th>
                <th className="py-3.5 px-6">Reason</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Review Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                    No leave requests submitted yet. Click &apos;Apply for Leave&apos; to submit your first request.
                  </td>
                </tr>
              ) : (
                myRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900">{req.leaveType?.name || 'General Leave'}</td>
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                      {new Date(req.startDate).toLocaleDateString()} &rarr; {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-900">{req.daysCount} day(s)</td>
                    <td className="py-3.5 px-6 text-xs text-slate-600 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">{req.reviewNote || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Approvals Inbox */}
      {activeTab === 'approvals' && canManage && (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pending Team Requests</h3>
            <button onClick={loadData} className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-6">Employee</th>
                <th className="py-3.5 px-6">Leave Category</th>
                <th className="py-3.5 px-6">Dates Requested</th>
                <th className="py-3.5 px-6">Days</th>
                <th className="py-3.5 px-6">Reason</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                    No pending leave approvals waiting for review. All clear!
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <p className="font-bold text-slate-900">
                        {req.employee?.firstName} {req.employee?.lastName || ''}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">{req.employee?.employeeCode}</p>
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-800">{req.leaveType?.name}</td>
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                      {new Date(req.startDate).toLocaleDateString()} &rarr; {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-900">{req.daysCount} day(s)</td>
                    <td className="py-3.5 px-6 text-xs text-slate-600 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReview(req.id, 'APPROVED')}
                          className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(req.id, 'REJECTED')}
                          className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-2xs"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Holidays Calendar */}
      {activeTab === 'holidays' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Company Holidays Calendar</h3>
              <p className="text-xs text-slate-500">
                Official organization holiday dates (not counted against paid leave quotas).
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => setShowHolidayModal(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
              >
                <PlusCircle className="h-3.5 w-3.5 text-indigo-600" />
                Add Holiday
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidays.length === 0 ? (
              <p className="text-xs text-slate-400 col-span-full py-6 text-center">
                No company holidays configured yet.
              </p>
            ) : (
              holidays.map((h) => (
                <div key={h.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{h.name}</h4>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {new Date(h.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {h.isOptional && (
                    <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 border-slate-200 text-slate-500">
                      Optional
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Apply for Leave</h3>
              <button onClick={() => setShowApplyModal(false)} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select leave category and duration. Your manager will be notified for review.
            </p>

            <form onSubmit={handleApplyLeave} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Leave Category</label>
                <select
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) - {t.isPaid ? 'Paid' : 'Unpaid'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Note</label>
                <textarea
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Family medical appointment / Annual vacation"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Company Holiday</h3>
              <button onClick={() => setShowHolidayModal(false)} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateHoliday} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={holidayData.name}
                  onChange={(e) => setHolidayData({ ...holidayData, name: e.target.value })}
                  placeholder="e.g. New Year's Day, Diwali"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={holidayData.date}
                  onChange={(e) => setHolidayData({ ...holidayData, date: e.target.value })}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOptional"
                  checked={holidayData.isOptional}
                  onChange={(e) => setHolidayData({ ...holidayData, isOptional: e.target.checked })}
                  className="rounded border-slate-200 text-indigo-600"
                />
                <label htmlFor="isOptional" className="text-xs font-medium text-slate-700">
                  Optional / Restricted Holiday
                </label>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
