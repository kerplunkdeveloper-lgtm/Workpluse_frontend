"use client";

import React, { useEffect, useState } from "react";
import { payrollApi, employeesApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

function ExportHistory() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    payrollApi.listExports().then((res) => setRows(unwrapList(res).length ? unwrapList(res) : res?.data || [])).catch(() => {});
  }, []);
  return (
    <ul className="text-xs divide-y">
      {rows.map((r) => (
        <li key={r.id} className="py-2 flex justify-between">
          <span>{r.fileName} · {r.rowCount} rows</span>
          <button
            className="text-indigo-600"
            onClick={async () => {
              const res = await payrollApi.downloadSavedExport(r.id);
              downloadBlob(res.data, r.fileName);
            }}
          >
            Download
          </button>
        </li>
      ))}
    </ul>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StatutoryView() {
  const { role } = useAuth();
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const [fy] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    return d.getMonth() >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [declaration, setDeclaration] = useState<any>({
    regime: "NEW",
    rentPaidAnnual: 0,
    section80C: 0,
    section80D: 0,
    homeLoanInterest: 0,
    npsEmployee: 0,
    otherExemptions: 0,
    previousEmployerIncome: 0,
    previousEmployerTds: 0,
    isMetro: true,
  });
  const [tax, setTax] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  const load = async (empId?: string) => {
    const res = await payrollApi.getItDeclaration({
      employeeId: isAdmin ? empId || employeeId || undefined : undefined,
      financialYear: fy,
    });
    if (res?.data?.declaration) setDeclaration({ ...declaration, ...res.data.declaration });
    if (res?.data?.tax) setTax(res.data.tax);
  };

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        const list = unwrapList(await employeesApi.list());
        setEmployees(list);
        if (list[0]?.id) {
          setEmployeeId(list[0].id);
          load(list[0].id);
        }
      } else {
        load();
      }
    })();
  }, []);

  const handleSave = async (submit = false) => {
    setSaving(true);
    try {
      const res = await payrollApi.saveItDeclaration({
        ...declaration,
        employeeId: isAdmin ? employeeId : undefined,
        financialYear: fy,
        submit,
      });
      if (res?.success) {
        toast.success(submit ? "Declaration submitted" : "Saved");
        setTax(res.data?.tax);
      } else toast.error(res?.message || "Save failed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleForm16 = async () => {
    try {
      if (isAdmin) {
        const res = await payrollApi.generateForm16({ employeeId: employeeId || undefined, financialYear: fy });
        if (res?.success) toast.success("Form 16 generated");
        else toast.error(res?.message || "Failed");
      }
      const blob = await payrollApi.downloadForm16Html({ employeeId: employeeId || undefined, financialYear: fy });
      downloadBlob(blob, `Form16_${fy}.html`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Form 16 failed");
    }
  };

  const handleExport = async (kind: "pf-ecr" | "esi" | "neft") => {
    try {
      const res = await payrollApi.downloadExport(kind, month, year);
      const name =
        res.headers?.["content-disposition"]?.match(/filename="([^"]+)"/)?.[1] || `${kind}.csv`;
      downloadBlob(res.data, name);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Export failed");
    }
  };

  const field = (key: string, label: string) => (
    <label className="space-y-1 text-xs">
      <span className="text-slate-600 font-medium">{label}</span>
      <input
        type="number"
        value={declaration[key] ?? 0}
        onChange={(e) => setDeclaration({ ...declaration, [key]: Number(e.target.value) })}
        className="w-full px-3 py-2 rounded-xl border border-slate-200"
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Statutory payroll"
        description="IT declaration, TDS / Form 16, PF ECR, ESI return, and NEFT salary file."
      />

      {isAdmin && (
        <select
          value={employeeId}
          onChange={(e) => {
            setEmployeeId(e.target.value);
            load(e.target.value);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.firstName} {e.lastName} ({e.employeeCode})
            </option>
          ))}
        </select>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold">IT declaration · FY {fy}</h2>
          <select
            value={declaration.regime}
            onChange={(e) => setDeclaration({ ...declaration, regime: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          >
            <option value="NEW">New regime (default)</option>
            <option value="OLD">Old regime (80C / HRA)</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            {field("section80C", "80C")}
            {field("section80D", "80D")}
            {field("rentPaidAnnual", "Annual rent")}
            {field("homeLoanInterest", "Home loan interest")}
            {field("npsEmployee", "NPS")}
            {field("previousEmployerTds", "Previous employer TDS")}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 rounded-xl border text-xs font-semibold">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save draft"}
            </button>
            <button onClick={() => handleSave(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
              Submit
            </button>
            <button onClick={handleForm16} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">
              Form 16
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 text-sm">
          <h2 className="text-sm font-semibold">TDS estimate</h2>
          {tax ? (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <dt className="text-slate-500">Taxable income</dt>
              <dd>₹{Number(tax.taxableIncome || 0).toLocaleString("en-IN")}</dd>
              <dt className="text-slate-500">Total tax</dt>
              <dd>₹{Number(tax.totalTax || 0).toLocaleString("en-IN")}</dd>
              <dt className="text-slate-500">TDS deducted</dt>
              <dd>₹{Number(tax.tdsDeducted || 0).toLocaleString("en-IN")}</dd>
              <dt className="text-slate-500">Monthly TDS</dt>
              <dd>₹{Number(tax.monthlyTds || 0).toLocaleString("en-IN")}</dd>
              <dt className="text-slate-500">Payable</dt>
              <dd>₹{Number(tax.taxPayable || 0).toLocaleString("en-IN")}</dd>
            </dl>
          ) : (
            <p className="text-xs text-slate-500">Save a declaration to see tax.</p>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold">Monthly filing files</h2>
          <div className="flex gap-2">
            <input type="number" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20 px-2 py-2 rounded-xl border text-xs" />
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 px-2 py-2 rounded-xl border text-xs" />
            <button onClick={() => handleExport("pf-ecr")} className="px-3 py-2 rounded-xl border text-xs font-semibold">PF ECR</button>
            <button onClick={() => handleExport("esi")} className="px-3 py-2 rounded-xl border text-xs font-semibold">ESI</button>
            <button onClick={() => handleExport("neft")} className="px-3 py-2 rounded-xl border text-xs font-semibold">NEFT / NACH</button>
          </div>
          <ExportHistory />
        </div>
      )}
    </div>
  );
}
