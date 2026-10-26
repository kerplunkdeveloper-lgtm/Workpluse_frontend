/**
 * Loads the Google Maps JavaScript API once, only in the browser, only when it is needed.
 * The key comes from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Without it the location picker still works
 * (search, GPS, and the Google map preview) but cannot be clicked to place the pin.
 *
 * The project has no @types/google.maps, so the API is handled loosely typed.
 */
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

let loading: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error("No Google Maps key is configured."));
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const callbackName = "__workpulseGoogleMapsReady";
    w[callbackName] = () => resolve(w.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("Google Maps could not be loaded. Check your internet connection."));
    };
    document.head.appendChild(script);
  });
  return loading;
}
