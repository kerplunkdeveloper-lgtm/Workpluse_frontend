"use client";

import React, { useState, useEffect } from "react";
import { Employee, Shift } from "@/types";
import { employeesApi, shiftsApi, shiftOverridesApi } from "@/lib/api";
import { formatDate, unwrapList } from "@/lib/utils";
import { formatHm, shiftLengthMinutes } from "@/components/attendance/attendanceUtils";
import { CalendarRange, Clock, Plus, Loader2, Pencil, Search, Users, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

export default function ShiftsAndRostersView() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignShift, setAssignShift] = useState<Shift | null>(null);
  const [assignedPeopleShift, setAssignedPeopleShift] = useState<Shift | null>(null);
  const [assignedPeople, setAssignedPeople] = useState<Employee[]>([]);
  const [assignedPeopleLoading, setAssignedPeopleLoading] = useState(false);
  const [assignedPeopleSearch, setAssignedPeopleSearch] = useState("");
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [ovEmp, setOvEmp] = useState("");
  const [ovDate, setOvDate] = useState("");
  const [ovShift, setOvShift] = useState("");
  const [ovReason, setOvReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  // Create Shift Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [breakMinutes, setBreakMinutes] = useState(15);
  const [lunchMinutes, setLunchMinutes] = useState(40);
  const [breakIncluded, setBreakIncluded] = useState(true);
  const [lunchIncluded, setLunchIncluded] = useState(true);
  const [workingDays, setWorkingDays] = useState("1,2,3,4,5,6"); // Monday to Saturday
  const [flexiblePunching, setFlexiblePunching] = useState(false);
  const [workingHours, setWorkingHours] = useState(9);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const [shiftRes, empRes, ovRes] = await Promise.allSettled([
        shiftsApi.list({ fresh: true }),
        employeesApi.list({ page: 1, limit: 500, status: "WORKING" }),
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
      const payload = {
        name,
        startTime,
        endTime,
        graceMinutes: Number(graceMinutes),
        breakMinutes: Number(breakMinutes),
        lunchMinutes: Number(lunchMinutes),
        breakIncluded,
        lunchIncluded,
        workingDays,
        flexiblePunching,
        totalWorkingMinutes: flexiblePunching ? Math.round(Number(workingHours) * 60) : undefined,
      };
      const res = editingShift
        ? await shiftsApi.update(editingShift.id, payload)
        : await shiftsApi.create(payload);

      if (res?.success) {
        toast.success(editingShift ? "Shift schedule updated successfully!" : "Shift schedule configured successfully!");
        setModalOpen(false);
        setEditingShift(null);
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

  const openEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setName(shift.name || "");
    setStartTime(shift.startTime || "09:00");
    setEndTime(shift.endTime || "18:00");
    setGraceMinutes(Number(shift.graceMinutes ?? 15));
    setBreakMinutes(Number(shift.breakMinutes ?? 0));
    setLunchMinutes(Number(shift.lunchMinutes ?? 0));
    setBreakIncluded(shift.breakIncluded !== false);
    setLunchIncluded(shift.lunchIncluded !== false);
    setWorkingDays(shift.workingDays || "1,2,3,4,5,6");
    setFlexiblePunching(shift.flexiblePunching === true);
    setWorkingHours(Number(shift.totalWorkingMinutes || 540) / 60);
    setModalOpen(true);
  };

  const openCreateShift = () => {
    setEditingShift(null);
    setName("");
    setStartTime("09:00");
    setEndTime("18:00");
    setGraceMinutes(15);
    setBreakMinutes(15);
    setLunchMinutes(40);
    setBreakIncluded(true);
    setLunchIncluded(true);
    setWorkingDays("1,2,3,4,5,6");
    setFlexiblePunching(false);
    setWorkingHours(9);
    setModalOpen(true);
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

  const openAssignedPeople = async (shift: Shift) => {
    setAssignedPeopleShift(shift);
    setAssignedPeopleSearch("");
    setAssignedPeople([]);
    setAssignedPeopleLoading(true);
    try {
      const res = await shiftsApi.getById(shift.id);
      setAssignedPeople((res?.data?.employees || res?.employees || []).filter((employee: Employee) => employee.status !== "TERMINATED"));
    } catch (err: any) {
      setAssignedPeopleShift(null);
      toast.error(err.response?.data?.message || err.message || "Could not load assigned people");
    } finally {
      setAssignedPeopleLoading(false);
    }
  };

  const removeAssignedPerson = async (employee: Employee) => {
    if (!assignedPeopleShift) return;
    const name = `${employee.firstName} ${employee.lastName || ""}`.trim();
    if (!window.confirm(`Remove ${name} from ${assignedPeopleShift.name}? Their historical attendance will not change.`)) return;
    try {
      const res = await shiftsApi.removeEmployee(assignedPeopleShift.id, employee.id);
      if (res?.success === false) throw new Error(res.message || "Could not remove employee");
      setAssignedPeople((current) => current.filter((person) => person.id !== employee.id));
      setShifts((current) => current.map((shift) => shift.id === assignedPeopleShift.id ? { ...shift, _count: { ...(shift as any)._count, employees: Math.max(0, Number((shift as any)._count?.employees ?? 0) - 1) } } as Shift : shift));
      toast.success(`${name} removed from ${assignedPeopleShift.name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not remove employee");
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
            Shifts & rosters
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Define work hours, grace arrival periods, 6-day week schedules, and automated overtime rules
          </p>
        </div>

        <button
          onClick={openCreateShift}
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
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Active Roster</span>
                    <button type="button" onClick={() => openEditShift(s)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700" title="Edit shift timing and policy">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">{s.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Working Days: <span className="text-slate-800 font-medium">{parseWorkingDays(s.workingDays)}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  {(() => {
                    const shiftMinutes = shiftLengthMinutes(s.startTime, s.endTime) || 0;
                    const includedBreak = s.breakIncluded === false ? 0 : Number(s.breakMinutes || 0);
                    const includedLunch = s.lunchIncluded === false ? 0 : Number(s.lunchMinutes || 0);
                    const productiveMinutes = Math.max(0, shiftMinutes - includedBreak - includedLunch);
                    return <>
                      <div className="flex justify-between"><span className="text-slate-500">Shift window:</span><span className="font-bold text-slate-900">{formatHm(shiftMinutes)} total</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Included pauses:</span><span className="font-semibold text-indigo-700">{formatHm(includedBreak)} break · {formatHm(includedLunch)} lunch</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Productive target:</span><span className="font-semibold text-emerald-700">{formatHm(productiveMinutes)}</span></div>
                    </>;
                  })()}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timings:</span>
                    <span className="font-bold text-slate-900">
                      {s.flexiblePunching ? "Any time" : `${s.startTime} - ${s.endTime}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Grace Arrival:</span>
                    <span className="font-semibold text-amber-700">
                      {s.flexiblePunching ? "Company rules" : `${s.graceMinutes} minutes`}
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
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => void openAssignedPeople(s)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-700">
                    <Users className="h-3.5 w-3.5" /> View people
                  </button>
                  <button
                    type="button"
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
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Day shift overrides</h2>
        <form onSubmit={handleOverride} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <Select
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
          </Select>
          <input
            type="date"
            value={ovDate}
            onChange={(e) => setOvDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <Select
            value={ovShift}
            onChange={(e) => setOvShift(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          >
            <option value="">Shift</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
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
            <p className="text-xs text-slate-500">Select the employees who should use this shift. Any-time punching is configured only in the shift settings.</p>
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

      {assignedPeopleShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="assigned-people-title">
          <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Roster analysis</p>
                <h3 id="assigned-people-title" className="mt-1 text-lg font-semibold text-slate-900">People assigned to {assignedPeopleShift.name}</h3>
                <p className="mt-1 text-xs text-slate-500">Review the current roster, branch coverage, departments, and punching setup.</p>
              </div>
              <button type="button" onClick={() => setAssignedPeopleShift(null)} aria-label="Close assigned people" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            {assignedPeopleLoading ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Loading assigned people...</div>
            ) : (
              <AssignedPeopleContent people={assignedPeople} search={assignedPeopleSearch} onSearch={setAssignedPeopleSearch} onRemove={removeAssignedPerson} />
            )}
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      {modalOpen && (
        <Modal>
          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">{editingShift ? "Edit Shift Schedule" : "Create Shift Schedule"}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {flexiblePunching ? "Create a flexible attendance shift and assign eligible employees after saving." : "Configure shift working hours, grace period, and working days bitmask"}
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

              <label className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-950">
                <input type="checkbox" className="mt-0.5" checked={flexiblePunching} onChange={(e) => setFlexiblePunching(e.target.checked)} />
                <span><span className="block font-semibold">Allow any-time punching</span><span className="mt-0.5 block text-violet-700">Employees assigned to this shift can punch in or out outside the shift timing. Payroll still uses the company working-hours rules.</span></span>
              </label>

              {flexiblePunching && (
                <label className="block rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950">
                  <span className="block font-semibold">Total working hours (including break & lunch)</span>
                  <input type="number" min={1} max={24} step={0.25} value={workingHours} onChange={(e) => setWorkingHours(Number(e.target.value))} className="mt-3 w-full rounded-xl border border-emerald-200 bg-white p-2.5 text-sm font-semibold text-slate-900" required />
                  <span className="mt-3 grid grid-cols-2 gap-3">
                    <span>
                      <span className="block font-semibold">Break minutes</span>
                      <input type="number" min={0} max={240} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-emerald-200 bg-white p-2.5 text-sm font-semibold text-slate-900" />
                    </span>
                    <span>
                      <span className="block font-semibold">Lunch minutes</span>
                      <input type="number" min={0} max={240} value={lunchMinutes} onChange={(e) => setLunchMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-emerald-200 bg-white p-2.5 text-sm font-semibold text-slate-900" />
                    </span>
                  </span>
                </label>
              )}

              {!flexiblePunching && <>
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
<div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-xs font-semibold text-indigo-900">Included pause allowances</p>
                <p className="mt-1 text-[11px] text-indigo-700">For a 09:00–18:00 shift, included break and lunch time are part of the 9-hour window; productive target is calculated automatically.</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-[11px] font-medium text-slate-700">Break minutes
                    <input type="number" min={0} max={240} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900" />
                  </label>
                  <label className="text-[11px] font-medium text-slate-700">Lunch minutes
                    <input type="number" min={0} max={240} value={lunchMinutes} onChange={(e) => setLunchMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900" />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-700">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={breakIncluded} onChange={(e) => setBreakIncluded(e.target.checked)} /> Break included in shift window</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={lunchIncluded} onChange={(e) => setLunchIncluded(e.target.checked)} /> Lunch included in shift window</label>
                </div>
              </div>
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
              </>}

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
                  {editingShift ? "Update Shift" : "Save Shift"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AssignedPeopleContent({ people, search, onSearch, onRemove }: { people: Employee[]; search: string; onSearch: (value: string) => void; onRemove: (employee: Employee) => void }) {
  const query = search.trim().toLowerCase();
  const filtered = people.filter((employee) => `${employee.firstName} ${employee.lastName} ${employee.employeeCode} ${employee.department?.name || ""} ${employee.branch?.name || ""}`.toLowerCase().includes(query));
  const departments = new Set(people.map((employee) => employee.department?.name).filter(Boolean));
  const branches = new Set(people.map((employee) => employee.branch?.name).filter(Boolean));
  const active = people.filter((employee) => ["ACTIVE", "PROBATION", "NOTICE_PERIOD"].includes(employee.status)).length;
  const flexible = people.filter((employee) => employee.flexiblePunching === true).length;

  return (
    <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Assigned", people.length, "text-indigo-700"],
          ["Active", active, "text-emerald-700"],
          ["Departments", departments.size, "text-violet-700"],
          ["Branches", branches.size, "text-amber-700"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{flexible} people allow any-time punching · {filtered.length} shown</p>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search assigned people</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search name, code, branch..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Punching</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No assigned people match this search.</td></tr> : filtered.map((employee) => (
              <tr key={employee.id} className="hover:bg-indigo-50/40">
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 text-slate-500">{employee.employeeCode}</p></td>
                <td className="px-4 py-3 text-slate-600">{employee.department?.name || "Unassigned"}</td>
                <td className="px-4 py-3 text-slate-600">{employee.branch?.name || "Unassigned"}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{employee.status || "Active"}</span></td>
                <td className="px-4 py-3 text-slate-600">{employee.flexiblePunching ? "Any time" : "Shift hours"}</td>
                <td className="px-4 py-3 text-right"><button type="button" onClick={() => void onRemove(employee)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-rose-600 hover:bg-rose-50" title="Remove from this shift"><Trash2 className="h-3.5 w-3.5" /> Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
