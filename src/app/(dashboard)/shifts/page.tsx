'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import api from '@/lib/api';
import {
  Clock,
  Plus,
  Edit3,
  Trash2,
  Users,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Loader2,
  X,
  Moon,
  Sun,
  Sunrise,
  ShieldCheck,
  Timer,
} from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  durationHours?: string;
  _count?: {
    employees: number;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName?: string | null;
  employeeCode: string;
  shiftId?: string | null;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
  });

  // Assign Modal State
  const [assigningShift, setAssigningShift] = useState<Shift | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Simulation State
  const [simShift, setSimShift] = useState({
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
  });
  const [simCheckIn, setSimCheckIn] = useState('09:22');
  const [simCheckOut, setSimCheckOut] = useState('18:45');
  const [simResult, setSimResult] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftsRes, empRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/employees'),
      ]);
      setShifts(shiftsRes.data.data || []);
      setEmployees(empRes.data.data || []);
    } catch (err: unknown) {
      console.error('Failed to load shifts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const addGeneralShiftPreset = async () => {
    try {
      const res = await api.post('/shifts', {
        name: 'General Shift',
        startTime: '09:00',
        endTime: '18:00',
        graceMinutes: 15,
      });
      setShifts((prev) => [...prev, res.data.data]);
      notify("Preset 'General Shift' added!");
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const addMorningShiftPreset = async () => {
    try {
      const res = await api.post('/shifts', {
        name: 'Morning Shift',
        startTime: '06:00',
        endTime: '14:00',
        graceMinutes: 10,
      });
      setShifts((prev) => [...prev, res.data.data]);
      notify("Preset 'Morning Shift' added!");
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const addNightShiftPreset = async () => {
    try {
      const res = await api.post('/shifts', {
        name: 'Night Shift',
        startTime: '22:00',
        endTime: '06:00',
        graceMinutes: 20,
      });
      setShifts((prev) => [...prev, res.data.data]);
      notify("Preset 'Night Shift' added!");
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        graceMinutes: Number(formData.graceMinutes),
      };

      if (editingShift) {
        const res = await api.put(`/shifts/${editingShift.id}`, payload);
        setShifts((prev) =>
          prev.map((s) => (s.id === editingShift.id ? res.data.data : s))
        );
        notify(`Shift '${formData.name}' updated!`);
      } else {
        const res = await api.post('/shifts', payload);
        setShifts((prev) => [...prev, res.data.data]);
        notify(`Shift '${formData.name}' created!`);
      }
      setShowModal(false);
      setEditingShift(null);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleDeleteShift = async (id: string, name: string) => {
    if (!confirm(`Delete shift '${name}'?`)) return;
    try {
      await api.delete(`/shifts/${id}`);
      setShifts((prev) => prev.filter((s) => s.id !== id));
      notify(`Shift '${name}' deleted.`);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleOpenAssign = (shift: Shift) => {
    setAssigningShift(shift);
    const currentlyAssigned = employees
      .filter((e) => e.shiftId === shift.id)
      .map((e) => e.id);
    setSelectedEmployees(currentlyAssigned);
  };

  const handleSaveAssignment = async () => {
    if (!assigningShift) return;
    try {
      await api.post(`/shifts/${assigningShift.id}/assign`, {
        employeeIds: selectedEmployees,
      });
      notify(`Assigned ${selectedEmployees.length} employee(s) to ${assigningShift.name}!`);
      setAssigningShift(null);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const runSimulation = async () => {
    try {
      const res = await api.post('/shifts/simulate', {
        startTime: simShift.startTime,
        endTime: simShift.endTime,
        graceMinutes: Number(simShift.graceMinutes),
        checkIn: simCheckIn,
        checkOut: simCheckOut,
      });
      if (res.data?.metrics) {
        setSimResult(res.data.metrics);
      }
    } catch (err: unknown) {
      console.error('Simulation failed', err);
    }
  };

  const totalAssignedStaff = shifts.reduce((sum, s) => sum + (s._count?.employees || 0), 0);

  return (
    <ProtectedRoute requiredPermission="manage:shifts">
      <div className="space-y-6 select-none">
        {/* Top Hero Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Work Shifts & Policy Engine
            </h1>
            <p className="mt-1 text-xs text-slate-600 font-medium">
              Configure shift hours, grace periods, overnight roster rules, and staff assignments.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingShift(null);
              setFormData({ name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15 });
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all relative z-10"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Shift</span>
          </button>
        </div>

        {feedback && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 KPI Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#7c3aed]">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Active Shifts</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{shifts.length}</div>
              <div className="mt-1 text-xs font-semibold text-indigo-600">Defined timing policies</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q30,5 60,18 T100,6 L100,25 L0,25 Z" fill="#c4b5fd" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#16a34a]">
                <Timer className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Standard Grace</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">15 mins</div>
              <div className="mt-1 text-xs font-semibold text-emerald-600">Late punch grace limit</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q35,8 65,16 T100,5 L100,25 L0,25 Z" fill="#86efac" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e0f2fe] text-[#0284c7]">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Staff Assigned</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{totalAssignedStaff}</div>
              <div className="mt-1 text-xs font-semibold text-sky-600">On active roster shifts</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q40,6 70,18 T100,8 L100,25 L0,25 Z" fill="#7dd3fc" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Coverage Model</span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">24/7 Enabled</div>
              <div className="mt-1 text-xs font-semibold text-amber-600">Overnight cross-day sync</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q30,10 60,18 T100,5 L100,25 L0,25 Z" fill="#fdba74" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Quick-Add Shift Presets:</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={addGeneralShiftPreset}
              className="flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>General Shift (09:00 - 18:00)</span>
            </button>
            <button
              onClick={addMorningShiftPreset}
              className="flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Sunrise className="h-3.5 w-3.5 text-blue-500" />
              <span>Morning Shift (06:00 - 14:00)</span>
            </button>
            <button
              onClick={addNightShiftPreset}
              className="flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Moon className="h-3.5 w-3.5 text-purple-500" />
              <span>Night Shift (22:00 - 06:00)</span>
            </button>
          </div>
        </div>

        {/* Configured Shifts Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 px-1">
            Active Shifts ({shifts.length})
          </h2>

          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400 font-medium">
              No shifts configured yet. Use the presets above to quickly add standard shifts.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {shifts.map((shift) => {
                const isOvernight = shift.startTime > shift.endTime;

                return (
                  <div
                    key={shift.id}
                    className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 space-y-4 shadow-sm hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-900">{shift.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs font-bold text-indigo-600">
                            {shift.startTime} - {shift.endTime}
                          </span>
                          {isOvernight && (
                            <span className="text-[10px] rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-purple-700 font-bold">
                              Overnight
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingShift(shift);
                            setFormData({
                              name: shift.name,
                              startTime: shift.startTime,
                              endTime: shift.endTime,
                              graceMinutes: shift.graceMinutes,
                            });
                            setShowModal(true);
                          }}
                          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shadow-2xs"
                          title="Edit Shift"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift.id, shift.name)}
                          className="rounded-xl p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 shadow-2xs"
                          title="Delete Shift"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                      <div className="rounded-2xl bg-slate-50/60 p-3 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Grace Window</span>
                        <span className="block font-bold text-emerald-600 text-xs mt-0.5">{shift.graceMinutes} mins</span>
                      </div>
                      <div className="rounded-2xl bg-slate-50/60 p-3 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Duration</span>
                        <span className="block font-bold text-slate-800 text-xs mt-0.5">{shift.durationHours || '8.0'} hrs</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenAssign(shift)}
                      className="flex items-center justify-center gap-2 w-full rounded-2xl bg-white border border-slate-200 py-2.5 text-xs font-bold text-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-2xs"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        Assign Staff ({shift._count?.employees || 0} assigned)
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Attendance Rule & Overtime Simulator */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 space-y-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
              <Play className="h-3.5 w-3.5" />
              <span>Calculation Engine Preview</span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-1">
              Live Attendance Rule & Overtime Simulator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate clock-in & clock-out times against shift rules to verify how late minutes and overtime are computed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shift Start</label>
              <input
                type="text"
                value={simShift.startTime}
                onChange={(e) => setSimShift({ ...simShift, startTime: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shift End</label>
              <input
                type="text"
                value={simShift.endTime}
                onChange={(e) => setSimShift({ ...simShift, endTime: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Grace (mins)</label>
              <input
                type="number"
                value={simShift.graceMinutes}
                onChange={(e) => setSimShift({ ...simShift, graceMinutes: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Actual Clock-In</label>
              <input
                type="text"
                value={simCheckIn}
                onChange={(e) => setSimCheckIn(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Actual Clock-Out</label>
              <input
                type="text"
                value={simCheckOut}
                onChange={(e) => setSimCheckOut(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              onClick={runSimulation}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Calculate Metrics</span>
            </button>

            {simResult && (
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span
                    className={`font-bold rounded-full px-2.5 py-0.5 border text-[10px] ${
                      simResult.status === 'PRESENT'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {simResult.status} {simResult.lateArrivalWaived && '• 8h Completed (Late Waived)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Late:</span>
                  <span className={`font-bold ${simResult.lateArrivalWaived ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {simResult.lateMinutes} mins {simResult.lateArrivalWaived && '(Waived)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Worked:</span>
                  <span className="font-bold text-slate-900">{simResult.workingHours} hrs</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Overtime:</span>
                  <span className="font-bold text-emerald-600">{simResult.overtimeHours} hrs</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create / Edit Shift */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">
                  {editingShift ? 'Edit Shift' : 'Create Shift'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveShift} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. General Shift"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Start Time (HH:mm) *</label>
                    <input
                      type="text"
                      required
                      placeholder="09:00"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">End Time (HH:mm) *</label>
                    <input
                      type="text"
                      required
                      placeholder="18:00"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={formData.graceMinutes}
                    onChange={(e) => setFormData({ ...formData, graceMinutes: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Arrivals within this window are marked on-time with 0 late minutes.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg"
                  >
                    {editingShift ? 'Save Changes' : 'Create Shift'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Assign Shift to Employees */}
        {assigningShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Staff to {assigningShift.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select the employees who should be scheduled to this shift.
                  </p>
                </div>
                <button
                  onClick={() => setAssigningShift(null)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {employees.map((emp) => {
                  const isChecked = selectedEmployees.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/60'
                          : 'border-slate-100 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmployees([...selectedEmployees, emp.id]);
                            } else {
                              setSelectedEmployees(selectedEmployees.filter((id) => id !== emp.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {emp.firstName} {emp.lastName || ''}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningShift(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignment}
                  className="rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg"
                >
                  Save Assignments
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
