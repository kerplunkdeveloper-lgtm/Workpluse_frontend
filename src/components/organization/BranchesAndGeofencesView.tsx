"use client";

import React, { useEffect, useState } from "react";
import { Branch } from "@/types";
import { branchesApi, employeesApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Plus,
  Navigation,
  ShieldCheck,
  Loader2,
  Trash2,
  Users,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import LocationPicker, { PickedLocation } from "./LocationPicker";
import { confirmDialog } from "@/components/ui/confirmDialog";

export default function BranchesAndGeofencesView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(250);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [assignBranch, setAssignBranch] = useState<Branch | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const [brRes, empRes] = await Promise.allSettled([branchesApi.list(), employeesApi.list({ page: 1, limit: 200 })]);
      if (brRes.status === "fulfilled") setBranches(unwrapList<Branch>(brRes.value));
      if (empRes.status === "fulfilled") setEmployees(unwrapList(empRes.value));
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const resetModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setName("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setRadiusMeters(250);
  };

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setRadiusMeters(250);
    setModalOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditingId(b.id);
    setName(b.name || "");
    setAddress(b.address || "");
    setLatitude(String(b.latitude ?? ""));
    setLongitude(String(b.longitude ?? ""));
    setRadiusMeters(Number(b.radiusMeters || 250));
    setModalOpen(true);
  };

  const handleLocationChange = (loc: PickedLocation | null) => {
    if (!loc) {
      setLatitude("");
      setLongitude("");
      setAddress("");
      return;
    }
    setLatitude(loc.lat.toFixed(6));
    setLongitude(loc.lng.toFixed(6));
    setAddress(loc.address);
    if (!name.trim() && loc.city) setName(`${loc.city} office`);
  };

  const pickedLocation =
    latitude && longitude && Number.isFinite(parseFloat(latitude)) && Number.isFinite(parseFloat(longitude))
      ? { lat: parseFloat(latitude), lng: parseFloat(longitude), address: address || `${latitude}, ${longitude}` }
      : null;

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latitude || !longitude) {
      toast.error("Select the office location first: search an address, use your current location, or pick it on the map.");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      name,
      address,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radiusMeters: Number(radiusMeters),
    };
    try {
      const res = editingId ? await branchesApi.update(editingId, payload) : await branchesApi.create(payload);
      if (res?.success) {
        toast.success(editingId ? "Branch location updated" : "Branch location saved. Assign people to this branch next.");
        resetModal();
        loadBranches();
      } else {
        toast.error(res?.message || "Failed to save branch");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to save branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!(await confirmDialog({ title: "Delete this branch?", message: "Employees assigned to it will be left without a branch.", confirmLabel: "Delete branch" }))) return;
    try {
      const res = await branchesApi.remove(id);
      if (res?.success !== false) {
        toast.success("Branch deleted");
        loadBranches();
      } else toast.error(res?.message || "Delete failed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Delete failed");
    }
  };

  const handleSetEmployeeBranch = async (employeeId: string, branchId: string) => {
    setAssigningId(employeeId);
    try {
      const res = await employeesApi.update(employeeId, { branchId: branchId || null });
      if (res?.success !== false) {
        toast.success("Branch assigned");
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === employeeId
              ? { ...emp, branchId: branchId || null, branch: branches.find((b) => b.id === branchId) || null }
              : emp
          )
        );
      } else {
        toast.error(res?.message || "Could not set branch");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not set branch");
    } finally {
      setAssigningId(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Locations & branches
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Add a GPS location, save it as a branch, then assign people to that office.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Add location
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">How this works</span>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            Search the office address, use your current location or pick it on the map, save the branch, then set each employee to that branch. Clock-in then checks GPS against this radius.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
            Loading locations...
          </div>
        ) : branches.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            No locations yet. Click <span className="font-semibold text-slate-700">Add location</span> and capture GPS.
          </div>
        ) : (
          branches.map((b) => {
            const assigned = employees.filter((emp) => emp.branchId === b.id).length;
            return (
              <div key={b.id} className="rounded-3xl p-6 border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {assigned} people
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{b.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.address || "No street address"}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">GPS</span>
                      <span className="font-mono text-slate-700">
                        {b.latitude != null ? Number(b.latitude).toFixed(4) : "—"}, {b.longitude != null ? Number(b.longitude).toFixed(4) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Punch radius</span>
                      <span className="font-bold text-emerald-700">{b.radiusMeters || 250} m</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <a
                    href={b.latitude != null ? `https://www.google.com/maps?q=${b.latitude},${b.longitude}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-600 font-semibold"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Map
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setAssignBranch(b)} className="text-slate-700 font-semibold">
                      Set people
                    </button>
                    <button onClick={() => openEdit(b)} className="text-indigo-600 font-semibold">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteBranch(b.id)} className="text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-slate-900 mb-1">{editingId ? "Edit location" : "Add location & set as branch"}</h3>
            <p className="text-xs text-slate-500 mb-4">Capture GPS at the office, then save. You can assign people after saving.</p>

            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Branch name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pondicherry HQ"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <LocationPicker value={pickedLocation} radiusMeters={radiusMeters} onChange={handleLocationChange} />
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[13px] font-medium text-slate-700">
                    Punch radius: <span className="text-indigo-600 font-bold">{radiusMeters} m</span>
                  </label>
                  <span className="text-xs text-slate-500">50m – 1000m</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={25}
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button type="button" onClick={resetModal} className="px-4 py-2 text-sm font-medium text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? "Update branch" : "Save as branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Set branch
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assign people to <span className="font-semibold text-slate-700">{assignBranch.name}</span>
                </p>
              </div>
              <button onClick={() => setAssignBranch(null)} className="text-xs font-semibold text-slate-500">
                Close
              </button>
            </div>
            {employees.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No employees yet. Add people first, then set their branch.</p>
            ) : (
              <div className="space-y-1.5">
                {employees.map((emp) => {
                  const onThis = emp.branchId === assignBranch.id;
                  return (
                    <div key={emp.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {emp.firstName} {emp.lastName || ""}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{emp.branch?.name || "No branch"}</p>
                      </div>
                      <button
                        disabled={assigningId === emp.id}
                        onClick={() => handleSetEmployeeBranch(emp.id, onThis ? "" : assignBranch.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          onThis ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-indigo-600 text-white"
                        }`}
                      >
                        {assigningId === emp.id ? "Saving…" : onThis ? "Assigned" : "Set here"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
