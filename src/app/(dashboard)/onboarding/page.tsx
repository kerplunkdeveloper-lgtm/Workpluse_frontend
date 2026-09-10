'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { hasRole } from '@/lib/permissions';
import api from '@/lib/api';
import {
  UserPlus,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Copy,
  ExternalLink,
  ShieldCheck,
  FileText,
  FileCheck,
  Check,
  X,
  Eye,
  Printer,
  Download,
  Calendar,
  Sparkles,
  MapPin,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  PartyPopper,
  Send,
} from 'lucide-react';

interface Candidate {
  id: string;
  organizationId: string;
  token: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  designation: string;
  departmentId: string | null;
  branchId: string | null;
  shiftId: string | null;
  expectedJoinDate: string;
  proposedSalary: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  panNumber: string | null;
  aadhaarNumber: string | null;
  status: 'INVITED' | 'PROFILE_SUBMITTED' | 'UNDER_HR_REVIEW' | 'HR_VERIFIED' | 'ADMIN_APPROVED' | 'OFFER_GENERATED' | 'OFFER_SENT' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'ACTIVATED' | 'REJECTED';
  hrNotes: string | null;
  hrVerifiedAt: string | null;
  adminNotes: string | null;
  adminApprovedAt: string | null;
  employeeId: string | null;
  offerLetterRef: string | null;
  offerLetterData: any;
  offerSentAt?: string | null;
  offerRespondedAt?: string | null;
  candidateSignature?: string | null;
  offerRejectReason?: string | null;
  createdAt: string;
  branch?: { id: string; name: string };
  department?: { id: string; name: string };
  documents?: any[];
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  const isHR = hasRole(user, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerLetterContent, setOfferLetterContent] = useState<any>(null);

