"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, MapPin, Pencil, Satellite, Map as MapIcon, X, Plus, Minus } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface BranchMapViewerProps {
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  onClose: () => void;
  /** Shown only to people who may change the location. */
  onEdit?: () => void;
}

const STREET_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const roundButton =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-indigo-600 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500";

const formatRadius = (meters: number) => (meters >= 1000 ? `${Number((meters / 1000).toFixed(2))} km` : `${meters} m`);

const createCustomPinIcon = () => {
  return L.divIcon({
    className: "custom-branch-pin",
    html: `
      <div style="position: relative; width: 36px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 10px rgba(0,0,0,0.38));">
          <defs>
            <linearGradient id="wp-branch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4f46e5" />
              <stop offset="100%" stop-color="#312e81" />
            </linearGradient>
          </defs>
          <path d="M18 0C8.05887 0 0 8.05887 0 18C0 29.5 18 44 18 44C18 44 36 29.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="url(#wp-branch-grad)"/>
          <circle cx="18" cy="17" r="7" fill="white"/>
          <circle cx="18" cy="17" r="3.5" fill="#4f46e5"/>
        </svg>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
};

/**
 * The branch on the interactive map: zoom, pan, street view or satellite with geofence circle.
 * Opened from a branch card.
 */
export default function BranchMapViewer({ name, address, lat, lng, radiusMeters, onClose, onEdit }: BranchMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [satellite, setSatellite] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Zoom level calculation for radius
    const zoom = radiusMeters <= 100 ? 17 : radiusMeters <= 400 ? 16 : radiusMeters <= 1000 ? 15 : 14;

    const map = L.map(container, {
      center: [lat, lng],
      zoom,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Tile layer
    const initialTiles = L.tileLayer(STREET_TILES, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    tileLayerRef.current = initialTiles;

    // Branch Pin
    L.marker([lat, lng], {
      icon: createCustomPinIcon(),
      title: name,
    }).addTo(map);

    // Geofence Punch Range Circle
    L.circle([lat, lng], {
      radius: radiusMeters,
      color: "#4f46e5",
      weight: 2,
      opacity: 0.85,
      fillColor: "#6366f1",
      fillOpacity: 0.16,
    }).addTo(map);

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, name, radiusMeters]);

  // Toggle Satellite / Street view
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layer = satellite
      ? L.tileLayer(SATELLITE_TILES, { maxZoom: 19 })
      : L.tileLayer(STREET_TILES, { maxZoom: 19, subdomains: "abcd" });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [satellite]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  return (
    <Modal z={60} onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${name} on the map`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(88vh,720px)] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-slate-200"
      >
        <div className="relative isolate min-h-0 flex-1 bg-slate-100">
          <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
          <style>{`
            .custom-branch-pin {
              background: transparent !important;
              border: none !important;
            }
          `}</style>

          {/* Branch name and range, floating over the map */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[70%] rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-indigo-600">
              Employees can punch in within {formatRadius(radiusMeters)}
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close map" className={`${roundButton} absolute right-3 top-3 z-10`}>
            <X className="h-4 w-4" />
          </button>

          <div className="absolute right-3 top-16 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSatellite((s) => !s)}
              aria-pressed={satellite}
              aria-label={satellite ? "Switch to the street map" : "Switch to satellite view"}
              title={satellite ? "Map" : "Satellite"}
              className={roundButton}
            >
              {satellite ? <MapIcon className="h-4 w-4" /> : <Satellite className="h-4 w-4" />}
            </button>
            <div className="flex flex-col overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-black/5">
              <button
                type="button"
                onClick={zoomIn}
                aria-label="Zoom in"
                title="Zoom in"
                className="flex h-10 w-10 items-center justify-center text-slate-700 transition hover:bg-slate-50 hover:text-indigo-600 active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div className="h-px w-full bg-slate-100" />
              <button
                type="button"
                onClick={zoomOut}
                aria-label="Zoom out"
                title="Zoom out"
                className="flex h-10 w-10 items-center justify-center text-slate-700 transition hover:bg-slate-50 hover:text-indigo-600 active:scale-95"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <MapPin aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5 text-slate-900">{address || "No street address saved"}</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                {lat.toFixed(5)}, {lng.toFixed(5)} &middot; Radius: {formatRadius(radiusMeters)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open in Google Maps <ExternalLink className="h-3 w-3" />
            </a>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Change location
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
