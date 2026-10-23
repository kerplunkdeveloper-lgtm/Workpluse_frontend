"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertCircle, Check, Crosshair, Layers, Loader2, MapPin, Search, X } from "lucide-react";
import { PlaceResult, reverseGeocodeFull, searchPlaces } from "@/lib/geocode";

interface MapPickerModalProps {
  initial: { lat: number; lng: number } | null;
  radiusMeters: number;
  onCancel: () => void;
  onConfirm: (place: { lat: number; lng: number; address: string; city?: string }) => void;
}

type Point = { lat: number; lng: number };
type MapStyle = "street" | "satellite";

// Neutral world view shown only until the browser reports the user's position.
// No city is assumed, and no pin is placed until the user chooses a spot.
const WORLD_CENTER: [number, number] = [20, 0];
const WORLD_ZOOM = 2;

const TILES: Record<MapStyle, { url: string; attribution: string; maxZoom: number }> = {
  street: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
};

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#ea4335;border:3px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.45);transform:rotate(-45deg)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const floatingButton =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-indigo-600 active:scale-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500";

export default function MapPickerModal({ initial, radiusMeters, onCancel, onConfirm }: MapPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const radiusRef = useRef(radiusMeters);
  // The parent passes a fresh object each render, so the map must not depend on it.
  const initialRef = useRef(initial);
  const placePinRef = useRef<(lat: number, lng: number, fly: boolean) => void>(() => {});

  const [tilesFailed, setTilesFailed] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>("street");
  const [point, setPoint] = useState<Point | null>(initial);
  const [resolved, setResolved] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchOutcome, setSearchOutcome] = useState<{ query: string; items: PlaceResult[]; failed: boolean } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmedQuery = searchQuery.trim();
  const searching = trimmedQuery.length >= 3 && searchOutcome?.query !== trimmedQuery;
  const outcome = searchOutcome?.query === trimmedQuery ? searchOutcome : null;
  const showDropdown = searchFocused && trimmedQuery.length >= 3;
  const preview = point && resolved && resolved.lat === point.lat && resolved.lng === point.lng ? resolved.label : "";
  const previewParts = preview.split(",").map((p) => p.trim());

  useEffect(() => {
    radiusRef.current = radiusMeters;
    circleRef.current?.setRadius(radiusMeters);
  }, [radiusMeters]);

  // Live reverse geocoding preview when the pin moves.
  useEffect(() => {
    if (!point) return;
    const controller = new AbortController();
    reverseGeocodeFull(point.lat, point.lng, controller.signal).then((geo) => {
      if (!controller.signal.aborted && geo?.label) setResolved({ lat: point.lat, lng: point.lng, label: geo.label });
    });
    return () => controller.abort();
  }, [point]);

  // Debounced place search with fallbacks for long, detailed addresses.
  useEffect(() => {
    if (trimmedQuery.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const items = await searchPlaces(trimmedQuery, controller.signal);
        setSearchOutcome({ query: trimmedQuery, items, failed: false });
        setActiveIndex(-1);
      } catch (err: any) {
        if (err?.name !== "AbortError") setSearchOutcome({ query: trimmedQuery, items: [], failed: true });
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const start = initialRef.current;
    const map = L.map(container, { zoomControl: false, minZoom: 2, worldCopyJump: true });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.setView(start ? [start.lat, start.lng] : WORLD_CENTER, start ? 17 : WORLD_ZOOM);
    mapRef.current = map;

    // The one place a pin is created or moved, shared by clicks, drags, search and GPS.
    const placePin = (lat: number, lng: number, fly: boolean) => {
      if (!markerRef.current) {
        const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          placePinRef.current(p.lat, p.lng, false);
        });
        markerRef.current = marker;
        circleRef.current = L.circle([lat, lng], {
          radius: radiusRef.current,
          color: "#4f46e5",
          weight: 2,
          fillColor: "#6366f1",
          fillOpacity: 0.15,
        }).addTo(map);
      } else {
        markerRef.current.setLatLng([lat, lng]);
        circleRef.current?.setLatLng([lat, lng]);
      }
      setPoint({ lat, lng });
      if (fly) map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.8 });
    };
    placePinRef.current = placePin;

    if (start) {
      placePin(start.lat, start.lng, false);
    } else if (navigator.geolocation) {
      // Centre the view on the user's real position. No pin is placed for them.
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!markerRef.current && mapRef.current === map) map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        },
        () => {},
        { timeout: 8000, maximumAge: 60000 },
      );
    }

    map.on("click", (e: L.LeafletMouseEvent) => placePin(e.latlng.lat, e.latlng.lng, false));

    // The modal animates in and the viewport can resize, which leaves grey or partial tiles.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);
    const sizer = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(sizer);
      resizeObserver.disconnect();
      placePinRef.current = () => {};
      tileRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Street / satellite switch. Swapping the layer keeps the view, pin and radius.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { url, attribution, maxZoom } = TILES[mapStyle];
    let errors = 0;
    const layer = L.tileLayer(url, { attribution, maxZoom });
    layer.on("tileerror", () => {
      errors += 1;
      if (errors >= 3) setTilesFailed(true);
    });
    layer.on("tileload", () => {
      errors = 0;
      setTilesFailed(false);
    });
    layer.addTo(map);
    tileRef.current = layer;
    return () => {
      map.removeLayer(layer);
    };
  }, [mapStyle]);

  const selectPlace = (item: PlaceResult) => {
    setSearchQuery("");
    setSearchFocused(false);
    setNotice(item.approximate ? "Exact address not found. The pin is at the closest match, so drag it to your building." : null);
    placePinRef.current(item.lat, item.lng, true);
    setResolved({ lat: item.lat, lng: item.lng, label: item.label });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice("GPS is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setNotice(null);
        placePinRef.current(pos.coords.latitude, pos.coords.longitude, true);
      },
      (err) => {
        setLocating(false);
        setNotice(
          err.code === err.PERMISSION_DENIED
            ? "Location access is blocked. Allow it in your browser, or search for the address."
            : "Could not read your location. Search for the address instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const items = outcome?.items ?? [];
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && items.length) {
      e.preventDefault();
      selectPlace(items[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === "Escape" && showDropdown) {
      e.stopPropagation();
      setSearchFocused(false);
    }
  };

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
      address: geo?.label || preview || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
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
        className="relative flex h-[min(86vh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="relative min-h-0 flex-1">
          <div ref={containerRef} className="absolute inset-0 bg-slate-100" />

          {/* Floating search, like Google Maps */}
          <div className="absolute left-3 right-16 top-3 z-[1000] max-w-md">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-lg ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-indigo-500">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls="map-search-results"
                aria-label="Search for an address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search company name, office, address or landmark"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searching ? (
                <Loader2 aria-label="Searching" className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
              ) : (
                searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSearchQuery("")}
                    className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )
              )}
            </div>

            {showDropdown && (
              <ul id="map-search-results" role="listbox" className="mt-2 max-h-72 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/5">
                {searching ? (
                  <li className="px-3 py-3 text-xs text-slate-500">Searching...</li>
                ) : outcome?.failed ? (
                  <li className="px-3 py-3 text-xs text-rose-600">Search is unavailable right now. Click the map to place the pin instead.</li>
                ) : outcome && outcome.items.length === 0 ? (
                  <li className="px-3 py-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">No places found.</span> Try a broader area, landmark, or city, or click the map to place the pin.
                  </li>
                ) : (
                  outcome?.items.map((item, i) => (
                    <li
                      key={`${item.lat}-${item.lng}-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectPlace(item);
                      }}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition ${i === activeIndex ? "bg-slate-100" : ""}`}
                    >
                      <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                        {item.subtitle && <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>}
                        {item.approximate && <span className="mt-0.5 block text-[11px] font-medium text-amber-700">Closest match</span>}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Close */}
          <button type="button" onClick={onCancel} aria-label="Close map" className={`${floatingButton} absolute right-3 top-3 z-[1000]`}>
            <X className="h-4 w-4" />
          </button>

          {/* Map controls */}
          <div className="absolute right-3 top-16 z-[1000] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setMapStyle((s) => (s === "street" ? "satellite" : "street"))}
              aria-label={mapStyle === "street" ? "Switch to satellite view" : "Switch to street map"}
              title={mapStyle === "street" ? "Satellite" : "Map"}
              className={floatingButton}
            >
              <Layers className="h-4 w-4" />
            </button>
            <button type="button" onClick={handleUseCurrentLocation} disabled={locating} aria-label="Use my location" title="My location" className={floatingButton}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            </button>
          </div>

          {(tilesFailed || notice) && (
            <p
              role="alert"
              className="absolute bottom-3 left-3 right-16 z-[1000] flex max-w-md items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-lg ring-1 ring-amber-200"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {tilesFailed ? "The map could not load. Check your internet connection, or search for the address." : notice}
            </p>
          )}
        </div>

        {/* Selected place card */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <MapPin aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${point ? "text-rose-500" : "text-slate-300"}`} />
            <div className="min-w-0">
              {point ? (
                <>
                  <p className="truncate text-sm font-semibold text-slate-900">{preview ? previewParts[0] : "Locating address..."}</p>
                  <p className="truncate text-xs text-slate-500">
                    {preview ? previewParts.slice(1).join(", ") : `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Drag the pin to fine-tune the exact spot.</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No pin yet. Search an address, use your location, or click the map.</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!point || resolving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
            >
              {resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Set Office Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
