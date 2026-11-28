"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ExternalLink, MapPin, Pencil, Satellite, Map as MapIcon, X, Plus, Minus, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { formatMapRadius, googleMapsErrorMessage, isValidCoordinate, loadGoogleMaps } from "@/lib/googleMaps";

interface BranchMapViewerProps { name: string; address?: string | null; lat: number; lng: number; radiusMeters: number; onClose: () => void; onEdit?: () => void; }
const roundButton = "flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-indigo-600 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500";

export default function BranchMapViewer({ name, address, lat, lng, radiusMeters, onClose, onEdit }: BranchMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null); const mapRef = useRef<any>(null);
  const [satellite, setSatellite] = useState(false); const [error, setError] = useState<string | null>(null); const [ready, setReady] = useState(false);
  useEffect(() => { const handler = (event: KeyboardEvent) => event.key === "Escape" && onClose(); window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [onClose]);
  useEffect(() => {
    if (!isValidCoordinate(lat, lng)) { setError("This branch has invalid coordinates. Edit the location and select the office again."); return; }
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !containerRef.current) return;
      const zoom = radiusMeters <= 100 ? 17 : radiusMeters <= 400 ? 16 : radiusMeters <= 1000 ? 15 : 14;
      const map = new maps.Map(containerRef.current, { center: { lat, lng }, zoom, mapTypeId: "roadmap", streetViewControl: true, mapTypeControl: false, fullscreenControl: false });
      mapRef.current = map; setReady(true);
      new maps.Marker({ map, position: { lat, lng }, title: name });
      new maps.Circle({ map, center: { lat, lng }, radius: radiusMeters, strokeColor: "#4f46e5", strokeOpacity: .85, strokeWeight: 2, fillColor: "#6366f1", fillOpacity: .16 });
    }).catch((reason) => { if (!cancelled) setError(googleMapsErrorMessage(reason)); });
    return () => { cancelled = true; mapRef.current = null; };
  }, [lat, lng, name, radiusMeters]);
  useEffect(() => { if (mapRef.current) mapRef.current.setMapTypeId(satellite ? "satellite" : "roadmap"); }, [satellite]);
  return <Modal z={60} onClose={onClose}><div role="dialog" aria-modal="true" aria-label={`${name} on the map`} className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(88vh,720px)] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-slate-200">
    <div className="relative isolate min-h-0 flex-1 bg-slate-100"><div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {!ready && !error && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90"><Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />Loading Google Map...</div>}
      {error && <div role="alert" className="absolute inset-x-4 top-4 z-20 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-lg"><AlertCircle className="mr-2 inline h-5 w-5" />{error}</div>}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[70%] rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-lg ring-1 ring-black/5"><p className="truncate text-sm font-semibold text-slate-900">{name}</p><p className="mt-0.5 text-[11px] font-semibold text-indigo-600">Employees can punch in within {formatMapRadius(radiusMeters)}</p></div>
      <button type="button" onClick={onClose} aria-label="Close map" className={`${roundButton} absolute right-3 top-3 z-10`}><X className="h-4 w-4" /></button><div className="absolute right-3 top-16 z-10 flex flex-col gap-2"><button type="button" onClick={() => setSatellite((value) => !value)} aria-label={satellite ? "Switch to the street map" : "Switch to satellite view"} className={roundButton}>{satellite ? <MapIcon className="h-4 w-4" /> : <Satellite className="h-4 w-4" />}</button><div className="flex flex-col overflow-hidden rounded-full bg-white shadow-lg"><button type="button" onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 15) + 1)} aria-label="Zoom in" className="flex h-10 w-10 items-center justify-center"><Plus className="h-4 w-4" /></button><div className="h-px bg-slate-100" /><button type="button" onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 15) - 1)} aria-label="Zoom out" className="flex h-10 w-10 items-center justify-center"><Minus className="h-4 w-4" /></button></div></div>
    </div><div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div className="min-w-0"><p className="text-sm font-medium text-slate-900">{address || "No street address saved"}</p><p className="mt-0.5 font-mono text-[11px] text-slate-400">{lat.toFixed(5)}, {lng.toFixed(5)} · Radius: {formatMapRadius(radiusMeters)}</p></div></div><div className="flex shrink-0 flex-wrap gap-2"><a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700">Open in Google Maps <ExternalLink className="h-3 w-3" /></a>{onEdit && <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white"><Pencil className="h-3.5 w-3.5" />Change location</button>}</div></div>
  </div></Modal>;
}
