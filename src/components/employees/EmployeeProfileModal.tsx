"use client";

import React, { useState } from "react";
import { Employee } from "@/types";
import EmployeeDocumentsView from "./EmployeeDocumentsView";
import { User, FileCheck2, Trash2, Mail, AtSign, Phone, Building2, Briefcase, X, CreditCard, Laptop, Box, Loader2, Pencil } from "lucide-react";
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
import { sanitizeIndianPhone } from "@/components/ui/PhoneInput";
import { Asset, AssetAssignment } from "@/types";
import DatePicker from "@/components/ui/DatePicker";

interface EmployeeProfileModalProps {
  employee: Employee | null;
  isOpen: boolean;
  initialTab?: "PROFILE" | "DOCUMENTS" | "ASSETS";
  onClose: () => void;
  isCurrentUserAdmin?: boolean;
  /** Admin or HR: may edit the profile details. Everyone else sees them read-only. */
  canEdit?: boolean;
  canEditRole?: boolean;
  branches?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  shifts?: { id: string; name: string; startTime?: string; endTime?: string }[];
  designations?: string[];
  onEmployeeUpdated?: (employee: Employee) => void;
  onDeleteEmployee?: (employee: Employee) => void;
}

const GENDER_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female" };
const EMPLOYMENT_LABELS: Record<string, string> = Object.fromEntries(EMPLOYMENT_TYPES.map((t) => [t.value, t.label]));

function ProfileCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-shadow hover:shadow-sm space-y-4">
      <h3 className="flex items-center gap-2.5 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">{icon}</span>
        {title}
      </h3>
      <div className="space-y-3 text-xs">{children}</div>
    </div>
  );
}

