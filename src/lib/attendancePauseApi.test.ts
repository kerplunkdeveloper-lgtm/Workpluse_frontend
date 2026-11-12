import { afterEach, describe, expect, it } from "vitest";
import { api, attendanceApi } from "./api";

describe("attendance pause button requests", () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it.each([
    ["startBreak", "/attendance/break-start"],
    ["endBreak", "/attendance/break-end"],
    ["startLunch", "/attendance/lunch-start"],
    ["endLunch", "/attendance/lunch-end"],
  ] as const)("%s sends a timestamp and GPS coordinates", async (method, url) => {
    let body: Record<string, unknown> = {};
    api.defaults.adapter = async (config) => {
      body = JSON.parse(String(config.data));
      expect(config.url).toBe(url);
      return { data: { success: true }, status: 200, statusText: "OK", headers: {}, config };
    };

    await attendanceApi[method]({ latitude: 11.9329, longitude: 79.8072, accuracy: 12 });

    expect(body.latitude).toBe(11.9329);
    expect(body.longitude).toBe(79.8072);
    expect(body.accuracy).toBe(12);
    expect(typeof body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(String(body.timestamp)))).toBe(false);
  });
});
