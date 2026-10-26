"use client";

import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

/** Google Maps embed URL: shows the real Google map with a red marker on the point. No API key needed. */
export const googleEmbedUrl = (lat: number, lng: number, { zoom = 16, satellite = false }: { zoom?: number; satellite?: boolean } = {}) =>
  `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&t=${satellite ? "k" : "m"}&output=embed&hl=en`;

/** A zoom level that keeps a branch's punch range comfortably in view. */
export const zoomForRadius = (meters: number) => (meters <= 100 ? 17 : meters <= 400 ? 16 : meters <= 1000 ? 15 : 14);

interface GoogleMapEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;
  satellite?: boolean;
  title: string;
  className?: string;
  /** False for card thumbnails: the map is a picture, and clicks go to whatever sits on top of it. */
  interactive?: boolean;
}

/**
 * The real Google map for a point. Reloads when the point changes, so moving a branch's pin
 * is reflected straight away. Shows a placeholder until Google has drawn it.
 */
export default function GoogleMapEmbed({ lat, lng, zoom = 16, satellite = false, title, className = "", interactive = true }: GoogleMapEmbedProps) {
  const src = googleEmbedUrl(lat, lng, { zoom, satellite });
  // The caller may place the map itself (for example "absolute inset-0"). Adding `relative` on top of that
  // would override it and collapse the map to zero height, which hid the map and its pin.
  const positioned = /(^|\s)(absolute|relative|fixed|sticky)(\s|$)/.test(className);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), 9000);
    return () => clearTimeout(timer);
  }, [src]);

  return (
    <div className={`${positioned ? "" : "relative"} isolate overflow-hidden bg-gradient-to-br from-slate-100 to-indigo-50 ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-400">
          <MapPin aria-hidden="true" className="h-7 w-7 animate-pulse" />
          <span className="px-4 text-center text-[11px] font-medium">
            {slow ? "The map is slow to load. Check your internet connection." : "Loading Google Map..."}
          </span>
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen={interactive}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${interactive ? "" : "pointer-events-none"}`}
      />
    </div>
  );
}
