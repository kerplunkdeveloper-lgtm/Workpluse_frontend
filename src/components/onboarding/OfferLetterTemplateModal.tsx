"use client";

import { useEffect, useState } from "react";
import { Building2, FilePenLine, Loader2, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import { orgApi } from "@/lib/api";

type OfferTemplate = {
  title: string;
  greeting: string;
  introduction: string;
  terms: string[];
  signatoryName: string;
  signatoryTitle: string;
  primaryColor: string;
  footer: string;
};

const FALLBACK: OfferTemplate = {
  title: "EMPLOYMENT OFFER LETTER",
  greeting: "Dear {{candidateName}},",
  introduction: "We are pleased to offer you employment with {{companyName}}. We believe your skills and experience will be a valuable addition to our team.",
  terms: ["Probation period: 3 months.", "Notice period: 30 days after confirmation.", "Working hours: As per company policy.", "This offer is subject to verification of the information and documents provided during onboarding.", "Compensation, benefits and leave are governed by the company's current policies and applicable law.", "You must protect confidential company, customer and employee information and use personal data only for authorized business purposes.", "All work product and intellectual property created during employment for company business belongs to the company, subject to applicable law.", "This offer may be withdrawn or employment may be terminated in accordance with company policy, the employment agreement and applicable law."],
  signatoryName: "",
  signatoryTitle: "Authorized signatory",
  primaryColor: "#163b8f",
  footer: "This is a digitally generated offer letter. Please retain a copy for your records.",
};

export default function OfferLetterTemplateModal({ open, onClose, inline = false }: { open: boolean; onClose: () => void; inline?: boolean }) {
  const [form, setForm] = useState<OfferTemplate>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([orgApi.getOfferLetterTemplate(), orgApi.get()]).then(([templateRes, orgRes]) => {
      setForm({ ...FALLBACK, ...(templateRes?.data || {}), terms: templateRes?.data?.terms?.length ? templateRes.data.terms : FALLBACK.terms });
      setOrganization(orgRes?.data || null);
    }).catch(() => toast.error("Could not load offer letter template")).finally(() => setLoading(false));
  }, [open]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await orgApi.updateOfferLetterTemplate(form);
      setForm({ ...FALLBACK, ...(res?.data || form) });
      toast.success("Offer and joining letter template saved");
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not save offer letter template");
    } finally { setSaving(false); }
  };

  const update = (key: keyof OfferTemplate, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const interpolate = (value: string) => value.replaceAll("{{candidateName}}", "Candidate Name").replaceAll("{{companyName}}", organization?.name || "Company Name");
  const termsPerPage = 4;
  const termPages = Array.from({ length: Math.max(1, Math.ceil(form.terms.length / termsPerPage)) }, (_, index) => form.terms.slice(index * termsPerPage, index * termsPerPage + termsPerPage));
  const previewPage = (terms: string[], pageIndex: number) => <div key={pageIndex} className="relative mx-auto mb-4 aspect-[1/1.414] w-full max-w-[340px] overflow-hidden bg-white p-5 text-[8px] leading-[1.45] text-slate-700 shadow-lg sm:p-7">
    {organization?.logoUrl && <img src={organization.logoUrl} alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.035]" />}
    <div className="relative z-10 flex h-full flex-col"><div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3"><div className="min-w-0"><p className="truncate text-[11px] font-black" style={{ color: form.primaryColor }}>{organization?.name || "Company Name"}</p><p className="mt-0.5 flex items-start gap-1 text-[7px] text-slate-400"><MapPin className="h-2 w-2 shrink-0" />{organization?.address || "Company address not configured"}</p></div>{organization?.logoUrl ? <img src={organization.logoUrl} alt="Company logo" className="h-8 w-12 shrink-0 object-contain" /> : <Building2 className="h-6 w-6 shrink-0 text-slate-300" />}</div>{pageIndex === 0 ? <><p className="mt-7 text-center text-[13px] font-black" style={{ color: form.primaryColor }}>{interpolate(form.title)}</p><p className="mt-1 text-center text-[7px] text-slate-400">Reference: WP-OFFER · Issued: Date</p><p className="mt-7">{interpolate(form.greeting)}</p><p className="mt-2 leading-relaxed">{interpolate(form.introduction)}</p><p className="mt-4 text-[9px] font-bold" style={{ color: form.primaryColor }}>Offer details</p><div className="mt-1 grid grid-cols-[35%_65%] overflow-hidden rounded border border-slate-100">{[["Candidate", "Candidate Name"], ["Designation", "To be confirmed"], ["Department", "General"], ["Work location", "Corporate Headquarters"], ["Joining date", "To be confirmed"], ["Annual CTC", "INR 0"]].map(([label, value], index) => <div key={label} className="contents"><span className={`px-1.5 py-1 font-bold ${index % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>{label}</span><span className={`px-1.5 py-1 ${index % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>{value}</span></div>)}</div><p className="mt-4 text-[9px] font-bold" style={{ color: form.primaryColor }}>Terms and conditions</p></> : <p className="mt-8 text-[10px] font-bold" style={{ color: form.primaryColor }}>Terms and conditions (continued)</p>}<ul className="mt-1 list-disc space-y-0.5 pl-3">{terms.map((term, index) => <li key={`${term}-${index}`}>{interpolate(term)}</li>)}</ul><div className="mt-auto border-t border-slate-200 pt-2"><div className="flex items-end justify-between"><span className="text-slate-400">{form.signatoryTitle}</span><strong style={{ color: form.primaryColor }}>{form.signatoryName || organization?.name || "Company Name"}</strong></div><p className="mt-3 text-center text-[7px] text-slate-400">Page {pageIndex + 1} of {termPages.length} · {interpolate(form.footer)}</p></div></div>
  </div>;
  const preview = <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 shadow-inner"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">A4 document preview</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{termPages.length} page{termPages.length === 1 ? "" : "s"}</span></div>{termPages.map((terms, index) => previewPage(terms, index))}</div>;
  const editor = <div className={`relative w-full ${inline ? "max-w-none" : "max-w-2xl"} rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-8`}>
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><FilePenLine className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-bold text-slate-950">Offer & joining letter template</h2></div><p className="mt-1 text-xs text-slate-500">Company template used when HR creates and sends an offer letter.</p></div><button type="button" onClick={onClose} className="text-sm font-semibold text-slate-400 hover:text-slate-700">Close</button></div>
      {inline && <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs font-semibold text-indigo-800 lg:hidden">A4 preview is shown beside the editor on larger screens.</div>}
      {inline && <div className="absolute right-6 top-24 hidden w-[360px] lg:block"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live A4 preview</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Auto-updating</span></div>{preview}</div>}
      {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /></div> : <div className={`mt-5 max-h-[70vh] space-y-4 overflow-y-auto pr-1 ${inline ? "lg:pr-[390px]" : ""}`}><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]"><label className="text-xs font-semibold text-slate-600">Letter title<input value={form.title} onChange={(e) => update("title", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Accent color<input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="mt-1 h-10 w-16 rounded-lg border border-slate-200 bg-white p-1" /></label></div><label className="block text-xs font-semibold text-slate-600">Greeting<textarea value={form.greeting} onChange={(e) => update("greeting", e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /><span className="font-normal text-slate-400">Use {"{{candidateName}}"} for the candidate name.</span></label><label className="block text-xs font-semibold text-slate-600">Introduction<textarea value={form.introduction} onChange={(e) => update("introduction", e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /><span className="font-normal text-slate-400">Use {"{{companyName}}"} for the company name.</span></label><div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label className="text-xs font-semibold text-slate-600">Terms and conditions</label><button type="button" onClick={() => setForm((current) => ({ ...current, terms: [...current.terms, ""] }))} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600"><Plus className="h-3.5 w-3.5" />Add term</button></div>{form.terms.map((term, index) => <div key={`${index}-${term}`} className="mb-2 flex min-w-0 gap-2"><input value={term} onChange={(e) => setForm((current) => ({ ...current, terms: current.terms.map((item, itemIndex) => itemIndex === index ? e.target.value : item) }))} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button type="button" onClick={() => setForm((current) => ({ ...current, terms: current.terms.filter((_, itemIndex) => itemIndex !== index) }))} className="shrink-0 rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Remove term"><Trash2 className="h-4 w-4" /></button></div>)}</div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Signatory name<input value={form.signatoryName} onChange={(e) => update("signatoryName", e.target.value)} placeholder="Company name if blank" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Signatory title<input value={form.signatoryTitle} onChange={(e) => update("signatoryTitle", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label></div><label className="block text-xs font-semibold text-slate-600">Footer<textarea value={form.footer} onChange={(e) => update("footer", e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label></div>}
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void save()} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save template</button></div>
    </div>;
  return open ? (inline ? editor : <Modal>{editor}</Modal>) : null;
}
