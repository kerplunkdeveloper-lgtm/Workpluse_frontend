"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertCircle,
  Check,
  Crosshair,
  Loader2,
  MapPin,
  Satellite,
  Map as MapIcon,
  Search,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { PlaceResult, reverseGeocodeFull, searchPlaces } from "@/lib/geocode";

interface MapPickerModalProps {
  initial: { lat: number; lng: number } | null;
  radiusMeters: number;
  onCancel: () => void;
  onConfirm: (place: { lat: number; lng: number; address: string; city?: string }) => void;
}

type Point = { lat: number; lng: number };

// Default center: India / global fallback
const WORLD_CENTER = { lat: 20.5937, lng: 78.9629 };

const STREET_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const STREET_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTR =
  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

const floatingButton =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-indigo-600 active:scale-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500";

const createCustomPinIcon = () => {
  return L.divIcon({
    className: "custom-map-pin",
    html: `
      <div style="position: relative; width: 36px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: grab;">
        <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 10px rgba(0,0,0,0.38));">
          <defs>
            <linearGradient id="wp-pin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4f46e5" />
              <stop offset="100%" stop-color="#312e81" />
            </linearGradient>
          </defs>
          <path d="M18 0C8.05887 0 0 8.05887 0 18C0 29.5 18 44 18 44C18 44 36 29.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="url(#wp-pin-grad)"/>
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

export default function MapPickerModal({ initial, radiusMeters, onCancel, onConfirm }: MapPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const radiusRef = useRef(radiusMeters);
  const initialRef = useRef(initial);

  const [point, setPoint] = useState<Point | null>(initial);
  const [resolved, setResolved] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchOutcome, setSearchOutcome] = useState<{ query: string; items: PlaceResult[]; failed: boolean } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmedQuery = searchQuery.trim();
  const searching = trimmedQuery.length >= 3 && searchOutcome?.query !== trimmedQuery;
  const outcome = searchOutcome?.query === trimmedQuery ? searchOutcome : null;
  const showDropdown = searchFocused && trimmedQuery.length >= 3;
  const preview = point && resolved && resolved.lat === point.lat && resolved.lng === point.lng ? resolved.label : "";
  const previewParts = preview.split(",").map((p) => p.trim());

  // Keep radius in sync
  useEffect(() => {
    radiusRef.current = radiusMeters;
    if (circleRef.current) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // Street address for the pin, refreshed whenever the pin moves
  useEffect(() => {
    if (!point) return;
    const controller = new AbortController();
    reverseGeocodeFull(point.lat, point.lng, controller.signal).then((geo) => {
      if (!controller.signal.aborted && geo?.label) {
        setResolved({ lat: point.lat, lng: point.lng, label: geo.label });
      }
    });
    return () => controller.abort();
  }, [point]);

  // Debounced place search
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

  // Places or updates the pin & geofence circle on the Leaflet map
  const placePin = (lat: number, lng: number, opts: { pan?: boolean; zoom?: number } = {}) => {
    const map = mapRef.current;
    if (!map) return;

    const latLng = L.latLng(lat, lng);

    if (!markerRef.current) {
      const marker = L.marker(latLng, {
        icon: createCustomPinIcon(),
        draggable: true,
        title: "Office location (drag to adjust)",
      }).addTo(map);

      marker.on("drag", (e: any) => {
        const pos = e.target.getLatLng();
        circleRef.current?.setLatLng(pos);
      });

      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        circleRef.current?.setLatLng(pos);
        setPoint({ lat: pos.lat, lng: pos.lng });
      });

      markerRef.current = marker;

      const circle = L.circle(latLng, {
        radius: radiusRef.current,
        color: "#4f46e5",
        weight: 2,
        opacity: 0.85,
        fillColor: "#6366f1",
        fillOpacity: 0.16,
      }).addTo(map);

      circleRef.current = circle;
    } else {
      markerRef.current.setLatLng(latLng);
      circleRef.current?.setLatLng(latLng);
      circleRef.current?.setRadius(radiusRef.current);
    }

    if (opts.pan) {
      const targetZoom = opts.zoom || Math.max(map.getZoom(), 16);
      map.flyTo(latLng, targetZoom, { duration: 0.9 });
    }

    setPoint({ lat, lng });
  };

  // Mount Leaflet map
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const start = initialRef.current;
    const initialCenter = start || WORLD_CENTER;
    const initialZoom = start ? 16 : 5;

    const map = L.map(container, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Add initial tile layer
    const initialTiles = L.tileLayer(STREET_TILES, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    tileLayerRef.current = initialTiles;

    // Handle clicks to place pin anywhere
    map.on("click", (e: L.LeafletMouseEvent) => {
      placePin(e.latlng.lat, e.latlng.lng);
    });

    if (start) {
      placePin(start.lat, start.lng);
    } else if (navigator.geolocation) {
      // Auto-locate browser position smoothly without placing a pin yet
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!markerRef.current && mapRef.current) {
            mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
          }
        },
        () => {},
        { timeout: 8000, maximumAge: 60000 }
      );
    }

    // Ensure map tiles properly layout after modal is displayed
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      markerRef.current?.remove();
      circleRef.current?.remove();
      tileLayerRef.current?.remove();
      markerRef.current = null;
      circleRef.current = null;
      tileLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

  const selectPlace = (item: PlaceResult) => {
    setSearchQuery("");
    setSearchFocused(false);
    setNotice(
      item.approximate
        ? "Exact address not found. The pin is placed at the closest match. Drag it to your building."
        : null
    );
    placePin(item.lat, item.lng, { pan: true, zoom: 16 });
    setResolved({ lat: item.lat, lng: item.lng, label: item.label });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice("GPS is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setNotice(null);
        placePin(pos.coords.latitude, pos.coords.longitude, { pan: true, zoom: 17 });
      },
      (err) => {
        setLocating(false);
        setNotice(
          err.code === err.PERMISSION_DENIED
            ? "Location access is blocked. Allow it in your browser settings or search for the address."
            : "Could not read your location. Search for the address instead."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm sm:p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select office location on the map"
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(88vh,740px)] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-slate-200"
      >
        <div className="relative isolate min-h-0 flex-1 bg-slate-100">
          {/* Leaflet interactive map container */}
          <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
          <style>{`
            .custom-map-pin {
              background: transparent !important;
              border: none !important;
            }
          `}</style>

          {/* Floating search bar */}
          <div className="absolute left-3 right-16 top-3 z-20 max-w-md">
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
              <ul
                id="map-search-results"
                role="listbox"
                className="mt-2 max-h-72 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/5"
              >
                {searching ? (
                  <li className="px-3 py-3 text-xs text-slate-500">Searching...</li>
                ) : outcome?.failed ? (
                  <li className="px-3 py-3 text-xs text-rose-600">
                    Search is unavailable right now. Click anywhere on the map or use your current location.
                  </li>
                ) : outcome && outcome.items.length === 0 ? (
                  <li className="px-3 py-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">No places found.</span> Try a broader area, landmark, or city.
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
                      className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition ${
                        i === activeIndex ? "bg-indigo-50 text-indigo-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                        {item.subtitle && <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>}
                        {item.approximate && (
                          <span className="mt-0.5 block text-[11px] font-medium text-amber-700">Closest match</span>
                        )}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Floating Controls */}
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close map"
            className={`${floatingButton} absolute right-3 top-3 z-20`}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSatellite((s) => !s)}
              aria-pressed={satellite}
              aria-label={satellite ? "Switch to street map" : "Switch to satellite view"}
              title={satellite ? "Street Map" : "Satellite View"}
              className={floatingButton}
            >
              {satellite ? <MapIcon className="h-4 w-4" /> : <Satellite className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              aria-label="Use my current location"
              title="Locate Me"
              className={floatingButton}
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> : <Crosshair className="h-4 w-4" />}
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

          {/* Quick tip pill */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-sm rounded-xl bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-md backdrop-blur ring-1 ring-black/5">
            💡 Click anywhere on the map or drag the pin to place your office location
          </div>

          {/* Notification toast / banner */}
          {notice && (
            <p
              role="alert"
              className="absolute bottom-12 left-3 right-16 z-20 flex max-w-md items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900 shadow-lg ring-1 ring-amber-200"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              {notice}
            </p>
          )}
        </div>

        {/* Selected place footer */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${point ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
              <MapPin aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              {point ? (
                <>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {preview ? previewParts[0] : "Locating address..."}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {preview ? previewParts.slice(1).join(", ") : `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-indigo-600">
                    Geofence radius: {radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(2)} km` : `${radiusMeters} m`} (employees can punch within this circle)
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">No location pinned yet</p>
                  <p className="text-xs text-slate-400">Click anywhere on the map, search above, or use your GPS location.</p>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!point || resolving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
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
