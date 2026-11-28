/** Shared, browser-only Google Maps JavaScript API loader. */
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

let loading: Promise<any> | null = null;
export type GoogleMapsLoadErrorCode = "missing-key" | "auth" | "network" | "timeout";

export function googleMapsErrorMessage(error: unknown): string {
  const code = (error as { code?: GoogleMapsLoadErrorCode } | null)?.code;
  if (code === "missing-key") return "Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY at build time.";
  if (code === "auth") return "Google Maps rejected this key. Check the key, enabled Maps JavaScript API, billing, and allowed referrers.";
  if (code === "timeout") return "Google Maps took too long to load. Check the network connection and try again.";
  return "Google Maps could not be loaded. Check the network connection and allowed referrers for this site.";
}

function makeError(code: GoogleMapsLoadErrorCode, message: string) {
  const error = new Error(message) as Error & { code: GoogleMapsLoadErrorCode };
  error.code = code;
  return error;
}

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(makeError("network", "Google Maps is browser-only."));
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
  if (!GOOGLE_MAPS_KEY) return Promise.reject(makeError("missing-key", "No Google Maps key is configured."));
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const callbackName = "__workpulseGoogleMapsReady";
    let settled = false;
    const existing = document.querySelector<HTMLScriptElement>('script[data-workpulse-google-maps="true"], script[src*="maps.googleapis.com/maps/api/js"]');
    const script = existing || document.createElement("script");
    const timeout = window.setTimeout(() => finish(reject, makeError("timeout", "Google Maps loading timed out.")), 15000);
    const finish = (fn: (value: any) => void, value: any) => { if (settled) return; settled = true; window.clearTimeout(timeout); fn(value); };
    w.gm_authFailure = () => finish(reject, makeError("auth", "Google Maps authentication failed."));
    w[callbackName] = () => w.google?.maps?.Map ? finish(resolve, w.google.maps) : finish(reject, makeError("network", "Google Maps loaded without the Maps API."));
    script.onerror = () => finish(reject, makeError("network", "Google Maps script failed to load."));
    if (!existing) { script.dataset.workpulseGoogleMaps = "true"; script.async = true; script.defer = true; script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&callback=${callbackName}&v=weekly`; document.head.appendChild(script); }
  }).catch((error) => { loading = null; throw error; });
  return loading;
}

export function isValidCoordinate(lat: number, lng: number): boolean { return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180; }
export function formatMapRadius(meters: number): string { return meters >= 1000 ? `${Number((meters / 1000).toFixed(2))} km` : `${meters} m`; }
export function normalizeSavedMapPoint(value: { latitude?: number | string | null; longitude?: number | string | null } | null | undefined): { lat: number; lng: number } | null {
  if (value?.latitude == null || value?.longitude == null || value.latitude === "" || value.longitude === "") return null;
  const lat = Number(value?.latitude); const lng = Number(value?.longitude);
  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
}
export function selectMapCoordinate(lat: number, lng: number): { lat: number; lng: number } | null {
  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
}
