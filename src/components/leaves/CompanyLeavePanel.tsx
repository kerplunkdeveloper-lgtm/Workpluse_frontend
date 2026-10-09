"use client";

import React, { useEffect, useState } from "react";
import { branchesApi, companyLeavesApi } from "@/lib/api";
import { formatCycleDate } from "@/lib/payrollCycle";
import { unwrapList } from "@/lib/utils";
import { CalendarOff, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

type CompanyLeave = {
  id: string;
  title: string;
  reason?: string | null;
  startDate: string;
  endDate: string;
  isPaid: boolean;
  branchId?: string | null;
  branch?: { name: string } | null;
};

const parseDay = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const spanDays = (start: string, end: string) =>
  start && end ? Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / 86400000) + 1 : 0;

const formatRange = (start: string, end: string) =>
  start.slice(0, 10) === end.slice(0, 10)
    ? formatCycleDate(parseDay(start))
    : `${formatCycleDate(parseDay(start))} to ${formatCycleDate(parseDay(end))}`;

export default function CompanyLeavePanel({ canManage }: { canManage: boolean }) {
  const [leaves, setLeaves] = useState<CompanyLeave[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await companyLeavesApi.list();
      setLeaves(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not load company leave");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      if (canManage) {
        try {
          setBranches(unwrapList(await branchesApi.list()));
        } catch {
          // Branch scope is optional; the form still works for all employees.
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const days = spanDays(startDate, endDate || startDate);
  const scopeLabel = branchId ? branches.find((b) => b.id === branchId)?.name || "one branch" : "all employees";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Give the company leave a title");
    if (!startDate) return toast.error("Pick the start date");
    const end = endDate || startDate;
    if (end < startDate) return toast.error("End date cannot be before the start date");
    if (
      !window.confirm(
        `Mark ${days} day(s) as ${isPaid ? "PAID" : "UNPAID"} company leave for ${scopeLabel}?` +
          (isPaid ? "" : "\nEach day will be deducted as loss of pay unless the employee punched in."),
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await companyLeavesApi.create({
        title: title.trim(),
        reason: reason.trim() || undefined,
        startDate,
        endDate: end,
        isPaid,
        branchId: branchId || undefined,
        notify,
      });
      if (res?.success) {
        toast.success(res.message || "Company leave saved");
        setTitle("");
        setReason("");
        setStartDate("");
        setEndDate("");
        setIsPaid(false);
        setBranchId("");
        await load();
      } else {
        toast.error(res?.message || "Could not save company leave");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not save company leave");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (leave: CompanyLeave) => {
    if (!window.confirm(`Remove "${leave.title}" (${formatRange(leave.startDate, leave.endDate)})?`)) return;
    setBusyId(leave.id);
    try {
      const res = await companyLeavesApi.remove(leave.id);
      if (res?.success) {
        toast.success("Company leave removed");
        await load();
      } else toast.error(res?.message || "Could not remove company leave");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not remove company leave");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
        Loading company leave…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {canManage && (
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-indigo-600" />
              Mark company leave
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              One entry covers every employee in scope. No one has to apply individually.
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 uppercase">Title *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Office shutdown, power maintenance"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600 uppercase">From *</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600 uppercase">To</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-600 uppercase">Pay</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: "Unpaid", hint: "Loss of pay for each day" },
                { value: true, label: "Paid", hint: "No salary deduction" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setIsPaid(option.value)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    isPaid === option.value
                      ? option.value
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-rose-400 bg-rose-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                  <span className="block text-[11px] text-slate-500">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 uppercase">Applies to</span>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="">All employees</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  Only {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 uppercase">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Shown to employees in the notification"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-indigo-600" />
            Notify employees in the app
          </label>

          {startDate && (
            <p className={`text-xs rounded-xl border px-3 py-2 ${isPaid ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
              {days} day(s) of {isPaid ? "paid" : "unpaid"} leave for {scopeLabel}.{" "}
              {isPaid
                ? "Payroll counts these days as paid leave."
                : "Payroll deducts each day at the daily rate, except for employees who punched in."}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Submit for {scopeLabel}
          </button>
        </form>
      )}

      <div className={`${canManage ? "lg:col-span-3" : "lg:col-span-5"} bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs`}>
        <div className="px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">Company leave</div>
        {leaves.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No company leave has been marked.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {leaves.map((leave) => (
              <li key={leave.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{leave.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatRange(leave.startDate, leave.endDate)} · {spanDays(leave.startDate, leave.endDate)} day(s) ·{" "}
                    {leave.branch?.name ? `Only ${leave.branch.name}` : "All employees"}
                  </p>
                  {leave.reason && <p className="text-xs text-slate-400 mt-0.5">{leave.reason}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      leave.isPaid
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {leave.isPaid ? "PAID" : "UNPAID"}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleRemove(leave)}
                      disabled={busyId === leave.id}
                      title="Remove company leave"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
