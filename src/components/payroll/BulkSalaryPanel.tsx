"use client";

import React, { useEffect, useMemo, useState } from "react";
import { employeesApi, payrollApi } from "@/lib/api";
import { formatCurrency, unwrapList } from "@/lib/utils";
import { Employee } from "@/types";
import { Loader2, Save, Search, Wallet } from "lucide-react";
import { toast } from "sonner";

type Split = { basic: string; hra: string; special: string; other: string };

const DEFAULT_SPLIT: Split = { basic: "50", hra: "25", special: "15", other: "10" };
const PAGE_SIZE = 500;

const splitLabels: [keyof Split, string][] = [
  ["basic", "Basic %"],
  ["hra", "HRA %"],
  ["special", "Special %"],
  ["other", "Other %"],
];

const parseCtc = (raw: string | undefined) => {
  const value = Number(String(raw ?? "").trim());
  return Number.isFinite(value) && value > 0 ? value : null;
};

export default function BulkSalaryPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultCtc, setDefaultCtc] = useState("");
  const [split, setSplit] = useState<Split>(DEFAULT_SPLIT);
  const [notify, setNotify] = useState(false);
  const [search, setSearch] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const all: Employee[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await employeesApi.list({ page, limit: PAGE_SIZE });
        all.push(...unwrapList<Employee>(res));
        totalPages = res?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      const active = all.filter((e) => e.status === "ACTIVE");
      setEmployees(active);
      setInputs(
        Object.fromEntries(
          active.map((e) => [e.id, e.salaryStructure?.annualCtc ? String(Math.round(Number(e.salaryStructure.annualCtc))) : ""]),
        ),
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const splitTotal = Object.values(split).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const splitValid = Math.abs(splitTotal - 100) < 0.001 && Number(split.basic) > 0;

  const changes = useMemo(
    () =>
      employees.flatMap((e) => {
        const next = parseCtc(inputs[e.id]);
        if (next === null) return [];
        const current = e.salaryStructure?.annualCtc ? Number(e.salaryStructure.annualCtc) : null;
        if (current !== null && Math.round(current) === Math.round(next)) return [];
        return [{ employeeId: e.id, annualCtc: next }];
      }),
    [employees, inputs],
  );

  const invalidCount = useMemo(
    () => employees.filter((e) => inputs[e.id]?.trim() && parseCtc(inputs[e.id]) === null).length,
    [employees, inputs],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        `${e.firstName} ${e.lastName || ""}`.toLowerCase().includes(q) ||
        String(e.employeeCode || "").toLowerCase().includes(q),
    );
  }, [employees, search]);

  const fillBlank = () => {
    if (parseCtc(defaultCtc) === null) return toast.error("Enter a default annual CTC first");
    setInputs((prev) => {
      const next = { ...prev };
      for (const e of employees) if (!next[e.id]?.trim()) next[e.id] = defaultCtc;
      return next;
    });
  };

  const applyToAll = () => {
    if (parseCtc(defaultCtc) === null) return toast.error("Enter a default annual CTC first");
    setInputs(Object.fromEntries(employees.map((e) => [e.id, defaultCtc])));
  };

  const handleSave = async () => {
    if (!splitValid) return toast.error("Split percentages must add up to 100 and basic must be above 0");
    if (invalidCount > 0) return toast.error(`${invalidCount} row(s) have an invalid CTC`);
    if (changes.length === 0) return toast.info("No salary changes to save");
    if (notify && !window.confirm(`Save ${changes.length} salary change(s) and notify those employees in the app?`)) return;

    setSaving(true);
    try {
      const res = await payrollApi.bulkUpsertSalaryStructures({
        entries: changes,
        split: {
          basic: Number(split.basic),
          hra: Number(split.hra),
          special: Number(split.special),
          other: Number(split.other),
        },
        notify,
      });
      if (res?.success) toast.success(res.message);
      else toast.error(res?.message || "Save failed");
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Wallet className="w-4 h-4 text-indigo-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Set salary for all employees</h3>
          <p className="text-xs text-slate-500">Each row keeps its own annual CTC. Monthly components follow the split below.</p>
        </div>
      </div>

      <div className="p-5 space-y-4 border-b border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-slate-500">Default annual CTC</span>
            <input
              type="number"
              value={defaultCtc}
              onChange={(e) => setDefaultCtc(e.target.value)}
              placeholder="e.g. 600000"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={fillBlank} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              Fill blank rows
            </button>
            <button type="button" onClick={applyToAll} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              Apply to all
            </button>
          </div>
          <label className="flex items-end gap-2 text-xs text-slate-700 pb-2">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-indigo-600" />
            Notify changed employees in the app
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {splitLabels.map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
              <input
                type="number"
                step="0.01"
                value={split[key]}
                onChange={(e) => setSplit((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </label>
          ))}
        </div>
        <p className={`text-xs ${splitValid ? "text-slate-500" : "text-rose-600 font-semibold"}`}>
          Split total: {splitTotal}% {splitValid ? "" : "(must be 100, basic above 0)"}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code"
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs w-64"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              {changes.length} change(s){invalidCount > 0 ? `, ${invalidCount} invalid` : ""}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save salaries
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="p-6 text-xs text-slate-500">Loading employees…</p>
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left text-[13px] text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Gender</th>
                <th className="py-2.5 px-4">Current annual CTC</th>
                <th className="py-2.5 px-4">New annual CTC</th>
                <th className="py-2.5 px-4">Monthly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((e) => {
                const raw = inputs[e.id] ?? "";
                const valid = parseCtc(raw) !== null;
                const invalid = raw.trim() !== "" && !valid;
                return (
                  <tr key={e.id}>
                    <td className="py-2 px-4">
                      <div className="font-semibold text-slate-900">{e.firstName} {e.lastName || ""}</div>
                      <div className="text-xs text-slate-500">{e.employeeCode}</div>
                    </td>
                    <td className="py-2 px-4 text-slate-600">
                      {e.gender === "MALE" ? "Male" : e.gender === "FEMALE" ? "Female" : "—"}
                    </td>
                    <td className="py-2 px-4 tabular-nums text-slate-600">
                      {e.salaryStructure?.annualCtc ? formatCurrency(e.salaryStructure.annualCtc) : <span className="text-slate-400">Not set</span>}
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={raw}
                        onChange={(ev) => setInputs((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                        placeholder="Not set"
                        className={`w-40 px-2.5 py-1.5 rounded-lg border text-xs ${invalid ? "border-rose-400" : "border-slate-200"}`}
                      />
                    </td>
                    <td className="py-2 px-4 tabular-nums text-slate-500">
                      {valid ? formatCurrency(Number(raw) / 12) : "—"}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">No employees match this search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
