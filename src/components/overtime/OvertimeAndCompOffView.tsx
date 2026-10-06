"use client";

import React, { useState, useEffect } from "react";
import { compOffApi, overtimeApi } from "@/lib/api";
import { formatDate, unwrapList, unwrapItem } from "@/lib/utils";
import {
  Layers,
  Clock,
  Plus,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import DatePicker from "@/components/ui/DatePicker";

export default function OvertimeAndCompOffView() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [myOvertimes, setMyOvertimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redeem modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, histRes, otRes] = await Promise.allSettled([
        compOffApi.getBalance(),
        compOffApi.getHistory(),
        overtimeApi.getMy(),
      ]);

      if (balRes.status === "fulfilled" && balRes.value) {
        const bal = unwrapItem<any>(balRes.value) || balRes.value;
        setBalance(Number(bal.availableDays ?? bal.balanceDays ?? bal.balance ?? 0));
      }
      if (histRes.status === "fulfilled") {
        setHistory(unwrapList(histRes.value));
      }
      if (otRes.status === "fulfilled") {
        setMyOvertimes(unwrapList(otRes.value));
      }
    } catch (err) {
      console.error("Failed to load comp-off and overtime:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedDate) {
      toast.error("Please pick a date to redeem comp-off");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await compOffApi.redeem({
        requestedDate,
        days: Number(days),
        reason,
      });

      if (res?.success) {
        toast.success("Comp-off redemption submitted for manager review!");
        confetti({ particleCount: 50, spread: 60 });
        setModalOpen(false);
        setReason("");
        loadData();
      } else {
        toast.error(res?.message || "Failed to redeem comp-off");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to redeem comp-off");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-indigo-600" />
            Comp-Off Ledger & Overtime Accrual
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automatic credit for working on Sundays and holidays, 100% overtime accumulation, and comp-off redemption
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Redeem Comp-Off
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Available Comp-Off Credits
          </p>
          <p className="text-3xl font-bold text-emerald-600">{balance} Days</p>
          <p className="text-xs text-slate-400 mt-1">Ready for redemption</p>
        </div>

        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Overtime Accrued
          </p>
          <p className="text-3xl font-bold text-indigo-600">
            {myOvertimes.reduce((acc, o) => acc + (Number(o.hours) || 0), 0)} Hours
          </p>
          <p className="text-xs text-slate-400 mt-1">Beyond standard 9 hr shifts</p>
        </div>

        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
            Rest-Day Rule
          </p>
          <p className="text-xl font-bold text-slate-900">Sunday Punches Unblocked</p>
          <p className="text-xs text-slate-500 mt-1">100% credited to Overtime & Comp-off</p>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-sm text-slate-900">Redemption & Accrual History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Days / Hours</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">
                    Loading ledger records...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No redemption records found. Click "Redeem Comp-Off" to request.
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatDate(item.requestedDate || item.date || item.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Comp-Off Leave
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      {item.days || 1} day
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {item.reason || "Sunday rest day compensation"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          item.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {item.status || "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redeem Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Redeem Comp-Off Leave</h3>
            <p className="text-xs text-slate-500 mb-4">
              Apply earned rest-day credits for a scheduled day off
            </p>

            <form onSubmit={handleRedeem} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Target Date *</label>
                <DatePicker
                  value={requestedDate}
                  onChange={(val) => setRequestedDate(val)}
                  placeholder="Select target date"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Days to Deduct</label>
                <input
                  type="number"
                  min={0.5}
                  max={balance > 0 ? balance : 5}
                  step={0.5}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  required
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  Available balance: {balance} days
                </span>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Reason / Note</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Taking leave against Sunday client deployment work..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Redemption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
