"use client";

import React, { useState } from "react";
import { correctionsApi } from "@/lib/api";
import { Attendance } from "@/types";
import { toast } from "sonner";
import { Clock, AlertCircle, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";

interface RegularizationModalProps {
  attendance: Attendance | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function toRequestedTimestamp(attendanceDate: string, time: string) {
  if (!time) return undefined;
  const dateKey = String(attendanceDate).match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!dateKey) throw new Error("Attendance date is invalid. Please refresh and try again.");

  // HTML time inputs contain only HH:mm. Send a complete instant to the API;
  // passing the bare value to `new Date()` on the server creates an invalid date.
  const timestamp = new Date(`${dateKey}T${time}:00`);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Corrected punch time is invalid.");
  }
  return timestamp.toISOString();
}

export default function RegularizationModal({
  attendance,
  isOpen,
  onClose,
  onSuccess,
}: RegularizationModalProps) {
  const [requestedCheckIn, setRequestedCheckIn] = useState("");
  const [requestedCheckOut, setRequestedCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !attendance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for regularization");
      return;
    }

    setLoading(true);
    try {
      const res = await correctionsApi.request({
        attendanceId: attendance.id,
        date: attendance.date,
        requestedCheckIn: toRequestedTimestamp(attendance.date, requestedCheckIn),
        requestedCheckOut: toRequestedTimestamp(attendance.date, requestedCheckOut),
        reason: reason.trim(),
      });

      if (res?.success) {
        toast.success("Attendance regularization request submitted for manager review!");
        onSuccess();
        onClose();
      } else {
        toast.error(res?.message || "Failed to submit regularization");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-900"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Request Attendance Regularization</h3>
            <p className="text-xs text-slate-500">
              For date: <span className="font-semibold text-slate-700">{formatDate(attendance.date)}</span>
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Missed punches or biometric device delays can be regularized here. Your manager will verify and approve the updated timestamps.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Corrected Clock-In Time
              </label>
              <input
                type="time"
                value={requestedCheckIn}
                onChange={(e) => setRequestedCheckIn(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Corrected Clock-Out Time
              </label>
              <input
                type="time"
                value={requestedCheckOut}
                onChange={(e) => setRequestedCheckOut(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason for Adjustment <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. GPS spoof false alarm, biometric scanner network outage, client meeting on site..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs resize-none text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Regularization
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
