"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  KeyRound,
  Layers,
  Users,
  X,
} from "lucide-react";
import { branchesApi, departmentsApi, employeesApi, holidaysApi, shiftsApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";

interface SetupChecklistProps {
  organizationId?: string;
  isPlanLocked: boolean;
  onUnlock: () => void;
}

interface SetupStep {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onAction?: () => void;
  actionLabel: string;
}

interface SetupCounts {
  branches: number;
  departments: number;
  shifts: number;
  employees: number;
  holidays: number;
}

const storageKey = (organizationId?: string) => `wp-setup-dismissed:${organizationId || "workspace"}`;

const readDismissed = (organizationId?: string) => {
  try {
    return window.localStorage.getItem(storageKey(organizationId)) === "1";
  } catch {
    return false;
  }
};

/**
 * Guided first-run checklist for workspace admins. Progress is derived from
 * live data (not stored flags), so it stays correct if records are deleted
 * or created from another screen, and it disappears once setup is complete.
 */
export default function SetupChecklist({ organizationId, isPlanLocked, onUnlock }: SetupChecklistProps) {
  const [counts, setCounts] = useState<SetupCounts | null>(null);
  const [failed, setFailed] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Read after mount so server and client markup match.
    queueMicrotask(() => setDismissed(readDismissed(organizationId)));
  }, [organizationId]);

  const load = useCallback(async () => {
    setFailed(false);
    const [branches, departments, shifts, employees, holidays] = await Promise.allSettled([
      branchesApi.list(),
      departmentsApi.list(),
      shiftsApi.list(),
      employeesApi.list({ page: 1, limit: 2 }),
      holidaysApi.list({ year: new Date().getFullYear() }),
    ]);
    const size = (result: PromiseSettledResult<unknown>) =>
      result.status === "fulfilled" ? unwrapList(result.value).length : 0;

    if ([branches, departments, shifts, employees, holidays].every((r) => r.status === "rejected")) {
      setFailed(true);
      return;
    }
    setCounts({
      branches: size(branches),
      departments: size(departments),
      shifts: size(shifts),
      employees: size(employees),
      holidays: size(holidays),
    });
  }, []);

  useEffect(() => {
    if (dismissed) return;
    queueMicrotask(() => void load());
  }, [dismissed, load]);

  const steps: SetupStep[] = useMemo(() => {
    const c = counts;
    return [
      {
        id: "plan",
        title: "Activate your plan",
        detail: "Enter the unlock code from your activation email to enable payroll and geofencing.",
        done: !isPlanLocked,
        icon: KeyRound,
        onAction: onUnlock,
        actionLabel: "Enter code",
      },
      {
        id: "branch",
        title: "Add your first branch",
        detail: "Set the office location and geofence that attendance is checked against.",
        done: (c?.branches ?? 0) > 0,
        icon: Building2,
        href: "/branches",
        actionLabel: "Add branch",
      },
      {
        id: "department",
        title: "Create departments",
        detail: "Group people so approvals and reports route to the right managers.",
        done: (c?.departments ?? 0) > 0,
        icon: Layers,
        href: "/departments",
        actionLabel: "Add department",
      },
      {
        id: "shift",
        title: "Define a work shift",
        detail: "Start time, end time and grace period decide who is late or absent.",
        done: (c?.shifts ?? 0) > 0,
        icon: Clock3,
        href: "/shifts",
        actionLabel: "Create shift",
      },
      {
        id: "team",
        title: "Bring in your team",
        detail: "Invite people one by one, or import a spreadsheet. Each person gets a welcome email.",
        done: (c?.employees ?? 0) > 1,
        icon: Users,
        href: "/employees",
        actionLabel: "Add people",
      },
      {
        id: "holidays",
        title: "Publish this year's holidays",
        detail: "Holidays are excluded from absence and payroll calculations.",
        done: (c?.holidays ?? 0) > 0,
        icon: CalendarDays,
        href: "/holidays",
        actionLabel: "Add holidays",
      },
    ];
  }, [counts, isPlanLocked, onUnlock]);

  const completed = steps.filter((s) => s.done).length;
  const allDone = counts !== null && completed === steps.length;

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey(organizationId), "1");
    } catch {
      /* storage unavailable: hide for this session only */
    }
    setDismissed(true);
  };

  if (dismissed || allDone) return null;

  if (failed) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 flex items-center justify-between gap-4">
        <span>Setup progress could not be loaded.</span>
        <button type="button" onClick={() => void load()} className="font-semibold text-indigo-600 hover:text-indigo-700">
          Try again
        </button>
      </section>
    );
  }

  if (counts === null) {
    return (
      <section aria-busy="true" aria-label="Loading setup checklist" className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="h-5 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-50" />
          ))}
        </div>
      </section>
    );
  }

  const nextStepId = steps.find((s) => !s.done)?.id;
  const percent = Math.round((completed / steps.length) * 100);

  return (
    <section aria-labelledby="setup-checklist-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="setup-checklist-title" className="font-serif text-xl font-semibold tracking-tight text-slate-950">
            Finish setting up your workspace
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {completed} of {steps.length} steps done. Most teams finish in about ten minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide setup checklist"
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Setup progress"
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <motion.div
          className="h-full origin-left rounded-full bg-indigo-600"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: percent / 100 }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          style={{ width: "100%" }}
        />
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => {
          const isNext = step.id === nextStepId;
          const Icon = step.icon;
          const action = step.href ? (
            <Link
              href={step.href}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 transition hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              {step.actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={step.onAction}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              {step.actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          );

          return (
            <li
              key={step.id}
              className={`flex flex-col rounded-2xl border p-4 transition ${
                step.done
                  ? "border-emerald-100 bg-emerald-50/50"
                  : isNext
                    ? "border-indigo-200 bg-indigo-50/60"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    step.done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {step.done ? <Check aria-hidden="true" className="h-4 w-4" /> : <Icon aria-hidden="true" className="h-4 w-4" />}
                </span>
                <h3 className={`text-sm font-semibold ${step.done ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900"}`}>
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                  {step.done && <span className="sr-only"> (completed)</span>}
                </h3>
              </div>
              <p className="mt-2 flex-1 text-xs leading-5 text-slate-600">{step.detail}</p>
              {!step.done && <div className="mt-3">{action}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
