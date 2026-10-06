"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Loader2, X } from "lucide-react";
import { reverseGeocodeFull } from "@/lib/geocode";

interface MapPickerModalProps {
  initial: { lat: number; lng: number } | null;
  radiusMeters: number;
  onCancel: () => void;
  onConfirm: (place: { lat: number; lng: number; address: string; city?: string }) => void;
}

// Puducherry, the product's home market, is the fallback centre.
const DEFAULT_CENTER: [number, number] = [11.9416, 79.8083];

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#4f46e5;border:3px solid #fff;box-shadow:0 4px 10px rgba(15,23,42,.4);transform:rotate(-45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export default function MapPickerModal({ initial, radiusMeters, onCancel, onConfirm }: MapPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const radiusRef = useRef(radiusMeters);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(initial);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    radiusRef.current = radiusMeters;
    circleRef.current?.setRadius(radiusMeters);
  }, [radiusMeters]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const start: [number, number] = initial ? [initial.lat, initial.lng] : DEFAULT_CENTER;
    const map = L.map(container, { zoomControl: true }).setView(start, initial ? 17 : 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const place = (lat: number, lng: number) => {
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current!.getLatLng();
          place(p.lat, p.lng);
        });
        circleRef.current = L.circle([lat, lng], {
          radius: radiusRef.current,
          color: "#4f46e5",
          weight: 1.5,
          fillOpacity: 0.12,
        }).addTo(map);
      } else {
        markerRef.current.setLatLng([lat, lng]);
        circleRef.current?.setLatLng([lat, lng]);
      }
      setPoint({ lat, lng });
    };

    if (initial) place(initial.lat, initial.lng);
    map.on("click", (e: L.LeafletMouseEvent) => place(e.latlng.lat, e.latlng.lng));

    // The modal animates in, so Leaflet must re-measure once it has its size.
    const sizer = setTimeout(() => map.invalidateSize(), 120);
    return () => {
      clearTimeout(sizer);
      markerRef.current = null;
      circleRef.current = null;
      map.remove();
    };
    // The map is created once; later prop changes are handled by refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const confirm = async () => {
    if (!point) return;
    setResolving(true);
    const geo = await reverseGeocodeFull(point.lat, point.lng);
    setResolving(false);
    onConfirm({
      lat: point.lat,
      lng: point.lng,
      address: geo?.label || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      city: geo?.city,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select office location on map"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Select office on map</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Click the map to drop a pin, or drag the pin to fine-tune. The circle shows the punch radius.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close map"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={containerRef} className="h-[55vh] min-h-[320px] w-full bg-slate-100" />

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-xs text-slate-500" aria-live="polite">
            {point ? "Pin placed. Confirm to use this spot." : "No pin yet. Click anywhere on the map."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!point || resolving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Use this location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
