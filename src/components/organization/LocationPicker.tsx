"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Crosshair, ExternalLink, Loader2, Map as MapIcon, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PlaceResult, reverseGeocodeFull, searchPlaces } from "@/lib/geocode";

// Leaflet touches `window`, so the map only loads in the browser and only when opened.
const MapPickerModal = dynamic(() => import("./MapPickerModal"), { ssr: false });

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  accuracy?: number;
}

interface LocationPickerProps {
  value: { lat: number; lng: number; address: string } | null;
  radiusMeters: number;
  onChange: (location: PickedLocation | null) => void;
}

export default function LocationPicker({ value, radiusMeters, onChange }: LocationPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced address search. Nominatim asks for at most one request a second.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const found = await searchPlaces(trimmed, controller.signal);
        setResults(found);
        setActiveIndex(-1);
        setOpen(true);
      } catch (err: any) {
        if (err?.name !== "AbortError") setSearchError(err?.message || "Address search failed.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const choose = (place: PlaceResult) => {
    setAccuracy(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange({ lat: place.lat, lng: place.lng, address: place.label, city: place.city });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && open && activeIndex >= 0) {
      e.preventDefault();
      choose(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("GPS is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const geo = await reverseGeocodeFull(latitude, longitude);
        setAccuracy(Math.round(acc));
        onChange({
          lat: latitude,
          lng: longitude,
          address: geo?.label || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          city: geo?.city,
          accuracy: Math.round(acc),
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location access is blocked. Allow it in your browser, or search for the address instead."
            : "Could not read your location. Try searching for the address instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const buttonClass =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-60";

  return (
    <div className="space-y-3">
      <div ref={wrapperRef} className="relative">
        <label htmlFor={`${listId}-search`} className="mb-1 block text-[13px] font-medium text-slate-700">
          Office location <span aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id={`${listId}-search`}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${listId}-results`}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search office address..."
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {searching && <Loader2 aria-label="Searching" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
        </div>

        {open && (query.trim().length >= 3 || results.length > 0) && (
          <ul
            id={`${listId}-results`}
            role="listbox"
            className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            {searchError ? (
              <li className="px-3 py-3 text-xs text-rose-600">{searchError}</li>
            ) : results.length === 0 && !searching ? (
              <li className="px-3 py-3 text-xs text-slate-500">No matches. Try a nearby landmark, or use the map.</li>
            ) : (
              results.map((place, i) => (
                <li
                  key={`${place.lat}-${place.lng}-${i}`}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(place);
                  }}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 text-xs transition ${
                    i === activeIndex ? "bg-indigo-50 text-indigo-900" : "text-slate-700"
                  }`}
                >
                  <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="leading-5">{place.label}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={useCurrentLocation} disabled={locating} className={buttonClass}>
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          {locating ? "Reading GPS..." : "Use Current Location"}
        </button>
        <button type="button" onClick={() => setMapOpen(true)} className={buttonClass}>
          <MapIcon className="h-4 w-4" />
          Select on Map
        </button>
      </div>

      {value ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected address</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-900">{value.address}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAccuracy(null);
                onChange(null);
              }}
              aria-label="Clear selected location"
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Location selected
              {accuracy != null && <span className="font-medium text-emerald-700/80">· GPS accurate to about {accuracy} m</span>}
            </p>
            <a
              href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View in Maps <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 px-3.5 py-3 text-xs text-slate-500">
          No location selected yet. Search for the address, use your current location, or pick it on the map.
        </p>
      )}

      {mapOpen && (
        <MapPickerModal
          initial={value ? { lat: value.lat, lng: value.lng } : null}
          radiusMeters={radiusMeters}
          onCancel={() => setMapOpen(false)}
          onConfirm={(place) => {
            setMapOpen(false);
            setAccuracy(null);
            onChange(place);
          }}
        />
      )}
    </div>
  );
}
