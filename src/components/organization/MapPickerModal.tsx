"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Crosshair, Loader2, MapPin, Satellite, Map as MapIcon, Search, X } from "lucide-react";
import { PlaceResult, reverseGeocodeFull, searchPlaces } from "@/lib/geocode";
import { googleMapsErrorMessage, isValidCoordinate, loadGoogleMaps } from "@/lib/googleMaps";

interface MapPickerModalProps {
  initial: { lat: number; lng: number } | null;
  radiusMeters: number;
  onCancel: () => void;
  onConfirm: (place: { lat: number; lng: number; address: string; city?: string; accuracy?: number }) => void;
}
type Point = { lat: number; lng: number };
const WORLD_CENTER = { lat: 20.5937, lng: 78.9629 };
const floatingButton = "flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-indigo-600 active:scale-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500";

export default function MapPickerModal({ initial, radiusMeters, onCancel, onConfirm }: MapPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const radiusRef = useRef(radiusMeters);
  const [point, setPoint] = useState<Point | null>(initial);
  const [resolved, setResolved] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchOutcome, setSearchOutcome] = useState<{ query: string; items: PlaceResult[]; failed: boolean } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = searchQuery.trim();
  const outcome = searchOutcome?.query === trimmedQuery ? searchOutcome : null;
  const showDropdown = searchFocused && trimmedQuery.length >= 3;

  useEffect(() => { radiusRef.current = radiusMeters; circleRef.current?.setRadius(radiusMeters); }, [radiusMeters]);
  useEffect(() => {
    if (!point) return;
    const controller = new AbortController();
    reverseGeocodeFull(point.lat, point.lng, controller.signal).then((geo) => { if (!controller.signal.aborted && geo?.label) setResolved({ lat: point.lat, lng: point.lng, label: geo.label }); });
    return () => controller.abort();
  }, [point]);
  useEffect(() => {
    if (trimmedQuery.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try { setSearchOutcome({ query: trimmedQuery, items: await searchPlaces(trimmedQuery, controller.signal), failed: false }); setActiveIndex(-1); }
      catch (error: any) { if (error?.name !== "AbortError") setSearchOutcome({ query: trimmedQuery, items: [], failed: true }); }
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [trimmedQuery]);

  const placePin = (lat: number, lng: number, options: { pan?: boolean; zoom?: number } = {}, accuracy?: number) => {
    if (!isValidCoordinate(lat, lng) || !mapRef.current) return;
    const maps = (window as any).google.maps;
    const position = { lat, lng };
    if (!markerRef.current) {
      markerRef.current = new maps.Marker({ map: mapRef.current, position, draggable: true, title: "Office location (drag to adjust)" });
      circleRef.current = new maps.Circle({ map: mapRef.current, center: position, radius: radiusRef.current, strokeColor: "#4f46e5", strokeOpacity: 0.85, strokeWeight: 2, fillColor: "#6366f1", fillOpacity: 0.16 });
      markerRef.current.addListener("drag", () => circleRef.current?.setCenter(markerRef.current.getPosition()));
      markerRef.current.addListener("dragend", () => {
        const p = markerRef.current.getPosition(); const next = { lat: p.lat(), lng: p.lng() };
        circleRef.current?.setCenter(next); setPoint(next); setGpsAccuracy(null);
      });
    } else { markerRef.current.setPosition(position); circleRef.current?.setCenter(position); circleRef.current?.setRadius(radiusRef.current); }
    if (options.pan) { mapRef.current.panTo(position); if (options.zoom) mapRef.current.setZoom(options.zoom); }
    setPoint(position); if (accuracy != null) setGpsAccuracy(Math.round(accuracy));
  };

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !containerRef.current) return;
      const start = initial && isValidCoordinate(initial.lat, initial.lng) ? initial : null;
      const map = new maps.Map(containerRef.current, { center: start || WORLD_CENTER, zoom: start ? 16 : 5, mapTypeId: "roadmap", streetViewControl: true, mapTypeControl: false, fullscreenControl: false, clickableIcons: false });
      mapRef.current = map; setReady(true);
      map.addListener("click", (event: any) => { if (event.latLng) placePin(event.latLng.lat(), event.latLng.lng()); });
      if (start) placePin(start.lat, start.lng);
      else if (navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => { if (!markerRef.current) map.setCenter({ lat: position.coords.latitude, lng: position.coords.longitude }); }, () => {}, { timeout: 8000, maximumAge: 60000 });
    }).catch((error) => { if (!cancelled) setMapError(googleMapsErrorMessage(error)); });
    return () => { cancelled = true; markerRef.current?.setMap(null); circleRef.current?.setMap(null); mapRef.current = null; };
  }, []);
  useEffect(() => { if (mapRef.current) mapRef.current.setMapTypeId(satellite ? "satellite" : "roadmap"); }, [satellite]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setNotice("GPS is not available in this browser."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => { setLocating(false); setNotice(null); placePin(position.coords.latitude, position.coords.longitude, { pan: true, zoom: 17 }, position.coords.accuracy); }, (error) => { setLocating(false); setNotice(error.code === error.PERMISSION_DENIED ? "Location access is blocked. Allow it in your browser settings or search for the address." : "Could not read your location. Search for the address instead."); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  };
  const selectPlace = (item: PlaceResult) => { setSearchQuery(""); setSearchFocused(false); setNotice(item.approximate ? "Exact address not found. Drag the pin to your building." : null); placePin(item.lat, item.lng, { pan: true, zoom: 16 }); setResolved({ lat: item.lat, lng: item.lng, label: item.label }); };
  const confirm = async () => { if (!point) return; const geo = await reverseGeocodeFull(point.lat, point.lng); onConfirm({ lat: point.lat, lng: point.lng, address: geo?.label || resolved?.label || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, city: geo?.city, accuracy: gpsAccuracy || undefined }); };
  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => { const items = outcome?.items || []; if (event.key === "ArrowDown" && items.length) { event.preventDefault(); setActiveIndex((index) => (index + 1) % items.length); } else if (event.key === "ArrowUp" && items.length) { event.preventDefault(); setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1)); } else if (event.key === "Enter" && items.length) { event.preventDefault(); selectPlace(items[activeIndex >= 0 ? activeIndex : 0]); } };
  useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCancel(); window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onCancel]);

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm sm:p-6" onClick={onCancel}><div role="dialog" aria-modal="true" aria-label="Select office location on the map" onClick={(event) => event.stopPropagation()} className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(88vh,740px)] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-slate-200">
    <div className="relative isolate min-h-0 flex-1 bg-slate-100"><div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
      {!ready && !mapError && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90"><Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /><span className="text-sm text-slate-600">Loading Google Map...</span></div>}
      {mapError && <div role="alert" className="absolute inset-x-4 top-4 z-20 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-lg"><div className="flex gap-2"><AlertCircle className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Map unavailable</p><p className="mt-1">{mapError}</p></div></div></div>}
      <div className="absolute left-3 right-16 top-3 z-20 max-w-md"><div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-lg ring-1 ring-black/5"><Search className="h-4 w-4 text-slate-400" /><input type="text" role="combobox" aria-expanded={showDropdown} aria-label="Search for an address" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} onKeyDown={onSearchKeyDown} placeholder="Search company name, office, address or landmark" autoComplete="off" className="min-w-0 flex-1 bg-transparent py-1 text-sm text-slate-900 focus:outline-none" /></div>
        {showDropdown && <ul role="listbox" className="mt-2 max-h-72 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl">{outcome?.failed ? <li className="px-3 py-3 text-xs text-rose-600">Address search is unavailable. Click the map or use GPS.</li> : !outcome ? <li className="px-3 py-3 text-xs text-slate-500">Searching...</li> : outcome.items.length === 0 ? <li className="px-3 py-3 text-xs text-slate-600">No places found. Try a broader area.</li> : outcome.items.map((item, index) => <li key={`${item.lat}-${item.lng}-${index}`} role="option" onMouseDown={(event) => { event.preventDefault(); selectPlace(item); }} className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm ${index === activeIndex ? "bg-indigo-50" : "hover:bg-slate-50"}`}><MapPin className="mr-2 inline h-4 w-4 text-indigo-500" />{item.label}</li>)}</ul>}
      </div>
      <button type="button" onClick={onCancel} aria-label="Close map" className={`${floatingButton} absolute right-3 top-3 z-20`}><X className="h-4 w-4" /></button><div className="absolute right-3 top-16 z-20 flex flex-col gap-2"><button type="button" onClick={() => setSatellite((value) => !value)} aria-label={satellite ? "Switch to street map" : "Switch to satellite view"} className={floatingButton}>{satellite ? <MapIcon className="h-4 w-4" /> : <Satellite className="h-4 w-4" />}</button><button type="button" onClick={useCurrentLocation} disabled={locating} aria-label="Use my current location" className={floatingButton}>{locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}</button></div>
      {notice && <div role="alert" className="absolute bottom-3 left-3 right-3 z-20 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow ring-1 ring-amber-200">{notice}</div>}
    </div><div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4"><div className="min-w-0 text-xs text-slate-600">{point ? <><span className="font-mono text-slate-500">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</span>{gpsAccuracy != null && <span className={`ml-2 font-semibold ${gpsAccuracy > 100 ? "text-amber-700" : "text-emerald-700"}`}>GPS accuracy ±{gpsAccuracy} m{gpsAccuracy > 100 ? " — move closer to the office for a more accurate pin" : ""}</span>}</> : "Click the map, search, or use your current location."}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={onCancel} className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600">Cancel</button><button type="button" disabled={!point} onClick={confirm} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />Use this location</button></div></div>
  </div></div>;
}
