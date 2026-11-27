"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, FileCheck2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { employeesApi } from "@/lib/api";

type PendingDocument = {
  id: string;
  employeeId: string;
  documentType: string;
  fileName: string;
  createdAt: string;
  employee: { name: string; employeeCode: string; department?: { name: string } | null };
};

const label = (value: string) => value.replace(/_/g, " ");

export default function PendingDocumentVerificationCard() {
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await employeesApi.getPendingDocuments({ limit: 8 });
      const data = response?.data || response;
      setDocuments(data?.documents || []);
      setPendingCount(Number(data?.summary?.pendingCount || 0));
    } catch (error: any) {
      console.warn("Could not load pending document queue", error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const preview = async (document: PendingDocument) => {
    try {
      const blob = await employeesApi.getDocumentContent(document.employeeId, document.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not open this document");
    }
  };

  const review = async (document: PendingDocument, status: "VERIFIED" | "REJECTED") => {
    let rejectionReason: string | undefined;
    if (status === "REJECTED") {
      rejectionReason = window.prompt("Reason for rejecting this document:", "Please upload a clear and valid copy.") || "";
      if (!rejectionReason.trim()) return;
    }
    setBusyId(document.id);
    try {
      await employeesApi.verifyDocument(document.employeeId, document.id, { status, rejectionReason });
      toast.success(status === "VERIFIED" ? "Document verified" : "Document rejected");
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setPendingCount((current) => Math.max(0, current - 1));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not update document status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><FileCheck2 className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-indigo-600">Compliance</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Documents</h2><p className="mt-1 text-xs font-semibold text-slate-700">Pending verification</p><p className="mt-1 text-xs text-slate-500">Review employee uploads before they count as verified.</p></div></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{pendingCount} pending</span></div>
      {loading ? <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading review queue…</div> : documents.length === 0 ? <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">No employee documents are waiting for review.</div> : <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-100">{documents.map((document) => <div key={document.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{document.employee.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{document.employee.employeeCode} · {label(document.documentType)} · {document.fileName}</p></div><div className="flex shrink-0 items-center gap-1.5"><button type="button" onClick={() => preview(document)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" />View</button><button type="button" disabled={busyId === document.id} onClick={() => review(document, "REJECTED")} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" />Reject</button><button type="button" disabled={busyId === document.id} onClick={() => review(document, "VERIFIED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busyId === document.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Verify</button></div></div>)}</div>}
      {pendingCount > documents.length && <p className="mt-3 text-[11px] text-slate-500">Showing the first {documents.length} items. Refresh the dashboard to load the latest queue.</p>}
    </section>
  );
}
