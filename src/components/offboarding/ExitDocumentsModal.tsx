"use client";

import React, { useState, useEffect } from "react";
import { offboardingApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Printer,
  Download,
  X,
  FileText,
  ShieldCheck,
  Award,
  ScrollText,
  Loader2,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface ExitDocumentsModalProps {
  exitId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultDocType?: "FF_STATEMENT" | "CLEARANCE_CERTIFICATE" | "RELIEVING_LETTER" | "EXPERIENCE_LETTER";
}

export default function ExitDocumentsModal({
  exitId,
  isOpen,
  onClose,
  defaultDocType = "FF_STATEMENT",
}: ExitDocumentsModalProps) {
  const [docType, setDocType] = useState<
    "FF_STATEMENT" | "CLEARANCE_CERTIFICATE" | "RELIEVING_LETTER" | "EXPERIENCE_LETTER"
  >(defaultDocType);
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDoc = async (type: string) => {
    setLoading(true);
    try {
      const res = await offboardingApi.getDocument(exitId, type);
      if (res?.success && res.data) {
        setDocData(res.data);
      } else {
        toast.error("Failed to load document data");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not generate document");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && exitId) {
      fetchDoc(docType);
    }
  }, [isOpen, exitId, docType]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const org = docData?.organization || {
    name: "WorkPulse Enterprise Technologies Pvt Ltd",
    address: "Global Tech Park, Outer Ring Road, Bellandur, Bengaluru, KA 560103",
    email: "hr@workpulse.io",
    phone: "+91 80 4911 2000",
  };

  const emp = docData?.employee || {};
  const settlement = docData?.settlement;
  const clearances = docData?.clearances || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-document-container,
          #print-document-container * {
            visibility: visible;
          }
          #print-document-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: #0f172a !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:bg-white">
        {/* Modal Controls Header */}
        <div className="no-print shrink-0 p-4 px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Document Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setDocType("FF_STATEMENT")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                docType === "FF_STATEMENT"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              F&F Statement
            </button>
            <button
              onClick={() => setDocType("CLEARANCE_CERTIFICATE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                docType === "CLEARANCE_CERTIFICATE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              No-Dues Clearance
            </button>
            <button
              onClick={() => setDocType("RELIEVING_LETTER")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                docType === "RELIEVING_LETTER"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              Relieving Letter
            </button>
            <button
              onClick={() => setDocType("EXPERIENCE_LETTER")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                docType === "EXPERIENCE_LETTER"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Experience Letter
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition"
              title="Print document or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Preview Canvas */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/40 flex justify-center print:p-0 print:bg-white">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm">Preparing official document...</p>
            </div>
          ) : (
            <div
              id="print-document-container"
              className="w-full max-w-3xl bg-white text-slate-900 rounded-2xl p-8 sm:p-12 shadow-xl border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0 text-xs sm:text-sm font-sans"
            >
              {/* Official Company Letterhead Header */}
              <div className="border-b-2 border-indigo-600 pb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      W
                    </span>
                    <h1 className="text-xl font-bold text-indigo-950 tracking-tight">{org.name}</h1>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm">{org.address}</p>
                  <p className="text-slate-500 text-xs">
                    Email: {org.email} • Tel: {org.phone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-slate-700 font-mono text-xs font-bold uppercase">
                    Ref: WP-EXIT-{exitId.slice(0, 8).toUpperCase()}
                  </span>
                  <p className="text-slate-500 text-xs mt-1">Date: {docData?.generatedDate || "Today"}</p>
                </div>
              </div>

              {/* ─── 1. FULL & FINAL SETTLEMENT STATEMENT ───────────────────────── */}
              {docType === "FF_STATEMENT" && (
                <div className="space-y-6">
                  <div className="text-center py-1">
                    <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-wide">
                      Full & Final Settlement Statement
                    </h2>
                    <p className="text-xs text-slate-500">Formal Statement of Accounts & Separation Dues</p>
                  </div>

                  {/* Employee Details Box */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 uppercase text-xs font-bold">Employee Name</p>
                      <p className="font-bold text-slate-900 mt-0.5">{emp.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-xs font-bold">Employee Code</p>
                      <p className="font-mono font-bold text-indigo-700 mt-0.5">{emp.code}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-xs font-bold">Designation</p>
                      <p className="font-medium text-slate-900 mt-0.5">{emp.designation}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-xs font-bold">Department / Branch</p>
                      <p className="font-medium text-slate-900 mt-0.5">{emp.department} • {emp.branch}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-xs font-bold">Date of Joining</p>
                      <p className="font-medium text-slate-900 mt-0.5">{emp.joiningDate}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-xs font-bold">Last Working Day</p>
                      <p className="font-bold text-slate-900 mt-0.5">{emp.lastWorkingDay}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-xs font-bold">Exit Mode</p>
                      <p className="font-medium text-slate-900 mt-0.5">{docData?.exit?.exitType}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-xs font-bold">Payment Mode</p>
                      <p className="font-medium text-slate-900 mt-0.5">Bank NEFT / Direct Credit</p>
                    </div>
                  </div>

                  {/* Earnings and Deductions Two-Column Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Earnings Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-emerald-50 px-4 py-2 border-b border-slate-200 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                        A. Earnings & Entitlements
                      </div>
                      <table className="w-full text-[13px]">
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-2.5 text-slate-600">
                              Final Month Salary ({settlement?.workedDaysInFinalMonth || 0} worked days)
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.finalSalaryPayable || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">
                              Leave Encashment ({settlement?.leaveEncashmentDays || 0} days unutilized)
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.leaveEncashmentAmount || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">Approved Expense Reimbursements</td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.pendingReimbursements || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">Overtime Compensation</td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.overtimePay || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          {settlement?.gratuityOrBonus > 0 && (
                            <tr>
                              <td className="p-2.5 text-slate-600">Gratuity / Ex-Gratia Bonus</td>
                              <td className="p-2.5 text-right font-mono font-medium">
                                ₹{settlement.gratuityOrBonus.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-slate-50 font-bold border-t border-slate-300">
                            <td className="p-2.5 text-slate-900">Total Gross Earnings (A)</td>
                            <td className="p-2.5 text-right font-mono text-emerald-700">
                              ₹{(settlement?.grossEarnings || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Deductions Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-rose-50 px-4 py-2 border-b border-slate-200 text-rose-900 font-bold text-xs uppercase tracking-wide">
                        B. Deductions & Recoveries
                      </div>
                      <table className="w-full text-[13px]">
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-2.5 text-slate-600">
                              Loss of Pay (LOP) ({settlement?.lopDays || 0} days absent)
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.lopDeduction || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">
                              Notice Period Shortfall ({settlement?.noticeShortfallDays || 0} days)
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.noticeShortfallDeduction || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">Unreturned IT / Asset Recoveries</td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.assetRecoveryAmount || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">Salary Advances / Loan Recovery</td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.loanOrAdvanceRecovery || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">Statutory Deductions (PF / PT / ESI)</td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              ₹{(settlement?.statutoryDeductions || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                          <tr className="bg-slate-50 font-bold border-t border-slate-300">
                            <td className="p-2.5 text-slate-900">Total Deductions (B)</td>
                            <td className="p-2.5 text-right font-mono text-rose-700">
                              ₹{(settlement?.totalDeductions || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Net Payable Banner */}
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                        Net Full & Final Payable (A - B)
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Status: <strong className="text-indigo-700">{settlement?.status || "CALCULATED"}</strong>
                        {settlement?.paymentReference ? ` • Ref: ${settlement.paymentReference}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-950 font-mono">
                        ₹{(settlement?.netPayable || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200">
                    <div>
                      <div className="h-12"></div>
                      <div className="border-t border-slate-400 pt-1 text-slate-700 font-bold text-xs">
                        Authorized Signatory (HR / Finance)
                      </div>
                      <p className="text-xs text-slate-500">{org.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="h-12"></div>
                      <div className="border-t border-slate-400 pt-1 text-slate-700 font-bold text-xs">
                        Employee Acceptance Signature
                      </div>
                      <p className="text-xs text-slate-500">{emp.name} ({emp.code})</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── 2. NO-DUES CLEARANCE CERTIFICATE ────────────────────────────── */}
              {docType === "CLEARANCE_CERTIFICATE" && (
                <div className="space-y-6">
                  <div className="text-center py-1">
                    <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-wide">
                      No-Dues Clearance Certificate
                    </h2>
                    <p className="text-xs text-slate-500">Official Departmental Exit Sign-Off Form</p>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    This is to certify that <strong>{emp.name}</strong> (Employee Code:{" "}
                    <strong>{emp.code}</strong>), working in the <strong>{emp.department}</strong> department, has
                    completed all necessary separation protocols and project handovers. The clearance status across all
                    functional business units is recorded below:
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold text-xs uppercase">
                        <tr>
                          <th className="p-3 text-left">Department</th>
                          <th className="p-3 text-left">Handover Item / Requirement</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Dues / Recovery</th>
                          <th className="p-3 text-right">Cleared By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clearances.map((c: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">
                              {c.department.replace(/_/g, " ")}
                            </td>
                            <td className="p-3 text-slate-600">{c.itemName}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                  c.status === "CLEARED" || c.status === "WAIVED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {c.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono">
                              {c.recoveryAmount > 0 ? `₹${c.recoveryAmount}` : "Nil"}
                            </td>
                            <td className="p-3 text-right text-slate-600">{c.clearedBy || "Department Head"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-slate-600 italic">
                    Based on the verified endorsements above, the organization confirms that no assets or financial liabilities are outstanding.
                  </p>

                  <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200">
                    <div>
                      <div className="h-12"></div>
                      <div className="border-t border-slate-400 pt-1 text-slate-700 font-bold text-xs">
                        Head of Human Resources
                      </div>
                      <p className="text-xs text-slate-500">{org.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="h-12"></div>
                      <div className="border-t border-slate-400 pt-1 text-slate-700 font-bold text-xs">
                        Corporate Finance Controller
                      </div>
                      <p className="text-xs text-slate-500">{org.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── 3. RELIEVING LETTER ─────────────────────────────────────────── */}
              {docType === "RELIEVING_LETTER" && (
                <div className="space-y-6">
                  <div className="text-center py-1">
                    <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-wide">
                      Relieving Order
                    </h2>
                  </div>

                  <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <p>
                      <strong>Date:</strong> {docData?.generatedDate}
                    </p>
                    <p>
                      <strong>To:</strong>
                      <br />
                      <strong>{emp.name}</strong>
                      <br />
                      Employee Code: {emp.code}
                      <br />
                      Designation: {emp.designation}
                    </p>

                    <p className="font-bold text-slate-900 pt-2">
                      Sub: Relieving Letter from Services of {org.name}
                    </p>

                    <p>
                      Dear <strong>{emp.name}</strong>,
                    </p>

                    <p>
                      This has reference to your formal resignation letter dated <strong>{docData?.exit?.resignationDate}</strong>.
                      We would like to confirm that your resignation has been accepted and you are hereby officially relieved
                      from your duties and services at <strong>{org.name}</strong> with effect from the close of business
                      hours on <strong>{emp.lastWorkingDay}</strong>.
                    </p>

                    <p>
                      We confirm that all company assets, credentials, and documentation under your stewardship have been
                      satisfactorily returned and your Full & Final accounts have been settled in accordance with organizational
                      policy.
                    </p>

                    <p>
                      We take this opportunity to appreciate your contributions during your tenure with the organization and
                      wish you every success in your future personal and professional endeavors.
                    </p>

                    <div className="pt-10">
                      <p>Sincerely,</p>
                      <p className="font-bold text-slate-900 mt-1">For {org.name}</p>
                      <div className="h-12"></div>
                      <p className="font-bold text-slate-900">Authorized Signatory</p>
                      <p className="text-xs text-slate-500">People Operations & Human Resources</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── 4. EXPERIENCE CERTIFICATE ───────────────────────────────────── */}
              {docType === "EXPERIENCE_LETTER" && (
                <div className="space-y-6">
                  <div className="text-center py-1">
                    <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-wide">
                      Service & Experience Certificate
                    </h2>
                    <p className="text-xs text-slate-500">To Whomsoever It May Concern</p>
                  </div>

                  <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <p>
                      This is to certify that <strong>{emp.name}</strong> (Employee ID: <strong>{emp.code}</strong>) was
                      gainfully employed with <strong>{org.name}</strong> from <strong>{emp.joiningDate}</strong> to{" "}
                      <strong>{emp.lastWorkingDay}</strong>.
                    </p>

                    <p>
                      At the time of leaving the organization, {emp.name} was holding the position of{" "}
                      <strong>{emp.designation}</strong> in the <strong>{emp.department}</strong> department, operating out
                      of our <strong>{emp.branch}</strong> office.
                    </p>

                    <p>
                      During their tenure of employment with us, we observed them to be diligent, sincere, result-oriented,
                      and professional in their conduct. Their character and commitment towards assigned responsibilities have
                      been exemplary.
                    </p>

                    <p>
                      We certify that they have performed their duties to our complete satisfaction and we wish them great
                      success in all their future pursuits.
                    </p>

                    <div className="pt-12">
                      <p>For {org.name},</p>
                      <div className="h-12"></div>
                      <p className="font-bold text-slate-900">Head of Human Resources</p>
                      <p className="text-xs text-slate-500">{org.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
