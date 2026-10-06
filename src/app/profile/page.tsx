"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import EmployeeDocumentsView from "@/components/employees/EmployeeDocumentsView";
import {
  User,
  FileCheck2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Shield,
  Loader2,
  Clock,
  CheckCircle2,
  UserMinus,
  AlertTriangle,
  FileText,
  Calendar,
  Laptop,
  Box,
} from "lucide-react";
import { formatDate, roleLabel } from "@/lib/utils";
import { offboardingApi, assetsApi, employeesApi, branchesApi, authApi } from "@/lib/api";
import ProfilePhotoPicker from "@/components/profile/ProfilePhotoPicker";
import { toast } from "sonner";
import { unwrapList } from "@/lib/utils";
import { Asset, AssetAssignment } from "@/types";

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"DOCUMENTS" | "PROFILE" | "EXIT" | "ASSETS">("DOCUMENTS");
  const [myAssets, setMyAssets] = useState<{ assignedAssets: Asset[]; history: AssetAssignment[] } | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [savingBranch, setSavingBranch] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Exit & Resignation state
  const [myExit, setMyExit] = useState<any>(null);
  const [exitLoading, setExitLoading] = useState(false);
  const [resignationReason, setResignationReason] = useState("");
  const [preferredLwd, setPreferredLwd] = useState("");
  const [employeeComments, setEmployeeComments] = useState("");
  const [isSubmittingResignation, setIsSubmittingResignation] = useState(false);

  const loadMyExit = async () => {
    setExitLoading(true);
    try {
      const res = await offboardingApi.getMyExit();
      if (res?.success && res.data) {
        setMyExit(res.data);
      } else {
        setMyExit(null);
      }
    } catch {
      setMyExit(null);
    } finally {
      setExitLoading(false);
    }
  };

  const loadMyAssets = async () => {
    setAssetsLoading(true);
    try {
      const res = await assetsApi.getMyAssets();
      if (res?.success && res.data) {
        setMyAssets(res.data);
      }
    } catch {
      setMyAssets(null);
    } finally {
      setAssetsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.employee) {
      loadMyExit();
      loadMyAssets();
    }
    branchesApi.list().then((res) => setBranches(unwrapList(res))).catch(() => setBranches([]));
  }, [user]);

  const handleResignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resignationReason.trim()) {
      toast.error("Please provide a reason for resignation");
      return;
    }

    setIsSubmittingResignation(true);
    try {
      const res = await offboardingApi.initiate({
        exitType: "RESIGNATION",
        reason: resignationReason,
        preferredLastWorkingDate: preferredLwd || undefined,
        employeeComments,
        noticePeriodDays: 30,
      });

      if (res?.success) {
        toast.success("Resignation submitted to HR. Clearances initiated.");
        setResignationReason("");
        setPreferredLwd("");
        setEmployeeComments("");
        loadMyExit();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit resignation");
    } finally {
      setIsSubmittingResignation(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm">Loading employee profile...</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const employee = user?.employee;
  const isSuperOrAdmin = ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"].includes(user?.role || "");

  return (
    <ProtectedRoute>
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Profile Hero Card */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white shadow-sm relative overflow-hidden">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <ProfilePhotoPicker
                src={user?.avatarUrl || employee?.avatarUrl}
                initials={employee?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                uploading={savingPhoto}
                onFile={async (file) => {
                  setSavingPhoto(true);
                  try {
                    const res = await authApi.uploadAvatar(file);
                    if (res?.success === false) {
                      toast.error(res?.message || "Could not update photo");
                      return;
                    }
                    toast.success("Profile photo updated");
                    await refreshUser();
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || "Could not update photo");
                  } finally {
                    setSavingPhoto(false);
                  }
                }}
              />
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-serif text-2xl font-bold text-slate-900">
                    {employee?.firstName
                      ? `${employee.firstName} ${employee.lastName || ""}`
                      : user?.email?.split("@")[0]}
                  </h1>
                  {employee?.employeeCode && (
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {employee.employeeCode}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                    {roleLabel(user?.role)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {user?.email}
                  </span>
                  {employee?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {employee.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {employee?.department?.name || "Corporate"} • {employee?.branch?.name || "Main HQ"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab navigation pills */}
            <div role="tablist" aria-label="Profile sections" className="flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner lg:flex-nowrap">
              <button
                onClick={() => setActiveTab("DOCUMENTS")}
                aria-selected={activeTab === "DOCUMENTS"}
                role="tab" className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                  activeTab === "DOCUMENTS"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                Employee Documents
              </button>
              <button
                onClick={() => setActiveTab("PROFILE")}
                aria-selected={activeTab === "PROFILE"}
                role="tab" className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                  activeTab === "PROFILE"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <User className="w-4 h-4" />
                Profile Info
              </button>
              <button
                onClick={() => setActiveTab("EXIT")}
                aria-selected={activeTab === "EXIT"}
                role="tab" className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                  activeTab === "EXIT"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <UserMinus className="w-4 h-4" />
                Exit & Separation
              </button>
              <button
                onClick={() => setActiveTab("ASSETS")}
                aria-selected={activeTab === "ASSETS"}
                role="tab" className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                  activeTab === "ASSETS"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <Laptop className="w-4 h-4" />
                My Assets ({myAssets?.assignedAssets?.length || 0})
              </button>
            </div>
          </div>
        </div>

        {/* Tab Body */}
        {activeTab === "DOCUMENTS" ? (
          <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white shadow-sm">
            {employee ? (
              <EmployeeDocumentsView
                employeeId={employee.id}
                employeeName={`${employee.firstName} ${employee.lastName || ""}`.trim()}
                employeeCode={employee.employeeCode}
                isCurrentUserAdmin={isSuperOrAdmin}
              />
            ) : (
              <div className="text-center py-16 text-slate-500">
                <FileCheck2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 mb-1">No Linked Employee Record Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your administrator account is not linked to a specific staff record. Go to the{" "}
                  <a href="/employees" className="text-indigo-600 underline font-bold">
                    Employee Directory
                  </a>{" "}
                  to view and verify all workforce documents.
                </p>
              </div>
            )}
          </div>
        ) : activeTab === "EXIT" ? (
          <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-rose-500" />
                Employee Separation & Resignation Lifecycle
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Submit resignation notice, track departmental clearances, and review Full & Final settlement.
              </p>
            </div>

            {exitLoading ? (
              <div className="py-12 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
                <p className="text-xs">Loading separation records...</p>
              </div>
            ) : myExit ? (
              <div className="space-y-6">
                {/* Active Exit Status Banner */}
                <div className="rounded-2xl p-5 border border-amber-200 bg-amber-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                      Current Stage: {myExit.status.replace(/_/g, " ")}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 mt-1.5">
                      Separation Request in Progress
                    </h3>
                    <p className="text-xs text-slate-700 mt-1">
                      Submitted on <strong>{formatDate(myExit.resignationDate)}</strong> • Notice:{" "}
                      <strong>{myExit.noticePeriodDays} Days</strong>
                    </p>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Approved Last Working Day (LWD):{" "}
                      <strong>
                        {myExit.approvedLastWorkingDate
                          ? formatDate(myExit.approvedLastWorkingDate)
                          : "Awaiting HR Review"}
                      </strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Clearances Completed</p>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">
                      {myExit.metrics?.clearedCount} / {myExit.metrics?.totalClearances}
                    </p>
                    <div className="w-32 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden ml-auto">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${myExit.metrics?.clearanceProgress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Clearances Table */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Your Handover Clearances</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {myExit.clearances?.map((c: any) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{c.itemName}</p>
                          <p className="text-xs text-slate-500 uppercase">{c.department.replace(/_/g, " ")}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            c.status === "CLEARED" || c.status === "WAIVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Settlement if calculated */}
                {myExit.finalSettlement && (
                  <div className="rounded-2xl p-5 border border-indigo-200 bg-indigo-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800 uppercase">Calculated Full & Final Settlement</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Status: <strong className="text-slate-900">{myExit.finalSettlement.status}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900 font-mono">
                        ₹{Number(myExit.finalSettlement.netPayable).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500">Net Separation Amount</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleResignSubmit} className="max-w-xl space-y-4 text-xs">
                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    Voluntary Separation Notice
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    Submitting this form initiates standard organizational separation protocols. The mandatory notice
                    period is 30 days. You will be scheduled for an exit interview and handover checklist with your manager.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reason for Resignation *</label>
                  <textarea
                    value={resignationReason}
                    onChange={(e) => setResignationReason(e.target.value)}
                    rows={3}
                    required
                    placeholder="Please share the reason for your departure..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Preferred Last Working Day</label>
                  <input
                    type="date"
                    value={preferredLwd}
                    onChange={(e) => setPreferredLwd(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Subject to HR and management approval.</p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Feedback / Handover Notes</label>
                  <textarea
                    value={employeeComments}
                    onChange={(e) => setEmployeeComments(e.target.value)}
                    rows={2}
                    placeholder="Any comments regarding KT or project dependencies..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingResignation}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-md shadow-rose-600/20 flex items-center gap-2"
                >
                  {isSubmittingResignation && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Resignation Notice
                </button>
              </form>
            )}
          </div>
        ) : activeTab === "PROFILE" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl p-6 border border-slate-200 bg-white shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Employment & Role Details
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">System User ID:</span>
                  <span className="text-slate-700 font-mono text-xs">{user?.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Employee Code:</span>
                  <span className="text-indigo-600 font-mono font-bold">{employee?.employeeCode || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-800 font-medium">{employee?.department?.name || "Corporate Operations"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 gap-3">
                  <span className="text-slate-500 shrink-0">Work Location / Branch:</span>
                  {branches.length > 0 ? (
                    <select
                      disabled={savingBranch}
                      value={employee?.branchId || employee?.branch?.id || ""}
                      onChange={async (e) => {
                        const branchId = e.target.value || null;
                        setSavingBranch(true);
                        try {
                          const res = await employeesApi.updateMe({ branchId });
                          if (res?.success !== false) {
                            toast.success("Your branch was updated");
                            await refreshUser();
                          } else toast.error(res?.message || "Could not set branch");
                        } catch (err: any) {
                          toast.error(err.response?.data?.message || "Could not set branch");
                        } finally {
                          setSavingBranch(false);
                        }
                      }}
                      className="max-w-[220px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-800 font-medium">{employee?.branch?.name || "No branch yet"}</span>
                  )}
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Shift Schedule:</span>
                  <span className="text-slate-800 font-medium">{employee?.shift?.name || "Standard Day Shift"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Account Role:</span>
                  <span className="text-indigo-600 font-semibold">{roleLabel(user?.role)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl p-6 border border-slate-200 bg-white shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                <Shield className="w-4 h-4 text-emerald-600" />
                Statutory Compliance & Security
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Employment Status:</span>
                  <span className="text-emerald-700 font-bold">{employee?.status || "ACTIVE"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Document Compliance Status:</span>
                  <span className="text-indigo-600 font-semibold">10 Configured Categories</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mandatory IDs:</span>
                  <span className="text-slate-700">Aadhaar, PAN, Education, Bank</span>
                </div>
                <form
                  className="space-y-2 pt-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    try {
                      const res = await employeesApi.updateMe({
                        phone: fd.get("phone"),
                        address: fd.get("address"),
                        emergencyContactName: fd.get("emergencyContactName"),
                        emergencyContactPhone: fd.get("emergencyContactPhone"),
                        bankName: fd.get("bankName"),
                        bankAccountNumber: fd.get("bankAccountNumber"),
                        bankIfsc: fd.get("bankIfsc"),
                      });
                      if (res?.success) {
                        toast.success("Profile saved");
                        await refreshUser();
                      } else toast.error(res?.message || "Save failed");
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || "Save failed");
                    }
                  }}
                >
                  <input name="phone" defaultValue={employee?.phone || ""} placeholder="Phone" className="w-full px-3 py-2 rounded-xl border" />
                  <input name="address" defaultValue={(employee as any)?.address || ""} placeholder="Address" className="w-full px-3 py-2 rounded-xl border" />
                  <input name="emergencyContactName" defaultValue={(employee as any)?.emergencyContactName || ""} placeholder="Emergency contact" className="w-full px-3 py-2 rounded-xl border" />
                  <input name="emergencyContactPhone" defaultValue={(employee as any)?.emergencyContactPhone || ""} placeholder="Emergency phone" className="w-full px-3 py-2 rounded-xl border" />
                  <input name="bankName" defaultValue={(employee as any)?.bankName || ""} placeholder="Bank name" className="w-full px-3 py-2 rounded-xl border" />
                  <input name="bankAccountNumber" defaultValue={(employee as any)?.bankAccountNumber || ""} placeholder="Account number" className="w-full px-3 py-2 rounded-xl border" />
                  <input name="bankIfsc" defaultValue={(employee as any)?.bankIfsc || ""} placeholder="IFSC" className="w-full px-3 py-2 rounded-xl border" />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold">
                    Save my details
                  </button>
                </form>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("DOCUMENTS")}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    Manage All My Documents
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ASSETS TAB */
          <div className="space-y-6">
            <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-indigo-600" />
                    Entrusted Company Assets & Equipment
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    View laptops, monitors, mobile devices, and access tokens officially registered in your custody
                  </p>
                </div>
                <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {myAssets?.assignedAssets?.length || 0} Active Device(s)
                </span>
              </div>

              {assetsLoading ? (
                <div className="py-16 text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs">Loading your assigned equipment...</p>
                </div>
              ) : !myAssets?.assignedAssets || myAssets.assignedAssets.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <Box className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 mb-1">No Assets Assigned</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You currently do not have any company hardware or office assets registered under your custody.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myAssets.assignedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 flex-shrink-0">
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {asset.assetCode}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {asset.status}
                              </span>
                            </div>
                            <h3 className="font-semibold text-slate-900 text-sm mt-1">{asset.name}</h3>
                            {asset.brand && (
                              <p className="text-xs text-slate-500">
                                {asset.brand} {asset.modelNumber ? `• ${asset.modelNumber}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Serial Number</span>
                          <p className="font-mono text-slate-700 font-semibold truncate">
                            {asset.serialNumber || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Handover Date</span>
                          <p className="text-slate-700 font-semibold">
                            {asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Condition</span>
                          <p className="text-emerald-700 font-semibold">{asset.condition}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Category</span>
                          <p className="text-slate-700 font-semibold">{asset.category.replace(/_/g, " ")}</p>
                        </div>
                      </div>

                      {asset.specifications && (
                        <div className="text-xs space-y-1">
                          <span className="text-xs font-semibold text-slate-500 uppercase">Specifications</span>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(asset.specifications).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono border border-slate-200"
                              >
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Custody History */}
            {myAssets?.history && myAssets.history.length > 0 && (
              <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white shadow-sm space-y-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Box className="w-4 h-4 text-indigo-600" />
                  Asset Custody History Log
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] text-slate-600">
                    <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase bg-slate-50">
                      <tr>
                        <th className="py-2.5 px-3">Asset</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Condition</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myAssets.history.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {h.asset ? `${h.asset.assetCode} (${h.asset.name})` : "Asset"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                h.type === "ASSIGNMENT"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : h.type === "RETURN"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {h.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {new Date(h.returnedDate || h.assignedDate || h.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {h.conditionOnReturn || h.conditionOnAssign || "—"}
                          </td>
                          <td className="py-2.5 px-3 italic text-slate-500">{h.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
    </ProtectedRoute>
  );
}
