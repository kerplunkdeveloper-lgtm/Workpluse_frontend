"use client";

import React, { useEffect, useRef, useState } from "react";
import { correctionsApi } from "@/lib/api";
import { Attendance } from "@/types";
import { toast } from "sonner";
import { AlertCircle, Check, ChevronDown, Clock, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

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
  const timestamp = new Date(`${dateKey}T${time}:00`);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Corrected shoot in/out time is invalid.");
  }
  return timestamp.toISOString();
}


type PremiumTimePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function PremiumTimePicker({ label, value, onChange }: PremiumTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [dialMode, setDialMode] = useState<"hour" | "minute">("hour");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const parsed = value.match(/^(\d{2}):(\d{2})$/);
  const hour24 = parsed ? Number(parsed[1]) : 0;
  const minute = parsed ? Number(parsed[2]) : 0;
  const hour = parsed ? (hour24 % 12 || 12) : 12;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hours = Array.from({ length: 12 }, (_, index) => index + 1);
  const minutes = Array.from({ length: 60 }, (_, index) => index);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const update = (nextHour: number, nextMinute: number, nextPeriod: string) => {
    const nextHour24 = nextPeriod === "PM" ? (nextHour % 12) + 12 : nextHour % 12;
    onChange(`${String(nextHour24).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-[54px] w-full items-center justify-between rounded-2xl border px-4 text-left transition ${open ? "border-indigo-500 bg-indigo-50/50 ring-4 ring-indigo-100" : "border-slate-200 bg-slate-50/70 hover:border-indigo-300 hover:bg-white"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? "text-sm font-bold tracking-wide text-slate-900" : "text-sm font-medium text-slate-400"}>
          {value ? `${String(hour).padStart(2, "0")} : ${String(minute).padStart(2, "0")} ${period}` : "Select time"}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180 text-indigo-600" : ""}`} />
      </button>
      {open && (
        <div className="relative z-30 mx-auto mt-3 w-full max-w-[276px] overflow-hidden rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_24px_55px_-18px_rgba(15,23,42,0.5)] ring-1 ring-slate-900/5">
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-950 px-3 py-2.5 text-white">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Select time</p>
              <p className="mt-0.5 text-lg font-black tracking-widest">{String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")} <span className="text-indigo-300">{period}</span></p>
            </div>
            <Clock className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {["hour", "minute"].map((item) => (
              <button key={item} type="button" onClick={() => setDialMode(item as "hour" | "minute")} className={`rounded-lg px-2 py-1.5 text-[11px] font-bold capitalize transition ${dialMode === item ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="relative mx-auto aspect-square h-auto w-full max-w-[226px] rounded-full bg-gradient-to-br from-indigo-50 to-slate-100 ring-1 ring-indigo-100">
            <div className="absolute inset-[24px] rounded-full border border-indigo-100 bg-white shadow-inner" />
            <div className="absolute left-1/2 top-1/2 h-[86px] w-1 origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]" style={{ transform: `translateX(-50%) translateY(-100%) rotate(${dialMode === "hour" ? ((hour % 12) * 30) : (minute * 6)}deg)`, transformOrigin: "50% 100%" }} />
            <div className="absolute left-1/2 top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
            {(dialMode === "hour" ? hours : Array.from({ length: 12 }, (_, index) => index * 5)).map((item, index) => {
              const selected = dialMode === "hour" ? item === hour : item === minute;
              const angle = index * 30 - 90;
              const radius = 87;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              return (
                <button key={item} type="button" onClick={() => { if (dialMode === "hour") { update(item, minute, period); setDialMode("minute"); } else { update(hour, item, period); } }} className={`absolute z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold transition ${selected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-700 hover:bg-indigo-100 hover:text-indigo-700"}`} style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}>
                  {dialMode === "hour" ? String(item).padStart(2, "0") : String(item).padStart(2, "0")}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {["AM", "PM"].map((item) => (
              <button key={item} type="button" onClick={() => update(hour, minute, item)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-black tracking-wider transition ${period === item ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`}>{item}</button>
            ))}
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-indigo-700">Done</button>
          </div>
        </div>
      )}
    </div>
  );
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
        toast.success("Shoot-time change sent to HR/admin for verification!");
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
    <Modal>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-8"
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
            <h3 className="text-base font-semibold text-slate-900">Request Attendance Regularization</h3>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0"><PremiumTimePicker label="Corrected Shoot-In Time" value={requestedCheckIn} onChange={setRequestedCheckIn} /></div>
            <div className="min-w-0"><PremiumTimePicker label="Corrected Shoot-Out Time" value={requestedCheckOut} onChange={setRequestedCheckOut} /></div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
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
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 transition shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Regularization
            </button>
          </div>
        </form>
      </motion.div>
    </Modal>
  );
}
