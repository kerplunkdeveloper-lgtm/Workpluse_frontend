export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
  city?: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

const cityOf = (address: any): string | undefined =>
  address?.city || address?.town || address?.village || address?.suburb || address?.state_district || address?.state;

/** Address search for the branch location picker. Returns up to 5 matches. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error("Address search is unavailable right now.");
  const rows: any[] = await res.json();
  return rows
    .map((row) => ({
      label: String(row.display_name || "").trim(),
      lat: Number(row.lat),
      lng: Number(row.lon),
      city: cityOf(row.address),
    }))
    .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng));
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
