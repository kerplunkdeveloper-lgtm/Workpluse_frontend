/**
 * A small request cache for data that many screens ask for and that rarely changes (branches, departments,
 * shifts, holidays...). Within `ttl` the same answer is reused, and screens asking at the same moment share one
 * request. Anything that changes the data calls `invalidate`, so the next read is fresh.
 *
 * `useQuery` is the hook for new screens: it shows cached data at once and refreshes it in the background.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

interface Entry {
  data?: unknown;
  error?: unknown;
  updatedAt: number;
  promise?: Promise<unknown>;
  /** Set by `invalidate`, so a screen that is showing this data fetches it again. */
  stale?: boolean;
}

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();
const DEFAULT_TTL = 60_000;

const notify = (key: string) => listeners.get(key)?.forEach((fn) => fn());

/** Returns the cached value while it is fresh, shares a request already in flight, otherwise fetches. */
export function cachedFetch<T>(key: string, fetcher: () => Promise<T>, options: { ttl?: number; fresh?: boolean } = {}): Promise<T> {
  const ttl = options.ttl ?? DEFAULT_TTL;
  const entry = entries.get(key);
  if (entry && !options.fresh) {
    if (entry.promise) return entry.promise as Promise<T>;
    if (entry.data !== undefined && Date.now() - entry.updatedAt < ttl) return Promise.resolve(entry.data as T);
  }
  const promise = fetcher().then(
    (data) => {
      entries.set(key, { data, updatedAt: Date.now() });
      notify(key);
      return data;
    },
    (error) => {
      // A failed request must not be remembered; keep the last good data for display.
      const previous = entries.get(key);
      entries.set(key, previous?.data !== undefined ? { data: previous.data, updatedAt: 0 } : { updatedAt: 0, error });
      notify(key);
      throw error;
    },
  );
  entries.set(key, { data: entry?.data, updatedAt: entry?.updatedAt ?? 0, promise });
  return promise;
}

/** Forgets every cached answer whose key starts with `prefix`, so the next read fetches again. */
export function invalidate(prefix: string): void {
  for (const [key, entry] of entries) {
    if (!key.startsWith(prefix)) continue;
    entries.set(key, { data: entry.data, updatedAt: 0, stale: true });
    notify(key);
  }
}

/** Empties the cache, for example on sign-out, so one person's data never shows for the next. */
export function clearQueryCache(): void {
  const keys = [...entries.keys()];
  entries.clear();
  keys.forEach(notify);
}

export interface QueryState<T> {
  data: T | undefined;
  /** True only while there is nothing to show yet. */
  loading: boolean;
  /** True whenever a request is running, including a background refresh. */
  fetching: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

const subscribe = (key: string, fn: () => void) => {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(fn);
  return () => {
    set!.delete(fn);
    // Do not retain an empty listener set for every key ever used by the app.
    if (set!.size === 0 && listeners.get(key) === set) listeners.delete(key);
  };
};

/** Reads `key` through the cache: cached data shows immediately and is refreshed when it is older than `ttl`. */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, options: { ttl?: number; enabled?: boolean } = {}): QueryState<T> {
  const enabled = options.enabled !== false && key !== null;
  const ttl = options.ttl ?? DEFAULT_TTL;
  const entry = useSyncExternalStore(
    useCallback((fn) => (key ? subscribe(key, fn) : () => {}), [key]),
    () => (key ? entries.get(key) : undefined),
    () => undefined,
  );

  useEffect(() => {
    if (!enabled || !key) return;
    cachedFetch(key, fetcher, { ttl }).catch(() => {});
    // The fetcher is a new function every render; the key is what identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ttl, entry?.stale]);

  const refetch = useCallback(async () => {
    if (key) await cachedFetch(key, fetcher, { fresh: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data: entry?.data as T | undefined,
    loading: enabled && entry?.data === undefined && !entry?.error,
    fetching: Boolean(entry?.promise),
    error: entry?.error,
    refetch,
  };
}
