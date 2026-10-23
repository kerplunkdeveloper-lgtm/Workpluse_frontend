import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { api } from "./api";

type Step = number | "ok" | "network" | "cancel";

const g = globalThis as unknown as { window?: EventTarget; localStorage?: unknown };
const events: { type: string; status?: number }[] = [];

/** Makes every request answer with the next step in the sequence (the last one repeats). */
function respondWith(sequence: Step[]) {
  const calls = { count: 0 };
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const step = sequence[Math.min(calls.count, sequence.length - 1)];
    calls.count += 1;
    if (step === "ok") return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
    if (step === "cancel") throw new axios.CanceledError("cancelled", config);
    if (step === "network") throw new AxiosError("Network Error", "ERR_NETWORK", config);
    throw new AxiosError(`status ${step}`, "ERR_BAD_RESPONSE", config, null, {
      data: {},
      status: step,
      statusText: "",
      headers: {},
      config,
    });
  };
  return calls;
}

/** Runs a request to completion with the retry back-off timers fast-forwarded. */
async function settle<T>(request: Promise<T>) {
  const outcome = request.then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error }),
  );
  await vi.advanceTimersByTimeAsync(5000);
  return outcome;
}

describe("API failure handling", () => {
  beforeAll(() => {
    const target = new EventTarget();
    for (const type of ["workpulse:server-error", "workpulse:server-recovered"]) {
      target.addEventListener(type, (event) => {
        events.push({ type, status: (event as CustomEvent<{ status?: number }>).detail?.status });
      });
    }
    g.window = target;
    g.localStorage = { getItem: () => "test-device", setItem: () => {}, removeItem: () => {} };
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    // Start every test with no outage showing.
    respondWith(["ok"]);
    await api.get("/reset");
    events.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a GET through a brief server error without ever showing the outage screen", async () => {
    const calls = respondWith([500, 500, "ok"]);

    const result = await settle(api.get("/attendance/today"));

    expect(result.ok).toBe(true);
    expect(calls.count).toBe(3);
    expect(events).toEqual([]);
  });

  it("retries a dropped connection the same way", async () => {
    const calls = respondWith(["network", "ok"]);

    const result = await settle(api.get("/attendance/summary"));

    expect(result.ok).toBe(true);
    expect(calls.count).toBe(2);
    expect(events).toEqual([]);
  });

  it("shows the outage screen once when a GET keeps failing", async () => {
    const calls = respondWith([503]);

    const result = await settle(api.get("/employees"));

    expect(result.ok).toBe(false);
    expect(calls.count).toBe(3);
    expect(events).toEqual([{ type: "workpulse:server-error", status: 503 }]);
  });

  it("never retries a write, which could be applied twice", async () => {
    const calls = respondWith([500]);

    const result = await settle(api.post("/leaves", {}));

    expect(result.ok).toBe(false);
    expect(calls.count).toBe(1);
    expect(events).toEqual([{ type: "workpulse:server-error", status: 500 }]);
  });

  it("leaves the outage screen alone for a background request that keeps failing", async () => {
    const calls = respondWith([500]);

    const result = await settle(api.get("/attendance/today", { skipGlobalError: true }));

    expect(result.ok).toBe(false);
    expect(calls.count).toBe(3);
    expect(events).toEqual([]);
  });

  it("does not mistake a cancelled request for an outage", async () => {
    const calls = respondWith(["cancel"]);

    const result = await settle(api.get("/employees"));

    expect(result.ok).toBe(false);
    expect(calls.count).toBe(1);
    expect(events).toEqual([]);
  });

  it("does not retry a client error", async () => {
    const calls = respondWith([404]);

    const result = await settle(api.get("/missing"));

    expect(result.ok).toBe(false);
    expect(calls.count).toBe(1);
    expect(events).toEqual([]);
  });

  it("clears the outage screen as soon as the server answers again", async () => {
    respondWith([503]);
    await settle(api.get("/employees"));
    expect(events.map((e) => e.type)).toEqual(["workpulse:server-error"]);

    respondWith(["ok"]);
    await settle(api.get("/employees"));
    await settle(api.get("/employees"));

    // Announced once on recovery, not on every later success.
    expect(events.map((e) => e.type)).toEqual(["workpulse:server-error", "workpulse:server-recovered"]);
  });
});
