'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import api from '@/lib/api';
import {
  PartyPopper,
  Calendar,
  Building2,
  MapPin,
  Plus,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Star,
  Check,
  CalendarDays,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import HolidayExcelUploadModal from '@/components/holidays/HolidayExcelUploadModal';

interface Branch {
  id: string;
  name: string;
}

interface Holiday {
  id: string;
  organizationId: string;
  name: string;
  date: string;
  type: 'GOVERNMENT' | 'COMPANY' | 'OPTIONAL';
  branchId: string | null;
  description: string | null;
  isOptional: boolean;
  branch?: { id: string; name: string } | null;
}

export default function HolidaysPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, 'manage:company') || hasPermission(user, 'manage:leaves');

  const [year, setYear] = useState<number>(2026);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GOVERNMENT' | 'COMPANY' | 'OPTIONAL'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    date: '2026-01-26',
    type: 'GOVERNMENT',
    branchId: '',
    description: '',
    isOptional: false,
  });

  const notify = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [holidaysRes, branchesRes] = await Promise.all([
        api.get(`/holidays?year=${year}`),
        api.get('/branches').catch(() => ({ data: { data: [] } })),
      ]);
      setHolidays(holidaysRes.data?.data || []);
      setBranches(branchesRes.data?.data || []);
    } catch (err: any) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  // Submit Single Holiday (Create / Update)
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        name: formData.name,
        date: formData.date,
        type: formData.type,
        branchId: formData.branchId || null,
        description: formData.description || null,
        isOptional: formData.type === 'OPTIONAL' || formData.isOptional,
      };

      if (editingHoliday) {
        await api.put(`/holidays/${editingHoliday.id}`, payload);
        notify('success', `Holiday '${formData.name}' updated successfully!`);
      } else {
        await api.post('/holidays', payload);
        notify('success', `Holiday '${formData.name}' created successfully!`);
      }

      setShowAddModal(false);
      setEditingHoliday(null);
      setFormData({
        name: '',
        date: `${year}-01-26`,
        type: 'GOVERNMENT',
        branchId: '',
        description: '',
        isOptional: false,
      });
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save holiday';
      notify('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove '${name}' from holidays?`)) return;
    try {
      await api.delete(`/holidays/${id}`);
      notify('success', `Holiday '${name}' deleted successfully!`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'Failed to delete holiday');
    }
  };

  // Filtered list
  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.description && h.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || h.type === typeFilter;
    const matchesBranch =
      branchFilter === 'ALL' ||
      (branchFilter === 'ALL_BRANCHES' && !h.branchId) ||
      h.branchId === branchFilter;
    return matchesSearch && matchesType && matchesBranch;
  });

  // KPI calculations
  const totalCount = holidays.length;
  const govtCount = holidays.filter((h) => h.type === 'GOVERNMENT').length;
  const companyCount = holidays.filter((h) => h.type === 'COMPANY').length;
  const optionalCount = holidays.filter((h) => h.type === 'OPTIONAL' || h.isOptional).length;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <ProtectedRoute>
      <div className="space-y-6 select-none pb-12">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold animate-in fade-in-50 duration-200 shadow-xs ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Hero Header Banner Matching dashboard_ui.png */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-indigo-700 backdrop-blur-md shadow-xs border border-indigo-100">
                <PartyPopper className="h-3.5 w-3.5 text-indigo-600" />
                <span>STEP 7 — Holiday Governance & Observance Suite</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                Company & Government Holidays ({year})
              </h1>
              <p className="text-xs lg:text-sm text-slate-600 leading-relaxed">
                Configure official government, corporate, and optional festival holidays across office locations. Holidays are automatically protected from deducting employee leave balance or marking absenteeism.
              </p>
            </div>

            {/* Action Buttons */}
            {canManage && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-white/90 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-white shadow-xs transition-all active:scale-[0.98]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Upload Excel / CSV</span>
                </button>

                <button
                  onClick={() => {
                    setEditingHoliday(null);
                    setFormData({
                      name: '',
                      date: `${year}-01-26`,
                      type: 'GOVERNMENT',
                      branchId: '',
                      description: '',
                      isOptional: false,
                    });
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Holiday</span>
                </button>
              </div>
            )}
          </div>

          {/* Decorative geometric background elements */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-52 w-52 rounded-full bg-indigo-300/20 blur-2xl"></div>
          <div className="pointer-events-none absolute -top-12 right-40 h-44 w-44 rounded-full bg-blue-300/20 blur-2xl"></div>
        </div>

        {/* 4 KPI Wave Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Holidays */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Holidays</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">{totalCount} Days</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Scheduled for calendar year {year}</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-purple-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 2: Government Holidays */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Government Holidays</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">{govtCount} Days</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Mandatory paid public holidays</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-emerald-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 18 C25 22, 50 10, 75 16 C85 20, 95 10, 100 8 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 18 C25 22, 50 10, 75 16 C85 20, 95 10, 100 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 3: Company Holidays */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Company Observances</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">{companyCount} Days</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Corporate anniversary & shutdowns</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-blue-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 15 C30 8, 50 20, 70 12 C85 5, 95 15, 100 10 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 15 C30 8, 50 20, 70 12 C85 5, 95 15, 100 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 4: Optional Holidays */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Optional / Floating</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Star className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">{optionalCount} Days</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Restricted cultural options</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-amber-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 22 C30 14, 55 24, 75 14 C85 8, 95 16, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 22 C30 14, 55 24, 75 14 C85 8, 95 16, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filter Toolbar & View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector */}
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-2xs">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono text-xs font-bold text-slate-800 px-2">{year}</span>
              <button
                onClick={() => setYear((y) => y + 1)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {(['ALL', 'GOVERNMENT', 'COMPANY', 'OPTIONAL'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-2xl px-3 py-1.5 text-[11px] font-bold transition-all shrink-0 ${
                    typeFilter === t
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Branch Scopes</option>
              <option value="ALL_BRANCHES">Organization-Wide Only</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search holiday..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition-all w-44"
              />
            </div>

            {/* View Switcher Pills */}
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yearly Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                List View
              </button>
            </div>
          </div>
        </div>

        {/* MAIN VIEW: Calendar Grid or Table View */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
              <PartyPopper className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No holidays scheduled</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              No holidays match the selected year and filters. Click &ldquo;Add Holiday&rdquo; or &ldquo;Upload List&rdquo; to populate the holiday calendar.
            </p>
          </div>
        ) : viewMode === 'calendar' ? (
          /* 12-MONTH YEARLY CALENDAR GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {monthNames.map((monthName, monthIndex) => {
              // Days in this month
              const daysInThisMonth = new Date(year, monthIndex + 1, 0).getDate();
              const firstDayIndex = new Date(year, monthIndex, 1).getDay();

              // Holidays in this month
              const monthHolidays = filteredHolidays.filter((h) => {
                const d = new Date(h.date);
                return d.getUTCMonth() === monthIndex;
              });

              const holidayDateMap = new Map();
              monthHolidays.forEach((h) => {
                const dayNum = new Date(h.date).getUTCDate();
                holidayDateMap.set(dayNum, h);
              });

              return (
                <div
                  key={monthName}
                  className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-all"
                >
                  <div>
                    {/* Month Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800">{monthName}</span>
                      {monthHolidays.length > 0 && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                          {monthHolidays.length} holiday{monthHolidays.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Day Labels */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-300 pb-1">
                      <span>S</span>
                      <span>M</span>
                      <span>T</span>
                      <span>W</span>
                      <span>T</span>
                      <span>F</span>
                      <span>S</span>
                    </div>

                    {/* Day Cells */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {/* Empty padding */}
                      {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-6 w-full" />
                      ))}

                      {/* Days */}
                      {Array.from({ length: daysInThisMonth }).map((_, i) => {
                        const day = i + 1;
                        const holiday = holidayDateMap.get(day);

                        return (
                          <div
                            key={`day-${day}`}
                            title={holiday ? `${holiday.name} (${holiday.type})` : undefined}
                            className={`h-6 w-full rounded-lg flex items-center justify-center text-[10px] font-bold relative transition-all ${
                              holiday
                                ? holiday.type === 'GOVERNMENT'
                                  ? 'bg-emerald-500 text-white shadow-2xs font-extrabold cursor-pointer hover:scale-105'
                                  : holiday.type === 'COMPANY'
                                  ? 'bg-blue-500 text-white shadow-2xs font-extrabold cursor-pointer hover:scale-105'
                                  : 'bg-purple-500 text-white shadow-2xs font-extrabold cursor-pointer hover:scale-105'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* List of holidays in this month */}
                  <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5 min-h-[42px]">
                    {monthHolidays.length === 0 ? (
                      <span className="text-[10px] text-slate-300 italic">No holidays</span>
                    ) : (
                      monthHolidays.map((h) => (
                        <div key={h.id} className="flex items-center justify-between text-[11px] leading-tight">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                h.type === 'GOVERNMENT'
                                  ? 'bg-emerald-500'
                                  : h.type === 'COMPANY'
                                  ? 'bg-blue-500'
                                  : 'bg-purple-500'
                              }`}
                            />
                            <span className="truncate font-semibold text-slate-800">{h.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                            {new Date(h.date).getUTCDate()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE DIRECTORY VIEW */
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4 min-w-[140px]">Date</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Holiday Name & Description</th>
                    <th className="py-3.5 px-3 text-center">Category</th>
                    <th className="py-3.5 px-4">Applicable Scope</th>
                    {canManage && <th className="py-3.5 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredHolidays.map((h) => {
                    const d = new Date(h.date);
                    const formattedDate = d.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'UTC',
                    });

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-mono font-bold text-xs">
                              {d.getUTCDate()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{formattedDate}</p>
                              <p className="text-[10px] text-slate-400">{d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-800 text-xs">{h.name}</p>
                          {h.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{h.description}</p>
                          )}
                        </td>

                        <td className="py-4 px-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              h.type === 'GOVERNMENT'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : h.type === 'COMPANY'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {h.type}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {h.branch ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                              <MapPin className="h-3 w-3 text-indigo-500" />
                              <span>{h.branch.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                              <Building2 className="h-3 w-3" />
                              <span>All Branches</span>
                            </span>
                          )}
                        </td>

                        {canManage && (
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingHoliday(h);
                                  setFormData({
                                    name: h.name,
                                    date: new Date(h.date).toISOString().split('T')[0],
                                    type: h.type,
                                    branchId: h.branchId || '',
                                    description: h.description || '',
                                    isOptional: h.isOptional,
                                  });
                                  setShowAddModal(true);
                                }}
                                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteHoliday(h.id, h.name)}
                                className="rounded-xl p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT HOLIDAY */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-2xl space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <PartyPopper className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingHoliday ? 'Edit Holiday' : 'Configure New Holiday'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveHoliday} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Independence Day"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                    >
                      <option value="GOVERNMENT">Government Holiday</option>
                      <option value="COMPANY">Company Holiday</option>
                      <option value="OPTIONAL">Optional / Floating</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Applicable Branch Scope</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="">All Branches (Organization-Wide)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Select a branch for regional festival observances, or leave as All Branches.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. National paid public holiday with full compensation"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>{editingHoliday ? 'Save Changes' : 'Create Holiday'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: STEP 7.1 — HOLIDAY EXCEL/CSV UPLOAD */}
        <HolidayExcelUploadModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          onSuccess={(count, message) => {
            notify('success', message);
            fetchData();
          }}
          currentYear={year}
        />
      </div>
    </ProtectedRoute>
  );
}
