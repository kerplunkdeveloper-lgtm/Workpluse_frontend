"use client";

import { useCallback, useEffect, useState } from "react";
import { chatApi } from "@/lib/api";




import { Person } from "./chatTypes";
import { PAGE_SIZE, toList, metaOf } from "./chatUtils";

export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Server-side people search with paging, so it works for any workspace size. */
export function usePeopleSearch(term: string, minChars: number, enabled = true) {
  const [state, setState] = useState({ people: [] as Person[], page: 1, totalPages: 1, loading: false });

  useEffect(() => {
    if (!enabled || term.length < minChars) {
      queueMicrotask(() => setState({ people: [], page: 1, totalPages: 1, loading: false }));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setState((s) => ({ ...s, loading: true })));
    chatApi
      .teammates({ search: term || undefined, page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setState({ people: toList<Person>(res), page: 1, totalPages: metaOf(res).totalPages, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [term, minChars, enabled]);

  const loadMore = useCallback(async () => {
    if (state.loading || state.page >= state.totalPages) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const next = state.page + 1;
      const res = await chatApi.teammates({ search: term || undefined, page: next, limit: PAGE_SIZE });
      setState((s) => ({
        people: [...s.people, ...toList<Person>(res).filter((p) => !s.people.some((q) => q.id === p.id))],
        page: next,
        totalPages: metaOf(res).totalPages,
        loading: false,
      }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [state.loading, state.page, state.totalPages, term]);

  return { ...state, hasMore: state.page < state.totalPages, loadMore };
}
