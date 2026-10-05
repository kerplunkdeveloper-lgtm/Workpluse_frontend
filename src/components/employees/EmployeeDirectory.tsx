"use client";

import React, { useState, useEffect } from "react";
import { Employee } from "@/types";
import { employeesApi, branchesApi, departmentsApi, shiftsApi } from "@/lib/api";
import { formatCurrency, formatDate, unwrapList } from "@/lib/utils";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Edit,
  Sparkles,
  Send,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import EmployeeProfileModal from "./EmployeeProfileModal";
import ProfilePhotoPicker from "@/components/profile/ProfilePhotoPicker";

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);

  // Profile & Documents Modal State
  const [selectedEmployeeForProfile, setSelectedEmployeeForProfile] = useState<Employee | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);


  // Create / Invite Employee Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<"INVITE" | "MANUAL">("INVITE");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [showCreateDepartment, setShowCreateDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [shiftId, setShiftId] = useState("");
  const [ctc, setCtc] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [uanNumber, setUanNumber] = useState("");
  const [esiNumber, setEsiNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, brRes, deptRes, shiftRes] = await Promise.allSettled([
        employeesApi.list({ page, limit: 20, search: searchQuery || undefined }),
        branchesApi.list(),
        departmentsApi.list(),
        shiftsApi.list(),
      ]);

      if (empRes.status === "fulfilled") {
        setEmployees(unwrapList(empRes.value));
        setTotalPages(empRes.value?.totalPages || 1);
        setTotalEmployees(empRes.value?.total || unwrapList(empRes.value).length);
      }
      if (brRes.status === "fulfilled") {
        setBranches(unwrapList(brRes.value));
      }
      if (deptRes.status === "fulfilled") {
        setDepartments(unwrapList(deptRes.value));
      }
      if (shiftRes.status === "fulfilled") {
        setShifts(unwrapList(shiftRes.value));
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      if (inviteMode === "INVITE") {
        res = await employeesApi.inviteEmployee({
          firstName,
          lastName,
          email,
          phone,
          employeeCode: employeeCode || `WP-EMP-${Date.now().toString().slice(-4)}`,
          designation: designation || undefined,
          role,
          branchId: branchId || undefined,
          departmentId: departmentId || undefined,
          shiftId: shiftId || undefined,
          ctc: ctc ? Number(ctc) : undefined,
          panNumber: panNumber || undefined,
          uanNumber: uanNumber || undefined,
          esiNumber: esiNumber || undefined,
        });
      } else {
        res = await employeesApi.create({
          firstName,
          lastName,
          email,
          password,
          phone,
          employeeCode: employeeCode || `WP-EMP-${Date.now().toString().slice(-4)}`,
          designation: designation || undefined,
          role,
          branchId: branchId || undefined,
          departmentId: departmentId || undefined,
          shiftId: shiftId || undefined,
          ctc: ctc ? Number(ctc) : undefined,
          panNumber: panNumber || undefined,
          uanNumber: uanNumber || undefined,
          esiNumber: esiNumber || undefined,
        });
      }

      if (res?.success) {
        const createdId = res.data?.id || res.employee?.id;
        if (photoFile && createdId) {
          try {
            await employeesApi.uploadAvatar(createdId, photoFile);
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Employee saved, but the photo did not upload.");
          }
        }
        if (inviteMode === "INVITE") {
          toast.success(`Invitation dispatched! Credentials emailed to ${email}.`);
        } else {
          toast.success("Employee onboarded and account credentials created!");
        }
        confetti({ particleCount: 60, spread: 60 });
        setModalOpen(false);
        // Reset form
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setEmployeeCode("");
        setDesignation("");
        setCtc("");
        setPanNumber("");
        setUanNumber("");
        setEsiNumber("");
        setPhotoFile(null);
        loadData();
      } else {
        toast.error(res?.message || "Failed to add employee");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to add employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDepartment = async () => {
    const departmentName = newDepartmentName.trim();
    if (!departmentName) {
      toast.error("Enter a department name first.");
      return;
    }
    setCreatingDepartment(true);
    try {
      const res = await departmentsApi.create({ name: departmentName });
      if (!res?.success) {
        toast.error(res?.message || "Could not create department");
        return;
      }
      const created = res.data;
      setDepartments((current) => [created, ...current]);
      setDepartmentId(created.id);
      setNewDepartmentName("");
      setShowCreateDepartment(false);
      toast.success(`${departmentName} department created and selected.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not create department");
    } finally {
      setCreatingDepartment(false);
    }
  };

  const filteredEmployees = employees;

  return (
    <div className="space-y-6">
      {/* Header & Add Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            Workforce Employee Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage organization members, assign branches, departments, shifts, and configure compensation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setInviteMode("INVITE");
              if (branches.length > 0 && !branchId) setBranchId(branches[0].id);
              if (departments.length > 0 && !departmentId) setDepartmentId(departments[0].id);
              if (shifts.length > 0 && !shiftId) setShiftId(shifts[0].id);
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition"
          >
            <Mail className="w-4 h-4" />
            Invite Employee
          </button>

          <button
            onClick={() => {
              setInviteMode("MANUAL");
              if (branches.length > 0 && !branchId) setBranchId(branches[0].id);
              if (departments.length > 0 && !departmentId) setDepartmentId(departments[0].id);
              if (shifts.length > 0 && !shiftId) setShiftId(shifts[0].id);
              setModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Manual Add
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search employees by name, designation, code, email..."
          className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-slate-400 hover:text-white px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4">Shift</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-slate-200 rounded" />
                            <div className="h-2.5 w-36 bg-slate-100 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3 w-16 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3 w-16 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-5 w-16 bg-slate-100 rounded-full" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-5 w-14 bg-emerald-50 rounded-full" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="h-4 w-12 bg-slate-200 rounded ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    No employees matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => {
                          setSelectedEmployeeForProfile(emp);
                          setProfileModalOpen(true);
                        }}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        {emp.avatarUrl ? (
                          <img
                            src={emp.avatarUrl}
                            alt={`${emp.firstName} ${emp.lastName || ""}`}
                            className="w-8 h-8 rounded-full object-cover shadow-xs group-hover:ring-2 group-hover:ring-indigo-400/40 transition"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs group-hover:ring-2 group-hover:ring-indigo-400/40 transition">
                            {emp.firstName?.[0] || "E"}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                            {emp.firstName} {emp.lastName || ""}
                          </p>
                          <p className="text-[11px] text-slate-500">{emp.user?.email || emp.phone || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-700">
                      {emp.employeeCode}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {emp.designation || <span className="text-slate-400">Not assigned</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {emp.department?.name || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <select
                        value={emp.branchId || ""}
                        onChange={(e) => {
                          const next = e.target.value;
                          employeesApi
                            .update(emp.id, { branchId: next || null })
                            .then((res) => {
                              if (res?.success !== false) {
                                toast.success("Branch updated");
                                loadData();
                              } else toast.error(res?.message || "Could not set branch");
                            })
                            .catch((err) => toast.error(err.response?.data?.message || "Could not set branch"));
                        }}
                        className="max-w-[160px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                      >
                        <option value="">No branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {emp.shift?.name || "General Shift"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {emp.user?.role || "EMPLOYEE"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          emp.status === "ACTIVE" || emp.status === "PROBATION"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : emp.status === "NOTICE_PERIOD"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedEmployeeForProfile(emp);
                          setProfileModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-bold transition shadow-xs cursor-pointer"
                        title="View Employee Profile & Manage Documents"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        Profile & Docs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} · {totalEmployees} employees
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {inviteMode === "INVITE" ? "Invite Employee via Email" : "Add New Workforce Member"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {inviteMode === "INVITE"
                ? "Auto-generates temporary access credentials and emails them to the employee."
                : "Directly provisions an account with custom credentials and role assignment."}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 mb-4">
              <button
                type="button"
                onClick={() => setInviteMode("INVITE")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  inviteMode === "INVITE"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email Invite (Auto Credentials)
              </button>
              <button
                type="button"
                onClick={() => setInviteMode("MANUAL")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  inviteMode === "MANUAL"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Manual Provisioning
              </button>
            </div>

            {inviteMode === "INVITE" && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 mb-4 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  WorkPulse will generate a secure temporary password and email it to the employee with their company sign-in link. They must change password upon first login.
                </p>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <ProfilePhotoPicker
                size="md"
                initials={firstName?.[0] || "E"}
                hint="Add profile photo"
                onFile={(file) => setPhotoFile(file)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className={inviteMode === "INVITE" ? "space-y-1" : "grid grid-cols-2 gap-3"}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@company.com"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                {inviteMode === "MANUAL" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password *</label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="e.g. WP-EMP-009 (optional)"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    maxLength={120}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Department</label>
                    <button
                      type="button"
                      onClick={() => setShowCreateDepartment((value) => !value)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      {showCreateDepartment ? "Choose existing" : "+ Create new"}
                    </button>
                  </div>
                  {showCreateDepartment ? (
                    <div className="flex gap-1.5">
                      <input
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleCreateDepartment();
                          }
                        }}
                        placeholder="e.g. Engineering"
                        maxLength={100}
                        className="min-w-0 flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateDepartment()}
                        disabled={creatingDepartment}
                        className="px-2.5 rounded-xl bg-indigo-600 text-white disabled:opacity-50"
                        title="Create department"
                      >
                        {creatingDepartment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Schedule</label>
                  <select
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Shift...</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual CTC (INR)</label>
                  <input
                    type="number"
                    value={ctc}
                    onChange={(e) => setCtc(e.target.value)}
                    placeholder="e.g. 900000"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN</label>
                  <input
                    type="text"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UAN</label>
                  <input
                    type="text"
                    value={uanNumber}
                    onChange={(e) => setUanNumber(e.target.value)}
                    placeholder="PF UAN"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ESI number</label>
                  <input
                    type="text"
                    value={esiNumber}
                    onChange={(e) => setEsiNumber(e.target.value)}
                    placeholder="ESI IP"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : inviteMode === "INVITE" ? (
                    <Send className="w-3.5 h-3.5" />
                  ) : null}
                  {inviteMode === "INVITE" ? "Send Email Invitation" : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile & Documents Modal */}
      {selectedEmployeeForProfile && (
        <EmployeeProfileModal
          employee={selectedEmployeeForProfile}
          isOpen={profileModalOpen}
          initialTab="DOCUMENTS"
          isCurrentUserAdmin
          onEmployeeUpdated={(updated) => {
            setSelectedEmployeeForProfile(updated);
            setEmployees((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
          }}
          onClose={() => {
            setProfileModalOpen(false);
            setSelectedEmployeeForProfile(null);
          }}
        />
      )}
    </div>
  );
}
