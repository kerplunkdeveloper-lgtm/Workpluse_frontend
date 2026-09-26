function uniqueParts(parts: Array<string | undefined | null>) {
  return [...new Set(parts.map((part) => String(part || "").trim()).filter(Boolean))];
}

export function formatPlaceName(payload: any): string | null {
  const address = payload?.address || {};
  const locality =
    address.neighbourhood ||
    address.suburb ||
    address.village ||
    address.hamlet ||
    address.city_district ||
    address.road;
  const city = address.city || address.town || address.municipality || address.county;
  const formatted = uniqueParts([locality, city, address.state]).join(", ");
  if (formatted) return formatted.slice(0, 180);
  const display = String(payload?.display_name || "")
    .split(",")
    .slice(0, 3)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  return display ? display.slice(0, 180) : null;
}

export async function reverseGeocodeLabel(latitude: number, longitude: number): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("zoom", "16");
    url.searchParams.set("addressdetails", "1");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return formatPlaceName(await response.json());
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return null;
  }
}

export function mapsSearchUrl(label?: string | null) {
  if (!label) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}
