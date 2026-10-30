"use client";

import { useEffect, useState } from "react";
import { Archive, ExternalLink, FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { policyApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";

type CompanyPolicy = { id: string; title: string; description?: string; category: string; fileUrl: string; fileName: string; mimeType: string; fileSize?: number; isPublished: boolean; archivedAt?: string | null; createdAt: string };
const MANAGERS = new Set(["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]);

export default function CompanyPolicyLibrary() {
  const { role } = useAuth();
  const canManage = MANAGERS.has(role || "");
  const [policies, setPolicies] = useState<CompanyPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", category: "GENERAL", description: "", file: null as File | null });

  const load = async () => { try { const res = await policyApi.listCompany(); setPolicies(res.policies || []); } catch (e: any) { toast.error(e?.response?.data?.message || "Could not load company policies"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const importPolicy = async (event: React.FormEvent) => {
    event.preventDefault(); if (!form.file) return toast.error("Choose a policy file");
    setSaving(true); try { const body = new FormData(); body.append("file", form.file); body.append("title", form.title); body.append("category", form.category); body.append("description", form.description); await policyApi.importCompany(body); toast.success("Policy imported and published"); setForm({ title: "", category: "GENERAL", description: "", file: null }); setShowForm(false); await load(); } catch (e: any) { toast.error(e?.response?.data?.message || "Could not import policy"); } finally { setSaving(false); }
  };
  const archive = async (policy: CompanyPolicy) => { try { await policyApi.updateCompany(policy.id, { archived: !policy.archivedAt }); toast.success(policy.archivedAt ? "Policy restored" : "Policy archived"); await load(); } catch (e: any) { toast.error(e?.response?.data?.message || "Could not update policy"); } };

  return <div className="mx-auto max-w-6xl p-4 sm:p-6"><PageHeader icon={FileText} title="Company policies" description="Published workplace policies are available to every employee. HR, managers and admins can import and maintain the library." actions={canManage && <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"><Upload className="h-4 w-4" />Import policy</button>} />
    {showForm && canManage && <form onSubmit={importPolicy} className="mb-6 grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:grid-cols-2"><input required placeholder="Policy title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><input placeholder="Category (e.g. LEAVE)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><textarea placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:col-span-2" /><input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:col-span-2" /><div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Importing…" : "Import and publish"}</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600"><X className="mr-1 inline h-4 w-4" />Cancel</button></div></form>}
    {loading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading policies…</div> : policies.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No published company policies yet.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{policies.map((policy) => <article key={policy.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${policy.archivedAt ? "opacity-60" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><FileText className="h-5 w-5" /></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{policy.category}</span></div><h2 className="mt-4 font-semibold text-slate-900">{policy.title}</h2>{policy.description && <p className="mt-1 line-clamp-3 text-sm text-slate-500">{policy.description}</p>}<div className="mt-5 flex items-center gap-2"><a href={policy.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"><ExternalLink className="h-3.5 w-3.5" />View policy</a>{canManage && <button onClick={() => void archive(policy)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"><Archive className="h-3.5 w-3.5" />{policy.archivedAt ? "Restore" : "Archive"}</button>}</div></article>)}</div>}
  </div>;
}
