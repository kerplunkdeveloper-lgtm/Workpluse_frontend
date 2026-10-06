"use client";

import React, { useState } from "react";
import { Employee } from "@/types";
import EmployeeDocumentsView from "./EmployeeDocumentsView";
import {
  User,
  FileCheck2,
  Mail,
  Phone,
  Building2,
  Clock,
  Shield,
  Briefcase,
  Calendar,
  X,
  CreditCard,
  MapPin,
  Sparkles,
  Laptop,
  Box,
  Loader2,
} from "lucide-react";
import { formatDate, roleLabel } from "@/lib/utils";
import { assetsApi, employeesApi } from "@/lib/api";
import ProfilePhotoPicker from "@/components/profile/ProfilePhotoPicker";
import { toast } from "sonner";
import { Asset, AssetAssignment } from "@/types";

interface EmployeeProfileModalProps {
  employee: Employee | null;
  isOpen: boolean;
  initialTab?: "PROFILE" | "DOCUMENTS" | "ASSETS";
  onClose: () => void;
  isCurrentUserAdmin?: boolean;
  onEmployeeUpdated?: (employee: Employee) => void;
}

export default function EmployeeProfileModal({
  employee,
  isOpen,
  initialTab = "DOCUMENTS",
  onClose,
  isCurrentUserAdmin = true,
  onEmployeeUpdated,
}: EmployeeProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "DOCUMENTS" | "ASSETS">(initialTab);
  const [empAssets, setEmpAssets] = useState<{ assignedAssets: Asset[]; history: AssetAssignment[] } | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(employee?.avatarUrl || "");

  React.useEffect(() => {
    setAvatarUrl(employee?.avatarUrl || "");
  }, [employee?.id, employee?.avatarUrl]);

  React.useEffect(() => {
    if (employee?.id && activeTab === "ASSETS") {
      setAssetsLoading(true);
      assetsApi
        .getEmployeeAssets(employee.id)
        .then((res) => {
          if (res?.success) setEmpAssets(res.data);
        })
        .catch(() => setEmpAssets(null))
        .finally(() => setAssetsLoading(false));
    }
  }, [employee?.id, activeTab]);

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Header Banner */}
        <div className="relative shrink-0 bg-slate-50 border-b border-slate-200 p-6">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {isCurrentUserAdmin ? (
              <ProfilePhotoPicker
                size="md"
                src={avatarUrl}
                initials={`${employee.firstName?.[0] || "E"}${employee.lastName?.[0] || ""}`.toUpperCase()}
                uploading={savingPhoto}
                hint="Add photo"
                onFile={async (file) => {
                  setSavingPhoto(true);
                  try {
                    const res = await employeesApi.uploadAvatar(employee.id, file);
                    if (res?.success === false) {
                      toast.error(res?.message || "Could not update photo");
                      return;
                    }
                    const next = res?.data;
                    const nextUrl = next?.avatarUrl || next?.user?.avatarUrl || avatarUrl;
                    setAvatarUrl(nextUrl);
                    toast.success("Employee photo updated");
                    onEmployeeUpdated?.({ ...employee, ...next, avatarUrl: nextUrl });
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || "Could not update photo");
                  } finally {
                    setSavingPhoto(false);
                  }
                }}
              />
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${employee.firstName} ${employee.lastName || ""}`}
                className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0 border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-serif text-2xl flex items-center justify-center shadow-md shrink-0">
                {employee.firstName?.[0] || "E"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">
                  {employee.firstName} {employee.lastName || ""}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {employee.employeeCode}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                    employee.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {employee.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {employee.user?.email || "No email assigned"}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {employee.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {employee.department?.name || "General"} • {employee.branch?.name || "HQ"}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-t border-slate-200 pt-4">
            <button
              onClick={() => setActiveTab("DOCUMENTS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === "DOCUMENTS"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              Documents & Compliance
            </button>
            <button
              onClick={() => setActiveTab("PROFILE")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === "PROFILE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <User className="w-4 h-4" />
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab("ASSETS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === "ASSETS"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Laptop className="w-4 h-4" />
              Assigned Equipment
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto min-h-0 flex-1">
          {activeTab === "DOCUMENTS" ? (
            <EmployeeDocumentsView
              employeeId={employee.id}
              employeeName={`${employee.firstName} ${employee.lastName || ""}`.trim()}
              employeeCode={employee.employeeCode}
              isCurrentUserAdmin={isCurrentUserAdmin}
            />
          ) : activeTab === "PROFILE" ? (
            <div className="space-y-6">
              {/* Profile details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/70 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    Employment & Assignment
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Employee ID:</span>
                      <span className="text-indigo-700 font-mono font-semibold">{employee.employeeCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Designation:</span>
                      <span className="text-slate-800 font-medium">{employee.designation || "Not assigned"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="text-slate-800 font-medium">{employee.department?.name || "General"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Branch / Location:</span>
                      <span className="text-slate-800 font-medium">{employee.branch?.name || "Main HQ"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shift Schedule:</span>
                      <span className="text-slate-800 font-medium">{employee.shift?.name || "General Shift"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">System Role:</span>
                      <span className="text-indigo-700 font-semibold">{roleLabel(employee.user?.role || "EMPLOYEE")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Joined On:</span>
                      <span className="text-slate-800">{formatDate(employee.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/70 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    Statutory & Compliance Status
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Status:</span>
                      <span className="text-emerald-700 font-semibold">{employee.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PAN:</span>
                      <span className="text-slate-800 font-mono">{employee.panNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">UAN:</span>
                      <span className="text-slate-800 font-mono">{employee.uanNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ESI:</span>
                      <span className="text-slate-800 font-mono">{employee.esiNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Compliance Audit:</span>
                      <span className="text-slate-800">Active Employment File</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Direct Document Access:</span>
                      <button
                        onClick={() => setActiveTab("DOCUMENTS")}
                        className="text-indigo-600 font-semibold hover:underline"
                      >
                        Manage 10 Document Slots →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ASSETS TAB */
            <div className="space-y-6">
              {assetsLoading ? (
                <div className="py-16 text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs">Loading assigned assets...</p>
                </div>
              ) : !empAssets?.assignedAssets || empAssets.assignedAssets.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <Box className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 mb-1">No Hardware Assigned</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    This employee does not currently have any company equipment assigned. Go to the Asset Inventory to allocate devices.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-indigo-600" />
                    Currently Assigned Devices ({empAssets.assignedAssets.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {empAssets.assignedAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {asset.assetCode}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {asset.condition}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{asset.name}</h4>
                          <p className="text-xs text-slate-500">
                            {asset.brand} {asset.modelNumber ? `• ${asset.modelNumber}` : ""}
                          </p>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                          <div>Serial: <span className="font-mono text-slate-800">{asset.serialNumber || "—"}</span></div>
                          <div>Assigned: <span className="text-slate-800">{asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "—"}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {empAssets.history && empAssets.history.length > 0 && (
                    <div className="pt-4 border-t border-slate-200 space-y-2">
                      <h4 className="text-xs font-bold text-slate-700">Custody Transition History</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] text-slate-600">
                          <tbody className="divide-y divide-slate-100">
                            {empAssets.history.slice(0, 5).map((h) => (
                              <tr key={h.id} className="py-2 hover:bg-slate-50">
                                <td className="py-2 font-medium text-slate-900">{h.asset?.assetCode}</td>
                                <td className="py-2">
                                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                                    {h.type}
                                  </span>
                                </td>
                                <td className="py-2 text-slate-600">{new Date(h.returnedDate || h.assignedDate || h.createdAt).toLocaleDateString()}</td>
                                <td className="py-2 italic text-slate-500">{h.remarks || "—"}</td>
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
          )}
        </div>
      </div>
    </div>
  );
}
