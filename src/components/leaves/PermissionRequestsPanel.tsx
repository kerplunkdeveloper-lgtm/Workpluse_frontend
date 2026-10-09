"use client";

import React, { useEffect, useState } from "react";
import { permissionsApi } from "@/lib/api";
import { formatCycleDate, PERMISSION_HOUR_OPTIONS } from "@/lib/payrollCycle";
import { Clock, Loader2, Send, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

type PermissionRequest = {
  id: string;
  date: string;
  hours: string | number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote?: string | null;
  employee?: { firstName: string; lastName?: string | null; employeeCode: string };
};

type Allowance = {
  cycleStart: string;
  cycleEnd: string;
  allowanceHours: number;
  usedHours: number;
  remainingHours: number;
  excessHours: number;
};

const STATUS_STYLES: Record<PermissionRequest["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const parseDay = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function PermissionRequestsPanel({ canReview }: { canReview: boolean }) {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [queue, setQueue] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("1");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadMine = async () => {
    try {
      const res = await permissionsApi.my();
      setRequests(res?.data?.requests || []);
      setAllowance(res?.data?.allowance || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not load your permissions");
    }
  };

  const loadQueue = async () => {
    if (!canReview) return;
    try {
      const res = await permissionsApi.list({ status: "PENDING" });
      setQueue(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not load the permission queue");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadMine(), loadQueue()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReview]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return toast.error("Pick the date for the permission");
    if (!reason.trim()) return toast.error("Give a reason for the permission");

    setSubmitting(true);
    try {
      const res = await permissionsApi.apply({ date, hours: Number(hours), reason: reason.trim() });
      if (res?.success) {
        toast.success("Permission request submitted");
        setDate("");
        setReason("");
        setHours("1");
        await loadMine();
      } else {
        toast.error(res?.message || "Could not submit the request");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not submit the request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    setBusyId(id);
    try {
      const res = await permissionsApi.cancel(id);
      if (res?.success) {
        toast.success("Request withdrawn");
        await loadMine();
      } else toast.error(res?.message || "Could not withdraw the request");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not withdraw the request");
    } finally {
      setBusyId(null);
    }
  };

  const handleReview = async (request: PermissionRequest, status: "APPROVED" | "REJECTED") => {
    const who = request.employee ? `${request.employee.firstName} ${request.employee.lastName || ""}`.trim() : "this employee";
    if (!window.confirm(`${status === "APPROVED" ? "Approve" : "Reject"} ${Number(request.hours)} hour(s) for ${who} on ${request.date.slice(0, 10)}?`)) {
      return;
    }
    setBusyId(request.id);
    try {
      const res = await permissionsApi.review(request.id, { status });
      if (res?.success) {
        toast.success(res.message || "Request updated");
        await loadQueue();
      } else toast.error(res?.message || "Could not update the request");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not update the request");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
        Loading permissions…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {allowance && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">This payroll cycle</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {formatCycleDate(parseDay(allowance.cycleStart))} to {formatCycleDate(parseDay(allowance.cycleEnd))}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{allowance.allowanceHours}h</p>
                  <p className="text-[11px] text-slate-500">Free allowance</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{allowance.usedHours}h</p>
                  <p className="text-[11px] text-slate-500">Approved</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3">
                  <p className="text-lg font-bold text-indigo-700 tabular-nums">{allowance.remainingHours}h</p>
                  <p className="text-[11px] text-indigo-600">Left</p>
                </div>
              </div>
              {allowance.excessHours > 0 && (
                <p className="mt-3 text-xs text-rose-600">
                  {allowance.excessHours}h beyond the allowance will be deducted at the hourly rate.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleApply} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Request a short permission
              </h3>
              <p className="text-xs text-slate-500 mt-1">For leaving work for a few hours on a working day.</p>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600 uppercase">Date</span>
              <input
                type="date"
                min={todayKey()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600 uppercase">Hours</span>
              <select
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {PERMISSION_HOUR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} {option === 1 ? "hour" : "hours"}
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
                placeholder="e.g. Bank visit, doctor appointment"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit request
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">My permissions</div>
          {requests.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No permission requests yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r) => (
                <li key={r.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {r.date.slice(0, 10)} · {Number(r.hours)}h
                    </p>
                    <p className="text-xs text-slate-500 truncate">{r.reason}</p>
                    {r.reviewNote && <p className="text-xs text-slate-400 mt-0.5">Note: {r.reviewNote}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                    {r.status === "PENDING" && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={busyId === r.id}
                        title="Withdraw request"
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

      {canReview && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">
            Pending permission approvals ({queue.length})
          </div>
          {queue.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Nothing waiting for review.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {queue.map((r) => (
                <li key={r.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {r.employee ? `${r.employee.firstName} ${r.employee.lastName || ""}`.trim() : "Employee"}
                      <span className="ml-2 font-mono text-xs text-indigo-700">{r.employee?.employeeCode}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.date.slice(0, 10)} · {Number(r.hours)}h · {r.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReview(r, "APPROVED")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(r, "REJECTED")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
