export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
  city?: string;
  /** First part of the address, shown bold in result lists. */
  title?: string;
  /** Remainder of the address, shown muted under the title. */
  subtitle?: string;
  /** True when the exact address was not found and this is the closest broader match. */
  approximate?: boolean;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io/api/";

const cityOf = (address: any): string | undefined =>
  address?.city || address?.town || address?.village || address?.suburb || address?.state_district || address?.state;

const withTitle = (label: string, extra: Partial<PlaceResult> & { lat: number; lng: number }): PlaceResult => {
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  return {
    label,
    title: parts[0] || label,
    subtitle: parts.slice(1).join(", ") || undefined,
    ...extra,
  };
};

async function nominatimSearch(q: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "7");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
  if (!res.ok) return [];
  const rows: any[] = await res.json();
  return (rows || [])
    .map((row) => withTitle(String(row.display_name || "").trim(), { lat: Number(row.lat), lng: Number(row.lon), city: cityOf(row.address) }))
    .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

/** Photon tolerates typos and partial addresses that Nominatim rejects. */
async function photonSearch(q: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url = new URL(PHOTON);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "7");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.features || [])
    .map((f: any) => {
      const p = f?.properties || {};
      const [lng, lat] = f?.geometry?.coordinates || [];
      const street = [p.housenumber, p.street].filter(Boolean).join(" ");
      const label = [p.name, street, p.district || p.locality, p.city || p.county, p.state, p.postcode, p.country]
        .filter((part, i, all) => part && all.indexOf(part) === i)
        .join(", ");
      return withTitle(label, { lat: Number(lat), lng: Number(lng), city: p.city || p.county || p.state });
    })
    .filter((r: PlaceResult) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

/**
 * Detailed addresses with landmarks and door numbers may not match as written.
 * written. Strip landmark phrases and door numbers, then drop the most specific parts one at a
 * time until the geocoder recognises what is left.
 */
export function addressFallbacks(query: string): string[] {
  const cleaned = query
    .replace(/\b(near|opp(?:osite)?|behind|beside|next to)\b[^,]*/gi, "")
    .replace(/\b(?:door\s*)?(?:no|number|#)\.?\s*\d+[a-z]?(?:[/-]\d+[a-z]?)?\b[,.]?/gi, "")
    .replace(/\s+/g, " ");
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  const candidates = [query.trim(), parts.join(", ")];
  for (let drop = 1; drop < parts.length - 1; drop++) candidates.push(parts.slice(drop).join(", "));
  return [...new Set(candidates.filter((c) => c.length >= 3))].slice(0, 5);
}

/** Address search for the branch location picker. Returns up to 7 matches. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // If user typed or pasted raw coordinates: "lat, lng"
  const coordMatch = q.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [withTitle(`Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, { lat, lng })];
    }
  }

  if (q.length < 3) return [];
  const candidates = addressFallbacks(q);
  const attempt = async (search: (s: string, sig?: AbortSignal) => Promise<PlaceResult[]>, text: string) => {
    try {
      return await search(text, signal);
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      return [];
    }
  };

  for (let i = 0; i < candidates.length; i++) {
    const found = await attempt(nominatimSearch, candidates[i]);
    if (found.length) return i === 0 ? found : found.map((r) => ({ ...r, approximate: true }));
  }
  for (const text of [candidates[1] ?? q, candidates[candidates.length - 1]]) {
    const found = await attempt(photonSearch, text);
    if (found.length) return found.map((r) => ({ ...r, approximate: true }));
  }
  return [];
}

/** Full street-level address for a coordinate, used after GPS or a map click. */
export async function reverseGeocodeFull(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<{ label: string; city?: string } | null> {
  try {
    const url = new URL(`${NOMINATIM}/reverse`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
    if (!res.ok) return null;
    const data = await res.json();
    const label = String(data?.display_name || "").trim();
    return label ? { label, city: cityOf(data.address) } : null;
  } catch {
    return null;
  }
}
