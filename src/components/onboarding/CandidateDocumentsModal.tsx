"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, FileText, Hourglass, Loader2, RefreshCw, XCircle } from "lucide-react";
import { onboardingApi } from "@/lib/api";
import Modal from "@/components/ui/Modal";

interface CandidateDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED" | string;
  rejectionReason?: string | null;
  createdAt?: string;
}

const LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  PASSPORT: "Passport",
  DRIVING_LICENCE: "Driving Licence",
  EDUCATION_CERTIFICATE: "Education Certificate",
  EXPERIENCE_LETTER: "Experience / Relieving Letter",
  OFFER_LETTER: "Offer Letter",
  EMPLOYMENT_CONTRACT: "Employment Contract",
  BANK_DOCUMENT: "Bank Document",
  PHOTO: "Photograph",
  OTHER: "Other Document",
};
const labelOf = (type: string) => LABELS[type] || type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const STATUS = {
  VERIFIED: { text: "Verified", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircle2 },
  REJECTED: { text: "Rejected", cls: "bg-rose-50 text-rose-700 ring-rose-200", Icon: XCircle },
  PENDING: { text: "Awaiting review", cls: "bg-amber-50 text-amber-700 ring-amber-200", Icon: Hourglass },
} as const;

const isPdf = (doc: CandidateDocument) => doc.mimeType === "application/pdf" || doc.fileUrl.split(/[?#]/)[0].toLowerCase().endsWith(".pdf");
const sizeText = (bytes?: number | null) => (!bytes ? "" : bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

interface Props {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
}

/**
 * What a candidate uploaded in their portal (Aadhaar, PAN, certificates...), for HR and admins. Each file opens
 * in a preview here or in a new tab. Private files arrive with a signed link from the server.
 */
export default function CandidateDocumentsModal({ candidateId, candidateName, onClose }: Props) {
  const [docs, setDocs] = useState<CandidateDocument[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  // A file that fails to load is usually a link that needs refreshing, so offer a retry that fetches fresh links.
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    onboardingApi
      .getCandidateDetails(candidateId)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || res;
        setDocs((data?.documents || []) as CandidateDocument[]);
        setFailed(false);
        setBrokenIds(new Set());
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [candidateId, reloadKey]);

  const reload = () => {
    setDocs(null);
    setFailed(false);
    setReloadKey((k) => k + 1);
  };

  return (
    <Modal
      title={`${candidateName}'s documents`}
      description="Files the candidate uploaded in their onboarding portal."
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <FileText aria-hidden="true" className="h-5 w-5" />
        </span>
      }
      size="xl"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 sm:h-10">
          Close
        </button>
      }
    >
      {failed ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">The documents could not be loaded.</p>
          <button type="button" onClick={reload} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500">
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      ) : docs === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents...
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Nothing uploaded yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">The candidate has not added any documents in their portal.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => {
            const status = STATUS[doc.status as keyof typeof STATUS] || STATUS.PENDING;
            const open = openId === doc.id;
            const broken = brokenIds.has(doc.id);
            return (
              <li key={doc.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{labelOf(doc.documentType)}</p>
                    <p className="truncate text-xs text-slate-500" title={doc.fileName}>
                      {doc.fileName}
                      {sizeText(doc.fileSize) && ` · ${sizeText(doc.fileSize)}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${status.cls}`}>
                    <status.Icon aria-hidden="true" className="h-3 w-3" />
                    {status.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : doc.id)}
                    aria-expanded={open}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {open ? "Hide" : "View"}
                  </button>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${labelOf(doc.documentType)} in a new tab`}
                    title="Open in a new tab"
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {doc.status === "REJECTED" && doc.rejectionReason && <p className="border-t border-rose-100 bg-rose-50/60 px-4 py-2 text-xs text-rose-700">Reason: {doc.rejectionReason}</p>}
                {open && (
                  <div className="border-t border-slate-100 bg-slate-50 p-3">
                    {broken ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <p className="text-sm font-medium text-slate-600">This file could not be displayed.</p>
                        <p className="max-w-xs text-xs text-slate-500">The link may have expired. Reload to get a fresh one, or open it in a new tab.</p>
                        <button type="button" onClick={reload} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reload
                        </button>
                      </div>
                    ) : isPdf(doc) ? (
                      <iframe src={doc.fileUrl} title={`${labelOf(doc.documentType)} preview`} className="h-[60vh] w-full rounded-xl border border-slate-200 bg-white" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={doc.fileUrl}
                        alt={`${labelOf(doc.documentType)} uploaded by ${candidateName}`}
                        onError={() => setBrokenIds((prev) => new Set(prev).add(doc.id))}
                        className="mx-auto max-h-[60vh] max-w-full rounded-xl object-contain shadow-sm"
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
