"use client";

import React, { useState, useEffect } from "react";
import { Employee, Shift } from "@/types";
import { employeesApi, shiftsApi, shiftOverridesApi } from "@/lib/api";
import { formatDate, unwrapList } from "@/lib/utils";
import {
  CalendarRange,
  Clock,
  Plus,
  Users,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function ShiftsAndRostersView() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignShift, setAssignShift] = useState<Shift | null>(null);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [ovEmp, setOvEmp] = useState("");
  const [ovDate, setOvDate] = useState("");
  const [ovShift, setOvShift] = useState("");
  const [ovReason, setOvReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  // Create Shift Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [workingDays, setWorkingDays] = useState("1,2,3,4,5,6"); // Monday to Saturday
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const [shiftRes, empRes, ovRes] = await Promise.allSettled([
        shiftsApi.list(),
        employeesApi.list(),
        shiftOverridesApi.list(),
      ]);
      if (shiftRes.status === "fulfilled") setShifts(unwrapList<Shift>(shiftRes.value));
      if (empRes.status === "fulfilled") {
        setEmployees(unwrapList<Employee>(empRes.value).filter((e) => !e.status || e.status === "ACTIVE"));
      }
      if (ovRes.status === "fulfilled") {
        const raw = ovRes.value;
        setOverrides(unwrapList(raw).length ? unwrapList(raw) : raw?.overrides || []);
      }
    } catch (err: any) {
      console.error("Failed to load shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await shiftsApi.create({
        name,
        startTime,
        endTime,
        graceMinutes: Number(graceMinutes),
        workingDays,
      });

      if (res?.success) {
        toast.success("Shift schedule configured successfully!");
        setModalOpen(false);
        setName("");
        loadShifts();
      } else {
        toast.error(res?.message || "Failed to create shift");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to create shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignShift || selectedEmpIds.length === 0) {
      toast.error("Select at least one employee");
      return;
    }
    setAssigning(true);
    try {
      const res = await shiftsApi.assign(assignShift.id, selectedEmpIds);
      if (res?.success) {
        toast.success(res.message || "Employees assigned");
        setAssignShift(null);
        setSelectedEmpIds([]);
        loadShifts();
      } else toast.error(res?.message || "Assign failed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Assign failed");
    } finally {
      setAssigning(false);
    }
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ovEmp || !ovDate || !ovShift) {
      toast.error("Employee, date and shift are required");
      return;
    }
    setSavingOverride(true);
    try {
      const res = await shiftOverridesApi.set({
        employeeId: ovEmp,
        date: ovDate,
        shiftId: ovShift,
        reason: ovReason,
      });
      if (res?.success) {
        toast.success(res.message || "Override saved");
        setOvReason("");
        loadShifts();
      } else toast.error(res?.message || "Override failed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Override failed");
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (employeeId: string, date: string) => {
    try {
      const day = typeof date === "string" ? date.slice(0, 10) : date;
      const res = await shiftOverridesApi.remove(employeeId, day);
      if (res?.success !== false) {
        toast.success("Override removed");
        loadShifts();
      } else toast.error(res?.message || "Remove failed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Remove failed");
    }
  };

  const daysLabelMap: { [k: string]: string } = {
    "1": "Mon",
    "2": "Tue",
    "3": "Wed",
    "4": "Thu",
    "5": "Fri",
    "6": "Sat",
    "0": "Sun",
  };

  const parseWorkingDays = (daysStr: string) => {
    if (!daysStr) return "Mon - Sat";
    return daysStr
      .split(",")
      .map((d) => daysLabelMap[d.trim()] || d)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarRange className="w-7 h-7 text-indigo-600" />
            Shift Management & Rosters
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Define work hours, grace arrival periods, 6-day week schedules, and automated overtime rules
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Create Shift Schedule
        </button>
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
            Loading shift rosters...
          </div>
        ) : shifts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            No shift rosters configured yet.
          </div>
        ) : (
          shifts.map((s) => (
            <div
              key={s.id}
              className="rounded-3xl p-6 border border-slate-200 bg-white shadow-sm flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <Clock className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Active Roster
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">{s.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Working Days: <span className="text-slate-800 font-medium">{parseWorkingDays(s.workingDays)}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timings:</span>
                    <span className="font-bold text-slate-900">
                      {s.startTime} - {s.endTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Grace Arrival:</span>
                    <span className="font-semibold text-amber-700">
                      {s.graceMinutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monthly Standard:</span>
                    <span className="font-semibold text-emerald-700">26 Days Standard</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {(s as any)._count?.employees ?? (s as any).employeeCount ?? 0} assigned
                </span>
                <button
                  onClick={() => {
                    setAssignShift(s);
                    setSelectedEmpIds([]);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Assign people
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Day shift overrides</h2>
        <form onSubmit={handleOverride} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <select
            value={ovEmp}
            onChange={(e) => setOvEmp(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          >
            <option value="">Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} ({e.employeeCode})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={ovDate}
            onChange={(e) => setOvDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <select
            value={ovShift}
            onChange={(e) => setOvShift(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          >
            <option value="">Shift</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            value={ovReason}
            onChange={(e) => setOvReason(e.target.value)}
            placeholder="Reason"
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <button
            type="submit"
            disabled={savingOverride}
            className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            {savingOverride ? "Saving…" : "Set override"}
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Employee</th>
                <th className="py-2 text-left">Shift</th>
                <th className="py-2 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overrides.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-slate-500">No day overrides yet.</td>
                </tr>
              ) : (
                overrides.map((o) => (
                  <tr key={o.id || `${o.employeeId}-${o.date}`}>
                    <td className="py-2">{formatDate(o.date)}</td>
                    <td className="py-2">
                      {o.employee ? `${o.employee.firstName} ${o.employee.lastName || ""}` : o.employeeId}
                    </td>
                    <td className="py-2">{o.shift?.name || o.shiftId}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDeleteOverride(o.employeeId, o.date)}
                        className="text-rose-600 font-semibold"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {assignShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold">Assign to {assignShift.name}</h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {employees.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-[13px] py-1">
                  <input
                    type="checkbox"
                    checked={selectedEmpIds.includes(e.id)}
                    onChange={(ev) =>
                      setSelectedEmpIds((prev) =>
                        ev.target.checked ? [...prev, e.id] : prev.filter((id) => id !== e.id)
                      )
                    }
                  />
                  {e.firstName} {e.lastName} ({e.employeeCode})
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAssignShift(null)} className="px-3 py-2 text-xs">
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                {assigning ? "Saving…" : `Assign ${selectedEmpIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Create Shift Schedule</h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure shift working hours, grace period, and working days bitmask
            </p>

            <form onSubmit={handleCreateShift} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Shift Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. General Morning Shift, Night Shift, Weekend Roster"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">
                    Grace Minutes *
                  </label>
                  <input
                    type="number"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(Number(e.target.value))}
                    min={0}
                    max={60}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">
                    Working Days Bitmask
                  </label>
                  <input
                    type="text"
                    value={workingDays}
                    onChange={(e) => setWorkingDays(e.target.value)}
                    placeholder="1,2,3,4,5,6 (Mon-Sat)"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
