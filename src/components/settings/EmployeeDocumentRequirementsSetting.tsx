"use client";

import { useEffect, useState } from "react";
import { FileCheck2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { orgApi } from "@/lib/api";

const DOCUMENTS = [
  ["AADHAAR", "Aadhaar Card"],
  ["PAN", "PAN Card"],
  ["PASSPORT", "Passport"],
  ["DRIVING_LICENCE", "Driving Licence"],
  ["EDUCATION_CERTIFICATE", "Education Certificate"],
  ["EXPERIENCE_LETTER", "Experience / Relieving Letter"],
  ["OFFER_LETTER", "Offer Letter"],
  ["EMPLOYMENT_CONTRACT", "Employment Contract"],
  ["BANK_DOCUMENT", "Bank Document"],
  ["OTHER", "Other Document"],
] as const;

export default function EmployeeDocumentRequirementsSetting() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    orgApi.get().then((res) => setSelected(res?.data?.mandatoryEmployeeDocuments || [])).catch(() => toast.error("Could not load document requirements.")).finally(() => setLoading(false));
  }, []);

  const toggle = (type: string) => setSelected((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);

  const save = async () => {
    setSaving(true);
    try {
      await orgApi.update({ mandatoryEmployeeDocuments: selected });
      toast.success("Document requirements saved");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not save document requirements.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8" aria-labelledby="employee-document-requirements-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600"><FileCheck2 className="h-5 w-5" /></div>
          <div>
            <h3 id="employee-document-requirements-title" className="text-base font-semibold text-slate-900">Mandatory employee documents</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Select which document slots are required for every employee. The checklist, compliance dashboard and missing-document reports use this setting.</p>
          </div>
        </div>
        <button type="button" onClick={() => void save()} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save requirements
        </button>
      </div>
      {loading ? <div className="py-6 text-xs text-slate-500">Loading document options…</div> : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENTS.map(([type, label]) => {
            const mandatory = selected.includes(type);
            return <label key={type} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${mandatory ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 bg-slate-50/40 hover:border-slate-300"}`}>
              <span className="font-semibold text-slate-800">{label}</span>
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><input type="checkbox" checked={mandatory} onChange={() => toggle(type)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Mandatory</span>
            </label>;
          })}
        </div>
      )}
    </section>
  );
}
