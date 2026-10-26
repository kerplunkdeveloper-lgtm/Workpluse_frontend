"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Branch } from "@/types";
import { branchesApi, employeesApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Plus,
  ShieldCheck,
  Loader2,
  Trash2,
  Users,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import LocationPicker, { PickedLocation } from "./LocationPicker";
import { confirmDialog } from "@/components/ui/confirmDialog";

// Leaflet touches `window`, so the card maps load in the browser only.
const BranchMapPreview = dynamic(() => import("./BranchMapPreview"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-slate-100" />,
});

// The full, interactive map opened from a card, so nobody leaves the app to see where a branch is.
const BranchMapViewer = dynamic(() => import("./BranchMapViewer"), { ssr: false });

/** Tonal round icon button in the Material style: a soft tint at rest, a filled colour on hover. */
const iconButton = (tone: "indigo" | "rose") =>
  `inline-flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
    tone === "indigo" ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white" : "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
  }`;

/** 250 -> "250 m", 1000 -> "1 km" */
const formatRadius = (meters: number) => (meters >= 1000 ? `${Number((meters / 1000).toFixed(2))} km` : `${meters} m`);

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
  const [viewBranch, setViewBranch] = useState<Branch | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const [brRes, empRes] = await Promise.allSettled([branchesApi.list(), employeesApi.list({ page: 1, limit: 500, status: "WORKING" })]);
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
            Search the office address, use your current location or pick it on the map, save the branch, then set each employee to that branch. Punch-in then checks GPS against this radius.
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
            const lat = Number(b.latitude);
            const lng = Number(b.longitude);
            const hasPin = b.latitude != null && b.longitude != null && Number.isFinite(lat) && Number.isFinite(lng);
            const radius = Number(b.radiusMeters || 250);
            return (
              <article
                key={b.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(79,70,229,0.35)]"
              >
                {/* The map is the card's picture: full width, with the pin and the punch range */}
                <div className="relative h-48 sm:h-52">
                  {hasPin ? (
                    <>
                      <BranchMapPreview lat={lat} lng={lng} radiusMeters={radius} label={b.name} className="absolute inset-0" />
                      <button
                        type="button"
                        onClick={() => setViewBranch(b)}
                        aria-label={`Open the map for ${b.name}`}
                        className="absolute inset-0 z-10 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500"
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-indigo-50 px-4 text-center text-slate-400">
                      <MapPin aria-hidden="true" className="h-8 w-8" />
                      <span className="text-xs font-medium">No pin set yet</span>
                      <button type="button" onClick={() => openEdit(b)} className="rounded-full bg-indigo-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow transition hover:bg-indigo-500">
                        Place pin on map
                      </button>
                    </div>
                  )}
                  <span className="pointer-events-none absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-md ring-1 ring-black/5">
                    <Users aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
                    {assigned} {assigned === 1 ? "person" : "people"}
                  </span>
                  {hasPin && (
                    <span className="pointer-events-none absolute right-3 top-3 z-20 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
                      Range {formatRadius(radius)}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-slate-900">{b.name}</h3>
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                      <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span className="line-clamp-2">{b.address || "No street address saved"}</span>
                    </p>
                  </div>

                  <p className="rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200/70">
                    Employees can punch in within <span className="font-bold text-slate-900">{formatRadius(radius)}</span> of the pin.
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setAssignBranch(b)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                      <Users aria-hidden="true" className="h-4 w-4" />
                      Set people
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(b)} aria-label={`Edit ${b.name}`} title="Edit location" className={iconButton("indigo")}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteBranch(b.id)} aria-label={`Delete ${b.name}`} title="Delete location" className={iconButton("rose")}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
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
                  placeholder="e.g. Main office"
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

      {viewBranch && Number.isFinite(Number(viewBranch.latitude)) && Number.isFinite(Number(viewBranch.longitude)) && (
        <BranchMapViewer
          name={viewBranch.name}
          address={viewBranch.address}
          lat={Number(viewBranch.latitude)}
          lng={Number(viewBranch.longitude)}
          radiusMeters={Number(viewBranch.radiusMeters || 250)}
          onClose={() => setViewBranch(null)}
          onEdit={() => {
            const branch = viewBranch;
            setViewBranch(null);
            openEdit(branch);
          }}
        />
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
