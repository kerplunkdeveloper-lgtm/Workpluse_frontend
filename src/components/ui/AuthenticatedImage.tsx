"use client";

import { useEffect, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { api } from "@/lib/api";
import { isAuthenticatedApiImage } from "@/lib/privateMedia";

/** Renders legacy public URLs directly and fetches private API media with the session token. */
export default function AuthenticatedImage({
  src,
  alt,
  className,
  onError,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setObjectUrl(null);

    if (!isAuthenticatedApiImage(src)) return () => { cancelled = true; };
    const privateSrc = src;
    if (!privateSrc) return () => { cancelled = true; };

    api.get(privateSrc, { responseType: "blob", skipGlobalError: true })
      .then((response) => {
        if (!cancelled) setObjectUrl(URL.createObjectURL(response.data));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const resolvedSrc = isAuthenticatedApiImage(src) ? objectUrl || undefined : src || undefined;
  if (!resolvedSrc || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={resolvedSrc}
      alt={alt || ""}
      className={className}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