  // Create Joiner Form
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    departmentId: '',
    branchId: '',
    expectedJoinDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    proposedSalary: '65000',
  });

  // HR Verification Form
  const [hrNotes, setHrNotes] = useState('');
  const [docReviews, setDocReviews] = useState<Record<string, 'VERIFIED' | 'REJECTED'>>({});

  // Admin Approval Form
  const [approvalForm, setApprovalForm] = useState({
    adminNotes: 'Candidate background and documents verified. Approved for full employment.',
    initialPassword: 'TempPassword@2026',
    role: 'EMPLOYEE',
  });

  const notify = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [candRes, branchRes, deptRes] = await Promise.all([
        api.get('/onboarding'),
        api.get('/branches'),
        api.get('/departments'),
      ]);

      setCandidates(candRes.data?.data || []);
      setBranches(branchRes.data?.data || []);
      setDepartments(deptRes.data?.data || []);
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'Failed to load onboarding candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Create New Joiner
  const handleCreateJoiner = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/onboarding', createForm);
      notify('success', 'New joiner created! Invitation link generated.');
      const candidate = res.data?.data?.candidate;
      const fullUrl = `${window.location.origin}/onboarding/${candidate.token}`;
      setCreatedInviteUrl(fullUrl);
      fetchData();
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'Failed to create joiner');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Open HR Verification
  const openHRVerification = async (candidateId: string) => {
    try {
      setActionLoading(true);
      const res = await api.get(`/onboarding/${candidateId}`);
      const cand = res.data?.data;
      setSelectedCandidate(cand);
      setHrNotes(cand.hrNotes || '');

      // Preload document statuses
      const reviews: Record<string, 'VERIFIED' | 'REJECTED'> = {};
      (cand.documents || []).forEach((d: any) => {
        reviews[d.id] = d.status === 'REJECTED' ? 'REJECTED' : 'VERIFIED';
      });
      setDocReviews(reviews);
      setShowVerifyModal(true);
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'Failed to load candidate details');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit HR Verification
  const handleHRSubmitVerification = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedCandidate) return;
    try {
      setActionLoading(true);
      const documentVerifications = Object.entries(docReviews).map(([docId, status]) => ({
        documentId: docId,
        status,
        rejectionReason: status === 'REJECTED' ? 'Document does not meet compliance requirements' : null,
      }));

      await api.put(`/onboarding/${selectedCandidate.id}/hr-verify`, {
        hrNotes,
        documentVerifications,
        action,
      });

      notify('success', action === 'APPROVE' ? 'Candidate documents verified and submitted for Admin approval!' : 'Candidate rejected.');
      setShowVerifyModal(false);
      fetchData();
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'HR Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Admin Approval -> Generate Offer Letter
  const handleAdminApproveOffer = async () => {
    if (!selectedCandidate) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/onboarding/${selectedCandidate.id}/admin-approve-offer`, approvalForm);
      notify('success', 'Admin approved! Official Offer Letter generated. Awaiting HR review & send.');
      setShowApproveModal(false);
      fetchData();

      // Open Offer Letter automatically for review
      if (res.data?.data?.offerLetterData) {
        setOfferLetterContent(res.data.data.offerLetterData);
        setSelectedCandidate(res.data.data);
        setShowOfferModal(true);
      }
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'Admin approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. HR Review & Send to Employee
  const handleHRSendOffer = async (candidateId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/onboarding/${candidateId}/hr-send-offer`, {});
      notify('success', 'Offer Letter reviewed by HR and sent to Employee!');
      setShowOfferModal(false);
      fetchData();
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'Failed to send offer letter');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. View Offer Letter
  const openOfferLetter = async (candidate: Candidate) => {
    try {
      setActionLoading(true);
      setSelectedCandidate(candidate);
      if (candidate.offerLetterData) {
        setOfferLetterContent(candidate.offerLetterData);
      } else {
        const res = await api.get(`/onboarding/${candidate.id}/offer-letter`);
        setOfferLetterContent(res.data?.data?.offerLetter);
      }
      setShowOfferModal(true);
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'Failed to generate offer letter');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Link Helper
  const copyLink = (token: string) => {
    const url = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(url);
    notify('success', 'Candidate onboarding link copied to clipboard!');
  };

  // Calculations & KPIs
  const totalInPipeline = candidates.length;
  const awaitingReview = candidates.filter((c) => ['INVITED', 'PROFILE_SUBMITTED', 'UNDER_HR_REVIEW'].includes(c.status)).length;
  const pendingApproval = candidates.filter((c) => c.status === 'HR_VERIFIED').length;
  const offersSentOrGen = candidates.filter((c) => ['OFFER_GENERATED', 'OFFER_SENT'].includes(c.status)).length;
  const activatedCount = candidates.filter((c) => ['OFFER_ACCEPTED', 'ACTIVATED'].includes(c.status)).length;

  const filteredCandidates = candidates.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.designation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']}>
      <div className="space-y-6 select-none pb-12">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold animate-in fade-in-50 duration-200 shadow-xs ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Hero Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-indigo-700 backdrop-blur-md shadow-xs border border-indigo-100">
                <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                <span>End-to-End HR Onboarding Governance Pipeline</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                New Joiner & Employee Onboarding
              </h1>
              <p className="text-xs lg:text-sm text-slate-600 leading-relaxed">
                Staged workflow: HR creates invitation token $\rightarrow$ candidate fills profile & uploads documents $\rightarrow$ HR verification $\rightarrow$ Admin final approval $\rightarrow$ automatic user/employee account activation and offer letter generation.
              </p>
            </div>

            {/* CTA */}
            {isHR && (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => {
                    setCreatedInviteUrl(null);
                    setCreateForm({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      designation: '',
                      departmentId: departments[0]?.id || '',
                      branchId: branches[0]?.id || '',
                      expectedJoinDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                      proposedSalary: '65000',
                    });
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Create New Joiner</span>
                </button>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute -bottom-10 -right-10 h-52 w-52 rounded-full bg-indigo-300/20 blur-2xl"></div>
          <div className="pointer-events-none absolute -top-12 right-40 h-44 w-44 rounded-full bg-blue-300/20 blur-2xl"></div>
        </div>

        {/* 4 KPI Wave Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total In Pipeline */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Pipeline Total</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-slate-800">{totalInPipeline} Joiners</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Total new hire records in process</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-purple-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 20 C20 10, 40 25, 60 15 C80 5, 90 20, 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Awaiting HR Review */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Under HR Review</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-amber-600">{awaitingReview} Candidates</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Documents submitted & awaiting verification</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-amber-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 15 C30 25, 60 5, 80 18 C90 22, 95 12, 100 8 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 15 C30 25, 60 5, 80 18 C90 22, 95 12, 100 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Pending Admin Approval */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Ready for Admin Approval</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-blue-600">{pendingApproval} Ready</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">HR verified; pending Admin approval & offer creation</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-blue-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 22 C25 18, 50 8, 75 14 C88 18, 95 10, 100 6 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 22 C25 18, 50 8, 75 14 C88 18, 95 10, 100 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Offer Letters & Hires */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Offers & Onboarded</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black tracking-tight text-emerald-600">{activatedCount} Accepted</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{offersSentOrGen} offer{offersSentOrGen === 1 ? '' : 's'} in flight / pending candidate</p>
            </div>
            <div className="mt-4 pt-2">
              <svg className="w-full h-8 text-emerald-400" viewBox="0 0 100 25" fill="none" preserveAspectRatio="none">
                <path d="M0 25 C30 20, 60 10, 80 5 C90 2, 95 1, 100 0 L100 25 L0 25 Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M0 25 C30 20, 60 10, 80 5 C90 2, 95 1, 100 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Stages' },
              { id: 'INVITED', label: 'Invited' },
              { id: 'HR_VERIFIED', label: 'HR Verified' },
              { id: 'OFFER_GENERATED', label: 'Offer Generated' },
              { id: 'OFFER_SENT', label: 'Offer Sent' },
              { id: 'OFFER_ACCEPTED', label: 'Offer Accepted' },
              { id: 'OFFER_REJECTED', label: 'Declined' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setStatusFilter(p.id)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === p.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates Pipeline Directory Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Candidate Dossiers ({filteredCandidates.length})
            </h2>
            <span className="text-[11px] text-slate-400">Click actions to verify, approve, or generate offer</span>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No candidates found</h3>
              <p className="mt-1 text-xs text-slate-400">
                Create a new joiner to initiate the onboarding lifecycle.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-6">Candidate</th>
                    <th className="py-3 px-6">Role & Dept</th>
                    <th className="py-3 px-6">Expected Joining</th>
                    <th className="py-3 px-6">Documents</th>
                    <th className="py-3 px-6">Workflow Stage</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Candidate Column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-50 to-indigo-100 font-black text-indigo-600 shrink-0 text-xs shadow-2xs">
                            {c.firstName[0]}
                            {c.lastName?.[0] || ''}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {c.firstName} {c.lastName || ''}
                            </span>
                            <span className="text-[11px] text-slate-400">{c.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Dept */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 block">{c.designation}</span>
                        <span className="text-[11px] text-slate-400">
                          {c.department?.name || 'General'} • {c.branch?.name || 'All Branches'}
                        </span>
                      </td>

                      {/* Expected Joining */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-700">
                          {new Date(c.expectedJoinDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {c.proposedSalary && (
                          <span className="text-[10px] text-slate-400 block">
                            ₹{Number(c.proposedSalary).toLocaleString()}/mo
                          </span>
                        )}
                      </td>

                      {/* Documents */}
                      <td className="py-4 px-6">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                          {c.documents?.length || 0} file{(c.documents?.length || 0) === 1 ? '' : 's'}
                        </span>
                      </td>

                      {/* Status Stage */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            c.status === 'ACTIVATED' || c.status === 'OFFER_ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : c.status === 'OFFER_REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : c.status === 'OFFER_SENT'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : c.status === 'OFFER_GENERATED'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : c.status === 'HR_VERIFIED'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : c.status === 'UNDER_HR_REVIEW'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : c.status === 'PROFILE_SUBMITTED'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          <span>{c.status.replace(/_/g, ' ')}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy Link */}
                          <button
                            type="button"
                            title="Copy Onboarding Portal Link"
                            onClick={() => copyLink(c.token)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-2xs"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* HR Verify Button (Step 2) */}
                          {isHR && ['INVITED', 'PROFILE_SUBMITTED', 'UNDER_HR_REVIEW'].includes(c.status) && (
                            <button
                              type="button"
                              onClick={() => openHRVerification(c.id)}
                              className="flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              <span>HR Verify</span>
                            </button>
                          )}

                          {/* Admin Approve Button (Step 3: Admin Approval -> Generate Offer Letter) */}
                          {isAdmin && c.status === 'HR_VERIFIED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCandidate(c);
                                setShowApproveModal(true);
                              }}
                              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1.5 text-[11px] font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Admin Approval ✅</span>
                            </button>
                          )}

                          {/* HR Review & Send (Step 4 & 5: HR Review -> Send to Employee) */}
                          {isHR && c.status === 'OFFER_GENERATED' && (
                            <button
                              type="button"
                              onClick={() => openOfferLetter(c)}
                              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-1.5 text-[11px] font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>HR Review & Send</span>
                            </button>
                          )}

                          {/* Offer Letter View Button for already sent / accepted / rejected / activated */}
                          {['OFFER_SENT', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'ACTIVATED'].includes(c.status) && (
                            <button
                              type="button"
                              title="View & Print Official Offer Letter"
                              onClick={() => openOfferLetter(c)}
                              className="flex items-center gap-1 rounded-xl bg-slate-900 text-white px-2.5 py-1.5 text-[11px] font-bold hover:bg-slate-800 transition-all"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Offer Letter</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: CREATE NEW JOINER */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-7 shadow-2xl space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Create New Joiner Invitation</h3>
                    <p className="text-[11px] text-slate-400">Generate secure candidate token & onboarding portal</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {createdInviteUrl ? (
                <div className="py-4 space-y-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Invitation Generated!</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Share this unique onboarding portal link with the candidate to fill their profile.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2.5 border border-slate-200">
                    <input
                      type="text"
                      readOnly
                      value={createdInviteUrl}
                      className="flex-1 bg-transparent text-xs font-mono text-slate-800 outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdInviteUrl);
                        notify('success', 'Link copied to clipboard!');
                      }}
                      className="rounded-xl bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-indigo-700 shadow-xs"
                    >
                      Copy Link
                    </button>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-2xl bg-slate-900 text-white px-5 py-2 text-xs font-bold hover:bg-slate-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateJoiner} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rohan"
                        value={createForm.firstName}
                        onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sharma"
                        value={createForm.lastName}
                        onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="rohan@example.com"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Designation / Role Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Full Stack Engineer"
                      value={createForm.designation}
                      onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                      <select
                        value={createForm.departmentId}
                        onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Branch / Location</label>
                      <select
                        value={createForm.branchId}
                        onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      >
                        <option value="">All Branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Expected Joining Date *</label>
                      <input
                        type="date"
                        required
                        value={createForm.expectedJoinDate}
                        onChange={(e) => setCreateForm({ ...createForm, expectedJoinDate: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Proposed Monthly CTC (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 65000"
                        value={createForm.proposedSalary}
                        onChange={(e) => setCreateForm({ ...createForm, proposedSalary: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      <span>Generate Invite</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL 2: HR DOCUMENT & PROFILE AUDIT */}
        {showVerifyModal && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-7 shadow-2xl space-y-4 animate-in fade-in-50 duration-200 max-h-[90vh] flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      HR Verification & Document Audit
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Candidate: {selectedCandidate.firstName} {selectedCandidate.lastName || ''} ({selectedCandidate.designation})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* Profile Summary Card */}
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">Submitted Profile Data:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">DOB / Gender:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedCandidate.dateOfBirth ? selectedCandidate.dateOfBirth.split('T')[0] : '—'} ({selectedCandidate.gender || '—'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Bank Name:</span>
                      <span className="font-semibold text-slate-800">{selectedCandidate.bankName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">IFSC / Account:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedCandidate.ifscCode || '—'} / {selectedCandidate.accountNumber || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">PAN / Tax ID:</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedCandidate.panNumber || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Aadhaar ID:</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedCandidate.aadhaarNumber || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Emergency Contact:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedCandidate.emergencyContactName || '—'} ({selectedCandidate.emergencyContactPhone || '—'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents Verification */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800">Uploaded Credentials & Verification:</h4>
                  {(!selectedCandidate.documents || selectedCandidate.documents.length === 0) ? (
                    <p className="text-slate-400 italic">No documents uploaded by candidate yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                      {selectedCandidate.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-indigo-600" />
                            <div>
                              <span className="font-bold text-slate-800 block">{doc.fileName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{doc.documentType}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline text-[11px] font-bold inline-flex items-center gap-1 mr-2"
                              >
                                <span>Preview</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}

                            {/* Verify / Reject Toggle */}
                            <button
                              type="button"
                              onClick={() => setDocReviews({ ...docReviews, [doc.id]: 'VERIFIED' })}
                              className={`rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all ${
                                docReviews[doc.id] === 'VERIFIED'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Verify
                            </button>

                            <button
                              type="button"
                              onClick={() => setDocReviews({ ...docReviews, [doc.id]: 'REJECTED' })}
                              className={`rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all ${
                                docReviews[doc.id] === 'REJECTED'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* HR Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HR Audit Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Identity and past educational degrees verified successfully."
                    value={hrNotes}
                    onChange={(e) => setHrNotes(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => handleHRSubmitVerification('REJECT')}
                  disabled={actionLoading}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  Reject Candidate
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHRSubmitVerification('APPROVE')}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>Mark HR Verified</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: ADMIN APPROVAL & EMPLOYEE ACTIVATION */}
        {showApproveModal && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-2xl space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Admin Approval & Generate Offer Letter</h3>
                    <p className="text-[11px] text-slate-400">Approves candidate credentials & generates formal offer letter</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-950 block">
                    {selectedCandidate.firstName} {selectedCandidate.lastName || ''}
                  </span>
                  <span className="text-emerald-800 block">{selectedCandidate.designation}</span>
                  <span className="text-[11px] text-emerald-700 block font-mono">
                    CTC: ₹{Number(selectedCandidate.proposedSalary || 0).toLocaleString()}/month
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Temporary Password</label>
                  <input
                    type="text"
                    value={approvalForm.initialPassword}
                    onChange={(e) => setApprovalForm({ ...approvalForm, initialPassword: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-mono font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Used upon employee offer acceptance to activate their WorkPulse login.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Approval Notes</label>
                  <textarea
                    rows={2}
                    value={approvalForm.adminNotes}
                    onChange={(e) => setApprovalForm({ ...approvalForm, adminNotes: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAdminApproveOffer}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-emerald-500/25 hover:shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Approve & Generate Offer Letter ✅</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: DYNAMIC OFFER LETTER PREVIEW & PRINT */}
        {showOfferModal && offerLetterContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl space-y-6 animate-in fade-in-50 duration-200 max-h-[92vh] flex flex-col justify-between overflow-hidden">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Official Letter of Employment</h3>
                    <p className="text-[11px] text-slate-400 font-mono">Ref: {offerLetterContent.referenceNo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Letter</span>
                  </button>
                  <button
                    onClick={() => setShowOfferModal(false)}
                    className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Printable Letter Container */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-5 text-slate-800 text-xs leading-relaxed p-6 bg-slate-50/50 rounded-2xl border border-slate-200 font-serif">
                {/* Company Letterhead */}
                <div className="flex items-start justify-between border-b border-slate-300 pb-4">
                  <div className="flex items-center gap-3.5 font-sans">
                    <img
                      src="/workpulse-logo.png"
                      alt="WorkPulse Logo"
                      className="h-12 w-12 object-contain rounded-2xl border border-slate-200 bg-white p-1 shadow-2xs"
                    />
                    <div>
                      <h2 className="text-xl font-black font-sans tracking-tight text-indigo-950">
                        {offerLetterContent.organizationName || 'WorkPulse Technologies Inc.'}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Workforce Management & Human Capital Systems
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-sans text-slate-500">
                    <span className="font-bold text-slate-700 block">Date: {offerLetterContent.issuedDate}</span>
                    <span className="font-mono text-indigo-600 font-bold block">{offerLetterContent.referenceNo}</span>
                  </div>
                </div>

                {/* Salutation */}
                <div className="font-sans">
                  <span className="font-bold text-slate-900 block text-sm">
                    {offerLetterContent.candidateName}
                  </span>
                  <span className="text-slate-500 block text-[11px]">{offerLetterContent.currentAddress}</span>
                  <span className="text-slate-500 block text-[11px]">{offerLetterContent.email}</span>
                </div>

                <p>
                  Dear <strong>{offerLetterContent.candidateName}</strong>,
                </p>

                <p>
                  We are delighted to offer you full-time employment with{' '}
                  <strong>{offerLetterContent.organizationName}</strong> in the position of{' '}
                  <strong className="text-indigo-900">{offerLetterContent.designation}</strong>. Your scheduled start date will be{' '}
                  <strong>{offerLetterContent.expectedJoinDate}</strong> at our{' '}
                  <strong>{offerLetterContent.branch}</strong> office.
                </p>

                {/* Compensation Table */}
                <div className="font-sans space-y-2 pt-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Annual & Monthly Compensation Breakdown:
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="py-2 px-3">Salary Component</th>
                          <th className="py-2 px-3 text-right">Monthly (₹)</th>
                          <th className="py-2 px-3 text-right">Annual (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        <tr>
                          <td className="py-2 px-3 font-sans">Basic Salary (50%)</td>
                          <td className="py-2 px-3 text-right">
                            ₹{offerLetterContent.compensation.basicMonthly.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right">
                            ₹{(offerLetterContent.compensation.basicMonthly * 12).toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans">House Rent Allowance (HRA - 30%)</td>
                          <td className="py-2 px-3 text-right">
                            ₹{offerLetterContent.compensation.hraMonthly.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right">
                            ₹{(offerLetterContent.compensation.hraMonthly * 12).toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans">Special / Flexible Allowance (20%)</td>
                          <td className="py-2 px-3 text-right">
                            ₹{offerLetterContent.compensation.specialAllowanceMonthly.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right">
                            ₹{(offerLetterContent.compensation.specialAllowanceMonthly * 12).toLocaleString()}
                          </td>
                        </tr>
                        <tr className="bg-indigo-50/60 font-bold text-indigo-950">
                          <td className="py-2.5 px-3 font-sans">Total Gross CTC</td>
                          <td className="py-2.5 px-3 text-right">
                            ₹{offerLetterContent.compensation.grossMonthly.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            ₹{offerLetterContent.compensation.ctcAnnual.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Terms of Employment */}
                <div className="space-y-1.5 pt-1 text-[11px] leading-normal">
                  <h4 className="font-bold font-sans text-xs uppercase tracking-wider text-slate-700">
                    Standard Employment Terms:
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>
                      <strong>Probation Period:</strong> {offerLetterContent.terms.probationMonths} months from the effective date of joining.
                    </li>
                    <li>
                      <strong>Notice Period:</strong> {offerLetterContent.terms.noticePeriodDays} days upon confirmation.
                    </li>
                    <li>
                      <strong>Working Hours:</strong> Standard hours are {offerLetterContent.terms.workingHours}.
                    </li>
                    <li>
                      <strong>Company Policies:</strong> All attendance, leaves, and intellectual property remain governed by WorkPulse Enterprise policies.
                    </li>
                  </ul>
                </div>

                {/* Signatures */}
                <div className="flex items-center justify-between pt-8 font-sans">
                  <div className="space-y-1">
                    <div className="h-8 border-b border-slate-400 w-44"></div>
                    <span className="font-bold text-slate-900 block text-xs">Authorized HR Signatory</span>
                    <span className="text-[10px] text-slate-400">{offerLetterContent.organizationName}</span>
                  </div>

                  <div className="space-y-1 text-right">
                    <div className="h-8 border-b border-slate-400 w-44 ml-auto"></div>
                    <span className="font-bold text-slate-900 block text-xs">Candidate Acceptance Signature</span>
                    <span className="text-[10px] text-slate-400">{offerLetterContent.candidateName}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Workflow Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
                <div className="text-xs">
                  {selectedCandidate?.status === 'OFFER_GENERATED' && (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                      <Clock className="h-3.5 w-3.5" /> Awaiting HR Review & Dispatch
                    </span>
                  )}
                  {selectedCandidate?.status === 'OFFER_SENT' && (
                    <span className="inline-flex items-center gap-1.5 text-blue-600 font-bold bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                      <Send className="h-3.5 w-3.5" /> Sent to Candidate • Awaiting Accept / Reject
                    </span>
                  )}
                  {selectedCandidate?.status === 'OFFER_ACCEPTED' && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accepted & Signed by Employee
                    </span>
                  )}
                  {selectedCandidate?.status === 'OFFER_REJECTED' && (
                    <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
                      <AlertCircle className="h-3.5 w-3.5" /> Declined: {selectedCandidate.offerRejectReason || 'No reason provided'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOfferModal(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    Close
                  </button>

                  {/* Step 5: HR Review -> Send to Employee */}
                  {selectedCandidate && (isHR || isAdmin) && selectedCandidate.status === 'OFFER_GENERATED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleHRSendOffer(selectedCandidate.id)}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-indigo-500/25 hover:shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span>HR Review: Send to Employee ✉️</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
