"use client";

import React, { useState } from "react";
import { Building2, BriefcaseBusiness, CheckCircle2, Home, LogOut } from "lucide-react";
import { useAttendance, PunchOptions } from "@/context/AttendanceContext";

export type PunchConfirmAction = "CHECK_IN" | "CHECK_OUT";

type CheckInWorkMode = NonNullable<PunchOptions["workMode"]>;

interface PunchConfirmDialogProps {
  action: PunchConfirmAction | null;
  loading?: boolean;
  locationLabel?: string | null;
  onCancel: () => void;
  /** Receives the work mode and optional note the employee picked before check-in. */
  onConfirm: (options?: PunchOptions) => void;
}

export default function PunchConfirmDialog(props: PunchConfirmDialogProps) {
  if (!props.action) return null;
  // Mounting the body per open resets the work-mode choice each time.
  return <PunchConfirmBody {...props} action={props.action} />;
}

function PunchConfirmBody({ action, loading, onCancel, onConfirm }: PunchConfirmDialogProps & { action: PunchConfirmAction }) {
  const { todayStatus, isWithinGeofence } = useAttendance();
  const policy = todayStatus?.locationPolicy;
  const isCheckIn = action === "CHECK_IN";
  // In "anywhere" mode the punch is accepted wherever you are, so don't ask.
  const askWorkMode = isCheckIn;
  const [workMode, setWorkMode] = useState<CheckInWorkMode>("OFFICE");
  const [note, setNote] = useState("");
  const officeBlocked = isCheckIn && workMode === "OFFICE" && !isWithinGeofence;
  const customNoteRequired = isCheckIn && workMode === "CLIENT_VISIT" && !note.trim();

  const modes: { value: CheckInWorkMode; label: string; icon: typeof Building2 }[] = [
    { value: "OFFICE", label: "Office", icon: Building2 },
    ...(policy?.allowWfh !== false ? [{ value: "WORK_FROM_HOME" as const, label: "Remote / WFH", icon: Home }] : []),
    { value: "CLIENT_VISIT" as const, label: "Other", icon: BriefcaseBusiness },
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
              ? workMode === "WORK_FROM_HOME"
                ? "You are checking in as Remote / WFH. Your work mode will be recorded for today."
                : "Office check-in will verify your GPS distance from the assigned office before starting your shift."
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
            <p className={`text-[11px] leading-4 ${officeBlocked ? "font-semibold text-rose-600" : "text-slate-500"}`}>
              {officeBlocked
                ? "You are outside the assigned office area. Move closer to the office or choose Remote / WFH."
                : workMode === "OFFICE"
                ? "Your GPS must be inside the assigned office area to check in as Office."
                : workMode === "CLIENT_VISIT"
                ? "Choose Other when you need to record a custom work reason."
                : "You can check in from anywhere as Remote / WFH."}
            </p>
          </fieldset>
        )}

        {askWorkMode && (
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">{workMode === "CLIENT_VISIT" ? "Custom work reason" : "Custom note"} <span className="font-normal text-slate-400">{workMode === "CLIENT_VISIT" ? "(required)" : "(optional)"}</span></span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 160))}
              placeholder={workMode === "CLIENT_VISIT" ? "Example: Client visit, shoot, travel..." : workMode === "WORK_FROM_HOME" ? "Example: Working from home today" : "Example: Main office"}
              rows={2}
              className={`w-full resize-none rounded-xl border px-3 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${customNoteRequired ? "border-rose-300" : "border-slate-200"}`}
            />
            <p className={`text-[10px] ${customNoteRequired ? "text-rose-600" : "text-slate-400"}`}>{customNoteRequired ? "Enter a reason to continue." : "This note will appear in the attendance Location column."}</p>
          </label>
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
            onClick={() => onConfirm(askWorkMode ? { workMode, note: note.trim() || undefined } : undefined)}
            disabled={loading || officeBlocked || customNoteRequired}
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
