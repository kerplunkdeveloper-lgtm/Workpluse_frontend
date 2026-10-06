"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { departmentsApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import { Check, FolderTree, Loader2, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";

interface Department {
  id: string;
  name: string;
  _count?: { employees?: number };
  employeeCount?: number;
}

const headcount = (d: Department) => d._count?.employees ?? d.employeeCount ?? 0;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function DepartmentsView() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await departmentsApi.list();
      setDepartments(unwrapList(res) as Department[]);
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

  const totalPeople = useMemo(() => departments.reduce((sum, d) => sum + headcount(d), 0), [departments]);
  const largest = useMemo(
    () => departments.reduce<Department | null>((best, d) => (!best || headcount(d) > headcount(best) ? d : best), null),
    [departments],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...departments]
      .filter((d) => !q || d.name.toLowerCase().includes(q))
      .sort((a, b) => headcount(b) - headcount(a) || a.name.localeCompare(b.name));
  }, [departments, query]);

  const handleCreate = async (e: React.FormEvent) => {
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
        toast.success(`${clean} added`);
        setName("");
        await load();
      } else toast.error(res?.message || "Could not create the department.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not create the department.");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (id: string) => {
    const clean = editName.trim();
    if (!clean) return;
    setRenaming(true);
    try {
      const res = await departmentsApi.update(id, { name: clean });
      if (res?.success) {
        toast.success("Department renamed");
        setEditingId(null);
        await load();
      } else toast.error(res?.message || "Could not rename the department.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not rename the department.");
    } finally {
      setRenaming(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await departmentsApi.remove(deleteTarget.id);
      if (res?.success !== false) {
        toast.success(`${deleteTarget.name} deleted`);
        setDeleteTarget(null);
        await load();
      } else toast.error(res?.message || "Could not delete the department.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not delete the department.");
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
        description="Org structure used on invites, onboarding, and reports."
      />

      {/* Summary */}
      <section aria-label="Department summary" className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <stat.icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
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

      {/* Add + search */}
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <form
          onSubmit={handleCreate}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50"
        >
          <label htmlFor="new-department" className="sr-only">
            New department name
          </label>
          <input
            id="new-department"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New department name"
            maxLength={80}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </form>

        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments"
            aria-label="Search departments"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-50"
          />
        </div>
      </section>

      {/* List */}
      {loading ? (
        <div aria-busy="true" aria-label="Loading departments" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl border border-slate-100 bg-white" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FolderTree aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-serif text-xl font-semibold text-slate-950">No departments yet</h2>
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
            const isEditing = editingId === d.id;
            return (
              <li
                key={d.id}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_22px_50px_-30px_rgba(79,70,229,0.4)]"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="keep-white flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 font-serif text-sm font-semibold tracking-wide shadow-md shadow-indigo-600/25"
                  >
                    {initialsOf(d.name) || "D"}
                  </span>

                  {isEditing ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleRename(d.id);
                      }}
                    >
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                        aria-label={`Rename ${d.name}`}
                        maxLength={80}
                        className="min-w-0 flex-1 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                      />
                      <button
                        type="submit"
                        disabled={renaming || !editName.trim()}
                        aria-label="Save name"
                        className="rounded-xl bg-indigo-600 p-2 text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                      >
                        {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel rename"
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-slate-950">{d.name}</h3>
                        <p className="mt-0.5 text-sm text-slate-600 tabular-nums">
                          {count.toLocaleString("en-IN")} {count === 1 ? "employee" : "employees"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(d.id);
                            setEditName(d.name);
                          }}
                          aria-label={`Rename ${d.name}`}
                          title="Rename"
                          className="rounded-xl p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(d)}
                          aria-label={`Delete ${d.name}`}
                          title="Delete"
                          className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

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
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-[width] duration-500" style={{ width: `${share}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete confirmation */}
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
                    ? `${headcount(deleteTarget).toLocaleString("en-IN")} ${headcount(deleteTarget) === 1 ? "employee is" : "employees are"} in this department. They will be left without a department.`
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