/** One label/value line. A missing value shows an em dash so a blank is visible, not silently hidden. */
function Row({ label, value, mono, wrap }: { label: string; value?: string | null; mono?: boolean; wrap?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${wrap ? "items-start" : ""}`}>
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className={`min-w-0 break-words text-right ${mono ? "font-mono" : "font-medium"} ${value && String(value).trim() ? "text-slate-900" : "text-slate-300"} ${wrap ? "" : "truncate"}`}>
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
  canEditRole = false,
  branches = [],
  departments = [],
  shifts = [],
  onEmployeeUpdated,
  onDeleteEmployee,
}: EmployeeProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "DOCUMENTS" | "ASSETS">(initialTab);
  // The directory list leaves out PAN, bank and other personal fields, so the full record is fetched on open.
  const [fullRecord, setFullRecord] = useState<Employee | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState(false);
  const [employmentSaving, setEmploymentSaving] = useState(false);
  const [employmentForm, setEmploymentForm] = useState({ employeeCode: "", designation: "", employmentType: "", branchId: "", departmentId: "", shiftId: "", dateOfJoining: "", role: "EMPLOYEE" });

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
      personalEmail: view.personalEmail || "",
      phone: sanitizeIndianPhone(view.phone || ""),
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
      emergencyContactPhone: sanitizeIndianPhone(view.emergencyContactPhone || ""),
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


  const startEditingEmployment = () => {
    setEmploymentForm({ employeeCode: view.employeeCode || "", designation: view.designation || "", employmentType: view.employmentType || "", branchId: view.branchId || "", departmentId: view.departmentId || "", shiftId: view.shiftId || "", dateOfJoining: ymd(view.dateOfJoining) || ymd(view.createdAt), role: view.user?.role === "HR" ? "HR" : view.user?.role === "MANAGER" ? "MANAGER" : "EMPLOYEE" });
    setEditingEmployment(true);
  };

  const saveEmployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(employmentForm).some((value) => !value.trim())) { toast.error("Complete all Employment & Assignment fields before saving."); return; }
    setEmploymentSaving(true);
    try {
      const res = await employeesApi.update(view.id, employmentForm);
      if (res?.success === false) throw new Error(res?.message || "Could not save Employment & Assignment");
      const next = { ...view, ...res.data } as Employee; setFullRecord(next); onEmployeeUpdated?.(next); setEditingEmployment(false); toast.success("Employment & Assignment updated");
    } catch (err: any) { toast.error(err?.response?.data?.message || err?.message || "Could not save Employment & Assignment"); } finally { setEmploymentSaving(false); }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    // Email (the login) and CTC (payroll) are not edited here.
    const errors = validateProfile(form, {
  skip: [
    "email",
    "ctc",
    "bankName",
    "bankAccountNumber",
    "bankIfsc",
    "panNumber",
    "uanNumber",
    "esiNumber",
  ],
});
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
        <div className="shrink-0 bg-slate-50/90 border-b border-slate-200 p-6 sm:p-7">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0 flex-1">
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
                <span className="flex items-center gap-1.5" title="Office email (login)">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {employee.user?.email || "No email assigned"}
                </span>
                {view.personalEmail && (
                  <span className="flex items-center gap-1.5" title="Personal email (also works for login)">
                    <AtSign className="w-3.5 h-3.5 text-slate-400" />
                    {view.personalEmail}
                  </span>
                )}
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

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
            {canEdit && onDeleteEmployee && (
              <button
                type="button"
                onClick={() => onDeleteEmployee(employee)}
                className="group inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-rose-200 hover:border-rose-600 bg-white hover:bg-rose-600 text-rose-600 hover:text-white text-xs font-semibold shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer"
                title="Delete this employee"
              >
                <Trash2 className="w-3.5 h-3.5 transition-colors duration-150" />
                <span>Delete employee</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

          {/* Navigation Tabs */}
          <div role="tablist" aria-label="Employee sections" className="mt-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1">
            {([
              { key: "DOCUMENTS", label: "Documents & Compliance", icon: <FileCheck2 className="w-4 h-4" /> },
              { key: "PROFILE", label: "Profile Details", icon: <User className="w-4 h-4" /> },
              { key: "ASSETS", label: "Assigned Equipment", icon: <Laptop className="w-4 h-4" /> },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 ${
                  activeTab === tab.key
                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
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
                    <h3 className="text-base font-semibold text-slate-900">Edit profile details</h3>
                    <p className="text-xs text-slate-500">All fields are required except personal email, PAN, PF UAN and ESI number.</p>
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
                <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:opacity-60"
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
                  <Row label="Office email" value={view.user?.email || view.workEmail} />
                  <Row label="Personal email" value={view.personalEmail} />
                  <Row label="Address" value={view.address} wrap />
                </ProfileCard>

                <ProfileCard icon={<Phone className="w-4 h-4 text-rose-600" />} title="Emergency Contact">
                  <Row label="Contact name" value={view.emergencyContactName} />
                  <Row label="Contact phone" value={view.emergencyContactPhone} />
                </ProfileCard>

                <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/70 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2"><h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-600" />Employment & Assignment</h3>{canEditProfile && !editingEmployment && <button type="button" onClick={startEditingEmployment} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white"><Pencil className="h-3 w-3" /> Edit</button>}</div>
                  {editingEmployment ? <form onSubmit={saveEmployment} className="space-y-3" noValidate><label className="block text-xs font-medium text-slate-600">Employee ID<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" value={employmentForm.employeeCode} onChange={(e) => setEmploymentForm((f) => ({ ...f, employeeCode: e.target.value.toUpperCase() }))} required /></label><label className="block text-xs font-medium text-slate-600">System role<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={employmentForm.role} onChange={(e) => setEmploymentForm((f) => ({ ...f, role: e.target.value }))} disabled={!canEditRole} required><option value="EMPLOYEE">Employee</option>{canEditRole && <option value="MANAGER">HR / Manager</option>}</select></label><label className="block text-xs font-medium text-slate-600">Designation<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={employmentForm.designation} onChange={(e) => setEmploymentForm((f) => ({ ...f, designation: e.target.value }))} required /></label><label className="block text-xs font-medium text-slate-600">Employment type<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={employmentForm.employmentType} onChange={(e) => setEmploymentForm((f) => ({ ...f, employmentType: e.target.value }))} required><option value="">Select type...</option>{EMPLOYMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label className="block text-xs font-medium text-slate-600">Branch<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={employmentForm.branchId} onChange={(e) => setEmploymentForm((f) => ({ ...f, branchId: e.target.value }))} required><option value="">Select branch...</option>{branches.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label className="block text-xs font-medium text-slate-600">Department<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={employmentForm.departmentId} onChange={(e) => setEmploymentForm((f) => ({ ...f, departmentId: e.target.value }))} required><option value="">Select department...</option>{departments.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label className="block text-xs font-medium text-slate-600">Shift schedule<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={employmentForm.shiftId} onChange={(e) => setEmploymentForm((f) => ({ ...f, shiftId: e.target.value }))} required><option value="">Select shift...</option>{shifts.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label className="block text-xs font-medium text-slate-600">Date of joining<DatePicker id="employment-dateOfJoining" value={employmentForm.dateOfJoining} onChange={(value) => setEmploymentForm((f) => ({ ...f, dateOfJoining: value }))} placeholder="Select joining date" ariaLabel="Date of joining" /></label><div className="flex justify-end gap-2 border-t border-slate-200 pt-3"><button type="button" onClick={() => setEditingEmployment(false)} disabled={employmentSaving} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" disabled={employmentSaving} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{employmentSaving ? "Saving..." : "Save changes"}</button></div></form> : <div className="space-y-2.5 text-xs"><Row label="Employee ID" value={view.employeeCode} mono /><Row label="Designation" value={view.designation} /><Row label="Employment type" value={EMPLOYMENT_LABELS[view.employmentType || ""]} /><Row label="Department" value={view.department?.name} /><Row label="Branch / Location" value={view.branch?.name} /><Row label="Shift schedule" value={view.shift?.name} /><Row label="System role" value={roleLabel(view.user?.role || "EMPLOYEE")} /><Row label="Date of joining" value={formatDate(ymd(view.dateOfJoining) || ymd(view.createdAt))} /></div>}</div>

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
