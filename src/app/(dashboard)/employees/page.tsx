'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import api from '@/lib/api';
import {
  Users,
  Plus,
  Search,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Copy,
  Check,
  Trash2,
  Edit3,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface EmployeeItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  status: string;
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  department?: Department | null;
  branch?: Branch | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Employee Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Employee State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    status: 'ACTIVE',
    role: 'EMPLOYEE',
    departmentId: '',
    branchId: '',
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Success state showing credentials
  const [recentLoginCredentials, setRecentLoginCredentials] = useState<{
    email: string;
    pass: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form input state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    employeeCode: '',
    departmentId: '',
    branchId: '',
  });

  // Quick inline creation for dept & branch
  const [newDeptName, setNewDeptName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, branchRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments'),
        api.get('/branches'),
      ]);
      setEmployees(empRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      setBranches(branchRes.data.data || []);
    } catch (err: unknown) {
      console.error('Failed to load employee directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) return;
    try {
      const res = await api.post('/departments', { name: newDeptName.trim() });
      setDepartments((prev) => [...prev, res.data.data]);
      setFormData((prev) => ({ ...prev, departmentId: res.data.data.id }));
      setNewDeptName('');
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      const res = await api.post('/branches', { name: newBranchName.trim() });
      setBranches((prev) => [...prev, res.data.data]);
      setFormData((prev) => ({ ...prev, branchId: res.data.data.id }));
      setNewBranchName('');
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      const res = await api.post('/employees', formData);
      setShowModal(false);
      setRecentLoginCredentials({
        email: formData.email,
        pass: formData.password,
        role: formData.role,
      });

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        employeeCode: '',
        departmentId: '',
        branchId: '',
      });

      fetchData();
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setEditForm({
      firstName: emp.firstName,
      lastName: emp.lastName || '',
      phone: emp.phone || '',
      status: emp.status || 'ACTIVE',
      role: emp.user?.role || 'EMPLOYEE',
      departmentId: emp.department?.id || '',
      branchId: emp.branch?.id || '',
    });
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setSubmitting(true);

    try {
      await api.put(`/employees/${editingEmployee.id}`, editForm);
      setEditingEmployee(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${name} and their user login?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/employees/${id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete employee');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName || ''}`.toLowerCase();
    const email = emp.user?.email.toLowerCase() || '';
    const code = emp.employeeCode.toLowerCase();
    const q = searchTerm.toLowerCase();
    return fullName.includes(q) || email.includes(q) || code.includes(q);
  });

  const copyCreds = () => {
    if (!recentLoginCredentials) return;
    navigator.clipboard.writeText(
      `Email: ${recentLoginCredentials.email}\nPassword: ${recentLoginCredentials.pass}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const adminCount = employees.filter((e) => e.user?.role === 'COMPANY_ADMIN' || e.user?.role === 'SUPER_ADMIN').length;

  return (
    <ProtectedRoute requiredPermission="manage:employees">
      <div className="space-y-6 select-none">
        {/* Top Hero Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Workforce Directory</h1>
            <p className="mt-1 text-xs text-slate-600 font-medium">
              Manage workforce records, department & branch assignments, roles, and login credentials.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all relative z-10"
          >
            <Plus className="h-4 w-4" />
            <span>Create Employee</span>
          </button>
        </div>

        {/* Recently Created Credentials Alert */}
        {recentLoginCredentials && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Employee Account Created Successfully!</span>
              </div>
              <button
                onClick={copyCreds}
                className="flex items-center gap-1.5 rounded-xl bg-white border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100/50 transition-all shadow-2xs"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Use these credentials to sign in and test this account:
            </p>

            <div className="flex flex-wrap gap-4 text-xs font-mono bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <div>
                <span className="text-slate-400">Email: </span>
                <span className="text-slate-900 font-bold">{recentLoginCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-400">Password: </span>
                <span className="text-slate-900 font-bold">{recentLoginCredentials.pass}</span>
              </div>
              <div>
                <span className="text-slate-400">Role: </span>
                <span className="text-indigo-600 font-bold">{recentLoginCredentials.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4 KPI Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#7c3aed]">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Workforce</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{employees.length}</div>
              <div className="mt-1 text-xs font-semibold text-indigo-600">Registered employees</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q30,5 60,18 T100,6 L100,25 L0,25 Z" fill="#c4b5fd" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#16a34a]">
                <UserCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Active Roster</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{activeCount}</div>
              <div className="mt-1 text-xs font-semibold text-emerald-600">100% active status</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q35,8 65,16 T100,5 L100,25 L0,25 Z" fill="#86efac" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e0f2fe] text-[#0284c7]">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Departments</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{departments.length}</div>
              <div className="mt-1 text-xs font-semibold text-sky-600">Operational divisions</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q40,6 70,18 T100,8 L100,25 L0,25 Z" fill="#7dd3fc" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Branches</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{branches.length}</div>
              <div className="mt-1 text-xs font-semibold text-amber-600">Geofence sites</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q30,10 60,18 T100,5 L100,25 L0,25 Z" fill="#fdba74" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or employee code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
          />
        </div>

        {/* Directory Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-900">No employees found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Click &quot;Create Employee&quot; to provision your first workforce record.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Code</th>
                  <th className="py-3.5 px-6">Department</th>
                  <th className="py-3.5 px-6">Branch</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEmployees.map((emp) => {
                  const fullName = `${emp.firstName} ${emp.lastName || ''}`.trim();
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs shadow-2xs">
                            {emp.firstName[0]?.toUpperCase() || 'E'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{fullName}</p>
                            <p className="text-[10px] text-slate-400">{emp.user?.email || 'No login'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-600">
                        {emp.employeeCode}
                      </td>
                      <td className="py-3.5 px-6">
                        {emp.department ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                            <Building2 className="h-3 w-3 text-indigo-600" />
                            <span>{emp.department.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        {emp.branch ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                            <MapPin className="h-3 w-3 text-blue-600" />
                            <span>{emp.branch.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          {emp.user?.role || 'EMPLOYEE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(emp)}
                            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shadow-2xs"
                            title="Edit Employee"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, fullName)}
                            disabled={deletingId === emp.id}
                            className="rounded-xl p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs disabled:opacity-50"
                            title="Delete Employee"
                          >
                            {deletingId === emp.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal: Create Employee */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Create New Employee</h2>
                  <p className="text-xs text-slate-500">
                    Stores employee record and provisions login credentials.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {modalError && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitEmployee} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Jane"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@company.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Login Password *</label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Password123!"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      placeholder="Auto-generated if blank"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="+ Quick add new department"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleCreateDepartment}
                      className="rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Branch Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch Location</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="+ Quick add new branch"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleCreateBranch}
                      className="rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save & Issue Credentials</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Employee */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Edit Employee</h2>
                  <p className="text-xs text-slate-500">
                    Update profile, role, status, or branch assignment.
                  </p>
                </div>
                <button
                  onClick={() => setEditingEmployee(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateEmployee} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="TERMINATED">TERMINATED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={editForm.departmentId}
                    onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="">-- None --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch Location</label>
                  <select
                    value={editForm.branchId}
                    onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="">-- None --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Update Employee</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
