"use client";

import React, { useState, useEffect } from "react";
import { OnboardingCandidate } from "@/types";
import { onboardingApi, branchesApi, departmentsApi } from "@/lib/api";
import { formatCurrency, formatDate, unwrapList } from "@/lib/utils";
import {
  UserPlus,
  Send,
  CheckCircle2,
  ExternalLink,
  Plus,
  Loader2,
  Mail,
  DollarSign,
  FileText,
  ShieldCheck,
  ArrowRight,
  Search,
  BriefcaseBusiness,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { confetti } from "@/lib/confetti";
import Link from "next/link";
import PhoneInput, { toE164, validatePhone, type CountryCode } from "@/components/ui/PhoneInput";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import CandidateDocumentsModal from "./CandidateDocumentsModal";
import { useAuth } from "@/context/AuthContext";

const STAGES = [
  { id: "INVITED", label: "Invited", hint: "Candidate has received the portal link", statuses: ["INVITED"], color: "border-slate-200 bg-slate-50/70", tone: "bg-slate-100 text-slate-700" },
  {
    id: "REVIEW",
    label: "Profile / Review",
    statuses: ["PROFILE_SUBMITTED", "UNDER_HR_REVIEW"],
    hint: "Candidate submits profile and documents", color: "border-indigo-200 bg-indigo-50/40", tone: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "READY",
    label: "Verified / Offer ready",
    statuses: ["HR_VERIFIED", "ADMIN_APPROVED", "OFFER_GENERATED"],
    hint: "HR verifies details before the offer", color: "border-sky-200 bg-sky-50/40", tone: "bg-sky-100 text-sky-700",
  },
  { id: "OFFER_SENT", label: "Offer Sent", hint: "Offer is sent by email and WhatsApp", statuses: ["OFFER_SENT"], color: "border-amber-200 bg-amber-50/40", tone: "bg-amber-100 text-amber-700" },
  { id: "ACCEPTED", label: "Accepted", hint: "Candidate confirms the offer", statuses: ["OFFER_ACCEPTED", "ACCEPTED"], color: "border-emerald-200 bg-emerald-50/40", tone: "bg-emerald-100 text-emerald-700" },
  { id: "ACTIVATED", label: "Activated", hint: "Employee account is ready for day one", statuses: ["ACTIVATED", "ONBOARDED"], color: "border-teal-200 bg-teal-50/40", tone: "bg-teal-100 text-teal-700" },
];

const SEND_OFFER_STATUSES = [
  "HR_VERIFIED",
  "ADMIN_APPROVED",
  "OFFER_GENERATED",
];
const VERIFY_STATUSES = ["PROFILE_SUBMITTED", "UNDER_HR_REVIEW"];
const ACTIVATE_STATUSES = ["OFFER_ACCEPTED", "ACCEPTED"];

export default function OnboardingView() {
  const { role } = useAuth();
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Invite Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [docsFor, setDocsFor] = useState<{ id: string; name: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>("+91");
  const [designation, setDesignation] = useState("");
  const [offeredSalary, setOfferedSalary] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [quickOfferOpen, setQuickOfferOpen] = useState(false);
  const [quickOfferCandidateId, setQuickOfferCandidateId] = useState("");

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
    const phoneError = validatePhone(phone, phoneCountryCode);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await onboardingApi.createJoiner({
        firstName,
        lastName,
        email,
        phone: toE164(phoneCountryCode, phone),
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
        setPhoneCountryCode("+91");
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

  const handleSendOffer = async (candidateId: string, status?: string) => {
    toast.loading("Generating offer letter & dispatching alerts...", { id: "send-offer" });
    try {
      if (status === "HR_VERIFIED") await onboardingApi.adminApproveOffer(candidateId);
      const sendRes = await onboardingApi.hrSendOffer(candidateId);
      toast.dismiss("send-offer");
      if (sendRes?.success) {
        toast.success("Offer letter dispatched via Email & WhatsApp!");
        loadPipeline();
        return true;
      } else {
        toast.error(sendRes?.message || "Failed to dispatch offer");
      }
    } catch (err: any) {
      toast.dismiss("send-offer");
      toast.error(err.response?.data?.message || err.message || "Failed to send offer");
    }
    return false;
  };

  const directOfferCandidates = candidates.filter((candidate) => SEND_OFFER_STATUSES.includes(candidate.status) && (candidate.status !== "HR_VERIFIED" || isAdmin));
  const quickOfferCandidate = directOfferCandidates.find((candidate) => candidate.id === quickOfferCandidateId);

  const handleQuickSendOffer = async () => {
    if (!quickOfferCandidate) {
      toast.error("Select a candidate who is ready for an offer.");
      return;
    }
    const sent = await handleSendOffer(quickOfferCandidate.id, quickOfferCandidate.status);
    if (sent) {
      setQuickOfferOpen(false);
      setQuickOfferCandidateId("");
    }
  };

  const handleResendOfferEmail = async (candidateId: string) => {
    toast.loading("Resending the saved offer by email...", { id: "resend-offer" });
    try {
      const response = await onboardingApi.hrSendOffer(candidateId, { resend: true, deliveryChannel: "EMAIL" });
      toast.dismiss("resend-offer");
      if (response?.success) toast.success("Offer email sent again");
      else toast.error(response?.message || "Could not resend offer email");
    } catch (err: any) {
      toast.dismiss("resend-offer");
      toast.error(err.response?.data?.message || err.message || "Could not resend offer email");
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

  const visibleCandidates = candidates.filter((candidate) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [candidate.firstName, candidate.lastName, candidate.email, candidate.designation, (candidate as any).employeeCode].filter(Boolean).join(" ").toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-6 text-white shadow-[0_22px_60px_-28px_rgba(15,23,42,.55)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-8rem] left-1/3 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.2em] text-indigo-300">People operations · hiring workspace</p>
            <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl"><UserPlus className="h-8 w-8 text-indigo-300" />Onboarding pipeline</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">A single place for HR to invite, verify, send offers, and activate new employees without losing the next step.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {directOfferCandidates.length > 0 && <button type="button" onClick={() => { setQuickOfferCandidateId(directOfferCandidates[0].id); setQuickOfferOpen(true); }} className="flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/25"><Mail className="h-4 w-4" />Send default offer</button>}
            <Link href="/onboarding/offer-template" className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"><FileText className="h-4 w-4 text-indigo-300" />Offer template</Link>
            <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400"><Plus className="h-4 w-4" />Invite new joiner</button>
          </div>
        </div>
        <div className="relative mt-7 grid gap-2 sm:grid-cols-3">
          {[{ label: "1. Invite", text: "Create a secure candidate portal" }, { label: "2. Review", text: "Verify documents and offer details" }, { label: "3. Activate", text: "Create the employee account" }].map((step, index) => (
            <div key={step.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-indigo-200">{index + 1}</span>
              <div><p className="text-xs font-bold text-white">{step.label}</p><p className="mt-0.5 text-[11px] text-slate-400">{step.text}</p></div>
              {index < 2 && <ArrowRight className="ml-auto hidden h-4 w-4 text-slate-600 sm:block" />}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total candidates", candidates.length, "All active records"],
          ["Needs review", candidates.filter((c) => VERIFY_STATUSES.includes(c.status)).length, "HR action required"],
          ["Offers in motion", candidates.filter((c) => SEND_OFFER_STATUSES.includes(c.status) || c.status === "OFFER_SENT").length, "Ready to progress"],
          ["Activated", candidates.filter((c) => c.status === "ACTIVATED" || c.status === "ONBOARDED").length, "Ready for day one"],
        ].map(([label, value, detail]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <div className="mt-2 flex items-end justify-between gap-2"><span className="text-2xl font-semibold tracking-tight text-slate-950">{value}</span><span className="text-right text-[10px] font-medium text-slate-400">{detail}</span></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 ring-1 ring-slate-200 focus-within:ring-indigo-300">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, email or role" className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
        </div>
        <p className="text-xs font-medium text-slate-500">{visibleCandidates.length} of {candidates.length} candidates</p>
      </div>

      {/* Pipeline Board */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_18px_50px_-34px_rgba(15,23,42,.3)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
          <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-indigo-600">Live workflow</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Candidate pipeline</h2><p className="mt-1 text-xs text-slate-500">Open a card, complete the highlighted action, and move the candidate forward.</p></div>
          {loading && <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Syncing pipeline</span>}
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1420px] grid-cols-6 gap-3">
        {STAGES.map((stage, stageIndex) => {
          const stageCandidates = visibleCandidates.filter((c) => stage.statuses.includes(c.status));
          return (
            <div
              key={stage.id}
              className={`flex min-h-[470px] flex-col rounded-2xl border p-3.5 ${stage.color}`}
            >
              <div className="mb-3 border-b border-slate-200/80 pb-3">
                <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{stageIndex + 1}. {stage.label}</span><span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${stage.tone}`}>{stageCandidates.length}</span></div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{stage.hint}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-current opacity-40" style={{ width: `${Math.max(12, ((stageCandidates.length / Math.max(1, visibleCandidates.length)) * 100))}%` }} /></div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {stageCandidates.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/80 bg-white/35 px-4 text-center"><span className="text-xs font-semibold text-slate-400">No candidates here</span><span className="mt-1 text-[10px] text-slate-400">This stage is clear</span></div>
                ) : (
                  stageCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_8px_20px_-16px_rgba(15,23,42,.4)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><h4 className="truncate text-sm font-bold text-slate-900">{cand.firstName} {cand.lastName}</h4><p className="mt-0.5 truncate text-xs font-semibold text-indigo-600">{cand.designation || "Role to be confirmed"}</p></div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">{`${cand.firstName?.[0] || "C"}${cand.lastName?.[0] || ""}`.toUpperCase()}</span>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex min-w-0 items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{cand.email}</span></div>
                        <div className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{(cand as any).department?.name || "Department not assigned"}</span></div>
                        <div className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="font-semibold text-slate-700">{formatCurrency(cand.proposedSalary ?? cand.offeredSalary)}</span></div>
                        {(cand.expectedJoinDate || cand.joiningDate) && <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span>Join {formatDate(cand.expectedJoinDate || cand.joiningDate)}</span></div>}
                      </div>

                      <button type="button" onClick={() => setDocsFor({ id: cand.id, name: `${cand.firstName} ${cand.lastName || ""}`.trim() })} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"><span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400" />Documents</span><span className="rounded-full bg-white px-2 py-0.5 text-[11px] tabular-nums ring-1 ring-slate-200">{((cand as any).documents || []).length}</span></button>

                      {(cand.token || cand.portalToken) && <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2"><Link href={`/onboarding/portal/${cand.token || cand.portalToken}`} target="_blank" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"><span>Open portal</span><ExternalLink className="h-3 w-3" /></Link>{VERIFY_STATUSES.includes(cand.status) ? <button onClick={() => handleHrVerify(cand.id)} className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">Verify</button> : cand.status === "HR_VERIFIED" && isAdmin ? <button onClick={() => handleSendOffer(cand.id, cand.status)} className="flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"><Send className="h-3 w-3" />Approve & send</button> : ["ADMIN_APPROVED", "OFFER_GENERATED"].includes(cand.status) ? <button onClick={() => handleSendOffer(cand.id, cand.status)} className="flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"><Send className="h-3 w-3" />Send default offer</button> : cand.status === "OFFER_SENT" ? <button onClick={() => handleResendOfferEmail(cand.id)} className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"><Mail className="h-3 w-3" />Resend email</button> : ACTIVATE_STATUSES.includes(cand.status) && isAdmin ? <button onClick={() => handleActivateAccount(cand.id)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"><CheckCircle2 className="h-3 w-3" />Activate</button> : cand.status === "HR_VERIFIED" ? <span className="text-xs font-semibold text-slate-400">Awaiting admin approval</span> : cand.status === "ACTIVATED" || cand.status === "ONBOARDED" ? <span className="flex items-center gap-1 text-xs font-bold text-teal-700"><ShieldCheck className="h-3 w-3" />Active</span> : null}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </section>

      {/* Invite Joiner Modal */}
      {modalOpen && (
        <Modal>
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
                  <PhoneInput value={phone} onChange={setPhone} countryCode={phoneCountryCode} onCountryCodeChange={setPhoneCountryCode} />
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
                  <Select
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
                  </Select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Department</label>
                  <Select
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
                  </Select>
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
        </Modal>
      )}

      {quickOfferOpen && (
        <Modal>
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Mail className="h-5 w-5" /></span>
              <div>
                <h3 className="text-lg font-bold text-slate-950">Send default offer</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">Use the active company offer-letter template and dispatch it from this pipeline.</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-slate-600">Candidate<Select value={quickOfferCandidateId} onChange={(event) => setQuickOfferCandidateId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"><option value="">Select a ready candidate</option>{directOfferCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.firstName} {candidate.lastName || ""} · {candidate.email}</option>)}</Select></label>
              {quickOfferCandidate && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{quickOfferCandidate.firstName} {quickOfferCandidate.lastName || ""}</p><p className="mt-1 text-xs text-slate-500">{quickOfferCandidate.designation || "Role to be confirmed"} · {quickOfferCandidate.email}</p></div><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">{quickOfferCandidate.status.replaceAll("_", " ")}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600"><span><strong className="block text-[10px] uppercase tracking-wider text-slate-400">Annual CTC</strong>{formatCurrency(quickOfferCandidate.proposedSalary ?? quickOfferCandidate.offeredSalary)}</span><span><strong className="block text-[10px] uppercase tracking-wider text-slate-400">Delivery</strong>Email + WhatsApp</span></div></div>}
              <p className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs leading-5 text-indigo-800">The current active company template will be used. Review or change it from <Link href="/onboarding/offer-template" className="font-bold underline">Offer template</Link> before sending.</p>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => { setQuickOfferOpen(false); setQuickOfferCandidateId(""); }} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void handleQuickSendOffer()} disabled={!quickOfferCandidate} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />Send default offer</button></div>
          </div>
        </Modal>
      )}

      {docsFor && <CandidateDocumentsModal candidateId={docsFor.id} candidateName={docsFor.name} onClose={() => setDocsFor(null)} />}
    </div>
  );
}
