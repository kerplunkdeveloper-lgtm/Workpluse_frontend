"use client";

import React from "react";
import Link from "next/link";
import { RefreshCw, ServerCrash } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Changing this (e.g. the pathname) clears a caught error, so navigation recovers. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Keeps one broken screen from taking down the whole workspace: the sidebar and
 * top bar stay usable and the page area shows a recovery card instead of a
 * blank "Application error" screen.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[WorkPulse] Screen failed to render:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorCard onRetry={() => this.setState({ error: null })} />;
  }
}

export function ErrorCard({ onRetry, reference, code = 500 }: { onRetry: () => void; reference?: string; code?: number | string }) {
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-slate-900/[0.06] shadow-[var(--wp-card-shadow)] sm:px-10">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
        <ServerCrash className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Error code <span className="font-mono text-slate-600">{code}</span></p>
      <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-900">This screen couldn&apos;t load</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        Something unexpected happened while showing this page. Your data is safe. Try again, or head back to the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Go to dashboard
        </Link>
      </div>
      {reference && <p className="mt-6 text-xs text-slate-400">Reference: {reference}</p>}
    </div>
  );
}
