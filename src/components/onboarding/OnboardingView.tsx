"use client";

import React, { useState, useEffect } from "react";
import { OnboardingCandidate } from "@/types";
import { onboardingApi, branchesApi, departmentsApi } from "@/lib/api";
import { formatCurrency, formatDate, unwrapList } from "@/lib/utils";
import {
  UserPlus,
  Send,
  CheckCircle2,
  FileText,
  Clock,
  ExternalLink,
  Plus,
  Loader2,
  Mail,
  Building,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import Link from "next/link";

const STAGES = [
  { id: "INVITED", label: "Invited", statuses: ["INVITED"], color: "border-slate-200 bg-slate-50/70" },
  {
    id: "REVIEW",
    label: "Profile / Review",
    statuses: ["PROFILE_SUBMITTED", "UNDER_HR_REVIEW"],
    color: "border-indigo-200 bg-indigo-50/40",
  },
  {
    id: "READY",
    label: "Verified / Offer ready",
    statuses: ["HR_VERIFIED", "ADMIN_APPROVED", "OFFER_GENERATED"],
    color: "border-sky-200 bg-sky-50/40",
  },
  { id: "OFFER_SENT", label: "Offer Sent", statuses: ["OFFER_SENT"], color: "border-amber-200 bg-amber-50/40" },
  { id: "ACCEPTED", label: "Accepted", statuses: ["OFFER_ACCEPTED", "ACCEPTED"], color: "border-emerald-200 bg-emerald-50/40" },
  { id: "ACTIVATED", label: "Activated", statuses: ["ACTIVATED", "ONBOARDED"], color: "border-teal-200 bg-teal-50/40" },
];

const SEND_OFFER_STATUSES = [
  "INVITED",
  "PROFILE_SUBMITTED",
  "UNDER_HR_REVIEW",
  "HR_VERIFIED",
  "ADMIN_APPROVED",
  "OFFER_GENERATED",
  "APPLIED",
  "INTERVIEWING",
];
const VERIFY_STATUSES = ["PROFILE_SUBMITTED", "UNDER_HR_REVIEW"];
const ACTIVATE_STATUSES = ["OFFER_ACCEPTED", "ACCEPTED"];

export default function OnboardingView() {
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Invite Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [offeredSalary, setOfferedSalary] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPipeline = async () => {
    setLoading(true);
    try {
      const [candRes, brRes, deptRes] = await Promise.allSettled([
        onboardingApi.listCandidates(),
        branchesApi.list(),
        departmentsApi.list(),
      ]);

      if (candRes.status === "fulfilled") setCandidates(unwrapList<OnboardingCandidate>(candRes.value));
      if (brRes.status === "fulfilled") setBranches(unwrapList(brRes.value));
      if (deptRes.status === "fulfilled") setDepartments(unwrapList(deptRes.value));
    } catch (err) {
      console.error("Failed to load onboarding pipeline:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const handleCreateJoiner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await onboardingApi.createJoiner({
        firstName,
        lastName,
        email,
        phone,
        designation,
        offeredSalary: Number(offeredSalary),
        proposedSalary: Number(offeredSalary),
        departmentId: departmentId || undefined,
        branchId: branchId || undefined,
        joiningDate: joiningDate || undefined,
        expectedJoinDate: joiningDate || undefined,
      });

      if (res?.success) {
        toast.success("Candidate invitation created and portal token generated!");
        confetti({ particleCount: 50, spread: 60 });
        setModalOpen(false);
        // Reset
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setDesignation("");
        setOfferedSalary("");
        loadPipeline();
      } else {
        toast.error(res?.message || "Failed to create candidate");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to create candidate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOffer = async (candidateId: string) => {
    toast.loading("Generating offer letter & dispatching alerts...", { id: "send-offer" });
    try {
      await onboardingApi.adminApproveOffer(candidateId);
      const sendRes = await onboardingApi.hrSendOffer(candidateId);
      toast.dismiss("send-offer");
      if (sendRes?.success) {
        toast.success("Offer letter dispatched via Email & WhatsApp!");
        loadPipeline();
      } else {
        toast.error(sendRes?.message || "Failed to dispatch offer");
      }
    } catch (err: any) {
      toast.dismiss("send-offer");
      toast.error(err.response?.data?.message || err.message || "Failed to send offer");
    }
  };

  const handleHrVerify = async (candidateId: string) => {
    try {
      const res = await onboardingApi.hrVerify(candidateId, { action: "APPROVE" });
      if (res?.success) {
        toast.success("Candidate verified");
        loadPipeline();
      } else toast.error(res?.message || "Verify failed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Verify failed");
    }
  };

  const handleActivateAccount = async (candidateId: string) => {
    toast.loading("Activating employee account and provisioning credentials...", { id: "activate-emp" });
    try {
      const res = await onboardingApi.adminActivate(candidateId);
      toast.dismiss("activate-emp");
      if (res?.success) {
        toast.success("Candidate activated into full employee account!");
        confetti({ particleCount: 80, spread: 70 });
        loadPipeline();
      } else {
        toast.error(res?.message || "Activation failed");
      }
    } catch (err: any) {
      toast.dismiss("activate-emp");
      toast.error(err.response?.data?.message || err.message || "Activation failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <UserPlus className="w-7 h-7 text-indigo-600" />
            Digital Candidate Onboarding Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track hiring stages, dispatch digital offer letters with one-click portal links, and activate employee accounts
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Invite New Joiner
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {STAGES.map((stage) => {
          const stageCandidates = candidates.filter((c) => stage.statuses.includes(c.status));
          return (
            <div
              key={stage.id}
              className={`rounded-3xl border p-4 flex flex-col min-h-[500px] ${stage.color}`}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <span className="font-bold text-xs text-slate-800 tracking-wide uppercase">
                  {stage.label}
                </span>
                <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center shadow-xs">
                  {stageCandidates.length}
                </span>
              </div>

              {/* Cards in this Stage */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {stageCandidates.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-slate-400 italic">
                    No candidates
                  </div>
                ) : (
                  stageCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="rounded-2xl p-4 border border-slate-200 bg-white space-y-3 hover:border-slate-300 shadow-xs transition"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {cand.firstName} {cand.lastName}
                        </h4>
                        <p className="text-xs text-indigo-600 font-medium">{cand.designation}</p>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{cand.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>Offered: {formatCurrency(cand.proposedSalary ?? cand.offeredSalary)}</span>
                        </div>
                        {(cand.expectedJoinDate || cand.joiningDate) && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Joining: {formatDate(cand.expectedJoinDate || cand.joiningDate)}</span>
                          </div>
                        )}
                      </div>

                      {/* Portal Link */}
                      {(cand.token || cand.portalToken) && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Link
                            href={`/onboarding/portal/${cand.token || cand.portalToken}`}
                            target="_blank"
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                          >
                            <span>Candidate Portal</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>

                          {VERIFY_STATUSES.includes(cand.status) ? (
                            <button
                              onClick={() => handleHrVerify(cand.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                            >
                              Verify
                            </button>
                          ) : SEND_OFFER_STATUSES.includes(cand.status) ? (
                            <button
                              onClick={() => handleSendOffer(cand.id)}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
                            >
                              <Send className="w-3 h-3" />
                              Send Offer
                            </button>
                          ) : ACTIVATE_STATUSES.includes(cand.status) ? (
                            <button
                              onClick={() => handleActivateAccount(cand.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Activate
                            </button>
                          ) : cand.status === "ACTIVATED" || cand.status === "ONBOARDED" ? (
                            <span className="text-xs text-teal-700 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Active
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Joiner Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Invite New Joiner to Pipeline</h3>
            <p className="text-xs text-slate-500 mb-4">
              Send onboarding invite with candidate portal link for document collection
            </p>

            <form onSubmit={handleCreateJoiner} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Annual CTC (INR) *</label>
                  <input
                    type="number"
                    value={offeredSalary}
                    onChange={(e) => setOfferedSalary(e.target.value)}
                    placeholder="e.g. 1200000"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Branch</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Proposed Joining Date *</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  required
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
                  Generate Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
