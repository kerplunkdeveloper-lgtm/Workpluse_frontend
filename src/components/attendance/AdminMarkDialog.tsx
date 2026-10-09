"use client";

import React, { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { attendanceApi } from "@/lib/api";
import type { AttendanceStatus } from "@/types";
import DatePicker from "@/components/ui/DatePicker";
import TimeSelect from "@/components/ui/TimeSelect";
import EmployeeCombobox, { type EmployeeOption } from "./EmployeeCombobox";
import { localDateKey } from "./attendanceUtils";

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half day" },
  { value: "WORK_FROM_HOME", label: "Work from home" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "ABSENT", label: "Absent" },
];

const NO_TIMES: AttendanceStatus[] = ["ON_LEAVE", "ABSENT"];

/**
 * The time pickers give wall-clock "HH:mm". Build the instant in the admin's
 * local time — appending "Z" (as before) stored 09:00 as 09:00 UTC, i.e. 2:30 PM IST.
 */
const toInstant = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

export interface AdminMarkInitial {
  employee?: EmployeeOption | null;
  date?: string;
  status?: AttendanceStatus;
  inTime?: string;
  outTime?: string;
}

export default function AdminMarkDialog({ open, initial, onClose, onSaved }: { open: boolean; initial?: AdminMarkInitial; onClose: () => void; onSaved: () => void }) {
  if (!open) return null;
  return <AdminMarkForm initial={initial} onClose={onClose} onSaved={onSaved} />;
}

function AdminMarkForm({ initial, onClose, onSaved }: { initial?: AdminMarkInitial; onClose: () => void; onSaved: () => void }) {
  const [employee, setEmployee] = useState<EmployeeOption | null>(initial?.employee || null);
  const [date, setDate] = useState(() => initial?.date || localDateKey(new Date()));
  const [status, setStatus] = useState<AttendanceStatus>(initial?.status || "PRESENT");
  const [inTime, setInTime] = useState(initial?.inTime || "09:30");
  const [outTime, setOutTime] = useState(initial?.outTime || "18:30");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsTimes = !NO_TIMES.includes(status);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!employee) return setError("Choose the employee you're marking attendance for.");
    if (needsTimes && outTime <= inTime) return setError("Punch out must be after punch in.");
    if (reason.trim().length < 3) return setError("Add a short reason so the change is clear in the audit log.");

    setSaving(true);
    try {
      const res = await attendanceApi.adminMarkAttendance({
        employeeId: employee.id,
        date,
        status,
        ...(needsTimes ? { checkIn: toInstant(date, inTime), checkOut: toInstant(date, outTime) } : {}),
        reason: reason.trim(),
      });
      if (res?.success === false) throw new Error(res?.message);
      toast.success(`Attendance saved for ${employee.name}`);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Couldn't save the attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-mark-title"
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="admin-mark-title" className="text-base font-semibold text-slate-900">{initial?.employee ? "Correct attendance" : "Mark attendance"}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Add or correct a day for an employee. This skips location rules and is recorded in the audit log.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Employee</label>
            <EmployeeCombobox value={employee} onChange={setEmployee} placeholder="Search by name or code" allowClear={false} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Date</label>
              <DatePicker value={date} onChange={setDate} placeholder="Select date" required />
            </div>
            <div>
              <label htmlFor="admin-mark-status" className="mb-1.5 block text-xs font-medium text-slate-700">Status</label>
              <select id="admin-mark-status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)} className={field}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {needsTimes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Punch in</label>
                <TimeSelect value={inTime} onChange={setInTime} defaultPeriod="AM" ariaLabel="Punch in time" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Punch out</label>
                <TimeSelect value={outTime} onChange={setOutTime} defaultPeriod="PM" ariaLabel="Punch out time" />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="admin-mark-reason" className="mb-1.5 block text-xs font-medium text-slate-700">Reason</label>
            <input id="admin-mark-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Forgot to punch, confirmed by manager" maxLength={200} className={field} />
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={saving} className="keep-white inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-500 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save attendance
          </button>
        </div>
      </form>
    </div>
  );
}
