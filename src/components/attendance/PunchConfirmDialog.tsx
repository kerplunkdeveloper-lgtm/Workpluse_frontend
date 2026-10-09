"use client";

import React, { useState } from "react";
import { Briefcase, Building2, CheckCircle2, Home, LogOut, Plane } from "lucide-react";
import { useAttendance, PunchOptions } from "@/context/AttendanceContext";

export type PunchConfirmAction = "CHECK_IN" | "CHECK_OUT";

type CheckInWorkMode = NonNullable<PunchOptions["workMode"]>;

interface PunchConfirmDialogProps {
  action: PunchConfirmAction | null;
  loading?: boolean;
  locationLabel?: string | null;
  onCancel: () => void;
  /** Receives the work mode the employee picked (only asked for when check-in is office only). */
  onConfirm: (options?: PunchOptions) => void;
}

export default function PunchConfirmDialog(props: PunchConfirmDialogProps) {
  if (!props.action) return null;
  // Mounting the body per open resets the work-mode choice each time.
  return <PunchConfirmBody {...props} action={props.action} />;
}

function PunchConfirmBody({ action, loading, locationLabel, onCancel, onConfirm }: PunchConfirmDialogProps & { action: PunchConfirmAction }) {
  const { todayStatus } = useAttendance();
  const policy = todayStatus?.locationPolicy;
  const isCheckIn = action === "CHECK_IN";
  // In "anywhere" mode the punch is accepted wherever you are, so don't ask.
  const askWorkMode = isCheckIn && policy?.mode === "OFFICE_ONLY" && policy.radiusMeters !== null;
  const [workMode, setWorkMode] = useState<CheckInWorkMode>("OFFICE");

  const modes: { value: CheckInWorkMode; label: string; icon: typeof Building2 }[] = [
    { value: "OFFICE", label: "At the office", icon: Building2 },
    ...(policy?.allowWfh ? [{ value: "WORK_FROM_HOME" as const, label: "Work from home", icon: Home }] : []),
    { value: "CLIENT_VISIT", label: "Client visit", icon: Briefcase },
    { value: "TRAVEL", label: "Travel / field", icon: Plane },
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4" role="alertdialog" aria-modal="true" aria-labelledby="punch-confirm-title">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCheckIn ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"}`}>
          {isCheckIn ? <CheckCircle2 className="w-6 h-6" /> : <LogOut className="w-6 h-6" />}
        </div>
        <div className="space-y-1.5">
          <h3 id="punch-confirm-title" className="text-base font-semibold text-slate-900">
            {isCheckIn ? "Confirm check-in?" : "Confirm check-out?"}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {isCheckIn
              ? locationLabel
                ? `Your shift will start and the team will see you clocked in at ${locationLabel}.`
                : "Your current time and location will be recorded. The team can see where you clocked in."
              : "Your shift will end now. Today's hours will be saved to your timesheet."}
          </p>
        </div>

        {askWorkMode && (
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-slate-700">Where are you working today?</legend>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((mode) => {
                const selected = workMode === mode.value;
                return (
                  <label
                    key={mode.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                      selected ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input type="radio" name="work-mode" value={mode.value} checked={selected} onChange={() => setWorkMode(mode.value)} className="sr-only" />
                    <mode.icon className="h-3.5 w-3.5 shrink-0" />
                    {mode.label}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] leading-4 text-slate-500">
              {workMode === "OFFICE"
                ? "You need to be inside the office area to check in."
                : "You can check in from anywhere. Your manager will see the work mode you chose."}
            </p>
          </fieldset>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(askWorkMode ? { workMode } : undefined)}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition disabled:opacity-50 ${
              isCheckIn ? "bg-indigo-600 hover:bg-indigo-500" : "bg-rose-600 hover:bg-rose-500"
            }`}
          >
            {loading ? "Saving..." : isCheckIn ? "Yes, check in" : "Yes, check out"}
          </button>
        </div>
      </div>
    </div>
  );
}
