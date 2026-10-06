"use client";

import React, { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif";
const MAX_BYTES = 6 * 1024 * 1024;

const SIZE_CLASS = {
  sm: "w-10 h-10 text-sm rounded-xl",
  md: "w-16 h-16 text-2xl rounded-2xl",
  lg: "w-20 h-20 text-3xl rounded-3xl",
} as const;

export default function ProfilePhotoPicker({
  src,
  initials,
  onFile,
  uploading = false,
  disabled = false,
  size = "lg",
  hint = "Change photo",
}: {
  src?: string | null;
  initials: string;
  onFile: (file: File) => void | Promise<void>;
  uploading?: boolean;
  disabled?: boolean;
  size?: keyof typeof SIZE_CLASS;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Auto-generated placeholder avatars (random colours) are replaced by a branded initials tile.
  const isPlaceholder = !preview && /ui-avatars.com/i.test(src || "");
  const shown = preview || (isPlaceholder ? "" : src) || "";

  const pick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-start gap-1.5 shrink-0">
      <button
        type="button"
        onClick={pick}
        disabled={disabled || uploading}
        className={`relative ${SIZE_CLASS[size]} shadow-md shrink-0 group disabled:opacity-60`}
        title={hint}
        aria-label={hint}
      >
        <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
          {shown ? (
            <img src={shown} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="keep-white absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 font-serif font-semibold tracking-wide flex items-center justify-center">
              {initials}
            </span>
          )}
          <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/45 transition flex items-center justify-center">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
            )}
          </span>
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow border-2 border-white z-10">
          <Camera className="w-3 h-3" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > MAX_BYTES) {
            toast.error("Choose a photo under 6 MB.");
            return;
          }
          const next = URL.createObjectURL(file);
          setPreview(next);
          await onFile(file);
        }}
      />
      <span className="text-xs text-slate-500 font-medium">{uploading ? "Uploading…" : hint}</span>
    </div>
  );
}
