"use client";

import React, { useState, useEffect } from "react";
import { ExpenseClaim } from "@/types";
import { expensesApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Wallet,
  Plus,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Loader2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function ExpenseClaimsView() {
  const { user, role } = useAuth();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit Claim Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState("TRAVEL");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdminOrManager = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER";

  const loadClaims = async () => {
    setLoading(true);
    try {
      const res = isAdminOrManager ? await expensesApi.getAllClaims() : await expensesApi.getMyClaims();
      if (Array.isArray(res)) {
        setClaims(res);
      } else if (Array.isArray(res?.data)) {
        setClaims(res.data);
      } else if (Array.isArray(res?.data?.records)) {
        setClaims(res.data.records);
      } else {
        setClaims([]);
      }
    } catch (err: any) {
      console.error("Failed to load claims:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [isAdminOrManager]);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", description.slice(0, 100) || `${category} Claim`);
      formData.append("category", category);
      formData.append("amount", amount);
      formData.append("description", description);
      if (file) {
        formData.append("receipt", file);
      }

      const res = await expensesApi.create(formData);
      if (res?.success) {
        toast.success("Expense reimbursement claim submitted successfully!");
        confetti({ particleCount: 50, spread: 60 });
        setModalOpen(false);
        setAmount("");
        setDescription("");
        setFile(null);
        loadClaims();
      } else {
        toast.error(res?.message || "Failed to submit claim");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to submit claim");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewClaim = async (id: string, status: "APPROVED" | "REJECTED") => {
    toast.loading("Updating claim status...", { id: "claim-act" });
    try {
      const res = await expensesApi.review(id, { status, reviewNote: `Finance review: ${status}` });
      toast.dismiss("claim-act");
      if (res?.success) {
        toast.success(`Claim marked as ${status}!`);
        loadClaims();
      } else {
        toast.error(res?.message || "Review action failed");
      }
    } catch (err: any) {
      toast.dismiss("claim-act");
      toast.error(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const totalClaimed = claims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const totalApproved = claims
    .filter((c) => c.status === "APPROVED" || c.status === "PAID")
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-indigo-600" />
            Expense Reimbursement Claims
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit business expenditure receipts, track manager approval status, and manage settlement ledger
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Submit Expense Claim
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            Total Claims Value
          </p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalClaimed)}</p>
          <p className="text-xs text-slate-400 mt-1">{claims.length} claims submitted</p>
        </div>

        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved & Reimbursed
          </p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalApproved)}</p>
          <p className="text-xs text-slate-400 mt-1">Settled into payroll</p>
        </div>

        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Finance Audit
          </p>
          <p className="text-2xl font-bold text-amber-600">
            {claims.filter((c) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW").length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Awaiting approval</p>
        </div>
      </div>

      {/* Claims Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                {isAdminOrManager && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    Loading claims...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No expense claims recorded. Click "Submit Expense Claim" above.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {claim.employee?.firstName ? `${claim.employee.firstName} ${claim.employee.lastName || ""}` : "Employee"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {claim.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(claim.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {claim.description}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate((claim as any).expenseDate || claim.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          claim.status === "APPROVED" || claim.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : claim.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {claim.status}
                      </span>
                    </td>
                    {isAdminOrManager && (
                      <td className="py-3.5 px-4 text-right">
                        {claim.status === "PENDING" || claim.status === "SUBMITTED" || claim.status === "UNDER_REVIEW" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReviewClaim(claim.id, "APPROVED")}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition"
                              title="Approve claim"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReviewClaim(claim.id, "REJECTED")}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition"
                              title="Reject claim"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Processed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Claim Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Submit Expense Claim</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter expense details and attach receipt proof for manager reimbursement
            </p>

            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="TRAVEL">Travel / Flight / Cab</option>
                  <option value="CLIENT_ENTERTAINMENT">Client Entertainment / Dining</option>
                  <option value="FUEL">Fuel / Petrol / Vehicle</option>
                  <option value="INTERNET">Internet / Phone / Utilities</option>
                  <option value="LEARNING">Learning / Courses / Books</option>
                  <option value="OTHER">Other / Office Supplies</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Claim Amount (INR) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 2450"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Description / Business Purpose *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Client visit to Bangalore HQ, dinner meeting, cab receipt attached..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Attach Receipt Bill (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
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
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
