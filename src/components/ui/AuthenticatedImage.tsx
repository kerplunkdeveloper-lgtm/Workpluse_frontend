"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ImgHTMLAttributes } from "react";
import { api } from "@/lib/api";
import { isAuthenticatedApiImage, toAuthenticatedApiPath } from "@/lib/privateMedia";

const PRIVATE_IMAGE_CACHE_MAX = 128;
const PRIVATE_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const privateImageCache = new Map<string, { objectUrl: string; cachedAt: number }>();
const privateImageRequests = new Map<string, Promise<string>>();

function cachedPrivateImage(src?: string | null) {
  if (!src || !isAuthenticatedApiImage(src)) return null;
  const cached = privateImageCache.get(src);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > PRIVATE_IMAGE_CACHE_TTL_MS) {
    URL.revokeObjectURL(cached.objectUrl);
    privateImageCache.delete(src);
    return null;
  }
  cached.cachedAt = Date.now();
  return cached.objectUrl;
}

function loadPrivateImage(src: string) {
  const cached = cachedPrivateImage(src);
  if (cached) return Promise.resolve(cached);
  const existing = privateImageRequests.get(src);
  if (existing) return existing;

  const request = api.get(toAuthenticatedApiPath(src), { responseType: "blob", skipGlobalError: true })
    .then((response) => {
      const objectUrl = URL.createObjectURL(response.data);
      privateImageCache.set(src, { objectUrl, cachedAt: Date.now() });
      while (privateImageCache.size > PRIVATE_IMAGE_CACHE_MAX) {
        const oldest = privateImageCache.entries().next().value;
        if (!oldest) break;
        URL.revokeObjectURL(oldest[1].objectUrl);
        privateImageCache.delete(oldest[0]);
      }
      return objectUrl;
    })
    .finally(() => privateImageRequests.delete(src));
  privateImageRequests.set(src, request);
  return request;
}

/** Renders legacy public URLs directly and fetches private API media with the session token. */
export default function AuthenticatedImage({
  src,
  alt,
  className,
  onError,
  fallback,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null; fallback?: ReactNode }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(() => cachedPrivateImage(src));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setObjectUrl(cachedPrivateImage(src));

    if (!isAuthenticatedApiImage(src)) return () => { cancelled = true; };
    const privateSrc = src;
    if (!privateSrc) return () => { cancelled = true; };

    loadPrivateImage(privateSrc)
      .then((nextObjectUrl) => {
        if (!cancelled) setObjectUrl(nextObjectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const resolvedSrc = isAuthenticatedApiImage(src) ? objectUrl || undefined : src || undefined;
  if (!resolvedSrc || failed) return fallback ?? null;

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

