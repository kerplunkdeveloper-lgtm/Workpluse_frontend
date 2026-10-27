"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { departmentsApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import { FolderTree, Loader2, Pencil, Plus, Search, Trash2, Users, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import DepartmentModal from "./DepartmentModal";
import {
  resolveDepartmentVisual,
  detectDefaultDepartmentStyle,
  getStoredDepartmentStyles,
  saveDepartmentStyle,
  removeStoredDepartmentStyle,
  DepartmentStyle,
} from "@/lib/departmentVisuals";

interface Department {
  id: string;
  name: string;
  _count?: { employees?: number };
  employeeCount?: number;
}

const headcount = (d: Department) => d._count?.employees ?? d.employeeCount ?? 0;

export default function DepartmentsView() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [customStyles, setCustomStyles] = useState<Record<string, DepartmentStyle>>({});

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<{
    id?: string;
    name?: string;
    style?: DepartmentStyle;
  } | null>(null);

  const cancelRef = useRef<HTMLButtonElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await departmentsApi.list({ fresh: true });
      setDepartments(unwrapList(res) as Department[]);
      setCustomStyles(getStoredDepartmentStyles());
    } catch {
      toast.error("Departments could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (deleteTarget) cancelRef.current?.focus();
  }, [deleteTarget]);

  const totalPeople = useMemo(
    () => departments.reduce((sum, d) => sum + headcount(d), 0),
    [departments],
  );
  const largest = useMemo(
    () =>
      departments.reduce<Department | null>(
        (best, d) => (!best || headcount(d) > headcount(best) ? d : best),
        null,
      ),
    [departments],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...departments]
      .filter((d) => !q || d.name.toLowerCase().includes(q))
      .sort((a, b) => headcount(b) - headcount(a) || a.name.localeCompare(b.name));
  }, [departments, query]);

  // Quick auto-detected icon as user types in the inline input
  const quickVisual = useMemo(() => {
    return detectDefaultDepartmentStyle(name);
  }, [name]);

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (departments.some((d) => d.name.toLowerCase() === clean.toLowerCase())) {
      toast.error(`A department named "${clean}" already exists.`);
      return;
    }
    setSaving(true);
    try {
      const res = await departmentsApi.create({ name: clean });
      if (res?.success) {
        toast.success(`${clean} department added`);
        // Save auto-detected style
        const auto = detectDefaultDepartmentStyle(clean);
        const style: DepartmentStyle = {
          iconId: auto.iconId,
          themeId: auto.themeId,
        };
        const createdId = res?.data?.id;
        if (createdId) saveDepartmentStyle(createdId, style);
        saveDepartmentStyle(clean.toLowerCase(), style);

        setName("");
        await load();
      } else toast.error(res?.message || "Could not create the department.");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Could not create the department.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleModalSave = async ({
    name: newName,
    style,
  }: {
    name: string;
    style: DepartmentStyle;
  }) => {
    if (modalInitialData?.id) {
      // Edit existing
      const res = await departmentsApi.update(modalInitialData.id, { name: newName });
      if (res?.success !== false) {
        saveDepartmentStyle(modalInitialData.id, style);
        saveDepartmentStyle(newName.toLowerCase(), style);
        toast.success(`Updated ${newName}`);
        await load();
      } else {
        throw new Error(res?.message || "Could not update the department.");
      }
    } else {
      // Create new
      const res = await departmentsApi.create({ name: newName });
      if (res?.success) {
        const createdId = res?.data?.id;
        if (createdId) saveDepartmentStyle(createdId, style);
        saveDepartmentStyle(newName.toLowerCase(), style);
        toast.success(`${newName} added successfully`);
        await load();
      } else {
        throw new Error(res?.message || "Could not create the department.");
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await departmentsApi.remove(deleteTarget.id);
      if (res?.success !== false) {
        removeStoredDepartmentStyle(deleteTarget.id);
        removeStoredDepartmentStyle(deleteTarget.name.toLowerCase());
        toast.success(`${deleteTarget.name} deleted`);
        setDeleteTarget(null);
        await load();
      } else toast.error(res?.message || "Could not delete the department.");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Could not delete the department.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const stats = [
    { label: "Departments", value: departments.length.toLocaleString("en-IN"), icon: FolderTree },
    { label: "People assigned", value: totalPeople.toLocaleString("en-IN"), icon: Users },
    {
      label: "Largest team",
      value: largest ? largest.name : "—",
      sub: largest ? `${headcount(largest).toLocaleString("en-IN")} people` : undefined,
      icon: Users,
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        icon={FolderTree}
        title="Departments"
        description="Org structure and visual domain identities used on profiles, onboarding, and workforce reports."
        actions={
          <button
            type="button"
            onClick={() => {
              setModalInitialData(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </button>
        }
      />

      {/* Summary */}
      <section aria-label="Department summary" className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <stat.icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              {loading ? (
                <div className="mt-1.5 h-6 w-20 animate-pulse rounded-md bg-slate-100" />
              ) : (
                <p className="truncate font-serif text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
                  {stat.value}
                </p>
              )}
              {stat.sub && !loading && <p className="text-xs text-slate-500">{stat.sub}</p>}
            </div>
          </div>
        ))}
      </section>

      {/* Add + search bar */}
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <form
          onSubmit={handleQuickCreate}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50"
        >
          {/* Dynamic Auto-matched Icon Indicator */}
          <div
            title={`Domain icon: ${quickVisual.iconId} (${quickVisual.theme.label})`}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${quickVisual.theme.gradient} text-white shadow-xs transition-all`}
          >
            <quickVisual.IconComponent className="h-4 w-4 stroke-[2]" />
          </div>

          <label htmlFor="new-department" className="sr-only">
            New department name
          </label>
          <input
            id="new-department"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department name (e.g. Engineering, Sales, HR)..."
            maxLength={80}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => {
              setModalInitialData({ name });
              setModalOpen(true);
            }}
            title="Configure custom image logo or presets"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
            Add Image
          </button>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </form>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments..."
            aria-label="Search departments"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-50"
          />
        </div>
      </section>

      {/* Department Cards Grid */}
      {loading ? (
        <div
          aria-busy="true"
          aria-label="Loading departments"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-3xl border border-slate-100 bg-white"
            />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FolderTree aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-serif text-xl font-semibold text-slate-950">
            No departments yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
            Add your first department above. Employees, approvals and reports are grouped by these.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-600">
          No department matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((d) => {
            const count = headcount(d);
            const share = totalPeople > 0 ? Math.round((count / totalPeople) * 100) : 0;
            const visual = resolveDepartmentVisual(d.id, d.name, customStyles);
            const { IconComponent, theme, imageUrl } = visual;

            return (
              <li
                key={d.id}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_22px_50px_-30px_rgba(79,70,229,0.4)]"
              >
                <div className="flex items-start gap-3.5">
                  {/* Position from user screenshot: Relation Icon or Custom Uploaded Image */}
                  <div
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
                      imageUrl
                        ? "border border-slate-200 bg-slate-50 shadow-sm"
                        : `bg-gradient-to-br ${theme.gradient} text-white shadow-md ${theme.shadow}`
                    } transition-transform duration-200 group-hover:scale-105`}
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={d.name}
                        className="h-full w-full object-cover rounded-2xl"
                      />
                    ) : (
                      <IconComponent className="h-5 w-5 stroke-[2]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-950">{d.name}</h3>
                    <p className="mt-0.5 text-sm text-slate-600 tabular-nums">
                      {count.toLocaleString("en-IN")} {count === 1 ? "employee" : "employees"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setModalInitialData({
                          id: d.id,
                          name: d.name,
                          style: customStyles[d.id] || customStyles[d.name.toLowerCase()],
                        });
                        setModalOpen(true);
                      }}
                      aria-label={`Edit ${d.name}`}
                      title="Edit department name, image, or icon"
                      className="rounded-xl p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(d)}
                      aria-label={`Delete ${d.name}`}
                      title="Delete department"
                      className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar matching theme accent */}
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Share of workforce</span>
                    <span className="tabular-nums text-slate-700">{share}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={share}
                    aria-label={`${d.name} share of workforce`}
                    className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                  >
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${theme.progressGradient} transition-[width] duration-500`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / Edit Department Modal */}
      <DepartmentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalInitialData(null);
        }}
        onSave={handleModalSave}
        initialData={modalInitialData}
        existingNames={departments.map((d) => d.name)}
      />

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
          onKeyDown={(e) => e.key === "Escape" && !deleting && setDeleteTarget(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dept-title"
            aria-describedby="delete-dept-desc"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 id="delete-dept-title" className="text-base font-bold text-slate-900">
                  Delete {deleteTarget.name}?
                </h2>
                <p id="delete-dept-desc" className="mt-1 text-sm leading-6 text-slate-600">
                  {headcount(deleteTarget) > 0
                    ? `${headcount(deleteTarget).toLocaleString("en-IN")} ${
                        headcount(deleteTarget) === 1 ? "employee is" : "employees are"
                      } in this department. They will be left without a department.`
                    : "No employees are assigned to this department."}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {deleting ? "Deleting" : "Delete department"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
