"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, HandCoins, Loader2, Plus, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { loansApi, employeesApi } from "@/lib/api";
import { formatCurrency, unwrapList } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

interface LoanRow {
  id: string;
  type: "ADVANCE" | "LOAN";
  amount: number | string;
  monthlyRecovery: number | string;
  outstanding: number | string;
  reason?: string | null;
  reviewNote?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";
  createdAt?: string;
  employee?: { firstName?: string; lastName?: string; employeeCode?: string } | null;
}

const CARD = "rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.18)]";
const INPUT =
  "h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 transition hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const STATUS: Record<LoanRow["status"], { label: string; tone: string }> = {
  PENDING: { label: "Pending review", tone: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  APPROVED: { label: "Active", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  REJECTED: { label: "Rejected", tone: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  CLOSED: { label: "Fully repaid", tone: "bg-slate-100 text-slate-600 ring-slate-500/15" },
};

const money = (value: number | string | null | undefined) => formatCurrency(Number(value || 0));
const errorOf = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

export default function LoansView() {
  const { role } = useAuth();
  const isReviewer = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [reviewing, setReviewing] = useState<LoanRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(unwrapList<LoanRow>(await loansApi.list()));
      if (isReviewer) setEmployees(unwrapList(await employeesApi.list({ page: 1, limit: 500, status: "WORKING" })));
    } catch (err) {
      setError(errorOf(err, "Could not load loans and advances."));
    } finally {
      setLoading(false);
    }
  }, [isReviewer]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.status === "APPROVED");
    return {
      pending: rows.filter((r) => r.status === "PENDING").length,
      outstanding: active.reduce((sum, r) => sum + Number(r.outstanding || 0), 0),
      monthly: active.reduce((sum, r) => sum + Math.min(Number(r.monthlyRecovery || 0), Number(r.outstanding || 0)), 0),
    };
  }, [rows]);

  const reject = async (row: LoanRow) => {
    try {
      const res = await loansApi.review(row.id, { status: "REJECTED" });
      if (!res?.success) throw new Error(res?.message);
      toast.success("Request rejected.");
      void load();
    } catch (err) {
      toast.error(errorOf(err, "Could not reject this request."));
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 pb-10">
      <PageHeader
        icon={Wallet}
        title="Loans & advances"
        description={isReviewer ? "Review requests, set how each one is recovered, and track what is still owed." : "Request a salary advance and see how much is left to repay."}
        actions={
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> New request
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Loan summary">
        <Tile icon={Clock3} label="Awaiting review" value={String(totals.pending)} />
        <Tile icon={HandCoins} label="Outstanding" value={money(totals.outstanding)} />
        <Tile icon={Wallet} label="Recovered next payroll" value={money(totals.monthly)} />
      </section>

      {formOpen && (
        <RequestForm
          isReviewer={isReviewer}
          employees={employees}
          onDone={() => {
            setFormOpen(false);
            void load();
          }}
        />
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button>
        </div>
      )}

      <section className={`${CARD} overflow-hidden`} aria-label="Loans and advances">
        {loading ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton-shimmer h-16 rounded-xl" />)}
          </div>
        ) : rows.length === 0 && !error ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Wallet className="h-6 w-6" /></span>
            <p className="mt-4 text-sm font-semibold text-slate-900">No loans or advances yet</p>
            <p className="mt-1 text-sm text-slate-500">Use New request to ask for a salary advance.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <LoanItem key={row.id} row={row} canReview={isReviewer} onApprove={() => setReviewing(row)} onReject={() => void reject(row)} />
            ))}
          </ul>
        )}
      </section>

      {reviewing && (
        <ApproveDialog
          row={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2 text-slate-400"><Icon className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function LoanItem({ row, canReview, onApprove, onReject }: { row: LoanRow; canReview: boolean; onApprove: () => void; onReject: () => void }) {
  const amount = Number(row.amount || 0);
  const outstanding = Number(row.outstanding || 0);
  const repaidPercent = amount > 0 ? Math.min(100, Math.round(((amount - outstanding) / amount) * 100)) : 0;
  const name = row.employee ? `${row.employee.firstName || ""} ${row.employee.lastName || ""}`.trim() : "";
  const status = STATUS[row.status] ?? STATUS.PENDING;
  const monthly = Number(row.monthlyRecovery || 0);

  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {canReview && name && <p className="truncate text-sm font-semibold text-slate-900">{name}</p>}
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{row.type === "LOAN" ? "Loan" : "Advance"}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${status.tone}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-950">{money(amount)}</p>
        {row.reason && <p className="mt-0.5 truncate text-xs text-slate-500" title={row.reason}>{row.reason}</p>}
        {row.reviewNote && row.status === "REJECTED" && <p className="mt-0.5 text-xs text-rose-700">Note: {row.reviewNote}</p>}
      </div>

      <div className="min-w-0">
        {row.status === "APPROVED" || row.status === "CLOSED" ? (
          <>
            <div className="flex items-baseline justify-between text-xs text-slate-500">
              <span>{money(outstanding)} left</span>
              <span className="tabular-nums">{repaidPercent}% repaid</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={repaidPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Repayment progress">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${repaidPercent}%` }} />
            </div>
            {monthly > 0 && row.status === "APPROVED" && <p className="mt-1.5 text-xs text-slate-500">{money(monthly)} deducted each payroll</p>}
          </>
        ) : (
          <p className="text-xs text-slate-500">
            {monthly > 0 ? `Requested recovery: ${money(monthly)} per month` : "No monthly recovery requested yet"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        {canReview && row.status === "PENDING" && (
          <>
            <button type="button" onClick={onReject} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50">
              <X className="h-4 w-4" /> Reject
            </button>
            <button type="button" onClick={onApprove} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
              <Check className="h-4 w-4" /> Approve
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function RequestForm({ isReviewer, employees, onDone }: { isReviewer: boolean; employees: any[]; onDone: () => void }) {
  const [form, setForm] = useState({ employeeId: "", type: "ADVANCE", amount: "", monthlyRecovery: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const amount = Number(form.amount);
  const recovery = Number(form.monthlyRecovery);
  const months = amount > 0 && recovery > 0 ? Math.ceil(amount / recovery) : null;
  const recoveryTooHigh = recovery > 0 && amount > 0 && recovery > amount;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(amount > 0)) return toast.error("Enter the amount you need.");
    if (recoveryTooHigh) return toast.error("Monthly recovery cannot be more than the amount.");
    setSaving(true);
    try {
      const res = await loansApi.apply({
        type: form.type,
        amount,
        monthlyRecovery: recovery || 0,
        reason: form.reason.trim() || undefined,
        employeeId: isReviewer ? form.employeeId || undefined : undefined,
      });
      if (!res?.success) throw new Error(res?.message);
      toast.success("Request submitted.");
      onDone();
    } catch (err) {
      toast.error(errorOf(err, "Could not submit the request."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${CARD} space-y-4 p-5 sm:p-6`} aria-label="New loan or advance request">
      <h2 className="text-sm font-semibold text-slate-900">New request</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isReviewer && (
          <Field label="For" hint="Leave blank to request for yourself">
            <Select value={form.employeeId} onChange={set("employeeId")} className={INPUT}>
              <option value="">Myself</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Type">
          <Select value={form.type} onChange={set("type")} className={INPUT}>
            <option value="ADVANCE">Salary advance</option>
            <option value="LOAN">Loan</option>
          </Select>
        </Field>
        <Field label="Amount (₹)">
          <input type="number" min={1} inputMode="decimal" required value={form.amount} onChange={set("amount")} placeholder="e.g. 10000" className={INPUT} />
        </Field>
        <Field label="Repay per month (₹)" hint={months ? `About ${months} month${months === 1 ? "" : "s"} to repay` : "Deducted from each payroll"} error={recoveryTooHigh ? "More than the amount" : undefined}>
          <input type="number" min={1} inputMode="decimal" value={form.monthlyRecovery} onChange={set("monthlyRecovery")} placeholder="e.g. 2000" className={INPUT} />
        </Field>
      </div>
      <Field label="Reason (optional)">
        <input value={form.reason} onChange={set("reason")} maxLength={300} placeholder="What is it for?" className={INPUT} />
      </Field>
      <div className="flex justify-end">
        <button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit request
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {(error || hint) && <span className={`block text-[11px] ${error ? "font-medium text-rose-600" : "text-slate-400"}`}>{error || hint}</span>}
    </label>
  );
}

/** Approving needs a recovery amount: a loan with none is never deducted from payroll. */
function ApproveDialog({ row, onClose, onDone }: { row: LoanRow; onClose: () => void; onDone: () => void }) {
  const amount = Number(row.amount || 0);
  const [recovery, setRecovery] = useState(String(Number(row.monthlyRecovery) > 0 ? Number(row.monthlyRecovery) : ""));
  const [saving, setSaving] = useState(false);
  const value = Number(recovery);
  const invalid = !(value > 0) || value > amount;
  const months = !invalid ? Math.ceil(amount / value) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const approve = async () => {
    setSaving(true);
    try {
      const res = await loansApi.review(row.id, { status: "APPROVED", monthlyRecovery: value });
      if (!res?.success) throw new Error(res?.message);
      toast.success("Approved. The amount will be deducted from payroll.");
      onDone();
    } catch (err) {
      toast.error(errorOf(err, "Could not approve this request."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal z={60} onClose={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="approve-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id="approve-title" className="text-base font-semibold text-slate-950">Approve {money(amount)}</h2>
        <p className="mt-1 text-sm text-slate-500">Choose how much is deducted from each payroll until it is repaid.</p>
        <label className="mt-5 block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Deduct per month (₹)</span>
          <input autoFocus type="number" min={1} max={amount} value={recovery} onChange={(e) => setRecovery(e.target.value)} className={INPUT} />
          <span className={`block text-[11px] ${recovery && invalid ? "font-medium text-rose-600" : "text-slate-400"}`}>
            {recovery && invalid ? `Enter an amount between 1 and ${amount}` : months ? `Repaid in about ${months} month${months === 1 ? "" : "s"}` : "Required"}
          </span>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={invalid || saving} onClick={approve} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Approve
          </button>
        </div>
      </div>
    </Modal>
  );
}
