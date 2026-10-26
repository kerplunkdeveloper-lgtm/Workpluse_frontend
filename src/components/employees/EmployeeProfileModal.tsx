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
  Pencil,
} from "lucide-react";
import { formatDate, roleLabel } from "@/lib/utils";
import { assetsApi, employeesApi } from "@/lib/api";
import ProfilePhotoPicker from "@/components/profile/ProfilePhotoPicker";
import EmployeeProfileFields from "./EmployeeProfileFields";
import {
  EMPLOYMENT_TYPES,
  EMPTY_PROFILE,
  firstErrorKey,
  toProfilePayload,
  validateProfile,
  ymd,
  type EmployeeProfileValues,
  type ProfileErrors,
} from "@/lib/employeeProfile";
import { toast } from "sonner";
import { Asset, AssetAssignment } from "@/types";

interface EmployeeProfileModalProps {
  employee: Employee | null;
  isOpen: boolean;
  initialTab?: "PROFILE" | "DOCUMENTS" | "ASSETS";
  onClose: () => void;
  isCurrentUserAdmin?: boolean;
  /** Admin or HR: may edit the profile details. Everyone else sees them read-only. */
  canEdit?: boolean;
  branches?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  shifts?: { id: string; name: string; startTime?: string; endTime?: string }[];
  onEmployeeUpdated?: (employee: Employee) => void;
}

const GENDER_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female" };
const EMPLOYMENT_LABELS: Record<string, string> = Object.fromEntries(EMPLOYMENT_TYPES.map((t) => [t.value, t.label]));

function ProfileCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/70 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
        {icon}
        {title}
      </h3>
      <div className="space-y-2.5 text-xs">{children}</div>
    </div>
  );
}

