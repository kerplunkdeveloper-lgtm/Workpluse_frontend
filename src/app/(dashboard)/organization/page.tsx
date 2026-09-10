'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import api from '@/lib/api';
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  CheckCircle2,
  X,
  Users,
  Radio,
  Check,
  Building,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  _count?: { employees: number };
}

interface Branch {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters: number;
  _count?: { employees: number };
}

export default function OrganizationPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Department state
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

  // Branch state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: 200,
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, branchRes] = await Promise.all([
        api.get('/departments'),
        api.get('/branches'),
      ]);
      setDepartments(deptRes.data.data || []);
      setBranches(branchRes.data.data || []);
    } catch (err: unknown) {
      console.error('Failed to load organization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCreateDept = async (customName?: string) => {
    const nameToUse = (customName || newDeptName).trim();
    if (!nameToUse) return;
    try {
      const res = await api.post('/departments', { name: nameToUse });
      setDepartments((prev) => [...prev, res.data.data]);
      setNewDeptName('');
      notify(`Department '${nameToUse}' created.`);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editDeptName.trim()) return;
    try {
      const res = await api.put(`/departments/${editingDept.id}`, { name: editDeptName.trim() });
      setDepartments((prev) =>
        prev.map((d) => (d.id === editingDept.id ? res.data.data : d))
      );
      setEditingDept(null);
      notify(`Department updated.`);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (!confirm(`Delete department '${name}'?`)) return;
    try {
      await api.delete(`/departments/${id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      notify(`Department '${name}' deleted.`);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: branchForm.name,
        address: branchForm.address || null,
        latitude: branchForm.latitude ? parseFloat(branchForm.latitude) : null,
        longitude: branchForm.longitude ? parseFloat(branchForm.longitude) : null,
        radiusMeters: Number(branchForm.radiusMeters) || 200,
      };

      if (editingBranch) {
        const res = await api.put(`/branches/${editingBranch.id}`, payload);
        setBranches((prev) =>
          prev.map((b) => (b.id === editingBranch.id ? res.data.data : b))
        );
        notify(`Branch updated.`);
      } else {
        const res = await api.post('/branches', payload);
        setBranches((prev) => [...prev, res.data.data]);
        notify(`Branch '${branchForm.name}' created.`);
      }

      setShowBranchModal(false);
      setEditingBranch(null);
      setBranchForm({ name: '', address: '', latitude: '', longitude: '', radiusMeters: 200 });
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleStartEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name,
      address: b.address || '',
      latitude: b.latitude !== null && b.latitude !== undefined ? String(b.latitude) : '',
      longitude: b.longitude !== null && b.longitude !== undefined ? String(b.longitude) : '',
      radiusMeters: b.radiusMeters || 200,
    });
    setShowBranchModal(true);
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (!confirm(`Delete branch '${name}'?`)) return;
    try {
      await api.delete(`/branches/${id}`);
      setBranches((prev) => prev.filter((b) => b.id !== id));
      notify(`Branch '${name}' deleted.`);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const quickAddPondicherry = () => {
    setBranchForm({
      name: 'Pondicherry Technology HQ',
      address: 'Beach Road, White Town, Pondicherry',
      latitude: '11.9344',
      longitude: '79.8358',
      radiusMeters: 250,
    });
    setShowBranchModal(true);
  };

  const quickAddChennai = () => {
    setBranchForm({
      name: 'Chennai Tech Park',
      address: 'OMR IT Corridor, Chennai',
      latitude: '12.9716',
      longitude: '80.2437',
      radiusMeters: 300,
    });
    setShowBranchModal(true);
  };

  return (
    <ProtectedRoute requiredPermission="manage:branches">
      <div className="space-y-6 select-none">
        {/* Top Hero Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#e6edfe] to-[#dbeafe] p-7 border border-indigo-100/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Organizational Structure & Geofences
            </h1>
            <p className="mt-1 text-xs text-slate-600 font-medium">
              Provision corporate branch locations with GPS geofencing radius, and manage operational department units.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingBranch(null);
              setBranchForm({ name: '', address: '', latitude: '', longitude: '', radiusMeters: 200 });
              setShowBranchModal(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all relative z-10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Branch Location</span>
          </button>
        </div>

        {feedback && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 KPI Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e0f2fe] text-[#0284c7]">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Branches</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{branches.length}</div>
              <div className="mt-1 text-xs font-semibold text-sky-600">Physical office locations</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q35,5 70,18 T100,10 L100,25 L0,25 Z" fill="#7dd3fc" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#7c3aed]">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Departments</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{departments.length}</div>
              <div className="mt-1 text-xs font-semibold text-indigo-600">Active functional units</div>
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
                <Radio className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Default Radius</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">200m</div>
              <div className="mt-1 text-xs font-semibold text-emerald-600">Geofence accuracy limit</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q35,8 65,16 T100,5 L100,25 L0,25 Z" fill="#86efac" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
                <Building className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Live Sites</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">{branches.length > 0 ? 1 : 0}</div>
              <div className="mt-1 text-xs font-semibold text-amber-600">Authorized punch zones</div>
            </div>
            <div className="absolute bottom-0 right-0 left-0 h-8 opacity-25 pointer-events-none">
              <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
                <path d="M0,20 Q30,10 60,18 T100,5 L100,25 L0,25 Z" fill="#fdba74" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= BRANCHES COLUMN (7 Cols) ================= */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Branches & Geofences</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Quick presets:</span>
                <button
                  onClick={quickAddPondicherry}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  + Pondicherry
                </button>
                <button
                  onClick={quickAddChennai}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  + Chennai
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : branches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 font-medium">
                No branches configured. Click &quot;Add Branch&quot; to set up your first location.
              </div>
            ) : (
              <div className="space-y-3">
                {branches.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4 hover:border-slate-200 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{b.name}</span>
                        <span className="text-[10px] rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-blue-700 font-bold">
                          {b.radiusMeters}m radius
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {b.address || 'No street address specified'}
                      </p>
                      {b.latitude && b.longitude && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          GPS Coordinates: {b.latitude}, {b.longitude}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEditBranch(b)}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 shadow-2xs"
                        title="Edit Branch"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(b.id, b.name)}
                        className="rounded-xl p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 shadow-2xs"
                        title="Delete Branch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= DEPARTMENTS COLUMN (5 Cols) ================= */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Departments</h2>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => handleCreateDept('Engineering')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-600 hover:bg-slate-100"
                >
                  + Eng
                </button>
                <button
                  onClick={() => handleCreateDept('HR')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-600 hover:bg-slate-100"
                >
                  + HR
                </button>
                <button
                  onClick={() => handleCreateDept('Sales')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-600 hover:bg-slate-100"
                >
                  + Sales
                </button>
              </div>
            </div>

            {/* Create Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New department name..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDept()}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                onClick={() => handleCreateDept()}
                className="rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:shadow-md transition-all"
              >
                Add
              </button>
            </div>

            {/* Edit Department Inline Form */}
            {editingDept && (
              <form onSubmit={handleUpdateDept} className="flex gap-2 p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                <input
                  type="text"
                  required
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
              </form>
            )}

            {departments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 font-medium">
                No departments configured yet.
              </div>
            ) : (
              <div className="space-y-2">
                {departments.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{d.name}</span>
                      {d._count && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({d._count.employees} employees)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDept(d);
                          setEditDeptName(d.name);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Edit Department"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(d.id, d.name)}
                        className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete Department"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal for Branch Create / Edit */}
        {showBranchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">
                  {editingBranch ? 'Edit Branch' : 'Create Branch'}
                </h3>
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBranch} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pondicherry Technology HQ"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 12 Beach Road, White Town"
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Latitude (GPS)</label>
                    <input
                      type="text"
                      placeholder="11.9344"
                      value={branchForm.latitude}
                      onChange={(e) => setBranchForm({ ...branchForm, latitude: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Longitude (GPS)</label>
                    <input
                      type="text"
                      placeholder="79.8358"
                      value={branchForm.longitude}
                      onChange={(e) => setBranchForm({ ...branchForm, longitude: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Geofence Radius (Meters)</label>
                  <input
                    type="number"
                    value={branchForm.radiusMeters}
                    onChange={(e) => setBranchForm({ ...branchForm, radiusMeters: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg"
                  >
                    {editingBranch ? 'Save Changes' : 'Create Branch'}
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
