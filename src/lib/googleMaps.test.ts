import { describe, expect, it } from "vitest";
import { formatMapRadius, googleMapsErrorMessage, normalizeSavedMapPoint, selectMapCoordinate } from "./googleMaps";

describe("Google Maps attendance helpers", () => {
  it("accepts a map click coordinate and rejects invalid values", () => {
    expect(selectMapCoordinate(12.9716, 77.5946)).toEqual({ lat: 12.9716, lng: 77.5946 });
    expect(selectMapCoordinate(91, 77)).toBeNull();
  });

  it("keeps the saved geofence radius readable", () => {
    expect(formatMapRadius(250)).toBe("250 m");
    expect(formatMapRadius(1500)).toBe("1.5 km");
  });

  it("loads saved branch coordinates from API number or string fields", () => {
    expect(normalizeSavedMapPoint({ latitude: "12.971600", longitude: "77.594600" })).toEqual({ lat: 12.9716, lng: 77.5946 });
    expect(normalizeSavedMapPoint({ latitude: null, longitude: 77 })).toBeNull();
  });

  it("explains key, referrer and network failures", () => {
    expect(googleMapsErrorMessage({ code: "missing-key" })).toMatch(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/);
    expect(googleMapsErrorMessage({ code: "auth" })).toMatch(/referrers/);
    expect(googleMapsErrorMessage({ code: "network" })).toMatch(/network/);
  });
});
