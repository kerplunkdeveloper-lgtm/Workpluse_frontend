"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { orgApi } from "@/lib/api";

type Templates = Record<string, any>;
const TYPES = [
  ["FF_STATEMENT", "Full & Final Statement"],
  ["CLEARANCE_CERTIFICATE", "No-Dues Certificate"],
  ["RELIEVING_LETTER", "Relieving Letter"],
  ["EXPERIENCE_LETTER", "Experience Certificate"],
] as const;

const fieldLabels: Record<string, string> = {
  title: "Document title",
  subtitle: "Subtitle",
  paymentMode: "Payment mode",
  introduction: "Introduction",
  closing: "Closing statement",
  subject: "Subject",
  greeting: "Greeting",
  paragraph1: "Paragraph 1",
  paragraph2: "Paragraph 2",
  paragraph3: "Paragraph 3",
  paragraph4: "Paragraph 4",
  signatoryTitle: "Signatory title",
  signatorySubtitle: "Signatory subtitle",
  acceptanceTitle: "Employee signature label",
  leftSignatoryTitle: "Left signature title",
  rightSignatoryTitle: "Right signature title",
};

const placeholderHelp = "Available placeholders: {{companyName}}, {{employeeName}}, {{employeeCode}}, {{designation}}, {{department}}, {{branch}}, {{joiningDate}}, {{lastWorkingDay}}, {{resignationDate}}";

export default function ExitDocumentTemplatesSetting() {
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [selected, setSelected] = useState<string>(TYPES[0][0]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orgApi.getExitDocumentTemplates()
      .then((res) => setTemplates(res?.data || null))
      .catch(() => toast.error("Could not load exit document templates."))
      .finally(() => setLoading(false));
  }, []);

  const update = (section: string, field: string, value: string) => {
    setTemplates((current) => current ? ({ ...current, [section]: { ...current[section], [field]: value } }) : current);
  };

  const save = async () => {
    if (!templates) return;
    setSaving(true);
    try {
      await orgApi.updateExitDocumentTemplates(templates);
      toast.success("Exit document templates saved.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not save exit document templates.");
    } finally { setSaving(false); }
  };

  const reset = async () => {
    setLoading(true);
    try {
      const res = await orgApi.updateExitDocumentTemplates({});
      setTemplates(res?.data || null);
      toast.success("Templates reset to the standard wording.");
    } catch { toast.error("Could not reset templates."); }
    finally { setLoading(false); }
  };

  return (
    <section id="document-templates" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FileText className="h-5 w-5" /></span>
          <div><h2 className="text-base font-semibold text-slate-900">Exit document templates</h2><p className="mt-1 text-xs text-slate-500">Customize the wording used by Full & Final, clearance, relieving, and experience PDFs.</p></div>
        </div>
        <div className="flex gap-2"><button type="button" onClick={reset} disabled={loading || saving} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /> Reset</button><button type="button" onClick={save} disabled={!templates || loading || saving} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save templates</button></div>
      </div>
      {loading || !templates ? <div className="flex items-center justify-center py-10 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading templates…</div> : <>
        <div className="mt-6 flex flex-wrap gap-2">{TYPES.map(([key, label]) => <button key={key} type="button" onClick={() => setSelected(key)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${selected === key ? "bg-indigo-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"}`}>{label}</button>)}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {Object.entries(templates[selected] || {}).map(([field, value]) => <label key={field} className="block space-y-1.5"><span className="text-xs font-semibold text-slate-700">{fieldLabels[field] || field}</span>{String(value).length > 120 ? <textarea value={String(value)} onChange={(e) => update(selected, field, e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 outline-none focus:border-indigo-500 focus:bg-white" /> : <input value={String(value)} onChange={(e) => update(selected, field, e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white" />}</label>)}
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-inner">
          <div className="mb-2 flex items-center justify-between px-1"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Live preview</p><span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">Sample document</span></div>
          <div className="mx-auto max-w-2xl rounded-xl border-t-4 bg-white p-5 shadow-lg" style={{ borderTopColor: templates.branding.primaryColor }}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-sm font-black text-slate-900">Your Company</p><p className="mt-0.5 text-[10px] text-slate-400">Corporate address · email · phone</p></div><span className="rounded-lg px-2 py-1 text-[9px] font-bold text-white" style={{ backgroundColor: templates.branding.primaryColor }}>OFFICIAL</span></div>
            <div className="py-5 text-center"><h3 className="text-base font-black uppercase tracking-wide text-slate-900">{templates[selected]?.title}</h3><p className="mt-1 text-[10px] text-slate-400">{templates[selected]?.subtitle}</p></div>
            <div className="space-y-3 text-xs leading-5 text-slate-600"><p>Dear <strong className="text-slate-900">Employee Name</strong>,</p><p>{String(templates[selected]?.introduction || templates[selected]?.paragraph1 || templates[selected]?.closing || "Your customized document content will appear here.").replaceAll("{{employeeName}}", "Employee Name").replaceAll("{{companyName}}", "Your Company").replaceAll("{{employeeCode}}", "EMP-001")}</p><p className="text-slate-400">Additional employee and settlement details appear automatically in the final document.</p></div>
            <div className="mt-8 border-t border-slate-100 pt-4 text-[10px] text-slate-400">{templates.branding.footer}</div>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-indigo-50 px-3 py-2.5 text-[11px] leading-5 text-indigo-800">{placeholderHelp}</p>
        <div className="mt-5 border-t border-slate-100 pt-5"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Shared branding</h3><div className="mt-3 grid gap-4 md:grid-cols-3"><label className="space-y-1.5"><span className="text-xs font-semibold text-slate-700">Primary color</span><input type="color" value={templates.branding.primaryColor} onChange={(e) => setTemplates((c) => c ? ({ ...c, branding: { ...c.branding, primaryColor: e.target.value } }) : c)} className="h-10 w-full rounded-xl border border-slate-200 bg-white p-1" /></label><label className="space-y-1.5"><span className="text-xs font-semibold text-slate-700">Signatory name</span><input value={templates.branding.signatoryName} onChange={(e) => setTemplates((c) => c ? ({ ...c, branding: { ...c.branding, signatoryName: e.target.value } }) : c)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white" /></label><label className="space-y-1.5 md:col-span-1"><span className="text-xs font-semibold text-slate-700">Footer</span><input value={templates.branding.footer} onChange={(e) => setTemplates((c) => c ? ({ ...c, branding: { ...c.branding, footer: e.target.value } }) : c)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white" /></label></div></div>
      </>}
    </section>
  );
}
