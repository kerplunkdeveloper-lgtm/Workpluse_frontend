"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { onboardingApi } from "@/lib/api";
import { OnboardingCandidate } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function CandidatePortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [candidate, setCandidate] = useState<OnboardingCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);

  // Document upload state
  const [docType, setDocType] = useState("AADHAAR");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadCandidate = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await onboardingApi.getPortalCandidate(token);
      if (res?.success && (res.data || res.candidate)) {
        setCandidate(res.data || res.candidate);
      } else {
        setError(res?.message || "Candidate invitation not found or expired.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load portal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidate();
  }, [token]);

  const handleResponse = async (action: "ACCEPTED" | "REJECTED") => {
    setIsResponding(true);
    try {
      const res = await onboardingApi.respondOffer(token, action);
      if (res?.success) {
        if (action === "ACCEPTED") {
          toast.success("Congratulations! Offer accepted successfully!");
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        } else {
          toast.info("Offer declined.");
        }
        loadCandidate();
      } else {
        toast.error(res?.message || "Failed to update offer response");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Action failed");
    } finally {
      setIsResponding(false);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("documentType", docType);
      formData.append("file", selectedFile);

      const res = await onboardingApi.uploadPortalDocument(token, formData);
      if (res?.success) {
        toast.success("Document uploaded successfully!");
        setSelectedFile(null);
        loadCandidate();
      } else {
        toast.error(res?.message || "Document upload failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Verifying onboarding invitation token...</p>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
          <XCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invitation Unavailable</h2>
        <p className="text-xs text-slate-500 max-w-sm">{error || "Invalid candidate link."}</p>
      </div>
    );
  }

  const isAccepted = candidate.status === "ACCEPTED" || candidate.status === "ONBOARDED";
  const isRejected = candidate.status === "REJECTED";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-serif text-lg">
              W
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold text-slate-900">WorkPulse onboarding</h1>
              <p className="text-xs text-slate-500">Digital Candidate Journey & Offer Acceptance</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {candidate.status}
          </span>
        </div>

        {/* Welcome Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome, {candidate.firstName} {candidate.lastName}! 🎉
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            We are excited to welcome you to the team. Please review your employment offer details and submit your verification documents below.
          </p>

          {/* Offer Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Designation
              </span>
              <span className="text-base font-bold text-slate-900">{candidate.designation}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Offered Annual CTC
              </span>
              <span className="text-base font-bold text-emerald-700">
                {formatCurrency(candidate.offeredSalary)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Expected Joining Date
              </span>
              <span className="text-base font-bold text-indigo-700">
                {formatDate(candidate.joiningDate)}
              </span>
            </div>
          </div>

          {/* Offer Acceptance Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              {isAccepted ? (
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>You have formally accepted this offer letter. Welcome aboard!</span>
                </div>
              ) : isRejected ? (
                <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                  <XCircle className="w-5 h-5" />
                  <span>You have declined this offer letter.</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Please respond to your offer letter before the expiration date.
                </p>
              )}
            </div>

            {!isAccepted && !isRejected && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleResponse("REJECTED")}
                  disabled={isResponding}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleResponse("ACCEPTED")}
                  disabled={isResponding}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  Accept Offer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Document Submission Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Mandatory KYC & Onboarding Documents
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload copies of your Government ID, educational certificates, and relieving letters
            </p>
          </div>

          <form onSubmit={handleDocumentUpload} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="AADHAAR">Aadhaar Card (National ID)</option>
                  <option value="PAN">PAN Card (Tax ID)</option>
                  <option value="DEGREE_CERTIFICATE">Highest Degree Certificate</option>
                  <option value="RELIEVING_LETTER">Relieving Letter from Previous Org</option>
                  <option value="OTHER">Other Supporting Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Choose File (PDF, PNG, JPG)
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Upload className="w-3.5 h-3.5 text-white" />}
                Upload Document
              </button>
            </div>
          </form>

          {/* Uploaded Documents List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Uploaded Documents ({candidate.documents?.length || 0})
            </h4>

            {!candidate.documents || candidate.documents.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 italic">No documents uploaded yet.</p>
            ) : (
              candidate.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-900">{doc.documentType.replace(/_/g, " ")}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      doc.status === "VERIFIED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
