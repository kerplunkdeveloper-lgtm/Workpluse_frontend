"use client";

import React from "react";
import { CheckCircle2, LogOut } from "lucide-react";

export type PunchConfirmAction = "CHECK_IN" | "CHECK_OUT";

interface PunchConfirmDialogProps {
  action: PunchConfirmAction | null;
  loading?: boolean;
  locationLabel?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function PunchConfirmDialog({ action, loading, locationLabel, onCancel, onConfirm }: PunchConfirmDialogProps) {
  if (!action) return null;

  const isCheckIn = action === "CHECK_IN";

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4" role="alertdialog" aria-modal="true">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCheckIn ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"}`}>
          {isCheckIn ? <CheckCircle2 className="w-6 h-6" /> : <LogOut className="w-6 h-6" />}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">
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
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl shadow-sm transition disabled:opacity-50 ${
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