/** One label/value line. A missing value shows an em dash so a blank is visible, not silently hidden. */
function Row({ label, value, mono, wrap }: { label: string; value?: string | null; mono?: boolean; wrap?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${wrap ? "items-start" : ""}`}>
      <span className="shrink-0 text-slate-500">{label}:</span>
      <span className={`text-right text-slate-800 ${mono ? "font-mono" : "font-medium"} ${wrap ? "break-words" : ""}`}>
        {value && String(value).trim() ? value : "—"}
      </span>
    </div>
  );
}

export default function EmployeeProfileModal({
  employee,
  isOpen,
  initialTab = "DOCUMENTS",
  onClose,
  isCurrentUserAdmin = true,
  canEdit = false,
  branches = [],
  departments = [],
  shifts = [],
  onEmployeeUpdated,
}: EmployeeProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "DOCUMENTS" | "ASSETS">(initialTab);
  // The directory list leaves out PAN, bank and other personal fields, so the full record is fetched on open.
  const [fullRecord, setFullRecord] = useState<Employee | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmployeeProfileValues>(EMPTY_PROFILE);
  const [formErrors, setFormErrors] = useState<ProfileErrors>({});
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

  // Load the full record (PAN, bank, DOB, address...) once per employee, and drop any edit in progress.
  React.useEffect(() => {
    setEditing(false);
    setFullRecord(null);
    if (!isOpen || !employee?.id) return;
    let cancelled = false;
    setProfileLoading(true);
    employeesApi
      .getById(employee.id)
      .then((res) => {
        if (!cancelled && res?.success) setFullRecord(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load the full profile. Some details may be missing.");
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employee?.id]);

  if (!isOpen || !employee) return null;

  const view: Employee = { ...employee, ...(fullRecord || {}) };
  const canEditProfile = canEdit;

  const setField = (key: keyof EmployeeProfileValues, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const startEditing = () => {
    setForm({
      ...EMPTY_PROFILE,
      firstName: view.firstName || "",
      lastName: view.lastName || "",
      phone: view.phone || "",
      gender: view.gender || "",
      dateOfBirth: ymd(view.dateOfBirth),
      dateOfJoining: ymd(view.dateOfJoining) || ymd(view.createdAt),
      designation: view.designation || "",
      employmentType: view.employmentType || "",
      branchId: view.branchId || "",
      departmentId: view.departmentId || "",
      shiftId: view.shiftId || "",
      address: view.address || "",
      emergencyContactName: view.emergencyContactName || "",
      emergencyContactPhone: view.emergencyContactPhone || "",
      bankName: view.bankName || "",
      bankAccountNumber: view.bankAccountNumber || "",
      bankIfsc: view.bankIfsc || "",
      panNumber: view.panNumber || "",
      uanNumber: view.uanNumber || "",
      esiNumber: view.esiNumber || "",
    });
    setFormErrors({});
    setEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    // Email (the login) and CTC (payroll) are not edited here.
    const errors = validateProfile(form, { skip: ["email", "ctc"] });
    setFormErrors(errors);
    const firstKey = firstErrorKey(errors);
    if (firstKey) {
      toast.error("Please fix the highlighted fields.");
      document
        .querySelector<HTMLElement>(`[data-field="emp-${firstKey}"] input, [data-field="emp-${firstKey}"] select, [data-field="emp-${firstKey}"] button`)
        ?.focus();
      return;
    }
    const { email: _email, ctc: _ctc, ...payload } = toProfilePayload(form);
    setSaving(true);
    try {
      const res = await employeesApi.update(view.id, payload);
      if (res?.success === false) {
        toast.error(res?.message || "Could not save the profile");
        return;
      }
      const next = { ...view, ...res.data } as Employee;
      setFullRecord(next);
      onEmployeeUpdated?.(next);
      setEditing(false);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not save the profile");
    } finally {
      setSaving(false);
    }
  };

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
            editing ? (
              <form onSubmit={handleSaveProfile} className="mx-auto max-w-2xl space-y-5" noValidate>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Edit profile details</h3>
                    <p className="text-xs text-slate-500">All fields are required except PAN, PF UAN and ESI number.</p>
                  </div>
                </div>
                <EmployeeProfileFields
                  values={form}
                  errors={formErrors}
                  onChange={setField}
                  branches={branches}
                  departments={departments}
                  shifts={shifts}
                  hideEmail
                  hideCtc
                />
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {saving ? "Saving" : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
            <div className="space-y-6">
              {canEditProfile && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit profile
                  </button>
                </div>
              )}
              {profileLoading && (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading full profile...
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfileCard icon={<User className="w-4 h-4 text-indigo-600" />} title="Personal Details">
                  <Row label="Full name" value={`${view.firstName} ${view.lastName || ""}`.trim()} />
                  <Row label="Gender" value={GENDER_LABELS[view.gender || ""]} />
                  <Row label="Date of birth" value={view.dateOfBirth ? formatDate(ymd(view.dateOfBirth)) : ""} />
                  <Row label="Phone" value={view.phone} />
                  <Row label="Email" value={view.user?.email || view.workEmail} />
                  <Row label="Address" value={view.address} wrap />
                </ProfileCard>

                <ProfileCard icon={<Phone className="w-4 h-4 text-rose-600" />} title="Emergency Contact">
                  <Row label="Contact name" value={view.emergencyContactName} />
                  <Row label="Contact phone" value={view.emergencyContactPhone} />
                </ProfileCard>

                <ProfileCard icon={<Briefcase className="w-4 h-4 text-indigo-600" />} title="Employment & Assignment">
                  <Row label="Employee ID" value={view.employeeCode} mono />
                  <Row label="Designation" value={view.designation} />
                  <Row label="Employment type" value={EMPLOYMENT_LABELS[view.employmentType || ""]} />
                  <Row label="Department" value={view.department?.name} />
                  <Row label="Branch / Location" value={view.branch?.name} />
                  <Row label="Shift schedule" value={view.shift?.name} />
                  <Row label="System role" value={roleLabel(view.user?.role || "EMPLOYEE")} />
                  <Row label="Date of joining" value={formatDate(ymd(view.dateOfJoining) || ymd(view.createdAt))} />
                </ProfileCard>

                <ProfileCard icon={<CreditCard className="w-4 h-4 text-emerald-600" />} title="Bank & Statutory">
                  <Row label="Bank" value={view.bankName} />
                  <Row label="Account number" value={view.bankAccountNumber} mono />
                  <Row label="IFSC" value={view.bankIfsc} mono />
                  <Row label="PAN" value={view.panNumber} mono />
                  <Row label="PF UAN" value={view.uanNumber} mono />
                  <Row label="ESI number" value={view.esiNumber} mono />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Documents:</span>
                    <button onClick={() => setActiveTab("DOCUMENTS")} className="text-indigo-600 font-semibold hover:underline">
                      Manage documents →
                    </button>
                  </div>
                </ProfileCard>
              </div>
            </div>
            )
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
