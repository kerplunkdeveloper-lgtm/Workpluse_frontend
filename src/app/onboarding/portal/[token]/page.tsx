"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { onboardingApi } from "@/lib/api";
import { OnboardingCandidate } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CloudUpload,
  FileCheck2,
  FileText,
  Loader2,
  Mail,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const steps = ["Profile", "Offer", "Documents", "Ready"];

const statusLabel = (status: string) => status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function CandidatePortalPage() {
  const params = useParams();
  const token = params?.token as string;
  const [candidate, setCandidate] = useState<OnboardingCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [signature, setSignature] = useState("");
  const [docType, setDocType] = useState("AADHAAR");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadCandidate = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await onboardingApi.getPortalCandidate(token);
      if (res?.success && (res.data || res.candidate)) setCandidate(res.data || res.candidate);
      else setError(res?.message || "This onboarding invitation is not available.");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "This onboarding invitation is not available.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadCandidate(); }, [loadCandidate]);

  const respond = async (action: "ACCEPT" | "REJECT") => {
    if (action === "ACCEPT" && !signature.trim()) {
      toast.error("Type your full name as a digital signature before accepting");
      return;
    }
    setIsResponding(true);
    try {
      const res = await onboardingApi.respondOffer(token, action, signature.trim() || undefined);
      if (!res?.success) throw new Error(res?.message || "Could not update your offer response");
      if (action === "ACCEPT") {
        toast.success("Offer accepted. Welcome to the team!");
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 } });
      } else toast.success("Your response has been recorded");
      await loadCandidate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not update your response");
    } finally {
      setIsResponding(false);
    }
  };

  const uploadDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) return toast.error("Choose a file before uploading");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("documentType", docType);
      formData.append("file", selectedFile);
      const res = await onboardingApi.uploadPortalDocument(token, formData);
      if (!res?.success) throw new Error(res?.message || "Document upload failed");
      toast.success("Document uploaded");
      setSelectedFile(null);
      await loadCandidate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Document upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const accepted = candidate?.status === "ACCEPTED" || candidate?.status === "ONBOARDED";
  const rejected = candidate?.status === "REJECTED" || candidate?.status === "OFFER_REJECTED";
  const progress = accepted ? 4 : candidate?.documents?.length ? 3 : candidate?.status === "OFFER_SENT" ? 2 : 1;
  const documentCount = candidate?.documents?.length || 0;
  const companyName = "WorkPulse";
  const initials = candidate ? `${candidate.firstName?.[0] || ""}${candidate.lastName?.[0] || ""}` : "W";

  const documentTypes = useMemo(() => [
    ["AADHAAR", "Aadhaar card"],
    ["PAN", "PAN card"],
    ["DEGREE_CERTIFICATE", "Degree certificate"],
    ["RELIEVING_LETTER", "Relieving letter"],
    ["OTHER", "Other document"],
  ], []);

  if (loading) {
    return <div className="min-h-[100dvh] bg-slate-50 p-5 sm:p-10"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-8 w-36 rounded-lg bg-slate-200" /><div className="mt-12 h-48 rounded-[28px] bg-white" /><div className="mt-5 grid gap-5 md:grid-cols-2"><div className="h-72 rounded-[28px] bg-white" /><div className="h-72 rounded-[28px] bg-white" /></div></div></div>;
  }

  if (error || !candidate) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-5 text-center">
        <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-44px_rgba(15,23,42,.3)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><CircleAlert className="h-7 w-7" /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-slate-400">WorkPulse onboarding</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Invitation unavailable</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">{error || "This invitation link is invalid or has expired. Ask your hiring contact to send a fresh invitation."}</p>
          <a href="mailto:support@workpulse.com" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">Contact support <ArrowRight className="h-4 w-4" /></a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-slate-50 text-slate-950">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-9">
        <header className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-900/15">W</div>
            <div><p className="text-sm font-bold tracking-tight text-slate-950">{companyName}</p><p className="text-xs text-slate-500">Candidate onboarding</p></div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Secure private portal</div>
        </header>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Your next chapter starts here</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.045em] text-slate-950 sm:text-5xl">Welcome, {candidate.firstName}.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">Review your offer, submit the required documents, and complete your onboarding in a few simple steps.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:mb-1">
            <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-500">Onboarding progress</span><span className="font-bold text-slate-900">{progress}/4 complete</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(progress / 4) * 100}%` }} /></div>
            <div className="mt-3 grid grid-cols-4 text-[10px] font-semibold text-slate-400">{steps.map((step, index) => <span key={step} className={index < progress ? "text-indigo-600" : ""}>{step}</span>)}</div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,.35)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-700">{initials.toUpperCase()}</div><div><p className="text-lg font-semibold text-slate-950">{candidate.firstName} {candidate.lastName}</p><p className="mt-0.5 text-sm text-slate-500">{candidate.designation}</p></div></div></div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${accepted ? "bg-emerald-50 text-emerald-700" : rejected ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{statusLabel(candidate.status)}</span>
          </div>
          <div className="grid gap-3 pt-6 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Annual CTC</p><p className="mt-2 text-lg font-semibold text-slate-950">{formatCurrency(candidate.proposedSalary ?? candidate.offeredSalary)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Joining date</p><p className="mt-2 text-lg font-semibold text-slate-950">{formatDate(candidate.expectedJoinDate || candidate.joiningDate)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</p><p className="mt-2 truncate text-sm font-semibold text-slate-950">{candidate.email}</p></div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex items-center gap-3">{accepted ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : rejected ? <XCircle className="h-5 w-5 text-rose-600" /> : <Clock3 className="h-5 w-5 text-indigo-600" />}<p className="text-sm font-medium text-slate-700">{accepted ? "Offer accepted. Welcome aboard." : rejected ? "This offer was declined." : "Please review and respond to your offer."}</p></div>
            {!accepted && !rejected && <div className="w-full space-y-3 sm:w-auto sm:min-w-[23rem]"><label className="block text-xs font-semibold text-slate-600">Digital signature <span className="font-normal text-slate-400">(type your full name to accept)</span><input value={signature} onChange={(event) => setSignature(event.target.value)} placeholder={`${candidate.firstName} ${candidate.lastName || ""}`.trim()} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></label><div className="flex justify-end gap-2"><button onClick={() => respond("REJECT")} disabled={isResponding} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-50">Decline</button><button onClick={() => respond("ACCEPT")} disabled={isResponding || !signature.trim()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/15 transition hover:bg-[#123276] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50">{isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept offer</button></div></div>}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">Step 3</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Submit your documents</h2><p className="mt-2 text-sm leading-6 text-slate-500">Upload clear files so HR can verify your onboarding details.</p></div><FileCheck2 className="h-6 w-6 text-slate-300" /></div>
            <form onSubmit={uploadDocument} className="mt-6 space-y-4">
              <label className="block text-xs font-bold text-slate-600">Document type<select value={docType} onChange={(e) => setDocType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">{documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"><CloudUpload className="h-7 w-7 text-indigo-500" /><span className="mt-3 text-sm font-semibold text-slate-800">{selectedFile ? selectedFile.name : "Choose a file to upload"}</span><span className="mt-1 text-xs text-slate-500">PDF, PNG or JPG up to the allowed file size</span><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="sr-only" /></label>
              <button type="submit" disabled={isUploading || !selectedFile} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40">{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload document</button>
            </form>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">Your files</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Document checklist</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{documentCount} uploaded</span></div><div className="mt-6 space-y-2">{documentCount === 0 ? <div className="rounded-2xl bg-slate-50 p-5 text-center"><FileText className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">No documents yet</p><p className="mt-1 text-xs leading-5 text-slate-500">Your uploaded documents will appear here for review.</p></div> : candidate.documents?.map((doc) => <div key={doc.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-white p-2 text-indigo-600"><FileText className="h-4 w-4" /></div><span className="truncate text-sm font-semibold text-slate-800">{doc.documentType.replace(/_/g, " ")}</span></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${doc.status === "VERIFIED" ? "bg-emerald-50 text-emerald-700" : doc.status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{doc.status}</span></div>)}</div></div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-1 py-8 text-xs text-slate-400"><span>Need help? Contact your hiring team.</span><span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Securely powered by WorkPulse</span></footer>
      </div>
    </main>
  );
}
