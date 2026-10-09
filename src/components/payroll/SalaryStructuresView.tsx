"use client";

import React, { useEffect, useState } from "react";
import { employeesApi, payrollApi } from "@/lib/api";
import { formatCurrency, unwrapList, unwrapItem } from "@/lib/utils";
import { Employee } from "@/types";
import { Calculator, Loader2, Save, Wallet } from "lucide-react";
import { toast } from "sonner";
import BulkSalaryPanel from "./BulkSalaryPanel";

const emptyForm = {
  annualCtc: "",
  monthlyCtc: "",
  baseSalary: "",
  hra: "",
  transport: "",
  special: "",
  otherAllowance: "",
  pf: "",
  esi: "",
  professionalTax: "",
  overtimeRate: "1.5",
};

function IndividualSalaryView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  useEffect(() => {
    (async () => {
      try {
        const res = await employeesApi.list();
        setEmployees(unwrapList<Employee>(res).filter((e) => e.status === "ACTIVE"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openEmployee = async (emp: Employee) => {
    setSelected(emp);
    setPreview(null);
    setForm(emptyForm);
    try {
      const res = await payrollApi.getSalaryStructure(emp.id);
      const s = unwrapItem<any>(res);
      if (s) {
        setForm({
          annualCtc: s.annualCtc ?? "",
          monthlyCtc: s.monthlyCtc ?? "",
          baseSalary: s.baseSalary ?? "",
          hra: s.hra ?? "",
          transport: s.transport ?? "",
          special: s.special ?? "",
          otherAllowance: s.otherAllowance ?? "",
          pf: s.pf ?? "",
          esi: s.esi ?? "",
          professionalTax: s.professionalTax ?? "",
          overtimeRate: s.overtimeRate ?? "1.5",
        });
      }
    } catch {
      // no structure yet
    }
  };

  const num = (v: string) => (v === "" ? 0 : Number(v));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (form.baseSalary === "") {
      toast.error("Basic salary is required");
      return;
    }
    setSaving(true);
    try {
      const res = await payrollApi.upsertSalaryStructure({
        employeeId: selected.id,
        annualCtc: form.annualCtc === "" ? undefined : Number(form.annualCtc),
        monthlyCtc: form.monthlyCtc === "" ? undefined : Number(form.monthlyCtc),
        baseSalary: Number(form.baseSalary),
        hra: num(form.hra),
        transport: num(form.transport),
        special: num(form.special),
        otherAllowance: num(form.otherAllowance),
        pf: num(form.pf),
        esi: num(form.esi),
        professionalTax: num(form.professionalTax),
        overtimeRate: num(form.overtimeRate) || 1.5,
      });
      if (res?.success) {
        toast.success("Salary structure saved");
      } else {
        toast.error(res?.message || "Save failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selected) return;
    setPreviewing(true);
    try {
      const res = await payrollApi.calculatePreview({
        employeeId: selected.id,
        month,
        year,
      });
      if (res?.success) {
        setPreview(unwrapItem(res) || res.data);
      } else {
        toast.error(res?.message || "Preview failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-indigo-600" />
          Active employees
        </div>
        {loading ? (
          <p className="p-6 text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
            {employees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => openEmployee(emp)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 ${
                  selected?.id === emp.id ? "bg-indigo-50" : ""
                }`}
              >
                <div className="font-semibold text-slate-900">
                  {emp.firstName} {emp.lastName}
                </div>
                <div className="text-slate-500">{emp.employeeCode}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        {!selected ? (
          <p className="text-sm text-slate-500 py-16 text-center">
            Select an employee to set CTC, basic, allowances and statutory deductions.
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {selected.firstName} {selected.lastName}
              </h3>
              <p className="text-xs text-slate-500">{selected.employeeCode}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["annualCtc", "Annual CTC"],
                  ["monthlyCtc", "Monthly CTC"],
                  ["baseSalary", "Basic *"],
                  ["hra", "HRA"],
                  ["transport", "Transport"],
                  ["special", "Special allowance"],
                  ["otherAllowance", "Other allowance"],
                  ["pf", "PF"],
                  ["esi", "ESI"],
                  ["professionalTax", "Professional tax"],
                  ["overtimeRate", "OT multiplier"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save structure
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                Preview {month}/{year}
              </button>
            </div>
            {preview && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs grid grid-cols-2 gap-2">
                <div>Gross: {formatCurrency(preview.salaryBreakdown?.grossSalary ?? preview.grossSalary)}</div>
                <div>Net: {formatCurrency(preview.netSalary)}</div>
                <div>LOP days: {preview.attendanceSummary?.unpaidLeaveDays ?? "—"}</div>
                <div>OT hours: {preview.attendanceSummary?.overtimeHours ?? "—"}</div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function SalaryStructuresView() {
  const [mode, setMode] = useState<"INDIVIDUAL" | "BULK">("INDIVIDUAL");

  return (
    <div className="space-y-4">
      <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 w-fit">
        {(
          [
            ["INDIVIDUAL", "One employee"],
            ["BULK", "All employees"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              mode === value ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "BULK" ? <BulkSalaryPanel /> : <IndividualSalaryView />}
    </div>
  );
}
