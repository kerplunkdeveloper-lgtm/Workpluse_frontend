"use client";

import React, { useEffect, useState } from "react";
import { loansApi, employeesApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

export default function LoansView() {
  const { role } = useAuth();
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ employeeId: "", type: "ADVANCE", amount: "", monthlyRecovery: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loansApi.list();
      setRows(unwrapList(res).length ? unwrapList(res) : res?.data || []);
      if (isAdmin) {
        const list = unwrapList(await employeesApi.list({ page: 1, limit: 200 }));
        setEmployees(list);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loansApi.apply({
        ...form,
        amount: Number(form.amount),
        monthlyRecovery: Number(form.monthlyRecovery || 0),
        employeeId: isAdmin ? form.employeeId || undefined : undefined,
      });
      if (res?.success) {
        toast.success("Submitted");
        setForm({ ...form, amount: "", reason: "" });
        load();
      } else toast.error(res?.message || "Failed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Wallet} title="Loans & advances" description="Apply, approve, and track salary advances." />
      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 grid md:grid-cols-5 gap-3 text-xs">
        {isAdmin && (
          <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="px-3 py-2 rounded-xl border">
            <option value="">Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} ({e.employeeCode})
              </option>
            ))}
          </select>
        )}
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2 rounded-xl border">
          <option value="ADVANCE">Advance</option>
          <option value="LOAN">Loan</option>
        </select>
        <input type="number" required placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 rounded-xl border" />
        <input type="number" placeholder="Monthly recovery" value={form.monthlyRecovery} onChange={(e) => setForm({ ...form, monthlyRecovery: e.target.value })} className="px-3 py-2 rounded-xl border" />
        <button className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-semibold">Apply</button>
        <input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="md:col-span-5 px-3 py-2 rounded-xl border" />
      </form>
      {loading && <div className="bg-white rounded-2xl border p-8 text-sm text-slate-500">Loading loans…</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="bg-white rounded-2xl border p-8 text-sm text-slate-500">No loans or advances yet.</div>
      )}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3">Employee</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              {isAdmin && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.employee ? `${r.employee.firstName} ${r.employee.lastName || ""}` : "—"}</td>
                <td className="p-3">{r.type}</td>
                <td className="p-3">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                <td className="p-3">{r.status}</td>
                {isAdmin && r.status === "PENDING" && (
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => loansApi.review(r.id, { status: "APPROVED" }).then(load)} className="text-emerald-600">
                      Approve
                    </button>
                    <button onClick={() => loansApi.review(r.id, { status: "REJECTED" }).then(load)} className="text-rose-600">
                      Reject
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
