"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { orgApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import CompanyLogo from "@/components/ui/CompanyLogo";
import { confirmDialog } from "@/components/ui/confirmDialog";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 2 * 1024 * 1024;

/** Company logo upload for the organization profile. Shown across the app once set. */
export default function CompanyLogoSetting() {
  const { user, refreshUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const name = user?.organization?.name || "Your company";
  const logoUrl = user?.organization?.logoUrl;

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Choose an image under 2 MB.");
      return;
    }
    setBusy("upload");
    try {
      await orgApi.uploadLogo(file);
      await refreshUser();
      toast.success("Logo updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "The logo could not be uploaded.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const ok = await confirmDialog({ title: "Remove company logo?", message: "Your company initials will show instead.", confirmLabel: "Remove logo" });
    if (!ok) return;
    setBusy("remove");
    try {
      await orgApi.removeLogo();
      await refreshUser();
      toast.success("Logo removed");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "The logo could not be removed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <CompanyLogo name={name} logoUrl={logoUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">Company logo</p>
        <p className="text-xs text-slate-500">Shown on the dashboard, sidebar and payslips. PNG, JPG or WEBP, up to 2 MB. A square image works best.</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60"
        >
          {busy === "upload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5 text-indigo-600" />}
          {logoUrl ? "Replace" : "Upload logo"}
        </button>
        {logoUrl && (
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            aria-label="Remove company logo"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
          >
            {busy === "remove" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
