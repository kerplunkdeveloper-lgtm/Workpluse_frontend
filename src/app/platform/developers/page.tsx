"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { platformApi } from "@/lib/api";

type Developer = { id: string; email: string; isActive: boolean; createdAt: string; lastLoginAt?: string | null; mustChangePassword: boolean };

export default function DevelopersPage() {
  return <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><AppLayout><DeveloperManager /></AppLayout></ProtectedRoute>;
}

function DeveloperManager() {
  const [rows, setRows] = useState<Developer[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const load = async () => { const response = await platformApi.developers(); setRows(response?.data || []); };
  useEffect(() => { void load(); }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { const response = await platformApi.createDeveloper(email); setCredentials({ email: response.data.developer.email, password: response.data.temporaryPassword }); setEmail(""); await load(); toast.success("Developer account created"); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Could not create developer"); }
    finally { setBusy(false); }
  };

  const toggle = async (row: Developer) => {
    const nextIsActive = !row.isActive;
    if (typeof window !== "undefined" && !window.confirm(`${nextIsActive ? "Enable" : "Disable"} ${row.email}?`)) return;
    setTogglingId(row.id);
    try { const response = await platformApi.updateDeveloper(row.id, nextIsActive); setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...response.data } : item)); toast.success(nextIsActive ? "Developer account enabled" : "Developer account disabled"); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Could not update developer account"); }
    finally { setTogglingId(null); }
  };

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Platform access</p><h1 className="mt-1 text-3xl font-black text-slate-950">Developer accounts</h1><p className="mt-2 text-sm text-slate-500">Create support-only login IDs. Developers do not appear in customer menus.</p></div>
    <form onSubmit={create} className="flex max-w-xl gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" type="email" required placeholder="developer@yourcompany.com" value={email} onChange={(event) => setEmail(event.target.value)} /><button disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Creating…" : "Create developer"}</button></form>
    {credentials && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black">Copy these credentials now</p><p className="mt-2">Login: <b>{credentials.email}</b></p><p>Password: <b>{credentials.password}</b></p><p className="mt-2 text-xs">The developer must change this temporary password on first login.</p></div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3 text-right">Access</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.email}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{row.isActive ? "Active" : "Disabled"}</span>{row.mustChangePassword ? " · Password pending" : ""}</td><td className="px-4 py-3 text-slate-500">{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString("en-IN") : "Never"}</td><td className="px-4 py-3 text-right"><button type="button" disabled={togglingId === row.id} onClick={() => void toggle(row)} className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${row.isActive ? "border border-rose-200 text-rose-700 hover:bg-rose-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{togglingId === row.id ? "Updating…" : row.isActive ? "Disable account" : "Enable account"}</button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No developer accounts yet.</div>}</div>
  </div>;
}
