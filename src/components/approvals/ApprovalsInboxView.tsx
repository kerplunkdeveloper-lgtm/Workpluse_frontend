"use client";

import React, { useState, useEffect } from "react";
import { correctionsApi, leavesApi, overtimeApi, expensesApi, compOffApi } from "@/lib/api";
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

type ApprovalCategory = "CORRECTIONS" | "LEAVES" | "OVERTIME" | "EXPENSES" | "COMPOFF";

export default function ApprovalsInboxView() {
  const [activeTab, setActiveTab] = useState<ApprovalCategory>("CORRECTIONS");
  const [corrections, setCorrections] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [compOffs, setCompOffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllPending = async () => {
    setLoading(true);
    try {
      const [corrRes, leaveRes, otRes, expRes, compRes] = await Promise.allSettled([
        correctionsApi.getPendingCorrections(),
        leavesApi.getAllLeaves({ status: "PENDING" }),
        overtimeApi.getPending(),
        expensesApi.getAllClaims(),
        compOffApi.getPending(),
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
      if (compRes.status === "fulfilled") setCompOffs(unwrapList(compRes.value));
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

  const handleReviewCompOff = async (id: string, status: "APPROVED" | "REJECTED") => {
    toast.loading("Reviewing comp-off request...", { id: "compoff-act" });
    try {
      const res = await compOffApi.review(id, { status, reviewNote: "Reviewed in approvals inbox" });
      toast.dismiss("compoff-act");
      if (res?.success) { toast.success(`Comp-off request ${status}!`); loadAllPending(); }
      else toast.error(res?.message || "Action failed");
    } catch (err: any) {
      toast.dismiss("compoff-act");
      toast.error(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const totalPending = corrections.length + leaves.length + overtimes.length + expenses.length + compOffs.length;

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

        <button
          onClick={() => setActiveTab("COMPOFF")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "COMPOFF" ? "bg-indigo-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Comp-Off</span>
          {compOffs.length > 0 && <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{compOffs.length}</span>}
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
<div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="min-w-[900px] w-full table-fixed text-left text-sm">
                <thead className="bg-slate-50/90 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="w-[19%] px-4 py-3 font-semibold">Employee</th>
                    <th className="w-[14%] px-4 py-3 font-semibold">Date</th>
                    <th className="w-[22%] px-4 py-3 font-semibold">Requested time</th>
                    <th className="w-[29%] px-4 py-3 font-semibold">Reason</th>
                    <th className="w-[16%] px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {corrections.map((corr) => {
                    const reason = String(corr.reason || "No reason provided");
                    return (
                      <tr key={corr.id} className="align-middle transition-colors hover:bg-indigo-50/[0.32]">
                        <td className="px-4 py-4">
                          <p className="truncate font-semibold text-slate-900">{corr.employee?.firstName} {corr.employee?.lastName}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{corr.employee?.department?.name || corr.employee?.employeeCode || "—"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{formatDate(corr.attendance?.date || corr.createdAt)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                          <span className="font-medium text-slate-900">In</span> {formatTime(corr.requestedCheckIn)} <span className="mx-1 text-slate-300">/</span> <span className="font-medium text-slate-900">Out</span> {formatTime(corr.requestedCheckOut)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="group relative max-w-[260px]">
                            <p className="truncate text-xs leading-5 text-slate-700" title={reason}>{reason}</p>
                            <div role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-3rem))] rounded-xl bg-slate-950 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                              {reason}
                              <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45 bg-slate-950" />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "APPROVED")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-500 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "REJECTED")} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-px hover:bg-rose-100 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30">
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>          )
        ) : activeTab === "LEAVES" ? (
          leaves.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No pending leave requests awaiting your decision.
            </div>
          ) : (
<div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="min-w-[900px] w-full table-fixed text-left text-sm">
                <thead className="bg-slate-50/90 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="w-[19%] px-4 py-3 font-semibold">Employee</th>
                    <th className="w-[14%] px-4 py-3 font-semibold">Date</th>
                    <th className="w-[22%] px-4 py-3 font-semibold">Requested time</th>
                    <th className="w-[29%] px-4 py-3 font-semibold">Reason</th>
                    <th className="w-[16%] px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {corrections.map((corr) => {
                    const reason = String(corr.reason || "No reason provided");
                    return (
                      <tr key={corr.id} className="align-middle transition-colors hover:bg-indigo-50/[0.32]">
                        <td className="px-4 py-4">
                          <p className="truncate font-semibold text-slate-900">{corr.employee?.firstName} {corr.employee?.lastName}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{corr.employee?.department?.name || corr.employee?.employeeCode || "—"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{formatDate(corr.attendance?.date || corr.createdAt)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                          <span className="font-medium text-slate-900">In</span> {formatTime(corr.requestedCheckIn)} <span className="mx-1 text-slate-300">/</span> <span className="font-medium text-slate-900">Out</span> {formatTime(corr.requestedCheckOut)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="group relative max-w-[260px]">
                            <p className="truncate text-xs leading-5 text-slate-700" title={reason}>{reason}</p>
                            <div role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-3rem))] rounded-xl bg-slate-950 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                              {reason}
                              <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45 bg-slate-950" />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "APPROVED")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-500 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "REJECTED")} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-px hover:bg-rose-100 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30">
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>          )
        ) : activeTab === "OVERTIME" ? (
          overtimes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No pending overtime accumulation claims.
            </div>
          ) : (
<div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="min-w-[900px] w-full table-fixed text-left text-sm">
                <thead className="bg-slate-50/90 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="w-[19%] px-4 py-3 font-semibold">Employee</th>
                    <th className="w-[14%] px-4 py-3 font-semibold">Date</th>
                    <th className="w-[22%] px-4 py-3 font-semibold">Requested time</th>
                    <th className="w-[29%] px-4 py-3 font-semibold">Reason</th>
                    <th className="w-[16%] px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {corrections.map((corr) => {
                    const reason = String(corr.reason || "No reason provided");
                    return (
                      <tr key={corr.id} className="align-middle transition-colors hover:bg-indigo-50/[0.32]">
                        <td className="px-4 py-4">
                          <p className="truncate font-semibold text-slate-900">{corr.employee?.firstName} {corr.employee?.lastName}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{corr.employee?.department?.name || corr.employee?.employeeCode || "—"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{formatDate(corr.attendance?.date || corr.createdAt)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                          <span className="font-medium text-slate-900">In</span> {formatTime(corr.requestedCheckIn)} <span className="mx-1 text-slate-300">/</span> <span className="font-medium text-slate-900">Out</span> {formatTime(corr.requestedCheckOut)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="group relative max-w-[260px]">
                            <p className="truncate text-xs leading-5 text-slate-700" title={reason}>{reason}</p>
                            <div role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-3rem))] rounded-xl bg-slate-950 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                              {reason}
                              <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45 bg-slate-950" />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "APPROVED")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-500 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "REJECTED")} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-px hover:bg-rose-100 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30">
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>          )
        ) : activeTab === "EXPENSES" ? (
          expenses.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No reimbursement claims pending review.
            </div>
          ) : (
<div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="min-w-[900px] w-full table-fixed text-left text-sm">
                <thead className="bg-slate-50/90 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="w-[19%] px-4 py-3 font-semibold">Employee</th>
                    <th className="w-[14%] px-4 py-3 font-semibold">Date</th>
                    <th className="w-[22%] px-4 py-3 font-semibold">Requested time</th>
                    <th className="w-[29%] px-4 py-3 font-semibold">Reason</th>
                    <th className="w-[16%] px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {corrections.map((corr) => {
                    const reason = String(corr.reason || "No reason provided");
                    return (
                      <tr key={corr.id} className="align-middle transition-colors hover:bg-indigo-50/[0.32]">
                        <td className="px-4 py-4">
                          <p className="truncate font-semibold text-slate-900">{corr.employee?.firstName} {corr.employee?.lastName}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{corr.employee?.department?.name || corr.employee?.employeeCode || "—"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{formatDate(corr.attendance?.date || corr.createdAt)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                          <span className="font-medium text-slate-900">In</span> {formatTime(corr.requestedCheckIn)} <span className="mx-1 text-slate-300">/</span> <span className="font-medium text-slate-900">Out</span> {formatTime(corr.requestedCheckOut)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="group relative max-w-[260px]">
                            <p className="truncate text-xs leading-5 text-slate-700" title={reason}>{reason}</p>
                            <div role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-3rem))] rounded-xl bg-slate-950 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                              {reason}
                              <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45 bg-slate-950" />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "APPROVED")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-500 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "REJECTED")} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-px hover:bg-rose-100 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30">
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>          )
        ) : (
          compOffs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">No comp-off requests pending review.</div>
          ) : (
<div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="min-w-[900px] w-full table-fixed text-left text-sm">
                <thead className="bg-slate-50/90 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="w-[19%] px-4 py-3 font-semibold">Employee</th>
                    <th className="w-[14%] px-4 py-3 font-semibold">Date</th>
                    <th className="w-[22%] px-4 py-3 font-semibold">Requested time</th>
                    <th className="w-[29%] px-4 py-3 font-semibold">Reason</th>
                    <th className="w-[16%] px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {corrections.map((corr) => {
                    const reason = String(corr.reason || "No reason provided");
                    return (
                      <tr key={corr.id} className="align-middle transition-colors hover:bg-indigo-50/[0.32]">
                        <td className="px-4 py-4">
                          <p className="truncate font-semibold text-slate-900">{corr.employee?.firstName} {corr.employee?.lastName}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{corr.employee?.department?.name || corr.employee?.employeeCode || "—"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">{formatDate(corr.attendance?.date || corr.createdAt)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                          <span className="font-medium text-slate-900">In</span> {formatTime(corr.requestedCheckIn)} <span className="mx-1 text-slate-300">/</span> <span className="font-medium text-slate-900">Out</span> {formatTime(corr.requestedCheckOut)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="group relative max-w-[260px]">
                            <p className="truncate text-xs leading-5 text-slate-700" title={reason}>{reason}</p>
                            <div role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-3rem))] rounded-xl bg-slate-950 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                              {reason}
                              <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45 bg-slate-950" />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "APPROVED")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-500 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button type="button" onClick={() => handleReviewCorrection(corr.id, "REJECTED")} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-px hover:bg-rose-100 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30">
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>          )
        )}
      </div>
    </div>
  );
}
