import { beforeEach, describe, expect, it, vi } from "vitest";
import { cachedFetch, clearQueryCache, invalidate } from "./queryCache";

describe("cachedFetch", () => {
  beforeEach(() => clearQueryCache());

  it("reuses a fresh answer instead of asking again", async () => {
    const fetcher = vi.fn().mockResolvedValue(["a"]);
    await cachedFetch("branches", fetcher);
    await cachedFetch("branches", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("shares one request between callers at the same moment", async () => {
    const fetcher = vi.fn().mockResolvedValue(1);
    const [a, b] = await Promise.all([cachedFetch("k", fetcher), cachedFetch("k", fetcher)]);
    expect([a, b]).toEqual([1, 1]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("asks again after invalidation, or when forced fresh", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new").mockResolvedValueOnce("newer");
    expect(await cachedFetch("branches/list", fetcher)).toBe("old");
    invalidate("branches");
    expect(await cachedFetch("branches/list", fetcher)).toBe("new");
    expect(await cachedFetch("branches/list", fetcher, { fresh: true })).toBe("newer");
  });

  it("asks again once the answer is older than its lifetime", async () => {
    const fetcher = vi.fn().mockResolvedValue("x");
    await cachedFetch("k", fetcher, { ttl: 0 });
    await cachedFetch("k", fetcher, { ttl: 0 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not remember a failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce("ok");
    await expect(cachedFetch("k", fetcher)).rejects.toThrow("down");
    expect(await cachedFetch("k", fetcher)).toBe("ok");
  });

  it("clearing the cache forgets everything", async () => {
    const fetcher = vi.fn().mockResolvedValue(1);
    await cachedFetch("k", fetcher);
    clearQueryCache();
    await cachedFetch("k", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

});
