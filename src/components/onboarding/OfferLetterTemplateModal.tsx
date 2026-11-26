"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { orgApi } from "@/lib/api";
import Modal from "@/components/ui/Modal";

type Template = { title: string; greeting: string; introduction: string; terms: string[]; signatoryName: string; signatoryTitle: string; primaryColor: string; footer: string; pdf?: { fileName?: string } | null; pdfFields?: Record<string, any> };

const fields = [
  ["candidateName", "Candidate name"], ["companyName", "Company name"], ["designation", "Designation"],
  ["department", "Department"], ["joiningDate", "Joining date"], ["annualCtc", "Annual CTC"], ["monthlyCtc", "Monthly CTC"],
];

export default function OfferLetterTemplateModal({ onClose }: { onClose: () => void }) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mappingDraft, setMappingDraft] = useState("{}");

  useEffect(() => {
    orgApi.getOfferLetterTemplate().then((res) => { setTemplate(res?.data); setMappingDraft(JSON.stringify(res?.data?.pdfFields || {}, null, 2)); }).catch((error) => toast.error(error?.response?.data?.message || "Could not load offer template")).finally(() => setLoading(false));
  }, []);

  const update = (key: keyof Template, value: string) => setTemplate((current) => current ? { ...current, [key]: value } : current);
  const updateTerm = (index: number, value: string) => setTemplate((current) => current ? { ...current, terms: current.terms.map((term, i) => i === index ? value : term) } : current);
  const save = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const res = await orgApi.updateOfferLetterTemplate(template);
      if (res?.success) { toast.success("Offer letter template saved"); onClose(); }
      else toast.error(res?.message || "Could not save offer template");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not save offer template"); }
    finally { setSaving(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Choose a PDF offer letter template.");
    setUploading(true);
    try {
      const res = await orgApi.uploadOfferLetterTemplate(file);
      if (res?.success) { setTemplate(res.data); setMappingDraft(JSON.stringify(res.data?.pdfFields || {}, null, 2)); toast.success("PDF template uploaded"); }
      else toast.error(res?.message || "Could not upload PDF template");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not upload PDF template"); }
    finally { setUploading(false); }
  };
  const updateMappings = (value: string) => {
    setMappingDraft(value);
    try { update("pdfFields" as keyof Template, JSON.parse(value)); }
    catch { /* allow the user to finish typing valid JSON */ }
  };

  return <Modal>
    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">Offer letter template</h2><p className="mt-1 text-xs leading-5 text-slate-500">Customize the PDF generated for every new offer. Existing sent offers keep their original snapshot.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button></div>
      {loading || !template ? <div className="flex items-center justify-center py-16 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading template…</div> : <>
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-indigo-950">Formatted PDF background</h3><p className="mt-1 text-xs leading-5 text-indigo-800">Upload your designed PDF. Fillable PDF fields are filled automatically. For a normal PDF, add coordinates below.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {template.pdf?.fileName ? "Replace PDF" : "Upload PDF"}<input type="file" accept="application/pdf" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} disabled={uploading} /></label></div>{template.pdf?.fileName && <p className="mt-2 text-[11px] font-semibold text-emerald-700">Active file: {template.pdf.fileName}</p>}</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-700">Title</span><input value={template.title} onChange={(e) => update("title", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-700">Greeting</span><input value={template.greeting} onChange={(e) => update("greeting", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" /></label>
          <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold text-slate-700">Introduction</span><textarea rows={3} value={template.introduction} onChange={(e) => update("introduction", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-700">Signatory name</span><input value={template.signatoryName} onChange={(e) => update("signatoryName", e.target.value)} placeholder="Authorized signatory" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-700">Signatory title</span><input value={template.signatoryTitle} onChange={(e) => update("signatoryTitle", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-700">Primary color</span><input type="color" value={template.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white p-1" /></label>
          <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold text-slate-700">Footer</span><input value={template.footer} onChange={(e) => update("footer", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" /></label>
        </div>
        <label className="mt-4 block space-y-1.5"><span className="text-xs font-semibold text-slate-700">PDF field mapping</span><textarea rows={8} value={mappingDraft} onChange={(e) => updateMappings(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] leading-5 outline-none focus:border-indigo-500 focus:bg-white" /><span className="block text-[11px] leading-5 text-slate-500">For a normal PDF, coordinates use the top-left origin: {`{ "candidateName": { "page": 1, "x": 120, "y": 240, "fontSize": 10, "color": "#111827" } }`}. For a fillable PDF, use the exact field name with page 1.</span></label>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Terms and conditions</h3><div className="mt-3 space-y-2">{template.terms.map((term, index) => <textarea key={index} rows={2} value={term} onChange={(e) => updateTerm(index, e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-indigo-500" />)}</div></div>
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="text-xs font-bold text-indigo-900">Available placeholders</p><p className="mt-2 text-[11px] leading-5 text-indigo-800">{fields.map(([key]) => `{{${key}}}`).join(" · ")}</p></div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save template</button></div>
      </>}
    </div>
  </Modal>;
}
