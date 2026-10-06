"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarPlus, Check, Loader2, Pause, Play, Repeat } from "lucide-react";
import { toast } from "sonner";
import { platformApi } from "@/lib/api";

type Mode = "EXTEND" | "CHANGE_PLAN" | "SUSPEND" | "REACTIVATE";

interface DialogClient {
  id: string;
  name: string;
  plan: string;
  status: string;
  billingCycle?: string | null;
  employees: number;
  branches: number;
  periodEnd?: string | null;
  suspendReason?: string | null;
}

const PLANS = [
  { key: "STARTER", name: "Starter", people: 25, branches: 2 },
  { key: "PROFESSIONAL", name: "Professional", people: 100, branches: 10 },
  { key: "ENTERPRISE", name: "Enterprise", people: 10000, branches: 100 },
];

const dateText = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-50";

export default function OwnerActionDialog({
  client,
  mode,
  onClose,
  onDone,
}: {
  client: DialogClient;
  mode: Mode;
  onClose: () => void;
  onDone: (updated: any) => void;
}) {
  const isTrial = client.plan === "FREE_TRIAL";
  const [days, setDays] = useState(isTrial ? 14 : 30);
  const [plan, setPlan] = useState(PLANS.find((p) => p.key !== client.plan)?.key || "STARTER");
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">(client.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY");
  const [reason, setReason] = useState("");
  const [typedName, setTypedName] = useState("");
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLElement | null>(null);

  const maxDays = isTrial ? 90 : 365;
  const target = PLANS.find((p) => p.key === plan)!;
  const overSeats = client.employees > target.people;
  const overBranches = client.branches > target.branches;

  const base = client.periodEnd && new Date(client.periodEnd) > new Date() ? new Date(client.periodEnd) : new Date();
  const newEnd = new Date(base.getTime() + (Number.isFinite(days) ? days : 0) * 86400000);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const valid =
    mode === "EXTEND"
      ? Number.isInteger(days) && days >= 1 && days <= maxDays
      : mode === "CHANGE_PLAN"
        ? reason.trim().length >= 5 && !overSeats && !overBranches
        : mode === "SUSPEND"
          ? reason.trim().length >= 5 && typedName.trim().toLowerCase() === client.name.trim().toLowerCase()
          : true;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      const res = await platformApi.act(client.id, {
        action: mode,
        days: mode === "EXTEND" ? days : undefined,
        plan: mode === "CHANGE_PLAN" ? plan : undefined,
        billingCycle: mode === "CHANGE_PLAN" ? cycle : undefined,
        reason: reason.trim() || undefined,
        confirmName: mode === "SUSPEND" ? typedName.trim() : undefined,
      });
      toast.success(
        mode === "EXTEND"
          ? `${client.name} extended by ${days} days`
          : mode === "CHANGE_PLAN"
            ? `${client.name} is now on ${target.name}`
            : mode === "SUSPEND"
              ? `${client.name} suspended`
              : `${client.name} reactivated`,
      );
      onDone(res?.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "That change could not be made.");
    } finally {
      setBusy(false);
    }
  };

  const meta = {
    EXTEND: { title: isTrial ? "Extend trial" : "Extend paid period", icon: CalendarPlus, tone: "indigo", cta: isTrial ? "Extend trial" : "Extend period" },
    CHANGE_PLAN: { title: "Change plan", icon: Repeat, tone: "indigo", cta: "Change plan" },
    SUSPEND: { title: "Suspend workspace", icon: Pause, tone: "rose", cta: "Suspend workspace" },
    REACTIVATE: { title: "Reactivate workspace", icon: Play, tone: "emerald", cta: "Reactivate" },
  }[mode];
  const Icon = meta.icon;
  const toneBtn =
    meta.tone === "rose"
      ? "bg-rose-600 hover:bg-rose-500 focus-visible:outline-rose-600"
      : meta.tone === "emerald"
        ? "bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-600"
        : "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600";

  return (
    <div data-owner-dialog className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start gap-3 px-6 pb-3 pt-6">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.tone === "rose" ? "bg-rose-50 text-rose-600" : meta.tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 id="owner-dialog-title" className="text-base font-bold text-slate-950">
              {meta.title}
            </h2>
            <p className="text-sm text-slate-600">{client.name}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-2">
          {mode === "EXTEND" && (
            <>
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-slate-700">Add how many days?</legend>
                <div className="flex flex-wrap gap-2">
                  {(isTrial ? [7, 14, 30, 60] : [7, 30, 90, 180]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={days === d}
                      onClick={() => setDays(d)}
                      ref={(el) => {
                        if (d === days && !firstRef.current) firstRef.current = el;
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${days === d ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                    >
                      {d} days
                    </button>
                  ))}
                  <label className="sr-only" htmlFor="custom-days">Custom days</label>
                  <input id="custom-days" type="number" min={1} max={maxDays} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold tabular-nums focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-50" />
                </div>
              </fieldset>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {client.periodEnd ? <>Currently ends <strong>{dateText(new Date(client.periodEnd))}</strong>. </> : null}
                New end date: <strong className="text-slate-950">{dateText(newEnd)}</strong>
                {isTrial && client.status !== "TRIALING" ? <p className="mt-1 text-xs text-slate-600">This also reopens the expired trial.</p> : null}
              </div>
              {!valid && <p role="alert" className="text-xs font-medium text-rose-600">Choose between 1 and {maxDays} days.</p>}
            </>
          )}

          {mode === "CHANGE_PLAN" && (
            <>
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-slate-700">New plan</legend>
                <div className="space-y-2">
                  {PLANS.map((p) => {
                    const on = plan === p.key;
                    const tooSmall = client.employees > p.people || client.branches > p.branches;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setPlan(p.key)}
                        ref={(el) => {
                          if (on && !firstRef.current) firstRef.current = el;
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${on ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        <span>
                          <span className="block text-sm font-bold text-slate-950">
                            {p.name}
                            {p.key === client.plan && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Current</span>}
                          </span>
                          <span className={`block text-xs ${tooSmall ? "text-rose-600" : "text-slate-600"}`}>
                            Up to {p.people.toLocaleString("en-IN")} people, {p.branches} branches{tooSmall ? " (too small for this client)" : ""}
                          </span>
                        </span>
                        {on && <Check aria-hidden="true" className="h-4 w-4 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold" role="radiogroup" aria-label="Billing cycle">
                {(["MONTHLY", "ANNUAL"] as const).map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={cycle === c} onClick={() => setCycle(c)} className={`rounded-lg px-4 py-1.5 transition ${cycle === c ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"}`}>
                    {c === "MONTHLY" ? "Monthly" : "Annual"}
                  </button>
                ))}
              </div>
              {(overSeats || overBranches) && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
                  <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {client.name} has {client.employees} active employees and {client.branches} branches, which exceeds {target.name}. They need to reduce first.
                </p>
              )}
              <div>
                <label htmlFor="owner-reason" className="mb-1 block text-xs font-bold text-slate-700">Reason (kept in the owner history)</label>
                <input id="owner-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Pilot agreement signed" maxLength={200} className={inputClass} />
              </div>
              <p className="text-xs leading-5 text-slate-600">
                Takes effect immediately and starts a fresh billing period at today&rsquo;s catalog price. No payment is collected, so use this for agreed or complimentary changes.
              </p>
            </>
          )}

          {mode === "SUSPEND" && (
            <>
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                Everyone at <strong>{client.name}</strong> will be signed out of access immediately and see a suspension notice. Nothing is deleted, and you can reactivate at any time.
              </p>
              <div>
                <label htmlFor="owner-reason" className="mb-1 block text-xs font-bold text-slate-700">Reason (required, owner history only)</label>
                <input id="owner-reason" ref={(el) => { firstRef.current = el; }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Payment dispute, chargeback" maxLength={200} className={inputClass} />
              </div>
              <div>
                <label htmlFor="owner-confirm" className="mb-1 block text-xs font-bold text-slate-700">
                  Type <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">{client.name}</span> to confirm
                </label>
                <input id="owner-confirm" value={typedName} onChange={(e) => setTypedName(e.target.value)} autoComplete="off" className={inputClass} />
              </div>
            </>
          )}

          {mode === "REACTIVATE" && (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {client.name} will be able to sign in again right away with their plan as it was.
              {client.suspendReason ? <> It was suspended for: <em>{client.suspendReason}</em>.</> : null}
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || busy}
            ref={(el) => {
              if (mode === "REACTIVATE") firstRef.current = el;
            }}
            className={`keep-white inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-md transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:shadow-none ${toneBtn}`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? "Saving" : meta.cta}
          </button>
        </div>
      </form>
    </div>
  );
}
