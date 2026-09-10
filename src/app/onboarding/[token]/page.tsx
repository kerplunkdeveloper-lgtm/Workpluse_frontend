'use client';

import React, { useState, useEffect, use } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  User,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Check,
  Calendar,
  Phone,
  Mail,
  MapPin,
  PartyPopper,
  Download,
  Printer,
  ExternalLink,
} from 'lucide-react';
import axios from 'axios';

interface OnboardingPortalProps {
  params: Promise<{ token: string }>;
}

export default function CandidateOnboardingPortal({ params }: OnboardingPortalProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [candidate, setCandidate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gender: 'Male',
    bloodGroup: 'O+',
    maritalStatus: 'Single',
    currentAddress: '',
    permanentAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    panNumber: '',
    aadhaarNumber: '',
  });

  // Document Uploads State
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Load candidate information by token
  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/onboarding/portal/${token}`);
      if (res.data?.data) {
        const c = res.data.data;
        setCandidate(c);
        setFormData({
          dateOfBirth: c.dateOfBirth ? c.dateOfBirth.split('T')[0] : '',
          gender: c.gender || 'Male',
          bloodGroup: c.bloodGroup || 'O+',
          maritalStatus: c.maritalStatus || 'Single',
          currentAddress: c.currentAddress || '',
          permanentAddress: c.permanentAddress || '',
          emergencyContactName: c.emergencyContactName || '',
          emergencyContactPhone: c.emergencyContactPhone || '',
          bankName: c.bankName || '',
          accountNumber: c.accountNumber || '',
          ifscCode: c.ifscCode || '',
          panNumber: c.panNumber || '',
          aadhaarNumber: c.aadhaarNumber || '',
        });

        // Set active step based on status
        if (c.status === 'INVITED') setCurrentStep(1);
        else if (c.status === 'PROFILE_SUBMITTED' && (!c.documents || c.documents.length === 0)) setCurrentStep(3);
        else setCurrentStep(4);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired onboarding invitation link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCandidate();
  }, [token]);

  // Handle Profile Update (Step 1 & 2)
  const handleSaveProfile = async (nextStep?: 2 | 3 | 4) => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await axios.put(`${API_URL}/onboarding/portal/${token}/profile`, formData);
      setCandidate(res.data?.data);
      setSuccessMsg('Profile details saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
      if (nextStep) setCurrentStep(nextStep);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile details');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Document Upload (Step 3)
  const handleFileUpload = async (docType: string, file: File) => {
    if (!file) return;
    try {
      setUploadingDocType(docType);
      setError(null);

      // Convert to Base64 data URL for self-contained document persistence
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileUrl = e.target?.result as string;
          await axios.post(`${API_URL}/onboarding/portal/${token}/documents`, {
            documentType: docType,
            fileName: file.name,
            fileUrl: fileUrl,
            fileSize: file.size,
            mimeType: file.type,
          });

          await fetchCandidate();
          setSuccessMsg(`Document '${file.name}' uploaded successfully!`);
          setTimeout(() => setSuccessMsg(null), 3000);
        } catch (postErr: any) {
          setError(postErr.response?.data?.message || 'Failed to upload document');
        } finally {
          setUploadingDocType(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Error processing file');
      setUploadingDocType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-9 w-9 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading your onboarding portal...</p>
        </div>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 shadow-xs">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Onboarding Link Error</h2>
          <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
          <p className="text-[11px] text-slate-400">
            Please reach out to your HR department or hiring coordinator to obtain a fresh invitation link.
          </p>
        </div>
      </div>
    );
  }

  const documents = candidate?.documents || [];
  const hasGovtId = documents.some((d: any) => d.documentType === 'GOVT_ID');
  const hasTaxId = documents.some((d: any) => d.documentType === 'TAX_ID');
  const hasDegree = documents.some((d: any) => d.documentType === 'DEGREE_CERTIFICATE');
  const hasBankProof = documents.some((d: any) => d.documentType === 'BANK_PROOF');

  return (
    <div className="min-h-screen bg-[#f8fafc] select-none pb-16">
      {/* Top Ambient Glow */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] border-b border-indigo-100/80 px-6 py-10 shadow-xs">
        <div className="mx-auto max-w-4xl relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2.5 rounded-full bg-white/90 pl-1.5 pr-3 py-1 text-[11px] font-bold text-indigo-900 backdrop-blur-md shadow-xs border border-indigo-100">
              <img src="/workpulse-logo.png" alt="WorkPulse" className="h-5 w-5 object-contain rounded-md" />
              <span>WorkPulse™ • Employee Onboarding Portal</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
              Welcome, {candidate?.firstName} {candidate?.lastName || ''}!
            </h1>
            <p className="text-xs lg:text-sm text-slate-600">
              You are being onboarded as <strong className="font-bold text-indigo-700">{candidate?.designation}</strong> at{' '}
              <strong className="font-bold text-slate-900">{candidate?.organization?.name}</strong>.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-indigo-100 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-2xs ${
                candidate?.status === 'ACTIVATED'
                  ? 'bg-emerald-500 text-white'
                  : candidate?.status === 'HR_VERIFIED'
                  ? 'bg-blue-500 text-white'
                  : candidate?.status === 'UNDER_HR_REVIEW'
                  ? 'bg-amber-500 text-white'
                  : candidate?.status === 'PROFILE_SUBMITTED'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-700 text-white'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{candidate?.status.replace(/_/g, ' ')}</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Joining Date: {new Date(candidate?.expectedJoinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Decorative background blurs */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-52 w-52 rounded-full bg-indigo-300/20 blur-2xl"></div>
        <div className="pointer-events-none absolute -top-12 left-40 h-44 w-44 rounded-full bg-blue-300/20 blur-2xl"></div>
      </div>

      <div className="mx-auto max-w-4xl px-4 mt-8 space-y-6">
        {/* Success Alert */}
        {successMsg && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 animate-in fade-in-50 duration-200 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-in fade-in-50 duration-200 shadow-xs">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4-Step Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center justify-center gap-2 rounded-2xl p-3.5 text-xs font-bold transition-all shadow-xs ${
              currentStep === 1
                ? 'bg-white text-indigo-700 border-2 border-indigo-500 shadow-sm'
                : 'bg-white/80 text-slate-500 border border-slate-200/80 hover:bg-white'
            }`}
          >
            <User className="h-4 w-4 text-indigo-600" />
            <span>1. Personal</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center justify-center gap-2 rounded-2xl p-3.5 text-xs font-bold transition-all shadow-xs ${
              currentStep === 2
                ? 'bg-white text-indigo-700 border-2 border-indigo-500 shadow-sm'
                : 'bg-white/80 text-slate-500 border border-slate-200/80 hover:bg-white'
            }`}
          >
            <CreditCard className="h-4 w-4 text-indigo-600" />
            <span>2. Bank & Tax</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center justify-center gap-2 rounded-2xl p-3.5 text-xs font-bold transition-all shadow-xs ${
              currentStep === 3
                ? 'bg-white text-indigo-700 border-2 border-indigo-500 shadow-sm'
                : 'bg-white/80 text-slate-500 border border-slate-200/80 hover:bg-white'
            }`}
          >
            <Upload className="h-4 w-4 text-indigo-600" />
            <span>3. Documents ({documents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(4)}
            className={`flex items-center justify-center gap-2 rounded-2xl p-3.5 text-xs font-bold transition-all shadow-xs ${
              currentStep === 4
                ? 'bg-white text-indigo-700 border-2 border-indigo-500 shadow-sm'
                : 'bg-white/80 text-slate-500 border border-slate-200/80 hover:bg-white'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
            <span>4. Review & Status</span>
          </button>
        </div>

        {/* STEP 1: PERSONAL INFORMATION */}
        {currentStep === 1 && (
          <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Step 1: Personal & Contact Information</h3>
              <p className="text-xs text-slate-400">Please provide your personal demographics and emergency contacts</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Marital Status</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Spouse / Parent name"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Residential Address</label>
                <textarea
                  rows={3}
                  placeholder="Flat / Building, Street, City, State, PIN"
                  value={formData.currentAddress}
                  onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Permanent Address</label>
                <textarea
                  rows={3}
                  placeholder="Permanent hometown address"
                  value={formData.permanentAddress}
                  onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSaveProfile(2)}
                disabled={submitting}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                <span>Save & Continue to Bank Details</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BANK & TAX INFORMATION */}
        {currentStep === 2 && (
          <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Step 2: Bank & Statutory Tax Details</h3>
              <p className="text-xs text-slate-400">Required for payroll salary transfers and statutory compliance</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank / ICICI / SBI"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="Bank Account Number"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-mono font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Permanent Account Number (PAN)</label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-mono font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Aadhaar / National ID Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1234-5678-9012"
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveProfile(3)}
                disabled={submitting}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                <span>Save & Continue to Documents</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DOCUMENT UPLOAD */}
        {currentStep === 3 && (
          <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 3: Upload Mandatory Documents</h3>
                <p className="text-xs text-slate-400">Upload clean PDF or image copies for HR credential verification</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {documents.length} / 4 Uploaded
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Doc 1: Govt Photo ID */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">1. Government Photo ID</span>
                  </div>
                  {hasGovtId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>Uploaded</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Required</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Aadhaar Card, Passport, or Voter ID (front & back)</p>
                <label className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                  <Upload className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{uploadingDocType === 'GOVT_ID' ? 'Uploading...' : 'Choose ID File'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload('GOVT_ID', e.target.files[0])}
                  />
                </label>
              </div>

              {/* Doc 2: PAN Card */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">2. PAN Card Copy</span>
                  </div>
                  {hasTaxId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>Uploaded</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Required</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Income Tax PAN card for TDS and payroll reporting</p>
                <label className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  <span>{uploadingDocType === 'TAX_ID' ? 'Uploading...' : 'Choose PAN File'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload('TAX_ID', e.target.files[0])}
                  />
                </label>
              </div>

              {/* Doc 3: Highest Degree Certificate */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">3. Degree / Academic Certificate</span>
                  </div>
                  {hasDegree ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>Uploaded</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Required</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Highest graduation or post-graduation certificate</p>
                <label className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                  <Upload className="h-3.5 w-3.5 text-purple-600" />
                  <span>{uploadingDocType === 'DEGREE_CERTIFICATE' ? 'Uploading...' : 'Choose Degree File'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload('DEGREE_CERTIFICATE', e.target.files[0])}
                  />
                </label>
              </div>

              {/* Doc 4: Bank Proof */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">4. Bank Passbook / Cheque</span>
                  </div>
                  {hasBankProof ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>Uploaded</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Cancelled cheque or passbook front page displaying IFSC</p>
                <label className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                  <Upload className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{uploadingDocType === 'BANK_PROOF' ? 'Uploading...' : 'Choose Bank Proof'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload('BANK_PROOF', e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Uploaded Document Dossier</h4>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <div>
                          <span className="font-bold text-slate-800 block">{doc.fileName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{doc.documentType}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            doc.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : doc.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {doc.status}
                        </span>
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <span>View</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <span>Proceed to Review</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & STATUS TRACKER */}
        {currentStep === 4 && (
          <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Step 4: Submission Review & Lifecycle Status</h3>
              <p className="text-xs text-slate-400">Track your onboarding verification and account activation progress</p>
            </div>

            {/* Workflow Milestones Progress Bar */}
            <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-700 block">Verification Lifecycle Pipeline:</span>
              <div className="flex items-center justify-between relative">
                {/* Step A */}
                <div className="flex flex-col items-center text-center z-10">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 mt-1">Profile Filled</span>
                </div>

                {/* Step B */}
                <div className="flex flex-col items-center text-center z-10">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      documents.length > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {documents.length > 0 ? <Check className="h-4 w-4" /> : '2'}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 mt-1">Docs Uploaded</span>
                </div>

                {/* Step C */}
                <div className="flex flex-col items-center text-center z-10">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      ['HR_VERIFIED', 'ACTIVATED'].includes(candidate?.status)
                        ? 'bg-emerald-500 text-white'
                        : candidate?.status === 'UNDER_HR_REVIEW'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {['HR_VERIFIED', 'ACTIVATED'].includes(candidate?.status) ? <Check className="h-4 w-4" /> : '3'}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 mt-1">HR Verified</span>
                </div>

                {/* Step D */}
                <div className="flex flex-col items-center text-center z-10">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      candidate?.status === 'ACTIVATED'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {candidate?.status === 'ACTIVATED' ? <Check className="h-4 w-4" /> : '4'}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 mt-1">Account Active</span>
                </div>
              </div>
            </div>

            {/* Offer Decision Review (When OFFER_SENT) */}
            {candidate?.status === 'OFFER_SENT' && candidate?.offerLetterData && (
              <div className="rounded-3xl border-2 border-indigo-200 bg-white p-6 shadow-md space-y-5 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Official Employment Offer Review</h4>
                      <p className="text-[11px] text-slate-400 font-mono">Ref: {candidate.offerLetterRef}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                    Action Required
                  </span>
                </div>

                {/* Offer Letter Summary */}
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Position:</span>
                      <span className="font-bold text-slate-900">{candidate.offerLetterData.designation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Location:</span>
                      <span className="font-semibold text-slate-800">{candidate.offerLetterData.branch}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Joining Date:</span>
                      <span className="font-semibold text-slate-800">{candidate.offerLetterData.expectedJoinDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Annual CTC:</span>
                      <span className="font-bold text-emerald-700">
                        ₹{candidate.offerLetterData.compensation.ctcAnnual?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Compensation Breakdown Table */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="py-1.5 px-3">Salary Component</th>
                          <th className="py-1.5 px-3 text-right">Monthly (₹)</th>
                          <th className="py-1.5 px-3 text-right">Annual (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        <tr>
                          <td className="py-1.5 px-3 font-sans">Basic Salary</td>
                          <td className="py-1.5 px-3 text-right">
                            ₹{candidate.offerLetterData.compensation.basicMonthly?.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            ₹{(candidate.offerLetterData.compensation.basicMonthly * 12)?.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-3 font-sans">House Rent Allowance (HRA)</td>
                          <td className="py-1.5 px-3 text-right">
                            ₹{candidate.offerLetterData.compensation.hraMonthly?.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            ₹{(candidate.offerLetterData.compensation.hraMonthly * 12)?.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-3 font-sans">Special / Flexible Allowance</td>
                          <td className="py-1.5 px-3 text-right">
                            ₹{candidate.offerLetterData.compensation.specialAllowanceMonthly?.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            ₹{(candidate.offerLetterData.compensation.specialAllowanceMonthly * 12)?.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="bg-indigo-50/70 font-bold text-indigo-950">
                          <td className="py-2 px-3 font-sans">Gross Total Monthly CTC</td>
                          <td className="py-2 px-3 text-right">
                            ₹{candidate.offerLetterData.compensation.grossMonthly?.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right">
                            ₹{candidate.offerLetterData.compensation.ctcAnnual?.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Terms: {candidate.offerLetterData.terms?.probationMonths} months probation, {candidate.offerLetterData.terms?.noticePeriodDays} days notice period. Standard hours: {candidate.offerLetterData.terms?.workingHours}.
                  </p>
                </div>

                {/* Candidate Decision Form */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-indigo-950">Confirm Acceptance & Digital Signature:</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Type Full Name as Digital Signature *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rohan Sharma"
                        value={formData.emergencyContactName ? formData.emergencyContactName : ''}
                        id="signatureInput"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          id="agreeCheckbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>I accept all employment terms and conditions</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const reason = prompt('Please enter the reason for declining this offer:') || 'Declined by candidate';
                        try {
                          setSubmitting(true);
                          await axios.post(`${API_URL}/onboarding/portal/${token}/respond-offer`, {
                            action: 'REJECT',
                            reason,
                          });
                          await fetchCandidate();
                          setSuccessMsg('Offer decision recorded.');
                        } catch (err: any) {
                          setError(err.response?.data?.message || 'Failed to record decision');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Decline Offer
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const sigElem = document.getElementById('signatureInput') as HTMLInputElement;
                        const signature = sigElem?.value || `${candidate.firstName} ${candidate.lastName || ''}`.trim();
                        try {
                          setSubmitting(true);
                          await axios.post(`${API_URL}/onboarding/portal/${token}/respond-offer`, {
                            action: 'ACCEPT',
                            signature,
                          });
                          await fetchCandidate();
                          setSuccessMsg('Congratulations! Offer accepted and employee account activated.');
                        } catch (err: any) {
                          setError(err.response?.data?.message || 'Failed to accept offer');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Accept Offer & Confirm Employment</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Current Status Callout */}
            {candidate?.status === 'ACTIVATED' || candidate?.status === 'OFFER_ACCEPTED' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xs">
                  <PartyPopper className="h-6 w-6" />
                </div>
                <h4 className="text-base font-black text-emerald-950">Congratulations! Offer Accepted & Account Activated</h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  You have accepted the offer of employment. Your digital signature ({candidate?.candidateSignature || 'Signed'}) has been recorded.
                </p>
                {candidate?.offerLetterRef && (
                  <div className="pt-2">
                    <span className="inline-block rounded-xl bg-white border border-emerald-200 px-4 py-2 text-xs font-mono font-bold text-emerald-900 shadow-2xs">
                      Offer Ref: {candidate.offerLetterRef}
                    </span>
                  </div>
                )}
              </div>
            ) : candidate?.status === 'OFFER_REJECTED' ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-center space-y-2">
                <h4 className="text-base font-black text-rose-950">Offer Declined</h4>
                <p className="text-xs text-rose-800 max-w-md mx-auto">
                  You have declined this offer of employment ({candidate?.offerRejectReason || 'No reason provided'}).
                </p>
              </div>
            ) : candidate?.status === 'OFFER_GENERATED' ? (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5 flex items-center gap-3">
                <FileText className="h-6 w-6 text-purple-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-purple-900">Admin Approved — Offer Letter in Review</h4>
                  <p className="text-[11px] text-purple-700">
                    The company administration has approved your profile and generated the formal Offer Letter. HR is conducting final review before releasing it for your acceptance.
                  </p>
                </div>
              </div>
            ) : candidate?.status === 'HR_VERIFIED' ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900">HR Verification Complete!</h4>
                  <p className="text-[11px] text-blue-700">
                    Your documents have been verified by HR. Company administration is reviewing for final employee code allocation and offer letter generation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 flex items-center gap-3">
                <Clock className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Application Under HR Review</h4>
                  <p className="text-[11px] text-amber-700">
                    HR is currently auditing your submitted profile and credentials. You will receive an update once verified.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Documents</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveProfile()}
                disabled={submitting}
                className="flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-6 py-2.5 text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Refresh Application Status</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
