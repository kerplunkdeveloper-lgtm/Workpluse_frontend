"use client";

import React, { useState, useEffect } from "react";
import { correctionsApi, leavesApi, overtimeApi, expensesApi } from "@/lib/api";
import { formatDate, formatTime, formatCurrency, unwrapList } from "@/lib/utils";
import {
  ShieldCheck,
  Clock,
  CalendarDays,
  Layers,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type ApprovalCategory = "CORRECTIONS" | "LEAVES" | "OVERTIME" | "EXPENSES";

export default function ApprovalsInboxView() {
  const [activeTab, setActiveTab] = useState<ApprovalCategory>("CORRECTIONS");
  const [corrections, setCorrections] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllPending = async () => {
    setLoading(true);
    try {
      const [corrRes, leaveRes, otRes, expRes] = await Promise.allSettled([
        correctionsApi.getPendingCorrections(),
        leavesApi.getAllLeaves({ status: "PENDING" }),
        overtimeApi.getPending(),
        expensesApi.getAllClaims(),
      ]);

      if (corrRes.status === "fulfilled") {
        setCorrections(unwrapList(corrRes.value));
      }
      if (leaveRes.status === "fulfilled") {
        setLeaves(unwrapList(leaveRes.value).filter((l: any) => l.status === "PENDING"));
      }
      if (otRes.status === "fulfilled") {
        setOvertimes(unwrapList(otRes.value));
      }
      if (expRes.status === "fulfilled") {
        setExpenses(
          unwrapList(expRes.value).filter((e: any) =>
            ["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(e.status)
          )
        );
      }
    } catch (err) {
      console.error("Failed to load approvals inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPending();
  }, []);

  const handleReviewCorrection = async (id: string, status: "APPROVED" | "REJECTED") => {
    toast.loading("Processing regularization decision...", { id: "corr-act" });
    try {
      const res = await correctionsApi.review(id, { status, reviewNote: `Decision by HR or admin (${status})` });
      toast.dismiss("corr-act");
      if (res?.success) {
        toast.success(`Attendance record updated and marked as ${status}!`);
        confetti({ particleCount: 50, spread: 50 });
        loadAllPending();
      } else {
        toast.error(res?.message || "Action failed");
      }
    } catch (err: any) {
      toast.dismiss("corr-act");
      toast.error(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const handleReviewLeave = async (id: string, status: "APPROVED" | "REJECTED") => {
    toast.loading("Processing leave review...", { id: "leave-act" });
    try {
      const res = await leavesApi.review(id, { status, reviewNote: `Decision by HR or admin (${status})` });
      toast.dismiss("leave-act");
      if (res?.success) {
        toast.success(`Leave request ${status}!`);
        confetti({ particleCount: 50, spread: 50 });
        loadAllPending();
      } else {
        toast.error(res?.message || "Action failed");
      }
    } catch (err: any) {
      toast.dismiss("leave-act");
      toast.error(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const handleReviewOvertime = async (id: string, status: "APPROVED" | "REJECTED") => {
    toast.loading("Processing overtime approval...", { id: "ot-act" });
    try {
      const res = await overtimeApi.review(id, { status, reviewNote: `Reviewed by HR or admin` });
      toast.dismiss("ot-act");
      if (res?.success) {
        toast.success(`Overtime request ${status}!`);
        loadAllPending();
      } else {
        toast.error(res?.message || "Action failed");
      }
    } catch (err: any) {
      toast.dismiss("ot-act");
      toast.error(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const handleReviewExpense = async (id: string, status: "APPROVED" | "REJECTED") => {
    toast.loading("Reviewing expense claim...", { id: "exp-act" });
    try {
      const res = await expensesApi.review(id, { status, reviewNote: `Finance review completed` });
      toast.dismiss("exp-act");
      if (res?.success) {
        toast.success(`Expense claim ${status}!`);
        loadAllPending();
      } else {
        toast.error(res?.message || "Action failed");
      }
    } catch (err: any) {
      toast.dismiss("exp-act");
      toast.error(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const totalPending = corrections.length + leaves.length + overtimes.length + expenses.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Approvals inbox
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized decision hub for employee regularization, leave, overtime, and reimbursement requests
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700">
          {/* <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> */}
          <span>{totalPending} Total Requests Awaiting Review</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("CORRECTIONS")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "CORRECTIONS"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Punch Regularization</span>
          {corrections.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
              {corrections.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("LEAVES")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "LEAVES"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Leave Requests</span>
          {leaves.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
              {leaves.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("OVERTIME")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "OVERTIME"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Overtime Credits</span>
          {overtimes.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
              {overtimes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("EXPENSES")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "EXPENSES"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Expense Claims</span>
          {expenses.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
              {expenses.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6">
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
            Loading approval items...
          </div>
        ) : activeTab === "CORRECTIONS" ? (
          corrections.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              All attendance regularization requests are clear! No pending items.
            </div>
          ) : (
            <div className="space-y-3">
              {corrections.map((corr) => (
                <div
                  key={corr.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {corr.employee?.firstName} {corr.employee?.lastName}
                      </span>
                      <span className="text-xs text-indigo-600 font-medium">
                        ({corr.employee?.department?.name || corr.employee?.employeeCode})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Target Date: <span className="font-semibold text-slate-900">{formatDate(corr.attendance?.date || corr.createdAt)}</span> | Requested In: {formatTime(corr.requestedCheckIn)} / Out: {formatTime(corr.requestedCheckOut)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 italic">Reason: "{corr.reason}"</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewCorrection(corr.id, "APPROVED")}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewCorrection(corr.id, "REJECTED")}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === "LEAVES" ? (
          leaves.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No pending leave requests awaiting your decision.
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {leave.employee?.firstName} {leave.employee?.lastName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                        {leave.leaveType?.name || "Leave"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {formatDate(leave.startDate)} to {formatDate(leave.endDate)} ({leave.totalDays} days)
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 italic">Reason: "{leave.reason}"</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewLeave(leave.id, "APPROVED")}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewLeave(leave.id, "REJECTED")}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === "OVERTIME" ? (
          overtimes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No pending overtime accumulation claims.
            </div>
          ) : (
            <div className="space-y-3">
              {overtimes.map((ot) => (
                <div
                  key={ot.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {ot.employee?.firstName} {ot.employee?.lastName}
                      </span>
                      <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs">{ot.hours || 0} Hours OT</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Date: {formatDate(ot.date)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewOvertime(ot.id, "APPROVED")}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition"
                    >
                      Approve OT
                    </button>
                    <button
                      onClick={() => handleReviewOvertime(ot.id, "REJECTED")}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          expenses.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No reimbursement claims pending review.
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {exp.employee?.firstName} {exp.employee?.lastName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
                        {exp.category}
                      </span>
                      <span className="font-bold text-emerald-700 text-xs">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 italic">"{exp.description}"</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewExpense(exp.id, "APPROVED")}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition"
                    >
                      Approve Claim
                    </button>
                    <button
                      onClick={() => handleReviewExpense(exp.id, "REJECTED")}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
